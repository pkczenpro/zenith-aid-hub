import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, TrendingUp, ThumbsUp, ThumbsDown, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ChatSession {
  id: string;
  session_id: string;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  resolved_by_ai: boolean;
  profiles: {
    full_name: string;
    email: string;
  } | null;
  products: {
    name: string;
  } | null;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface Feedback {
  feedback_type: string;
  comment: string | null;
}

interface Analytics {
  totalSessions: number;
  resolvedByAI: number;
  positiveFeedback: number;
  negativeFeedback: number;
  averageMessages: number;
}

const ChatAnalytics = () => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [analytics, setAnalytics] = useState<Analytics>({
    totalSessions: 0,
    resolvedByAI: 0,
    positiveFeedback: 0,
    negativeFeedback: 0,
    averageMessages: 0
  });
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);
  const [sessionFeedback, setSessionFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchSessions();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [filterStatus, filterProduct]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('status', 'published')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      let query = supabase
        .from('chat_sessions')
        .select(`
          id,
          session_id,
          started_at,
          ended_at,
          message_count,
          resolved_by_ai,
          product_id,
          profiles(full_name, email),
          products(name)
        `);

      // Apply status filter
      if (filterStatus === 'resolved') {
        query = query.eq('resolved_by_ai', true);
      } else if (filterStatus === 'ended') {
        query = query.not('ended_at', 'is', null).eq('resolved_by_ai', false);
      } else if (filterStatus === 'active') {
        query = query.is('ended_at', null);
      }

      // Apply product filter
      if (filterProduct !== 'all') {
        query = query.eq('product_id', filterProduct);
      }

      const { data, error } = await query
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat sessions",
        variant: "destructive"
      });
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data: sessionsData } = await supabase
        .from('chat_sessions')
        .select('id, message_count, resolved_by_ai');

      const { data: feedbackData } = await supabase
        .from('chat_feedback')
        .select('feedback_type');

      const totalSessions = sessionsData?.length || 0;
      const resolvedByAI = sessionsData?.filter(s => s.resolved_by_ai).length || 0;
      const positiveFeedback = feedbackData?.filter(f => f.feedback_type === 'positive').length || 0;
      const negativeFeedback = feedbackData?.filter(f => f.feedback_type === 'negative').length || 0;
      const averageMessages = sessionsData?.length 
        ? Math.round(sessionsData.reduce((sum, s) => sum + s.message_count, 0) / sessionsData.length)
        : 0;

      setAnalytics({
        totalSessions,
        resolvedByAI,
        positiveFeedback,
        negativeFeedback,
        averageMessages
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const viewSessionDetails = async (sessionId: string) => {
    try {
      setSelectedSession(sessionId);

      const { data: messages, error: msgError } = await supabase
        .from('chat_session_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      const { data: feedback, error: fbError } = await supabase
        .from('chat_feedback')
        .select('feedback_type, comment')
        .eq('session_id', sessionId)
        .single();

      if (msgError) throw msgError;
      setSessionMessages(messages || []);
      setSessionFeedback(feedback || null);
    } catch (error) {
      console.error('Error fetching session details:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Chat Analytics Dashboard</h1>
          <p className="text-muted-foreground">Monitor AI chat performance and user interactions</p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">{analytics.totalSessions}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resolved by AI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <span className="text-3xl font-bold">{analytics.resolvedByAI}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.totalSessions > 0 
                  ? `${Math.round((analytics.resolvedByAI / analytics.totalSessions) * 100)}% resolution rate`
                  : '0% resolution rate'
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Positive Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-success" />
                <span className="text-3xl font-bold">{analytics.positiveFeedback}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Negative Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ThumbsDown className="h-5 w-5 text-destructive" />
                <span className="text-3xl font-bold">{analytics.negativeFeedback}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-accent" />
                <span className="text-3xl font-bold">{analytics.averageMessages}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Chat Sessions</CardTitle>
            <CardDescription>View and analyze all chat interactions</CardDescription>
            
            {/* Filters */}
            <div className="flex gap-4 mt-4">
              <div className="flex-1">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="ended">Ended (Not Resolved)</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Select value={filterProduct} onValueChange={setFilterProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {session.profiles?.full_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {session.profiles?.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {session.products?.name || 'No product'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(session.started_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{session.message_count}</Badge>
                    </TableCell>
                    <TableCell>
                      {session.resolved_by_ai ? (
                        <Badge className="bg-success text-white">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Resolved
                        </Badge>
                      ) : session.ended_at ? (
                        <Badge variant="secondary">Ended</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewSessionDetails(session.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Chat Session Details</DialogTitle>
                            <DialogDescription>
                              Session with {session.profiles?.full_name || 'Unknown User'}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <ScrollArea className="h-[500px] pr-4">
                            <div className="space-y-4">
                              {sessionMessages.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  No messages found for this session
                                </div>
                              ) : (
                                sessionMessages.map((msg) => (
                                  <div
                                    key={msg.id}
                                    className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                  >
                                    <div className="flex items-center gap-2 px-1">
                                      {msg.role === 'user' ? (
                                        <>
                                          <span className="text-xs font-semibold text-muted-foreground">User</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-xs font-semibold text-muted-foreground">AI Assistant</span>
                                        </>
                                      )}
                                    </div>
                                    <div
                                      className={`max-w-[85%] rounded-lg p-4 ${
                                        msg.role === 'user'
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted text-foreground border border-border'
                                      }`}
                                    >
                                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                      <p className="text-xs opacity-70 mt-2">
                                        {format(new Date(msg.created_at), 'MMM d, yyyy HH:mm:ss')}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </ScrollArea>

                          {sessionFeedback && (
                            <div className="border-t pt-4 mt-4">
                              <h4 className="font-semibold mb-2">User Feedback</h4>
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={
                                    sessionFeedback.feedback_type === 'positive'
                                      ? 'bg-success text-white'
                                      : 'bg-destructive text-white'
                                  }
                                >
                                  {sessionFeedback.feedback_type === 'positive' ? (
                                    <ThumbsUp className="h-3 w-3 mr-1" />
                                  ) : (
                                    <ThumbsDown className="h-3 w-3 mr-1" />
                                  )}
                                  {sessionFeedback.feedback_type}
                                </Badge>
                              </div>
                              {sessionFeedback.comment && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {sessionFeedback.comment}
                                </p>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ChatAnalytics;