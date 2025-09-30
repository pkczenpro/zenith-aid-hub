import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { soundService } from '@/utils/soundNotifications';
import SoundControls from './SoundControls';
import ConversationList from './ConversationList';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'support' | 'system';
  timestamp: string;
  type: 'chat' | 'ticket';
  client_name?: string;
}

const ClientChat = () => {
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedConversation || !isAdmin) {
      fetchMessages();
    }
    
    // Set up real-time subscription for chat messages
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          // For admins, only show messages from selected conversation
          if (isAdmin && payload.new.conversation_id !== selectedConversation) {
            return;
          }

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
  }, [user, selectedConversation, isAdmin]);

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

      // If not admin, filter by user's profile
      // If admin, filter by selected conversation
      if (!isAdmin) {
        query = query.eq('profile_id', currentProfile.id);
      } else if (selectedConversation) {
        query = query.eq('conversation_id', selectedConversation);
      } else {
        // Admin with no conversation selected - show no messages
        setMessages([]);
        return;
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

      // For admins, use the selected conversation and profile
      // For clients, use their own profile
      const conversationId = isAdmin ? selectedConversation : profile.id;
      const targetProfileId = isAdmin ? selectedProfileId : profile.id;

      if (isAdmin && !selectedConversation) {
        toast({
          title: "No Conversation Selected",
          description: "Please select a conversation first.",
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
          profile_id: targetProfileId,
          content: newMessage,
          sender: isAdmin ? 'support' : 'user',
          conversation_id: conversationId
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

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSelectConversation = (conversationId: string, clientName: string, profileId: string) => {
    setSelectedConversation(conversationId);
    setSelectedClientName(clientName);
    setSelectedProfileId(profileId);
    setMessages([]); // Clear messages before fetching new ones
  };

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation List - Admin Only */}
          <div className="lg:col-span-1">
            <ConversationList 
              onSelectConversation={handleSelectConversation}
              selectedConversation={selectedConversation}
            />
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <Card className="shadow-card border-0 bg-gradient-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="h-5 w-5" />
                      <span>Chat with {selectedClientName}</span>
                    </div>
                    <SoundControls />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Messages */}
                  <div className="h-[600px] overflow-y-auto bg-background/50 rounded-lg p-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === 'support' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg flex items-start space-x-2 ${
                              message.sender === 'support'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            {message.sender === 'support' ? (
                              <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            ) : (
                              <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                              <p className="text-sm">{message.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
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
            ) : (
              <Card className="shadow-card border-0 bg-gradient-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Select a conversation to start chatting</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        // Client View - Simple Chat
        <Card className="shadow-card border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>Live Support Chat</span>
              </div>
              <SoundControls />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages */}
            <div className="h-[600px] overflow-y-auto bg-background/50 rounded-lg p-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg flex items-start space-x-2 ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
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
    </div>
  );
};

export default ClientChat;