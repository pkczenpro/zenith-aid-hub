import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  Monitor, 
  Cloud, 
  Shield, 
  BarChart3, 
  Zap,
  ArrowRight,
  PlayCircle,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  icon_url: string | null;
  created_at: string;
  updated_at: string;
  articles_count: number;
}

const ProductCategories = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const getProductIcon = (category: string | null) => {
    const categoryIconMap: { [key: string]: typeof Smartphone } = {
      'mobile': Smartphone,
      'web': Monitor,
      'cloud': Cloud,
      'security': Shield,
      'analytics': BarChart3,
      'api': Zap,
      'default': Package
    };
    return categoryIconMap[category?.toLowerCase() || 'default'] || Package;
  };

  const getProductColor = (category: string | null) => {
    const categoryColorMap: { [key: string]: string } = {
      'mobile': 'from-blue-500 to-blue-600',
      'web': 'from-purple-500 to-purple-600',
      'cloud': 'from-cyan-500 to-cyan-600',
      'security': 'from-emerald-500 to-emerald-600',
      'analytics': 'from-orange-500 to-orange-600',
      'api': 'from-violet-500 to-violet-600',
      'default': 'from-gray-500 to-gray-600'
    };
    return categoryColorMap[category?.toLowerCase() || 'default'] || 'from-gray-500 to-gray-600';
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('products')
        .select(`
          *,
          articles:articles(count)
        `);

      // If not admin, only show products the client has access to
      if (!isAdmin && user) {
        // For clients, we need to join through client_product_access
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', user.id)
          .single();

        if (clientData) {
          const { data: accessData } = await supabase
            .from('client_product_access')
            .select('product_id')
            .eq('client_id', clientData.id);

          if (accessData && accessData.length > 0) {
            const productIds = accessData.map(access => access.product_id);
            query = query.in('id', productIds);
          } else {
            // No access, return empty
            setProducts([]);
            setLoading(false);
            return;
          }
        } else {
          // No client record, return empty
          setProducts([]);
          setLoading(false);
          return;
        }
      } else if (!user) {
        // No user, no products
        setProducts([]);
        setLoading(false);
        return;
      }

      // Only show published products for clients
      if (!isAdmin) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching products:', error);
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        });
        return;
      }

      const productsWithCount = (data || []).map(item => ({
        ...item,
        articles_count: item.articles?.[0]?.count || 0
      }));

      setProducts(productsWithCount);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold text-gradient">
              Explore by Product
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose your product to find specific guides, tutorials, and documentation
            </p>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl font-bold text-gradient">
            Explore by Product
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose your product to find specific guides, tutorials, and documentation
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">No Products Available</h3>
            <p className="text-muted-foreground mb-6">
              {isAdmin 
                ? "Create your first product to get started with documentation."
                : "No products have been assigned to you yet. Contact your administrator for access."
              }
            </p>
            {isAdmin && (
              <Button 
                onClick={() => navigate('/products')}
                className="inline-flex items-center"
              >
                <Package className="h-4 w-4 mr-2" />
                Manage Products
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => {
              const ProductIcon = getProductIcon(product.category);
              const colorClass = getProductColor(product.category);
              
              return (
                <Card 
                  key={product.id} 
                  className="group cursor-pointer card-hover border-0 shadow-card bg-gradient-card"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass} shadow-lg`}>
                        {product.icon_url ? (
                          <img 
                            src={product.icon_url} 
                            alt={product.name}
                            className="h-6 w-6 object-contain"
                          />
                        ) : (
                          <ProductIcon className="h-6 w-6 text-white" />
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {product.articles_count} articles
                      </Badge>
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
                        <PlayCircle className="h-4 w-4" />
                        <span>{product.status}</span>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="group/btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/product/${product.id}`);
                        }}
                      >
                        {isAdmin ? 'Manage' : 'View Docs'}
                        <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductCategories;