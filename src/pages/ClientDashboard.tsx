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

      console.log('Fetching data for user:', user.id, user.email);

      // First get the user's profile to find their client record
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, full_name, email')
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

      console.log('User profile found:', userProfile);

      // Check if user is admin first
      if (userProfile.role === 'admin') {
        navigate('/');
        return;
      }

      // Get client data using the profile_id
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('profile_id', userProfile.id)
        .single();

      console.log('Client lookup result:', { clientData, clientError });

      if (clientError || !clientData) {
        console.error('Client error:', clientError);
        toast({
          title: "Access Denied", 
          description: "You don't have access to any client dashboard.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      console.log('Client found:', clientData);

      setClient({
        id: clientData.id,
        name: userProfile.full_name || clientData.name || userProfile.email,
        company: clientData.company,
        industry: clientData.industry,
        profile_id: userProfile.id
      });

      // Get client's accessible products
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

      console.log('Product access data:', accessData);

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
          console.log('Processing product for articles:', item.products);
          
          const { count, error: countError } = await supabase
            .from('articles')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', item.products.id)
            .eq('status', 'published');

          if (countError) {
            console.error('Count error for product', item.products.name, ':', countError);
          }

          console.log(`Product "${item.products.name}" has ${count || 0} published articles`);

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

      console.log('Final products with counts:', productsWithCounts);
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

  // Auto-redirect for single product access to "Thomas Assess Accredited"
  useEffect(() => {
    if (accessibleProducts.length === 1 && accessibleProducts[0].name === "Thomas Assess Accredited") {
      navigate(`/product/${accessibleProducts[0].id}/docs`);
    }
  }, [accessibleProducts, navigate]);

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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredAccessibleProducts.map((product) => {
                      const getProductIcon = (category: string | null) => {
                        const categoryIconMap: { [key: string]: typeof BookOpen } = {
                          'mobile': BookOpen,
                          'web': BookOpen,
                          'cloud': BookOpen,
                          'security': Shield,
                          'analytics': BookOpen,
                          'api': BookOpen,
                          'zenithr': BookOpen,
                          'default': BookOpen
                        };
                        return categoryIconMap[category?.toLowerCase() || 'default'] || BookOpen;
                      };

                      const getProductColor = (category: string | null) => {
                        const categoryColorMap: { [key: string]: string } = {
                          'mobile': 'from-blue-500 to-blue-600',
                          'web': 'from-purple-500 to-purple-600',
                          'cloud': 'from-cyan-500 to-cyan-600',
                          'security': 'from-emerald-500 to-emerald-600',
                          'analytics': 'from-orange-500 to-orange-600',
                          'api': 'from-violet-500 to-violet-600',
                          'zenithr': 'from-indigo-500 to-indigo-600',
                          'default': 'from-slate-500 to-slate-600'
                        };
                        return categoryColorMap[category?.toLowerCase() || 'default'] || 'from-slate-500 to-slate-600';
                      };

                      const ProductIcon = getProductIcon(product.category);
                      const colorClass = getProductColor(product.category);

                      return (
                        <Card 
                          key={product.id} 
                          className="group cursor-pointer card-hover border-0 shadow-card bg-gradient-card transition-all duration-300"
                        >
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between">
                              <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass} shadow-lg`}>
                                {product.icon_url ? (
                                  <img 
                                    src={product.icon_url} 
                                    alt={product.name}
                                    className="h-6 w-6 object-contain text-white"
                                  />
                                ) : (
                                  <ProductIcon className="h-6 w-6 text-white" />
                                )}
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                  {product.articles} articles
                                </Badge>
                                <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Access
                                </Badge>
                              </div>
                            </div>
                            <CardTitle className="text-xl group-hover:text-primary transition-colors">
                              {product.name}
                            </CardTitle>
                          </CardHeader>
                          
                          <CardContent className="space-y-4">
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              {product.description || "No description available"}
                            </p>
                            
                            <div className="flex items-center justify-between pt-4 border-t">
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>Updated {product.lastUpdated}</span>
                              </div>
                              
                              <Button 
                                asChild
                                variant="ghost" 
                                size="sm" 
                                className="group/btn"
                                disabled={product.articles === 0}
                              >
                                <Link to={`/product/${product.id}/docs`}>
                                  View Docs
                                  <ExternalLink className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                              </Button>
                            </div>

                            {product.articles === 0 && (
                              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground text-center">
                                  No documentation available yet
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
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