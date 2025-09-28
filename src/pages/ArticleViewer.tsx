import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Search, ChevronRight, BookOpen, Home, FileText, Settings, Edit3, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Article {
  id: string;
  title: string;
  product_id: string;
  content: any[];
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
}

const ArticleViewer = () => {
  const { productId, articleId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, profile } = useAuth();
  const { toast } = useToast();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableOfContents, setTableOfContents] = useState<{ title: string; id: string; level: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (articleId && productId) {
      fetchData();
    }
  }, [articleId, productId, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      console.log('ArticleViewer - productId from useParams:', productId);
      console.log('ArticleViewer - articleId from useParams:', articleId);
      
      if (!productId || !articleId) {
        console.error('ArticleViewer - Missing parameters:', { productId, articleId });
        toast({
          title: "Error",
          description: "Required parameters are missing",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Check access for non-admin users
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

      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) {
        console.error('Error fetching product:', productError);
        toast({
          title: "Error",
          description: "Failed to load product information",
          variant: "destructive",
        });
        return;
      }

      setProduct(productData);

      // Fetch all articles for this product
      const { data: articlesData, error: articlesError } = await supabase
        .from('articles')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'published')
        .order('created_at', { ascending: true });

      if (articlesError) {
        console.error('Error fetching articles:', articlesError);
      } else {
        const processedArticles = (articlesData || []).map(article => ({
          ...article,
          content: Array.isArray(article.content) ? article.content : []
        }));
        setAllArticles(processedArticles);
      }

      // Fetch specific article
      const { data: articleData, error: articleError } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .eq('product_id', productId)
        .single();

      if (articleError) {
        console.error('Error fetching article:', articleError);
        setArticle(null);
        return;
      }

      setArticle({
        ...articleData,
        content: Array.isArray(articleData.content) ? articleData.content : []
      });

      // Generate table of contents from article content
      if (articleData.content && Array.isArray(articleData.content)) {
        const toc = articleData.content
          .filter((section: any) => section.type === 'heading')
          .map((section: any, index: number) => ({
            title: section.content || `Section ${index + 1}`,
            id: `section-${index + 1}`,
            level: section.level || 1
          }));
        setTableOfContents(toc);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load article",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content: any[]) => {
    if (!content || !Array.isArray(content)) return null;

    return content.map((section, index) => {
      switch (section.type) {
        case 'heading':
          const HeadingTag = section.level === 1 ? 'h1' : section.level === 2 ? 'h2' : 'h3';
          const headingClasses = section.level === 1 
            ? 'text-3xl font-bold text-primary border-b border-primary/20 pb-3 mb-6'
            : section.level === 2 
            ? 'text-2xl font-semibold text-primary border-b border-primary/20 pb-2 mb-4'
            : 'text-xl font-medium text-foreground mb-3';
          
          return (
            <div key={index} className="animate-fade-in mb-6" id={`section-${index + 1}`}>
              <HeadingTag className={headingClasses}>
                {section.content}
              </HeadingTag>
            </div>
          );
        case 'text':
          return (
            <div key={index} className="animate-fade-in mb-6">
              <div 
                dangerouslySetInnerHTML={{ __html: section.content }}
                className="prose prose-lg max-w-none text-foreground/90 leading-relaxed prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded"
              />
            </div>
          );
        case 'code':
          return (
            <div key={index} className="animate-fade-in mb-6">
              <pre className="bg-muted border border-border rounded-lg p-4 overflow-x-auto">
                <code className="text-sm text-foreground">{section.content}</code>
              </pre>
            </div>
          );
        default:
          return (
            <div key={index} className="animate-fade-in mb-6">
              <p className="text-foreground/90 leading-relaxed">{section.content}</p>
            </div>
          );
      }
    });
  };

  // Group articles by sections and subsections
  const groupedArticles = allArticles.reduce((acc, article) => {
    const content = article.content || [];
    const mainHeadings = content.filter((section: any) => section.type === 'heading' && section.level === 1);
    
    if (mainHeadings.length > 0) {
      mainHeadings.forEach((heading: any) => {
        if (!acc[heading.content]) {
          acc[heading.content] = [];
        }
        acc[heading.content].push(article);
      });
    } else {
      // If no main headings, group under article title
      if (!acc[article.title]) {
        acc[article.title] = [];
      }
      acc[article.title].push(article);
    }
    
    return acc;
  }, {} as Record<string, Article[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container flex h-14 items-center px-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/docs/${productId}`)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to {product?.name}</span>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-md flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">{product?.name} Documentation</span>
            </div>
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
          
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate(`/product/${productId}`)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Product
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar - Dynamic Navigation */}
        <aside className="w-64 border-r border-border bg-background/50 h-[calc(100vh-3.5rem)] overflow-y-auto sticky top-14">
          <div className="p-6">
            <div className="mb-6">
              <Link 
                to={`/docs/${productId}`}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>Overview</span>
              </Link>
            </div>

            <Separator className="my-4" />

            {/* Dynamic Articles Navigation */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Articles</h4>
              <div className="space-y-1">
                {allArticles.map((art) => (
                  <Link
                    key={art.id}
                    to={`/docs/${productId}/${art.id}`}
                    className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                      art.id === articleId
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{art.title}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {art.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {allArticles.length === 0 && (
                  <p className="text-sm text-muted-foreground px-3 py-2">
                    No published articles yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
              <Link to="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link to={`/docs/${productId}`} className="hover:text-foreground transition-colors">
                {product?.name}
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-primary font-medium">
                {article?.title || 'Article Not Found'}
              </span>
            </nav>

            {/* Article Header */}
            <div className="mb-8">
              {product?.category && (
                <div className="mb-4">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {product.category}
                  </Badge>
                </div>
              )}
              <h1 className="text-4xl font-bold text-foreground mb-4">
                {article?.title || 'Article Not Found'}
              </h1>
              {article && (
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>Last updated: {new Date(article.updated_at).toLocaleDateString()}</span>
                  <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                    {article.status}
                  </Badge>
                </div>
              )}
            </div>

            {/* Article Content */}
            <div className="space-y-8">
              {article && article.content && Array.isArray(article.content) && article.content.length > 0 ? (
                renderContent(article.content)
              ) : (
                <div className="text-center py-16 bg-gradient-to-br from-background to-muted/10 rounded-lg border border-border/50">
                  <div className="max-w-md mx-auto">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No Content Available</h3>
                    <p className="text-muted-foreground mb-6">
                      {article 
                        ? "This article exists but has no content yet." 
                        : "This article hasn't been created yet or you don't have access to it."
                      } {isAdmin ? "Go to the product editor to create content for this documentation." : "Please contact an administrator to create this content."}
                    </p>
                    {isAdmin && (
                      <Button 
                        onClick={() => navigate(`/product/${productId}`)}
                        className="inline-flex items-center"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        {article ? 'Edit Article' : 'Create Article'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar - Table of Contents */}
        {tableOfContents.length > 0 && (
          <aside className="w-64 border-l border-border bg-background/50 h-[calc(100vh-3.5rem)] overflow-y-auto sticky top-14">
            <div className="p-6">
              <h4 className="text-sm font-medium text-foreground mb-4">On this page</h4>
              <nav className="space-y-2">
                {tableOfContents.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block text-sm text-muted-foreground hover:text-foreground transition-colors py-1 ${
                      item.level > 1 ? 'ml-4' : ''
                    }`}
                    style={{ marginLeft: `${(item.level - 1) * 16}px` }}
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default ArticleViewer;