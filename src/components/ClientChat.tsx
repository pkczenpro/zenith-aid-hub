import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  X
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'support';
  timestamp: string;
  type: 'chat' | 'ticket';
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  product_id?: string;
}

const ClientChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'chat' | 'tickets'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    product_id: ''
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchTickets();
    // Initialize with some sample messages
    setMessages([
      {
        id: '1',
        content: 'Hello! How can I help you today?',
        sender: 'support',
        timestamp: new Date().toISOString(),
        type: 'chat'
      }
    ]);
  }, []);

  const fetchTickets = async () => {
    if (!user) return;

    try {
      // In a real implementation, you'd fetch from a tickets table
      // For now, using mock data
      const mockTickets: Ticket[] = [
        {
          id: '1',
          subject: 'Issue with video playback',
          description: 'Videos are not loading properly in the documentation',
          status: 'open',
          priority: 'high',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          subject: 'Documentation feedback',
          description: 'Suggestion to add more examples in the API section',
          status: 'resolved',
          priority: 'low',
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      setTickets(mockTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'chat'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate support response
    setTimeout(() => {
      const supportMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Thank you for your message. Our support team will get back to you shortly. If this is urgent, please create a ticket for faster response.",
        sender: 'support',
        timestamp: new Date().toISOString(),
        type: 'chat'
      };
      setMessages(prev => [...prev, supportMessage]);
    }, 1000);
  };

  const submitTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      // In a real implementation, you'd save to database
      const newTicket: Ticket = {
        id: Date.now().toString(),
        subject: ticketForm.subject,
        description: ticketForm.description,
        status: 'open',
        priority: ticketForm.priority,
        created_at: new Date().toISOString(),
        product_id: ticketForm.product_id || undefined
      };

      setTickets(prev => [newTicket, ...prev]);
      setTicketForm({ subject: '', description: '', priority: 'medium', product_id: '' });
      setIsTicketFormOpen(false);
      
      toast({
        title: "Ticket Created!",
        description: "Your support ticket has been submitted successfully.",
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Support Center</h2>
        <p className="text-muted-foreground">Get help with documentation or report issues</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <Button
          variant={activeTab === 'chat' ? 'default' : 'outline'}
          onClick={() => setActiveTab('chat')}
          className="flex items-center space-x-2"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Live Chat</span>
        </Button>
        <Button
          variant={activeTab === 'tickets' ? 'default' : 'outline'}
          onClick={() => setActiveTab('tickets')}
          className="flex items-center space-x-2"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Support Tickets</span>
        </Button>
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span>Live Support Chat</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages */}
            <div className="h-96 overflow-y-auto bg-background/50 rounded-lg p-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg flex items-start space-x-2 ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {message.sender === 'support' && <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    {message.sender === 'user' && <User className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    <div>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets Tab */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          {/* Create Ticket Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Your Support Tickets</h3>
            <Button onClick={() => setIsTicketFormOpen(true)}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </div>

          {/* Ticket Form */}
          {isTicketFormOpen && (
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Create Support Ticket</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTicketFormOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Subject *</label>
                  <Input
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Brief description of the issue"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Priority</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full p-2 border border-input rounded-md bg-background"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Description *</label>
                  <Textarea
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of the issue..."
                    rows={4}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={submitTicket} className="bg-gradient-button text-white">
                    Submit Ticket
                  </Button>
                  <Button variant="outline" onClick={() => setIsTicketFormOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tickets List */}
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="shadow-card border-0 bg-gradient-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-foreground">{ticket.subject}</h4>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status === 'open' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {ticket.status === 'in_progress' && <Clock className="h-3 w-3 mr-1" />}
                          {ticket.status === 'resolved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{ticket.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {tickets.length === 0 && (
              <div className="text-center py-12">
                <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No tickets yet</h3>
                <p className="text-muted-foreground">
                  Create a ticket if you need help or want to report an issue.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientChat;