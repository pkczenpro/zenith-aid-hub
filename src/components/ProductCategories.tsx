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
  Package,
  FileText,
  BookOpen,
  Edit3,
  Trash2,
  Eye,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import ProductEditModal from "./ProductEditModal";

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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

  const updateProduct = async (productId: string, updates: { name?: string; description?: string; icon_url?: string }) => {
    try {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update product",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      
      fetchProducts();
      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error", 
        description: "Failed to update product",
        variant: "destructive",
      });
      return false;
    }
  };

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
        console.log('Fetching products for client user:', user.id, user.email);
        
        // First get the user's profile
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('User profile result:', userProfile, profileError);

        if (profileError) {
          console.error('Profile error:', profileError);
          toast({
            title: "Error",
            description: "Failed to load user profile",
            variant: "destructive",
          });
          setProducts([]);
          setLoading(false);
          return;
        }

        if (!userProfile) {
          console.log('No profile found for user');
          setProducts([]);
          setLoading(false);
          return;
        }

        // For clients, we need to join through client_product_access
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', userProfile.id)
          .maybeSingle();

        console.log('Client data result:', clientData, clientError);

        if (clientError) {
          console.error('Client error:', clientError);
          toast({
            title: "Error",
            description: "Failed to load client data",
            variant: "destructive",
          });
          setProducts([]);
          setLoading(false);
          return;
        }

        if (clientData) {
          const { data: accessData, error: accessError } = await supabase
            .from('client_product_access')
            .select('product_id')
            .eq('client_id', clientData.id);

          console.log('Product access data:', accessData, accessError);

          if (accessError) {
            console.error('Access error:', accessError);
            toast({
              title: "Error",
              description: "Failed to load product access",
              variant: "destructive",
            });
            setProducts([]);
            setLoading(false);
            return;
          }

          if (accessData && accessData.length > 0) {
            const productIds = accessData.map(access => access.product_id);
            console.log('Client has access to products:', productIds);
            query = query.in('id', productIds);
          } else {
            // No access, return empty
            console.log('No product access found for client');
            setProducts([]);
            setLoading(false);
            return;
          }
        } else {
          // No client record, return empty
          console.log('No client record found for profile');
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

      console.log('Final products query result:', data, error);

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

      console.log('Products with article counts:', productsWithCount);
      setProducts(productsWithCount);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
      setProducts([]);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const ProductIcon = getProductIcon(product.category);
              const colorClass = getProductColor(product.category);
              
              return (
                <Card key={product.id} className="card-hover">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {product.icon_url ? (
                          <img 
                            src={product.icon_url} 
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                            <ProductIcon className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          {product.category && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {product.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingProduct(product)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="flex flex-col items-end gap-2">
                        <Badge 
                          variant={product.status === 'published' ? 'default' : 'secondary'}
                          className={`capitalize ${product.status === 'published' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                        >
                          {product.status}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {product.articles_count} articles
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {product.description || 'No description provided'}
                    </p>
                    
                    {isAdmin ? (
                      <>
                        <div className="flex gap-2 mb-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/product/${product.id}/editor`)}
                            className="flex-1"
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Edit Docs
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/product/${product.id}/articles`)}
                            className="flex-1"
                          >
                            <BookOpen className="mr-2 h-4 w-4" />
                            Articles
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/product/${product.id}/docs`)}
                          className="w-full"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Documentation
                        </Button>
                      </>
                    ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/product/${product.id}/docs`)}
                          className="w-full"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Documentation
                        </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onUpdate={updateProduct}
        />
      )}
    </section>
  );
};

export default ProductCategories;