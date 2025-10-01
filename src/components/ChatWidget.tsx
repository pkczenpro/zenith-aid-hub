import { useState, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: Date;
  links?: Array<{ type: string; id: string; url: string }>;
}

interface Product {
  id: string;
  name: string;
}

const ChatWidget = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hi! I'm Zenithr Assistant, powered by AI. I can help you troubleshoot issues, answer questions, and recommend relevant articles and resources. Which product do you need help with?",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

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
    const links: Array<{ type: string; id: string; url: string }> = [];
    const patterns = [
      { regex: /\[article:([^:]+):([^\]]+)\]/g, type: "article", urlType: "article" },
      { regex: /\[resource:([^:]+):([^\]]+)\]/g, type: "resource", urlType: "resource" },
      { regex: /\[video:([^:]+):([^\]]+)\]/g, type: "video", urlType: "video" },
    ];

    patterns.forEach(({ regex, type, urlType }) => {
      // Reset lastIndex for global regex
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const productId = match[1];
        const contentId = match[2];
        const url = `/product/${productId}/docs?type=${urlType}&id=${contentId}`;
        links.push({ type, id: contentId, url });
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

      // Remove link tags from display text
      const cleanText = aiResponse.replace(/\[(article|resource|video):([^:]+):([^\]]+)\]/g, '');

      const botMessage: Message = {
        id: messages.length + 2,
        text: cleanText,
        isBot: true,
        timestamp: new Date(),
        links: links.length > 0 ? links : undefined
      };

      setMessages(prev => [...prev, botMessage]);
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
        <Card className="fixed bottom-24 right-6 z-40 w-80 h-96 flex flex-col shadow-2xl border-0 bg-card animate-slide-up">
          {/* Header */}
          <div className="flex flex-col gap-3 p-4 border-b bg-gradient-hero text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Zenithr Assistant</h3>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs opacity-90">AI-Powered</span>
                  </div>
                </div>
              </div>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                <div className={`flex items-start space-x-2 max-w-[80%] ${message.isBot ? '' : 'flex-row-reverse space-x-reverse'}`}>
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    message.isBot ? 'bg-primary' : 'bg-accent'
                  }`}>
                    {message.isBot ? (
                      <Bot className="h-3 w-3 text-white" />
                    ) : (
                      <User className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className={`px-3 py-2 rounded-xl text-sm ${
                      message.isBot 
                        ? 'bg-muted text-foreground' 
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      {message.text}
                    </div>
                    
                    {/* Render clickable links for articles/resources/videos */}
                    {message.links && message.links.length > 0 && (
                      <div className="flex flex-col gap-1 pl-2">
                        {message.links.map((link, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="text-xs justify-start h-auto py-2"
                            onClick={() => {
                              setIsOpen(false);
                              navigate(link.url);
                            }}
                          >
                            {link.type === 'video' && '🎥'}
                            {link.type === 'article' && '📄'}
                            {link.type === 'resource' && '📎'}
                            <span className="ml-2">View {link.type}</span>
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
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                  <div className="px-3 py-2 rounded-xl text-sm bg-muted text-foreground">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 text-sm"
              />
              <Button 
                onClick={handleSendMessage}
                size="sm"
                className="bg-gradient-button text-white border-0 px-3"
                disabled={isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Powered by AI • Response time: ~30 seconds
            </p>
          </div>
        </Card>
      )}
    </>
  );
};

export default ChatWidget;