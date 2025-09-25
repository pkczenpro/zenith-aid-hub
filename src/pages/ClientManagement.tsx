import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Plus, 
  Building2, 
  Shield, 
  Eye, 
  Edit3, 
  Trash2, 
  ArrowLeft,
  UserPlus,
  Settings,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import Header from '@/components/Header';

interface Client {
  id: string;
  name: string;
  email: string;
  industry: string;
  company: string;
  assignedProducts: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  lastAccess: string;
}

interface Product {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const ClientManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('clients');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock data for products
  const products: Product[] = [
    { id: 'mobile', name: 'Mobile App', icon: '📱', color: 'from-blue-500 to-blue-600', description: 'iOS and Android app documentation' },
    { id: 'web', name: 'Web Platform', icon: '💻', color: 'from-purple-500 to-purple-600', description: 'Web application user guides' },
    { id: 'cloud', name: 'Cloud Services', icon: '☁️', color: 'from-cyan-500 to-cyan-600', description: 'Cloud infrastructure docs' },
    { id: 'security', name: 'Security Suite', icon: '🛡️', color: 'from-emerald-500 to-emerald-600', description: 'Security protocols and compliance' },
    { id: 'analytics', name: 'Analytics', icon: '📊', color: 'from-orange-500 to-orange-600', description: 'Data analytics and reporting' },
    { id: 'api', name: 'API & Integrations', icon: '⚡', color: 'from-violet-500 to-violet-600', description: 'API documentation and integrations' }
  ];

  // Mock data for clients
  const [clients, setClients] = useState<Client[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john@techcorp.com',
      industry: 'Technology',
      company: 'TechCorp Inc.',
      assignedProducts: ['mobile', 'web', 'api'],
      status: 'active',
      createdAt: '2024-01-15',
      lastAccess: '2024-01-20'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@healthplus.com',
      industry: 'Healthcare',
      company: 'HealthPlus Solutions',
      assignedProducts: ['security', 'cloud'],
      status: 'active',
      createdAt: '2024-01-18',
      lastAccess: '2024-01-19'
    },
    {
      id: '3',
      name: 'Mike Chen',
      email: 'mike@datalytics.com',
      industry: 'Finance',
      company: 'DataLytics Corp',
      assignedProducts: ['analytics', 'api'],
      status: 'inactive',
      createdAt: '2024-01-10',
      lastAccess: '2024-01-12'
    }
  ]);

  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    industry: '',
    company: '',
    assignedProducts: [] as string[]
  });

  const handleCreateClient = () => {
    const client: Client = {
      id: Date.now().toString(),
      ...newClient,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      lastAccess: 'Never'
    };

    setClients([...clients, client]);
    setNewClient({ name: '', email: '', industry: '', company: '', assignedProducts: [] });
    setIsCreateDialogOpen(false);
    
    toast({
      title: "Client created successfully!",
      description: `${client.name} has been added with access to ${client.assignedProducts.length} products.`,
    });
  };

  const handleAssignProducts = () => {
    if (selectedClient) {
      setClients(clients.map(client => 
        client.id === selectedClient.id 
          ? { ...client, assignedProducts: selectedClient.assignedProducts }
          : client
      ));
      setIsAssignDialogOpen(false);
      setSelectedClient(null);
      
      toast({
        title: "Product access updated!",
        description: "Client permissions have been successfully updated.",
      });
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getProductById = (id: string) => products.find(p => p.id === id);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Navigation */}
          <div className="flex items-center space-x-4 mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="hover:bg-muted/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="h-6 w-px bg-border"></div>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent text-white">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Client Management</h1>
                <p className="text-muted-foreground">Manage clients and their documentation access</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="clients" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Clients</span>
              </TabsTrigger>
              <TabsTrigger value="access" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Access Control</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Analytics</span>
              </TabsTrigger>
            </TabsList>

            {/* Clients Tab */}
            <TabsContent value="clients">
              <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search clients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-gradient-button text-white border-0"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Client
                  </Button>
                </div>

                {/* Clients Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredClients.map((client) => (
                    <Card key={client.id} className="shadow-card border-0 bg-gradient-card hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-semibold">
                              {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{client.name}</h3>
                              <p className="text-sm text-muted-foreground">{client.company}</p>
                            </div>
                          </div>
                          <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                            {client.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center text-sm">
                            <span className="text-muted-foreground w-16">Email:</span>
                            <span className="text-foreground">{client.email}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <span className="text-muted-foreground w-16">Industry:</span>
                            <span className="text-foreground">{client.industry}</span>
                          </div>
                        </div>

                        {/* Assigned Products */}
                        <div>
                          <div className="text-sm font-medium text-foreground mb-2">
                            Access to {client.assignedProducts.length} products:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {client.assignedProducts.slice(0, 3).map((productId) => {
                              const product = getProductById(productId);
                              return product ? (
                                <Badge key={productId} variant="outline" className="text-xs">
                                  {product.icon} {product.name}
                                </Badge>
                              ) : null;
                            })}
                            {client.assignedProducts.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{client.assignedProducts.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                          <div className="text-xs text-muted-foreground">
                            Last access: {client.lastAccess}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedClient(client);
                                setIsAssignDialogOpen(true);
                              }}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/client/${client.id}/docs`)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredClients.length === 0 && (
                  <div className="text-center py-16">
                    <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No clients found</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchQuery || filterStatus !== 'all' 
                        ? 'Try adjusting your search or filter criteria.'
                        : 'Get started by adding your first client.'
                      }
                    </p>
                    {!searchQuery && filterStatus === 'all' && (
                      <Button 
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="bg-gradient-button text-white border-0"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add First Client
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Access Control Tab */}
            <TabsContent value="access">
              <div className="space-y-6">
                <div className="text-center py-16">
                  <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Access Control Matrix</h3>
                  <p className="text-muted-foreground">
                    Advanced access control features will be available after connecting to Supabase.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <div className="space-y-6">
                <div className="text-center py-16">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Client Analytics</h3>
                  <p className="text-muted-foreground">
                    View client engagement and documentation usage analytics.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Create Client Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <span>Add New Client</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={newClient.company}
                  onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                  placeholder="Company Inc."
                />
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select value={newClient.industry} onValueChange={(value) => setNewClient({ ...newClient, industry: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Product Access</Label>
              <p className="text-sm text-muted-foreground mb-3">Select which products this client can access</p>
              <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={product.id}
                      checked={newClient.assignedProducts.includes(product.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewClient({
                            ...newClient,
                            assignedProducts: [...newClient.assignedProducts, product.id]
                          });
                        } else {
                          setNewClient({
                            ...newClient,
                            assignedProducts: newClient.assignedProducts.filter(id => id !== product.id)
                          });
                        }
                      }}
                    />
                    <div className="flex items-center space-x-2 flex-1">
                      <div className={`p-1 rounded bg-gradient-to-br ${product.color} text-white text-sm`}>
                        {product.icon}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateClient}
              disabled={!newClient.name || !newClient.email || !newClient.company}
              className="bg-gradient-button text-white border-0"
            >
              Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Products Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-primary" />
              <span>Manage Product Access</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {selectedClient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="font-medium">{selectedClient.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedClient.company}</div>
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Product Access</Label>
                <p className="text-sm text-muted-foreground mb-3">Manage which products this client can access</p>
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`assign-${product.id}`}
                        checked={selectedClient.assignedProducts.includes(product.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedClient({
                              ...selectedClient,
                              assignedProducts: [...selectedClient.assignedProducts, product.id]
                            });
                          } else {
                            setSelectedClient({
                              ...selectedClient,
                              assignedProducts: selectedClient.assignedProducts.filter(id => id !== product.id)
                            });
                          }
                        }}
                      />
                      <div className="flex items-center space-x-2 flex-1">
                        <div className={`p-1 rounded bg-gradient-to-br ${product.color} text-white text-sm`}>
                          {product.icon}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{product.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignProducts}
              className="bg-gradient-button text-white border-0"
            >
              Update Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientManagement;