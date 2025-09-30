import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Conversation {
  conversation_id: string;
  client_name: string;
  client_email: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  profile_id: string;
}

interface ConversationListProps {
  onSelectConversation: (conversationId: string, clientName: string, profileId: string) => void;
  selectedConversation: string | null;
}

const ConversationList = ({ onSelectConversation, selectedConversation }: ConversationListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();

    // Subscribe to new messages
    const channel = supabase
      .channel('conversation-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      // Get all unique conversations with latest message
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select(`
          conversation_id,
          content,
          created_at,
          profile_id,
          profiles!chat_messages_profile_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      // Group by conversation_id and get the latest message for each
      const conversationMap = new Map<string, Conversation>();
      
      messages?.forEach((msg: any) => {
        const convId = msg.conversation_id;
        if (!conversationMap.has(convId)) {
          conversationMap.set(convId, {
            conversation_id: convId,
            client_name: msg.profiles?.full_name || msg.profiles?.email || 'Unknown Client',
            client_email: msg.profiles?.email || '',
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: 0, // You can implement unread logic here
            profile_id: msg.profile_id
          });
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.client_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5" />
          <span>Conversations</span>
          <Badge variant="secondary">{conversations.length}</Badge>
        </CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredConversations.map((conv) => (
                <Button
                  key={conv.conversation_id}
                  variant={selectedConversation === conv.conversation_id ? 'secondary' : 'ghost'}
                  className="w-full justify-start h-auto p-4"
                  onClick={() => onSelectConversation(conv.conversation_id, conv.client_name, conv.profile_id)}
                >
                  <div className="flex items-start space-x-3 w-full">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm truncate">{conv.client_name}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conv.last_message_time)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message}
                      </p>
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="mt-1">
                          {conv.unread_count} new
                        </Badge>
                      )}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ConversationList;