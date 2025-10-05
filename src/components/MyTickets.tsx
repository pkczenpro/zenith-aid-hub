import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Paperclip,
  MessageSquare,
  FileText,
  Video,
  Download,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TicketResponse {
  id: string;
  response_text: string;
  created_at: string;
  responder: {
    full_name: string;
  };
  article?: {
    id: string;
    title: string;
  };
  video?: {
    id: string;
    title: string;
  };
  resource?: {
    id: string;
    title: string;
    file_url: string;
  };
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  product_id?: string;
  attachment_url?: string;
  product_name?: string;
  responses?: TicketResponse[];
}

const MyTickets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyTickets();
    }
  }, [user]);

  const fetchMyTickets = async () => {
    try {
      setLoading(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          products!support_tickets_product_id_fkey(name),
          ticket_responses(
            id,
            response_text,
            created_at,
            profiles!ticket_responses_responder_id_fkey(full_name),
            articles(id, title),
            product_videos(id, title),
            product_resources(id, title, file_url)
          )
        `)
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTickets = tickets?.map(ticket => ({
        ...ticket,
        status: ticket.status as 'open' | 'in_progress' | 'resolved' | 'closed',
        priority: ticket.priority as 'low' | 'medium' | 'high' | 'urgent',
        product_name: ticket.products?.name || 'General',
        responses: ticket.ticket_responses?.map((r: any) => ({
          id: r.id,
          response_text: r.response_text,
          created_at: r.created_at,
          responder: r.profiles,
          article: r.articles,
          video: r.product_videos,
          resource: r.product_resources
        }))
      })) || [];

      setTickets(formattedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load your tickets.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return AlertTriangle;
      case 'in_progress': return Clock;
      case 'resolved': return CheckCircle2;
      case 'closed': return XCircle;
      default: return AlertTriangle;
    }
  };

  const filterTicketsByStatus = (statusList: string[]) => {
    return tickets.filter(ticket => statusList.includes(ticket.status));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeTickets = filterTicketsByStatus(['open', 'in_progress']);
  const resolvedTickets = filterTicketsByStatus(['resolved', 'closed']);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gradient mb-2">My Support Tickets</h2>
        <p className="text-muted-foreground">View and track your support requests</p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            Active Tickets ({activeTickets.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved ({resolvedTickets.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {activeTickets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No active tickets</p>
              </CardContent>
            </Card>
          ) : (
            activeTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} getStatusIcon={getStatusIcon} />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="resolved" className="space-y-4">
          {resolvedTickets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No resolved tickets</p>
              </CardContent>
            </Card>
          ) : (
            resolvedTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} getStatusIcon={getStatusIcon} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface TicketCardProps {
  ticket: Ticket;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  getStatusIcon: (status: string) => any;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, getStatusColor, getPriorityColor, getStatusIcon }) => {
  const StatusIcon = getStatusIcon(ticket.status);
  
  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{ticket.subject}</CardTitle>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
              <Calendar className="h-3 w-3" />
              <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
              <span>•</span>
              <span>Product: {ticket.product_name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(ticket.status)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {ticket.status.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                {ticket.priority}
              </Badge>
              {ticket.attachment_url && (
                <Badge variant="outline">
                  <Paperclip className="h-3 w-3 mr-1" />
                  Attachment
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Description:</h4>
          <p className="text-sm text-muted-foreground">{ticket.description}</p>
        </div>

        {ticket.attachment_url && (
          <div>
            <h4 className="font-semibold mb-2">Attachment:</h4>
            <a 
              href={ticket.attachment_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Attachment
            </a>
          </div>
        )}
        
        {ticket.responses && ticket.responses.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-semibold flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              Support Responses ({ticket.responses.length})
            </h4>
            {ticket.responses.map((response) => (
              <Card key={response.id} className="bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">{response.responder?.full_name || 'Support Team'}</span>
                    <span>{new Date(response.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{response.response_text}</p>
                  
                  {(response.article || response.video || response.resource) && (
                    <div className="space-y-2 mt-3 pt-3 border-t">
                      <p className="text-xs font-semibold text-muted-foreground">Helpful Resources:</p>
                      {response.article && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          asChild
                        >
                          <Link to={`/docs/${ticket.product_id}/${response.article.id}`}>
                            <FileText className="h-4 w-4 mr-2 text-primary" />
                            <span className="flex-1 text-left">Article: {response.article.title}</span>
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </Link>
                        </Button>
                      )}
                      {response.video && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          asChild
                        >
                          <Link to={`/product/${ticket.product_id}/docs?video=${response.video.id}`}>
                            <Video className="h-4 w-4 mr-2 text-primary" />
                            <span className="flex-1 text-left">Video: {response.video.title}</span>
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </Link>
                        </Button>
                      )}
                      {response.resource && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          asChild
                        >
                          <a 
                            href={response.resource.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-4 w-4 mr-2 text-primary" />
                            <span className="flex-1 text-left">{response.resource.title}</span>
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyTickets;