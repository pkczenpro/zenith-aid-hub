import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { soundService } from '@/utils/soundNotifications';
import SoundControls from './SoundControls';
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
  sender: 'user' | 'support' | 'system';
  timestamp: string;
  type: 'chat' | 'ticket';
  client_name?: string;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  product_id?: string;
  client_name?: string;
}

const ClientChat = () => {
  const { user, profile, isAdmin } = useAuth();
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
    fetchMessages();
    
    // Set up real-time subscription for chat messages
    const channel = supabase
      .channel('chat-messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          (payload) => {
            const newMessage: Message = {
              id: payload.new.id,
              content: payload.new.content,
              sender: payload.new.sender as 'user' | 'support' | 'system',
              timestamp: payload.new.created_at,
              type: 'chat'
            };
            
            // Only add message if it's not from current user to avoid duplicates
            if (payload.new.user_id !== user?.id) {
              setMessages(prev => [...prev, newMessage]);
              // Play sound notification for received messages
              soundService.playMessageReceived();
            }
          }
        )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;

    try {
      let query = supabase.from('support_tickets').select(`
        *,
        profiles!support_tickets_profile_id_fkey(full_name, email)
      `);

      // If not admin, only show user's tickets
      if (!isAdmin) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (currentProfile) {
          query = query.eq('profile_id', currentProfile.id);
        }
      }

      const { data: tickets, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
        return;
      }

      const formattedTickets = tickets?.map(ticket => ({
        ...ticket,
        status: ticket.status as 'open' | 'in_progress' | 'resolved' | 'closed',
        priority: ticket.priority as 'low' | 'medium' | 'high' | 'urgent',
        client_name: ticket.profiles?.full_name || ticket.profiles?.email || 'Unknown'
      })) || [];

      setTickets(formattedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const fetchMessages = async () => {
    if (!user) return;

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return;

      let query = supabase
        .from('chat_messages')
        .select(`
          *,
          profiles!chat_messages_profile_id_fkey(full_name, email)
        `);

      // If not admin, only show user's messages
      // If admin, show all messages for admin interface
      if (!isAdmin) {
        query = query.eq('profile_id', currentProfile.id);
      }

      const { data: messages, error } = await query.order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      const formattedMessages: Message[] = messages?.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender as 'user' | 'support' | 'system',
        timestamp: msg.created_at,
        type: 'chat',
        client_name: msg.profiles?.full_name || msg.profiles?.email || 'Unknown'
      })) || [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        toast({
          title: "Error",
          description: "Profile not found. Please try logging in again.",
          variant: "destructive",
        });
        return;
      }

      const message: Message = {
        id: Date.now().toString(),
        content: newMessage,
        sender: isAdmin ? 'support' : 'user',
        timestamp: new Date().toISOString(),
        type: 'chat',
        client_name: profile?.id ? (profile as any).full_name || user.email || 'Unknown' : 'Unknown'
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');

      // Play sound notification for sent messages
      soundService.playMessageSent();

      // Save message to database
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          profile_id: profile.id,
          content: newMessage,
          sender: isAdmin ? 'support' : 'user'
        });

      if (error) {
        console.error('Error saving message:', error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Auto-response for clients only (admins don't get auto-response)
      if (!isAdmin) {
        setTimeout(async () => {
          const supportMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: "Thank you for your message. Our support team will get back to you shortly. If this is urgent, please create a ticket for faster response.",
            sender: 'support',
            timestamp: new Date().toISOString(),
            type: 'chat'
          };
          setMessages(prev => [...prev, supportMessage]);

          // Note: In production, support messages would be sent by actual support staff
          // This is just a demo auto-response
        }, 1000);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
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

    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        toast({
          title: "Error",
          description: "Profile not found. Please try logging in again.",
          variant: "destructive",
        });
        return;
      }

      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          profile_id: profile.id,
          subject: ticketForm.subject,
          description: ticketForm.description,
          priority: ticketForm.priority,
          product_id: ticketForm.product_id || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating ticket:', error);
        toast({
          title: "Error",
          description: "Failed to create ticket. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Add ticket to local state with proper typing
      const formattedTicket = {
        ...ticket,
        status: ticket.status as 'open' | 'in_progress' | 'resolved' | 'closed',
        priority: ticket.priority as 'low' | 'medium' | 'high' | 'urgent'
      };
      setTickets(prev => [formattedTicket, ...prev]);
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
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>{isAdmin ? 'Admin Support Chat' : 'Live Support Chat'}</span>
                {profile && (
                  <span className="text-sm font-normal text-muted-foreground">
                    - {(profile as any).full_name || user?.email || 'User'}
                  </span>
                )}
              </div>
              <SoundControls />
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
                      {isAdmin && message.client_name && message.sender === 'user' && (
                        <p className="text-xs font-medium text-primary mb-1">{message.client_name}</p>
                      )}
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
        <h3 className="text-lg font-semibold">
          {isAdmin ? 'All Support Tickets' : 'Your Support Tickets'}
        </h3>
        {!isAdmin && (
          <Button onClick={() => setIsTicketFormOpen(true)}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Create Ticket
          </Button>
        )}
      </div>

      {/* Ticket Form */}
      {isTicketFormOpen && !isAdmin && (
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
                    {isAdmin && ticket.client_name && (
                      <p className="text-sm font-medium text-primary mb-1">
                        Client: {ticket.client_name}
                      </p>
                    )}
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