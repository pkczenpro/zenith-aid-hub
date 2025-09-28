import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ClientChat from '@/components/ClientChat';
import { 
  Search, 
  BookOpen, 
  Clock, 
  User, 
  Building2, 
  FileText, 
  ExternalLink,
  Shield,
  LogOut,
  MessageCircle
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  company?: string;
  industry?: string;
  profile_id: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon_url?: string;
  status: string;
  articles: number;
  lastUpdated: string;
}

const ClientDashboard = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [accessibleProducts, setAccessibleProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'docs' | 'support'>('docs');

  useEffect(() => {
    if (user) {
      // Check user role and redirect accordingly
      checkUserRoleAndRedirect();
    }
  }, [user]);

  const checkUserRoleAndRedirect = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, id')
        .eq('user_id', user.id)
        .single();

      if (profileData?.role === 'client') {
        // Check if client record exists
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profileData.id)
          .maybeSingle();

        if (clientData) {
          // Redirect to client dashboard
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [user]);

  const fetchClientData = async () => {
    try {
      setLoading(true);

      if (!user) {
        navigate('/auth');
        return;
      }

      console.log('Current user:', user.id);

      // First get the user's profile to find their client record
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('Profile error:', profileError);
        toast({
          title: "Profile Error",
          description: "Could not find user profile.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      console.log('User profile:', userProfile);

      // Get client data using the profile_id
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*, profiles!inner(full_name, email)')
        .eq('profile_id', userProfile.id)
        .maybeSingle();

      console.log('Client data:', clientData);

      if (clientError) {
        console.error('Client error:', clientError);
      }

      if (!clientData) {
        // Check if user is admin and redirect to main dashboard
        const { data: profileRoleData } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (profileRoleData?.role === 'admin') {
          navigate('/');
          return;
        }

        toast({
          title: "Access Denied", 
          description: "You don't have access to any client dashboard.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      setClient({
        id: clientData.id,
        name: clientData.profiles.full_name || clientData.name,
        company: clientData.company,
        industry: clientData.industry,
        profile_id: userProfile.id
      });

      console.log('Looking for products for client_id:', clientData.id);

      // Get client's accessible products with article counts
      const { data: accessData, error: accessError } = await supabase
        .from('client_product_access')
        .select(`
          products!inner(
            id,
            name,
            description,
            category,
            icon_url,
            status,
            created_at,
            updated_at
          )
        `)
        .eq('client_id', clientData.id);

      console.log('Access data:', accessData);

      if (accessError) {
        console.error('Access error:', accessError);
        throw accessError;
      }

      if (!accessData || accessData.length === 0) {
        console.log('No product access found for this client');
        setAccessibleProducts([]);
        return;
      }

      // Get article counts for each product (only published articles)
      const productsWithCounts = await Promise.all(
        accessData.map(async (item) => {
          console.log('Processing product:', item.products);
          
          const { count, error: countError } = await supabase
            .from('articles')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', item.products.id)
            .eq('status', 'published');

          if (countError) console.error('Count error:', countError);

          console.log(`Product ${item.products.name} has ${count} published articles`);

          return {
            id: item.products.id,
            name: item.products.name,
            description: item.products.description,
            category: item.products.category,
            icon_url: item.products.icon_url,
            status: item.products.status,
            articles: count || 0,
            lastUpdated: new Date(item.products.updated_at).toLocaleDateString()
          };
        })
      );

      console.log('Products with counts:', productsWithCounts);
      setAccessibleProducts(productsWithCounts);
    } catch (error) {
      console.error('Error fetching client data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const filteredAccessibleProducts = accessibleProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have access to this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container flex h-16 items-center px-6">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-md flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Documentation Portal</span>
            </Link>
          </div>
          
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="relative w-full max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search documentation..."
                className="pl-10 pr-4 w-full bg-background border-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{client.name}</span>
            </div>
            {client.company && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{client.company}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="py-8 px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Navigation Tabs */}
          <div className="flex items-center space-x-4 mb-8">
            <Button
              variant={activeTab === 'docs' ? 'default' : 'outline'}
              onClick={() => setActiveTab('docs')}
              className="flex items-center space-x-2"
            >
              <BookOpen className="h-4 w-4" />
              <span>Documentation</span>
            </Button>
            <Button
              variant={activeTab === 'support' ? 'default' : 'outline'}
              onClick={() => setActiveTab('support')}
              className="flex items-center space-x-2"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Support</span>
            </Button>
          </div>

          {activeTab === 'docs' && (
            <>
              {/* Welcome Section */}
              <div className="mb-8">
                <div className="bg-gradient-to-r from-background via-muted/10 to-background border border-border/50 rounded-lg p-6">
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    Welcome back, {client.name.split(' ')[0]}! 👋
                  </h1>
                  <p className="text-muted-foreground mb-4">
                    Access your assigned documentation and resources{client.company ? ` for ${client.company}` : ''}
                  </p>
                  <div className="flex items-center space-x-6 text-sm">
                    {client.industry && (
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {client.industry}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span>Access to {accessibleProducts.length} products</span>
                    </div>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Last login: Today</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accessible Products */}
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Your Documentation</h2>
                    <p className="text-muted-foreground">Products and resources you have access to</p>
                  </div>
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    {accessibleProducts.length} Products Available
                  </Badge>
                </div>

                {accessibleProducts.length === 0 ? (
                  <div className="text-center py-16">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No products assigned</h3>
                    <p className="text-muted-foreground">
                      Contact your administrator to get access to documentation.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAccessibleProducts.map((product) => (
                      <Card key={product.id} className="shadow-card border-0 bg-gradient-card hover:shadow-lg transition-all duration-300 group">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-accent text-white">
                                {product.icon_url ? (
                                  <img src={product.icon_url} alt="" className="h-6 w-6" />
                                ) : (
                                  <BookOpen className="h-6 w-6" />
                                )}
                              </div>
                              <div>
                                <CardTitle className="text-lg">{product.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">{product.description}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                              <Shield className="h-3 w-3 mr-1" />
                              Access
                            </Badge>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2 text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              <span>{product.articles} articles</span>
                            </div>
                            <div className="flex items-center space-x-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>Updated {product.lastUpdated}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button 
                              asChild 
                              className="flex-1 bg-gradient-button text-white border-0 group-hover:shadow-md transition-all duration-200"
                              disabled={product.articles === 0}
                            >
                              <Link to={`/product/${product.id}/docs`}>
                                <BookOpen className="h-4 w-4 mr-2" />
                                View Documentation
                              </Link>
                            </Button>
                            <Button variant="outline" size="icon" asChild disabled={product.articles === 0}>
                              <Link to={`/product/${product.id}/docs`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {filteredAccessibleProducts.length === 0 && searchQuery && (
                  <div className="text-center py-12">
                    <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search terms or browse all available documentation.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'support' && (
            <ClientChat />
          )}
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;