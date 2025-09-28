import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  BookOpen, 
  Clock, 
  User, 
  Building2, 
  FileText, 
  ExternalLink,
  Shield,
  Package,
  ArrowLeft,
  Edit3
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  icon_url: string | null;
  created_at: string;
  updated_at: string;
  articles: Article[];
}

interface Article {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const ProductDashboard = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, profile } = useAuth();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (productId) {
      fetchProductData();
    }
  }, [productId, user]);

  const fetchProductData = async () => {
    try {
      setLoading(true);

      // First check if user has access to this product (for non-admins)
      if (!isAdmin && user && profile) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (clientData) {
          const { data: accessData } = await supabase
            .from('client_product_access')
            .select('product_id')
            .eq('client_id', clientData.id)
            .eq('product_id', productId);

          if (!accessData || accessData.length === 0) {
            toast({
              title: "Access Denied",
              description: "You don't have access to this product.",
              variant: "destructive",
            });
            navigate('/');
            return;
          }
        }
      }

      // Fetch product with articles
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          articles:articles(id, title, status, created_at, updated_at)
        `)
        .eq('id', productId)
        .single();

      if (productError) {
        console.error('Error fetching product:', productError);
        toast({
          title: "Error",
          description: "Failed to load product information",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // For non-admins, only show published articles
      if (!isAdmin && productData.articles) {
        productData.articles = productData.articles.filter((article: Article) => article.status === 'published');
      }

      setProduct(productData);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: "Error",
        description: "Failed to load product data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = product?.articles?.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading product documentation...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold mb-2">Product Not Found</h2>
          <p className="text-muted-foreground mb-6">The requested product could not be found or you don't have access to it.</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back Home
          </Button>
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
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div className="flex items-center space-x-2">
              {product.icon_url ? (
                <img 
                  src={product.icon_url} 
                  alt={product.name}
                  className="h-8 w-8 rounded-md object-cover"
                />
              ) : (
                <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-md flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <span className="font-semibold text-foreground">{product.name} Documentation</span>
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="relative w-full max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search articles..."
                className="pl-10 pr-4 w-full bg-background border-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate(`/product/${productId}`)}
                className="flex items-center space-x-2"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit Product</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="py-8 px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Product Overview */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-background via-muted/10 to-background border border-border/50 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {product.name}
                  </h1>
                  <p className="text-muted-foreground mb-4">
                    {product.description || "No description available"}
                  </p>
                  <div className="flex items-center space-x-6 text-sm">
                    {product.category && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {product.category}
                      </Badge>
                    )}
                    <Badge 
                      variant={product.status === 'published' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {product.status}
                    </Badge>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{filteredArticles.length} articles available</span>
                    </div>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Last updated: {new Date(product.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Articles */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Documentation Articles</h2>
                <p className="text-muted-foreground">Browse through the available documentation</p>
              </div>
            </div>

            {filteredArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((article) => (
                  <Card key={article.id} className="shadow-card border-0 bg-gradient-card hover:shadow-lg transition-all duration-300 group cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {article.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Updated {new Date(article.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge 
                          variant={article.status === 'published' ? 'default' : 'secondary'}
                          className="capitalize text-xs"
                        >
                          {article.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Button 
                          asChild 
                          className="flex-1 bg-gradient-button text-white border-0 group-hover:shadow-md transition-all duration-200"
                        >
                          <Link to={`/docs/${productId}/${article.id}`}>
                            <BookOpen className="h-4 w-4 mr-2" />
                            Read Article
                          </Link>
                        </Button>
                        <Button variant="outline" size="icon" asChild>
                          <Link to={`/docs/${productId}/${article.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                {searchQuery ? (
                  <>
                    <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No articles found</h3>
                    <p className="text-muted-foreground">
                      No articles match your search criteria. Try adjusting your search terms.
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Articles Available</h3>
                    <p className="text-muted-foreground mb-6">
                      {isAdmin 
                        ? "This product doesn't have any articles yet. Start by creating your first article."
                        : "No published articles are available for this product yet."
                      }
                    </p>
                    {isAdmin && (
                      <Button 
                        onClick={() => navigate(`/product/${productId}`)}
                        className="inline-flex items-center"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Create Article
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDashboard;