import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { soundService } from '@/utils/soundNotifications';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Search,
  Filter,
  Package,
  User,
  Calendar,
  Paperclip
} from 'lucide-react';

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
  client_name?: string;
  client_email?: string;
  product_name?: string;
}

interface Product {
  id: string;
  name: string;
}

const TicketManagement = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    fetchTickets();
    fetchProducts();

    // Subscribe to new tickets for admin notifications
    if (isAdmin) {
      const channel = supabase
        .channel('ticket-updates')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'support_tickets' },
          async (payload) => {
            // Refresh tickets
            fetchTickets();
            
            // Get client info for notification
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', payload.new.profile_id)
              .single();
            
            const clientName = profileData?.full_name || profileData?.email || 'A client';
            
            // Play notification sound
            soundService.playTicketSubmitted();
            
            // Show toast notification
            toast({
              title: "New Support Ticket",
              description: `${clientName} created a new ticket: ${payload.new.subject}`,
              duration: 7000,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          profiles!support_tickets_profile_id_fkey(full_name, email),
          products!support_tickets_product_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTickets = tickets?.map(ticket => ({
        ...ticket,
        status: ticket.status as 'open' | 'in_progress' | 'resolved' | 'closed',
        priority: ticket.priority as 'low' | 'medium' | 'high' | 'urgent',
        client_name: ticket.profiles?.full_name || 'Unknown',
        client_email: ticket.profiles?.email || 'No email',
        product_name: ticket.products?.name || 'General'
      })) || [];

      setTickets(formattedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load tickets.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('status', 'published')
        .order('name');

      if (error) throw error;
      setProducts(products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const updateTicketStatus = async () => {
    if (!selectedTicket || !newStatus) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === selectedTicket.id 
          ? { ...ticket, status: newStatus as any }
          : ticket
      ));

      // Play sound notification
      soundService.playTicketStatusUpdate();

      toast({
        title: "Status Updated",
        description: `Ticket status changed to ${newStatus.replace('_', ' ')}.`,
      });

      setStatusUpdateDialog(false);
      setSelectedTicket(null);
      setNewStatus('');
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket status.",
        variant: "destructive",
      });
    }
  };

  const openStatusUpdate = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setStatusUpdateDialog(true);
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesProduct = productFilter === 'all' || ticket.product_id === productFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesProduct && matchesPriority;
  });

  // Group tickets by product
  const ticketsByProduct = filteredTickets.reduce((acc, ticket) => {
    const productName = ticket.product_name || 'General';
    if (!acc[productName]) {
      acc[productName] = [];
    }
    acc[productName].push(ticket);
    return acc;
  }, {} as Record<string, Ticket[]>);

  // Status statistics
  const statusStats = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{statusStats.open}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{statusStats.in_progress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{statusStats.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-2xl font-bold">{statusStats.closed}</p>
                <p className="text-xs text-muted-foreground">Closed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets by Product */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">All Tickets</TabsTrigger>
          <TabsTrigger value="by-product">By Product</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          {filteredTickets.map((ticket) => {
            const StatusIcon = getStatusIcon(ticket.status);
            return (
              <Card key={ticket.id} className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-foreground">{ticket.subject}</h4>
                        {ticket.attachment_url && (
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{ticket.client_name}</span>
                        <span>•</span>
                        <Package className="h-3 w-3" />
                        <span>{ticket.product_name}</span>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ticket.description}
                      </p>
                      
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(ticket.status)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </div>
                    </div>
                    
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openStatusUpdate(ticket)}
                        className="ml-4"
                      >
                        Update Status
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
        
        <TabsContent value="by-product" className="space-y-6">
          {Object.entries(ticketsByProduct).map(([productName, productTickets]) => (
            <Card key={productName}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>{productName}</span>
                  <Badge variant="secondary">{productTickets.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {productTickets.map((ticket) => {
                  const StatusIcon = getStatusIcon(ticket.status);
                  return (
                    <div key={ticket.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h5 className="font-medium">{ticket.subject}</h5>
                            {ticket.attachment_url && (
                              <Paperclip className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {ticket.client_name} • {new Date(ticket.created_at).toLocaleDateString()}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(ticket.status)}>
                              <StatusIcon className="h-2 w-2 mr-1" />
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </div>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openStatusUpdate(ticket)}
                          >
                            Update
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Status Update Dialog */}
      <Dialog open={statusUpdateDialog} onOpenChange={setStatusUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Ticket Status</DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium">{selectedTicket.subject}</h4>
                <p className="text-sm text-muted-foreground">
                  Client: {selectedTicket.client_name}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">New Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusUpdateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateTicketStatus} disabled={!newStatus}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketManagement;