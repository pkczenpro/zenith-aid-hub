import { useState, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBrandSettings } from "@/hooks/useBrandSettings";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: Date;
  links?: Array<{ type: string; id: string; url: string; title: string }>;
  showProductSwitch?: boolean;
}

interface Product {
  id: string;
  name: string;
  icon_url?: string;
}

const ChatWidget = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { settings: brandSettings } = useBrandSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [sessionId, setSessionId] = useState(() => {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  });
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);
  
  useEffect(() => {
    // Fetch products when profile is loaded
    if (profile) {
      fetchProducts();
    }
  }, [profile]);

  useEffect(() => {
    // Load persisted chat when widget opens and refetch products
    if (isOpen && profile) {
      fetchProducts();
      loadPersistedChat();
    }
  }, [isOpen, profile]);

  useEffect(() => {
    if (profile?.id && !dbSessionId && sessionId) {
      initializeDbSession();
    }
  }, [profile?.id, dbSessionId, sessionId]);

  useEffect(() => {
    if (messages.length > 0) {
      persistChat();
      saveToDatabase();
      
      // Update last message time and reset inactivity timer
      setLastMessageTime(new Date());
      resetInactivityTimer();
    }
  }, [messages]);

  // Auto-close session after 5 minutes of inactivity
  useEffect(() => {
    return () => {
      // Cleanup timer on unmount
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    };
  }, [inactivityTimer]);

  const resetInactivityTimer = () => {
    // Clear existing timer
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    // Only set timer if we have a valid session with messages
    if (dbSessionId && messages.length > 2 && !feedbackGiven) {
      // Set 5-minute inactivity timer
      const timer = setTimeout(() => {
        autoCloseSession();
      }, 5 * 60 * 1000); // 5 minutes
      
      setInactivityTimer(timer);
    }
  };

  const autoCloseSession = async () => {
    if (!dbSessionId || feedbackGiven) return;

    try {
      // Mark session as resolved and ended due to inactivity
      await supabase
        .from('chat_sessions')
        .update({ 
          resolved_by_ai: true,
          ended_at: new Date().toISOString()
        })
        .eq('id', dbSessionId);

      console.log('Session auto-closed due to inactivity');
      
      // Show feedback prompt
      setShowFeedback(true);
      
      // Add a system message about auto-close
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: "This session has been automatically closed due to inactivity. Did I help resolve your question?",
        isBot: true,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error auto-closing session:', error);
    }
  };

  useEffect(() => {
    // Update session product when product is selected during conversation
    if (dbSessionId && selectedProduct) {
      updateSessionProduct();
    }
  }, [selectedProduct, dbSessionId]);

  const handleProductSelect = (productId: string, productName: string) => {
    const previousProduct = selectedProduct;
    setSelectedProduct(productId);
    
    // Add confirmation message
    const confirmationMessage = previousProduct 
      ? `Switched to ${productName}! How can I help you with this product?`
      : `Great! I'm ready to help you with ${productName}. What would you like to know?`;
    
    setMessages(prev => [...prev, {
      id: prev.length + 1,
      text: confirmationMessage,
      isBot: true,
      timestamp: new Date()
    }]);
    
    // Update the database session with new product
    if (dbSessionId) {
      updateSessionProduct();
    }
  };

  const loadPersistedChat = async () => {
    if (!profile?.id) {
      // Show welcome messages if no profile yet
      setMessages([
        {
          id: 1,
          text: `Hi! I'm ${brandSettings.chatbot_name}, powered by AI. 👋`,
          isBot: true,
          timestamp: new Date()
        },
        {
          id: 2,
          text: "I can help you troubleshoot issues, answer questions, and recommend relevant articles and resources. To get started, please select the product you need help with:",
          isBot: true,
          timestamp: new Date()
        }
      ]);
      return;
    }

    try {
      // First, try to load active session from database
      const { data: activeSessions, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('id, session_id, product_id, message_count')
        .eq('profile_id', profile.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1);

      if (!sessionError && activeSessions && activeSessions.length > 0) {
        const activeSession = activeSessions[0];
        
        // Load messages from database
        const { data: dbMessages, error: msgError } = await supabase
          .from('chat_session_messages')
          .select('*')
          .eq('session_id', activeSession.id)
          .order('created_at', { ascending: true });

        if (!msgError && dbMessages && dbMessages.length > 0) {
          // Convert database messages to UI format
          const loadedMessages = dbMessages.map((msg, index) => ({
            id: index + 1,
            text: msg.content,
            isBot: msg.role === 'assistant',
            timestamp: new Date(msg.created_at)
          }));

          setMessages(loadedMessages);
          setSessionId(activeSession.session_id);
          setDbSessionId(activeSession.id);
          if (activeSession.product_id) {
            setSelectedProduct(activeSession.product_id);
          }
          
          // Save to localStorage for faster subsequent loads
          localStorage.setItem('chatWidget_session', activeSession.session_id);
          localStorage.setItem('chatWidget_messages', JSON.stringify(loadedMessages));
          if (activeSession.product_id) {
            localStorage.setItem('chatWidget_selectedProduct', activeSession.product_id);
          }
          
          console.log('Loaded active session from database:', activeSession.id);
          return;
        }
      }

      // Fallback to localStorage if no active database session
      const savedSession = localStorage.getItem('chatWidget_session');
      const savedMessages = localStorage.getItem('chatWidget_messages');
      const savedProduct = localStorage.getItem('chatWidget_selectedProduct');
      const savedFeedback = localStorage.getItem('chatWidget_feedbackGiven');
      
      if (savedMessages && savedSession) {
        const parsedMessages = JSON.parse(savedMessages);
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
        setSessionId(savedSession);
        
        if (savedProduct) {
          setSelectedProduct(savedProduct);
        }
        
        if (savedFeedback === 'true') {
          setFeedbackGiven(true);
        }
        return;
      }
    } catch (error) {
      console.error('Error loading persisted chat:', error);
    }
    
    // If no saved chat anywhere, start with welcome messages
    setMessages([
      {
        id: 1,
        text: `Hi! I'm ${brandSettings.chatbot_name}, powered by AI. 👋`,
        isBot: true,
        timestamp: new Date()
      },
      {
        id: 2,
        text: "I can help you troubleshoot issues, answer questions, and recommend relevant articles and resources. To get started, please select the product you need help with:",
        isBot: true,
        timestamp: new Date()
      }
    ]);
  };

  const persistChat = () => {
    // Save to localStorage
    try {
      localStorage.setItem('chatWidget_session', sessionId);
      localStorage.setItem('chatWidget_messages', JSON.stringify(messages));
      localStorage.setItem('chatWidget_selectedProduct', selectedProduct);
      localStorage.setItem('chatWidget_feedbackGiven', feedbackGiven.toString());
    } catch (error) {
      console.error('Error persisting chat:', error);
    }
  };

  const initializeDbSession = async () => {
    if (!profile?.id || dbSessionId) return;

    try {
      // Check if there's already an active session for this user
      const { data: existingSession, error: checkError } = await supabase
        .from('chat_sessions')
        .select('id, session_id')
        .eq('profile_id', profile.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for existing session:', checkError);
      }

      if (existingSession) {
        // Resume existing session
        setDbSessionId(existingSession.id);
        setSessionId(existingSession.session_id);
        console.log('Resumed existing session:', existingSession.id);
        return;
      }

      // Create new session only if none exists
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          session_id: sessionId,
          profile_id: profile.id,
          product_id: selectedProduct || null,
          message_count: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error initializing session:', error);
        return;
      }

      if (data) {
        setDbSessionId(data.id);
        console.log('Created new session:', data.id);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  };

  const updateSessionProduct = async () => {
    if (!dbSessionId || !selectedProduct) return;

    try {
      await supabase
        .from('chat_sessions')
        .update({ product_id: selectedProduct })
        .eq('id', dbSessionId);
    } catch (error) {
      console.error('Error updating session product:', error);
    }
  };

  const saveToDatabase = async () => {
    if (!profile?.id || !dbSessionId) return;

    try {
      // Update session - mark as resolved by default
      await supabase
        .from('chat_sessions')
        .update({
          message_count: messages.length,
          product_id: selectedProduct || null,
          ended_at: new Date().toISOString(),
          resolved_by_ai: true // Mark as resolved by default
        })
        .eq('id', dbSessionId);

      // Save only the last 2 messages to avoid duplicates
      // Check if they already exist first
      const messagesToCheck = messages.slice(-2);
      
      for (const msg of messagesToCheck) {
        const { data: existing } = await supabase
          .from('chat_session_messages')
          .select('id')
          .eq('session_id', dbSessionId)
          .eq('role', msg.isBot ? 'assistant' : 'user')
          .eq('content', msg.text)
          .maybeSingle();

        if (!existing) {
          // Only insert if message doesn't exist
          await supabase
            .from('chat_session_messages')
            .insert({
              session_id: dbSessionId,
              role: msg.isBot ? 'assistant' : 'user',
              content: msg.text
            });
        }
      }
    } catch (error) {
      console.error('Error saving to database:', error);
    }
  };

  const startNewConversation = async () => {
    // Clear inactivity timer
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      setInactivityTimer(null);
    }
    
    // Mark current session as resolved
    if (dbSessionId) {
      await supabase
        .from('chat_sessions')
        .update({ 
          ended_at: new Date().toISOString(),
          resolved_by_ai: true 
        })
        .eq('id', dbSessionId);
    }

    // Generate new unique session ID
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Clear localStorage
    localStorage.removeItem('chatWidget_session');
    localStorage.removeItem('chatWidget_messages');
    localStorage.removeItem('chatWidget_selectedProduct');
    localStorage.removeItem('chatWidget_feedbackGiven');
    
    // Reset all state - IMPORTANT: Reset selectedProduct BEFORE setting messages
    setSelectedProduct("");
    setShowFeedback(false);
    setFeedbackGiven(false);
    setSessionId(newSessionId);
    setDbSessionId(null);
    setLastMessageTime(null);
    
    // Refetch products to ensure they're loaded
    await fetchProducts();
    
    // Set welcome messages after a small delay to ensure state is cleared
    setTimeout(() => {
      setMessages([
        {
          id: 1,
          text: `Hi! I'm ${brandSettings.chatbot_name}, powered by AI. 👋`,
          isBot: true,
          timestamp: new Date()
        },
        {
          id: 2,
          text: "I can help you troubleshoot issues, answer questions, and recommend relevant articles and resources. To get started, please select the product you need help with:",
          isBot: true,
          timestamp: new Date()
        }
      ]);
    }, 100);
    
    // Initialize new DB session
    if (profile?.id) {
      try {
        const { data, error } = await supabase
          .from('chat_sessions')
          .insert({
            session_id: newSessionId,
            profile_id: profile.id,
            product_id: null,
            message_count: 0
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating new session:', error);
          return;
        }

        if (data) {
          setDbSessionId(data.id);
        }
      } catch (error) {
        console.error('Error creating new session:', error);
      }
    }
  };

  const handleFeedback = async (rating: 'positive' | 'negative') => {
    setShowFeedback(true);
  };

  const submitFeedback = async (rating: 'positive' | 'negative') => {
    if (!profile?.id || !dbSessionId) {
      toast({
        title: "Error",
        description: "Unable to submit feedback. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Insert feedback
      const { error: feedbackError } = await supabase
        .from('chat_feedback')
        .insert({
          session_id: dbSessionId,
          profile_id: profile.id,
          feedback_type: rating,
          comment: null
        });

      if (feedbackError) throw feedbackError;

      // Mark session - only unresolved if negative feedback (unhelpful)
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .update({ 
          resolved_by_ai: rating !== 'negative', // Only unresolved if unhelpful
          ended_at: new Date().toISOString()
        })
        .eq('id', dbSessionId);

      if (sessionError) throw sessionError;

      setFeedbackGiven(true);
      
      // Save feedback state to localStorage
      localStorage.setItem('chatWidget_feedbackGiven', 'true');
      
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
      });
      
      setShowFeedback(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchProducts = async () => {
    if (!profile) {
      console.log('Profile not loaded yet, skipping product fetch');
      return;
    }

    try {
      console.log('Fetching products for role:', profile.role);
      
      if (profile.role === 'client') {
        // For clients, only show products they have access to
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (clientData) {
          const { data: accessData } = await supabase
            .from('client_product_access')
            .select('product_id')
            .eq('client_id', clientData.id);

          if (accessData && accessData.length > 0) {
            const productIds = accessData.map(item => item.product_id);
            
            const { data: productsData } = await supabase
              .from('products')
              .select('id, name, icon_url')
              .in('id', productIds);
            
            if (productsData) {
              console.log('Client products loaded:', productsData.length);
              setProducts(productsData);
            }
          } else {
            console.log('No product access found for client');
            setProducts([]);
          }
        }
      } else {
        // Admin sees all published products
        const { data } = await supabase
          .from("products")
          .select("id, name, icon_url")
          .eq("status", "published");
        
        if (data) {
          console.log('Admin products loaded:', data.length);
          setProducts(data);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const parseLinksFromResponse = (text: string) => {
    const links: Array<{ type: string; id: string; url: string; title: string }> = [];
    
    // Match Markdown format: [Link Text](article:productId:contentId)
    const patterns = [
      { regex: /\[([^\]]+)\]\(article:([^:]+):([^\)]+)\)/g, type: "article", urlType: "article" },
      { regex: /\[([^\]]+)\]\(resource:([^:]+):([^\)]+)\)/g, type: "resource", urlType: "resource" },
      { regex: /\[([^\]]+)\]\(video:([^:]+):([^\)]+)\)/g, type: "video", urlType: "video" },
    ];

    patterns.forEach(({ regex, type, urlType }) => {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const linkTitle = match[1];
        const productId = match[2];
        const contentId = match[3];
        const url = `/product/${productId}/docs?type=${urlType}&id=${contentId}`;
        links.push({ type, id: contentId, url, title: linkTitle });
      }
    });

    console.log('Parsed links from response:', links);
    return links;
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: currentMessage,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.isBot ? "assistant" : "user",
        content: m.text
      }));

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [...conversationHistory, { role: "user", content: currentMessage }],
          productId: selectedProduct || null
        }
      });

      if (error) throw error;

      const aiResponse = data.choices[0].message.content;
      const needsProductSwitch = data.needsProductSwitch || false;
      
      console.log('AI Response:', aiResponse);
      console.log('Needs product switch:', needsProductSwitch);
      
      const links = parseLinksFromResponse(aiResponse);
      console.log('Extracted links:', links);

      // Remove Markdown link tags from display text
      const cleanText = aiResponse.replace(/\[([^\]]+)\]\((article|resource|video):([^:]+):([^\)]+)\)/g, '$1');

      const botMessage: Message = {
        id: messages.length + 2,
        text: cleanText,
        isBot: true,
        timestamp: new Date(),
        links: links.length > 0 ? links : undefined,
        showProductSwitch: needsProductSwitch
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Show feedback after 3+ messages
      if (messages.length >= 5 && !feedbackGiven) {
        setTimeout(() => setShowFeedback(true), 1000);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
      
      const errorMessage: Message = {
        id: messages.length + 2,
        text: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-glow transition-all duration-300 ${
          isOpen ? 'bg-destructive hover:bg-destructive/90' : 'bg-gradient-button hover:shadow-xl'
        }`}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-40 w-[500px] h-[650px] flex flex-col shadow-2xl border-0 bg-card animate-slide-up">
          {/* Header */}
          <div className="flex flex-col gap-3 p-5 border-b bg-gradient-hero text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                  {brandSettings.chatbot_icon_url ? (
                    <img src={brandSettings.chatbot_icon_url} alt={brandSettings.chatbot_name} className="h-6 w-6 object-contain" />
                  ) : (
                    <Bot className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-base">{brandSettings.chatbot_name}</h3>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm opacity-90">AI-Powered</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={startNewConversation}
                className="text-white hover:bg-white/10"
                title="Start new conversation"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                <div className={`flex items-start space-x-3 max-w-[85%] ${message.isBot ? '' : 'flex-row-reverse space-x-reverse'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.isBot ? 'bg-primary' : 'bg-accent'
                  }`}>
                    {message.isBot ? (
                      <Bot className="h-4 w-4 text-white" />
                    ) : (
                      <User className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className={`px-4 py-3 rounded-xl text-base leading-relaxed ${
                      message.isBot 
                        ? 'bg-muted text-foreground' 
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      {message.text}
                    </div>
                    
                    {/* Render clickable links for articles/resources/videos */}
                    {message.links && message.links.length > 0 && (
                      <div className="flex flex-col gap-2 pl-2">
                        {message.links.map((link, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="text-sm justify-start h-auto py-2.5 px-3 hover:bg-accent/10 transition-colors"
                            onClick={() => {
                              setIsOpen(false);
                              navigate(link.url);
                            }}
                          >
                            <span className="text-base mr-2">
                              {link.type === 'video' && '🎥'}
                              {link.type === 'article' && '📄'}
                              {link.type === 'resource' && '📎'}
                            </span>
                            <span className="font-medium">{link.title}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    {/* Product Selection Cards - Show when product switch is suggested OR after initial welcome */}
                    {message.isBot && products.length > 0 && (message.id === 2 && !selectedProduct || message.showProductSwitch) && (
                      <div className="mt-4 grid gap-3">
                        {message.showProductSwitch && (
                          <p className="text-sm text-muted-foreground font-medium mb-2">
                            Please select a product:
                          </p>
                        )}
                        {products.map((product) => (
                          <Button
                            key={product.id}
                            onClick={() => handleProductSelect(product.id, product.name)}
                            variant="outline"
                            className="h-auto py-4 px-4 justify-start text-left hover:bg-primary/10 hover:border-primary transition-all hover-scale group"
                          >
                            <div className="flex items-center gap-4 w-full">
                              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/10 group-hover:border-primary/30 transition-all">
                                {product.icon_url ? (
                                  <img 
                                    src={product.icon_url} 
                                    alt={product.name}
                                    className="h-10 w-10 object-contain"
                                  />
                                ) : (
                                  <span className="text-2xl">📦</span>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-base text-foreground">{product.name}</span>
                                <span className="text-xs text-muted-foreground">Click to select this product</span>
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-xl text-base bg-muted text-foreground">
                    <div className="flex space-x-1.5">
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Feedback Section */}
            {showFeedback && !feedbackGiven && messages.length > 5 && (
              <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm font-medium">Was this chat helpful?</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => submitFeedback('positive')}
                    className="flex-1"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Helpful
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => submitFeedback('negative')}
                    className="flex-1"
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Not Helpful
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-5 border-t">
            <div className="flex space-x-2">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={!selectedProduct ? "Please select a product to start..." : "Type your message..."}
                className="flex-1 text-base h-11"
                disabled={!selectedProduct || isLoading}
              />
              <Button 
                onClick={handleSendMessage}
                size="default"
                className="bg-gradient-button text-white border-0 px-4 h-11"
                disabled={!selectedProduct || isLoading}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-3 text-center">
              {brandSettings.chatbot_name} • Response time: ~30 seconds
            </p>
          </div>
        </Card>
      )}
    </>
  );
};

export default ChatWidget;