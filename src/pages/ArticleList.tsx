import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  BookOpen, 
  ArrowLeft,
  FileText,
  Plus,
  Edit3,
  Eye,
  Calendar,
  ChevronRight
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  content: any;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon_url?: string;
}

const ArticleList = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && productId) {
      fetchProductAndArticles();
    }
  }, [user, productId]);

  const fetchProductAndArticles = async () => {
    try {
      setLoading(true);

      // Get product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !productData) {
        console.error('Product error:', productError);
        toast({
          title: "Product Not Found",
          description: "The requested product could not be found.",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      setProduct(productData);

      // Get articles for this product
      const { data: articlesData, error: articlesError } = await supabase
        .from('articles')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (articlesError) {
        console.error('Articles error:', articlesError);
        toast({
          title: "Error",
          description: "Failed to load articles.",
          variant: "destructive",
        });
      } else {
        setArticles(articlesData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load product data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateArticle = () => {
    navigate(`/product/${productId}/editor`);
  };

  const handleEditArticle = (articleId: string) => {
    navigate(`/product/${productId}/editor?articleId=${articleId}`);
  };

  const handleViewArticle = (articleId: string, index: number) => {
    navigate(`/product/${productId}/article/article-${index + 1}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h2>
          <p className="text-muted-foreground">The requested product could not be found.</p>
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="h-6 w-px bg-border"></div>
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-md flex items-center justify-center">
                {product.icon_url ? (
                  <img src={product.icon_url} alt="" className="h-4 w-4" />
                ) : (
                  <BookOpen className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              <span className="font-semibold text-foreground">{product.name} Articles</span>
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
          
          {isAdmin && (
            <Button onClick={handleCreateArticle} className="ml-4">
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          )}
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? 'No articles found' : 'No articles yet'}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {searchQuery 
                ? 'Try adjusting your search terms.' 
                : 'Create your first article to get started with documentation.'
              }
            </p>
            {isAdmin && !searchQuery && (
              <Button onClick={handleCreateArticle}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Article
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article, index) => (
              <Card key={article.id} className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                          {article.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Updated {new Date(article.updated_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewArticle(article.id, index)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    {isAdmin && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleEditArticle(article.id)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleList;