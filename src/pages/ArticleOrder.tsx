import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Save,
  BookOpen
} from 'lucide-react';
// No drag and drop library needed for this implementation

interface Article {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  order_index?: number;
}

interface Product {
  id: string;
  name: string;
  icon_url?: string;
}

const ArticleOrder = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    if (productId) {
      fetchData();
    }
  }, [isAdmin, productId, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Get articles for this product ordered by current order
      const { data: articlesData, error: articlesError } = await supabase
        .from('articles')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (articlesError) throw articlesError;
      
      // Add order_index to articles based on current order
      const articlesWithOrder = (articlesData || []).map((article, index) => ({
        ...article,
        order_index: index
      }));
      
      setArticles(articlesWithOrder);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load article data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const moveArticle = (fromIndex: number, toIndex: number) => {
    const newArticles = [...articles];
    const [movedArticle] = newArticles.splice(fromIndex, 1);
    newArticles.splice(toIndex, 0, movedArticle);
    
    // Update order_index for all articles
    const articlesWithUpdatedOrder = newArticles.map((article, index) => ({
      ...article,
      order_index: index
    }));
    
    setArticles(articlesWithUpdatedOrder);
  };

  const moveUp = (index: number) => {
    if (index > 0) {
      moveArticle(index, index - 1);
    }
  };

  const moveDown = (index: number) => {
    if (index < articles.length - 1) {
      moveArticle(index, index + 1);
    }
  };

  const saveOrder = async () => {
    try {
      setSaving(true);
      
      // For now, we'll use the created_at timestamp to maintain order
      // In a more robust solution, you'd add an order_index column to the articles table
      const updates = articles.map((article, index) => {
        const baseTime = new Date('2020-01-01').getTime();
        const newTimestamp = new Date(baseTime + (index * 1000 * 60)).toISOString();
        
        return supabase
          .from('articles')
          .update({ created_at: newTimestamp })
          .eq('id', article.id);
      });

      const results = await Promise.all(updates);
      
      const hasError = results.some(result => result.error);
      if (hasError) {
        throw new Error('Failed to update article order');
      }

      toast({
        title: "Success",
        description: "Article order updated successfully.",
      });
      
      navigate(`/product/${productId}/articles`);
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: "Error",
        description: "Failed to save article order.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
            <Button variant="ghost" size="sm" onClick={() => navigate(`/product/${productId}/articles`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Articles
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
              <span className="font-semibold text-foreground">{product.name} - Article Order</span>
            </div>
          </div>
          
          <div className="ml-auto">
            <Button onClick={saveOrder} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Order'}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Manage Article Order</h1>
          <p className="text-muted-foreground">
            Arrange the articles in the order they should appear. The first article will be shown at the top.
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No articles found</h3>
            <p className="text-muted-foreground">Create some articles first to manage their order.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {articles.map((article, index) => (
              <Card key={article.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col items-center space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium text-muted-foreground bg-muted rounded px-2 py-1 min-w-[2rem] text-center">
                          {index + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveDown(index)}
                          disabled={index === articles.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{article.title}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                            {article.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Updated {new Date(article.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    </div>
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

export default ArticleOrder;