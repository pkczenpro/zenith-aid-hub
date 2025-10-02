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

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: Date;
  links?: Array<{ type: string; id: string; url: string; title: string }>;
}

interface Product {
  id: string;
  name: string;
}

const ChatWidget = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [sessionId, setSessionId] = useState(() => {
    const stored = localStorage.getItem('chatSessionId');
    return stored || `session-${Date.now()}`;
  });
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState("");

  useEffect(() => {
    fetchProducts();
    loadPersistedChat();
  }, []);

  useEffect(() => {
    if (profile?.id && !dbSessionId) {
      initializeDbSession();
    }
  }, [profile?.id, sessionId]);

  useEffect(() => {
    if (messages.length > 0) {
      persistChat();
      saveToDatabase();
    }
  }, [messages]);

  const loadPersistedChat = () => {
    const stored = localStorage.getItem(`chat-${sessionId}`);
    if (stored) {
      const data = JSON.parse(stored);
      setMessages(data.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      setSelectedProduct(data.selectedProduct || "");
    } else {
      // Initialize with welcome message
      setMessages([{
        id: 1,
        text: "Hi! I'm Zenithr Assistant, powered by AI. I can help you troubleshoot issues, answer questions, and recommend relevant articles and resources. Which product do you need help with?",
        isBot: true,
        timestamp: new Date()
      }]);
    }
  };

  const persistChat = () => {
    localStorage.setItem(`chat-${sessionId}`, JSON.stringify({
      messages,
      selectedProduct,
      timestamp: new Date().toISOString()
    }));
    localStorage.setItem('chatSessionId', sessionId);
  };

  const initializeDbSession = async () => {
    if (!profile?.id) return;

    try {
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

      if (data) {
        setDbSessionId(data.id);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  };

  const saveToDatabase = async () => {
    if (!profile?.id || !dbSessionId) return;

    try {
      // Update session
      await supabase
        .from('chat_sessions')
        .update({
          message_count: messages.length,
          product_id: selectedProduct || null,
          ended_at: new Date().toISOString()
        })
        .eq('id', dbSessionId);

      // Save messages
      const messagesToSave = messages.slice(-2).map(msg => ({
        session_id: dbSessionId,
        role: msg.isBot ? 'assistant' : 'user',
        content: msg.text
      }));

      if (messagesToSave.length > 0) {
        await supabase
          .from('chat_session_messages')
          .insert(messagesToSave);
      }
    } catch (error) {
      console.error('Error saving to database:', error);
    }
  };

  const startNewConversation = async () => {
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

    // Generate new session ID
    const newSessionId = `session-${Date.now()}`;
    
    // Clear old session data
    localStorage.removeItem(`chat-${sessionId}`);
    localStorage.setItem('chatSessionId', newSessionId);
    
    // Reset all state
    setSessionId(newSessionId);
    setDbSessionId(null);
    setMessages([{
      id: 1,
      text: "Hi! I'm Zenithr Assistant, powered by AI. I can help you troubleshoot issues, answer questions, and recommend relevant articles and resources. Which product do you need help with?",
      isBot: true,
      timestamp: new Date()
    }]);
    setSelectedProduct("");
    setShowFeedback(false);
    setFeedbackGiven(false);
    setFeedbackComment("");
    
    // Initialize new DB session
    if (profile?.id) {
      try {
        const { data, error } = await supabase
          .from('chat_sessions')
          .insert({
            session_id: newSessionId,
            profile_id: profile.id,
            product_id: selectedProduct || null,
            message_count: 0
          })
          .select()
          .single();

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
          comment: feedbackComment || null
        });

      if (feedbackError) throw feedbackError;

      // Mark session as resolved and ended
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .update({ 
          resolved_by_ai: rating === 'positive',
          ended_at: new Date().toISOString()
        })
        .eq('id', dbSessionId);

      if (sessionError) throw sessionError;

      setFeedbackGiven(true);
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted. Starting a new session...",
      });
      
      // End session and start new conversation after brief delay
      setTimeout(() => {
        startNewConversation();
      }, 1500);
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
    const { data } = await supabase
      .from("products")
      .select("id, name")
      .eq("status", "published");
    
    if (data) {
      setProducts(data);
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
      console.log('AI Response:', aiResponse);
      const links = parseLinksFromResponse(aiResponse);
      console.log('Extracted links:', links);

      // Remove Markdown link tags from display text
      const cleanText = aiResponse.replace(/\[([^\]]+)\]\((article|resource|video):([^:]+):([^\)]+)\)/g, '$1');

      const botMessage: Message = {
        id: messages.length + 2,
        text: cleanText,
        isBot: true,
        timestamp: new Date(),
        links: links.length > 0 ? links : undefined
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
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Zenithr Assistant</h3>
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
            
            {/* Product Selection */}
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-full bg-white text-foreground">
                <SelectValue placeholder="Select a product..." />
              </SelectTrigger>
              <SelectContent>
                {products.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <p className="text-sm font-medium">How was your experience?</p>
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
                <Textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Additional comments (optional)..."
                  className="text-sm"
                  rows={2}
                />
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
                placeholder="Type your message..."
                className="flex-1 text-base h-11"
              />
              <Button 
                onClick={handleSendMessage}
                size="default"
                className="bg-gradient-button text-white border-0 px-4 h-11"
                disabled={isLoading}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Powered by AI • Response time: ~30 seconds
            </p>
          </div>
        </Card>
      )}
    </>
  );
};

export default ChatWidget;