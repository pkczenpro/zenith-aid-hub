import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, ChevronRight, BookOpen, Home, FileText, Users, Settings, Edit3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [article, setArticle] = useState<Article | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableOfContents, setTableOfContents] = useState<{ title: string; id: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (articleId && productId) {
      fetchArticleAndProduct();
    }
  }, [articleId, productId, user]);

  const fetchArticleAndProduct = async () => {
    try {
      setLoading(true);

      // Fetch product first
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

      // Fetch article
      const { data: articleData, error: articleError } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .eq('product_id', productId)
        .single();

      if (articleError) {
        console.error('Error fetching article:', articleError);
        // Don't show error for missing articles, just show empty state
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
            id: `section-${index + 1}`
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
          return (
            <div key={index} className="animate-fade-in mb-6" id={`section-${index + 1}`}>
              <h2 className="text-2xl font-semibold text-primary border-b border-primary/20 pb-2">
                {section.content}
              </h2>
            </div>
          );
        case 'text':
          return (
            <div key={index} className="animate-fade-in mb-6">
              <div 
                dangerouslySetInnerHTML={{ __html: section.content }}
                className="prose prose-lg max-w-none text-foreground/90 leading-relaxed"
              />
            </div>
          );
        case 'code':
          return (
            <div key={index} className="animate-fade-in mb-6">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code>{section.content}</code>
              </pre>
            </div>
          );
        default:
          return (
            <div key={index} className="animate-fade-in mb-6">
              <p className="text-foreground/90">{section.content}</p>
            </div>
          );
      }
    });
  };

  const sidebarItems = [
    { icon: Home, label: 'Overview', href: '/', active: false },
    { icon: FileText, label: 'Documentation', href: '/docs', active: true },
    { icon: Users, label: 'Client Access', href: '/clients', active: false },
    { icon: Settings, label: 'Settings', href: '/settings', active: false },
  ];

  const navigationItems = [
    { label: 'Announcements', href: '/announcements' },
    { label: 'Status', href: '/status' },
    { label: 'About Integrations', href: '/about-integrations' },
    { label: 'Introduction', href: '/introduction' },
    { label: 'Build with URL', href: '/build-url' },
  ];

  const integrationItems = [
    { label: 'GitHub Integration', href: '/integrations/github' },
    { label: 'Supabase Integration', href: '/integrations/supabase' },
    { label: 'Stripe Integration', href: '/integrations/stripe', active: true },
    { label: 'Resend Integration', href: '/integrations/resend' },
    { label: 'Clerk Integration', href: '/integrations/clerk' },
    { label: 'Make Integration', href: '/integrations/make' },
    { label: 'Replicate Integration', href: '/integrations/replicate' },
    { label: 'AI Integration', href: '/integrations/ai' },
    { label: '21st.dev Integration', href: '/integrations/21st-dev' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading article...</p>
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
            <Link to="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-md flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Documentation</span>
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
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  Ctrl K
                </kbd>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-border bg-background/50 h-[calc(100vh-3.5rem)] overflow-y-auto sticky top-14">
          <div className="p-6">
            {/* Main Navigation */}
            <div className="space-y-1 mb-6">
              {sidebarItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    item.active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Documentation Navigation */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">General</h4>
                <div className="space-y-1">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="block px-3 py-1 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Integrations</h4>
                <div className="space-y-1">
                  {integrationItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className={`block px-3 py-1 text-sm rounded-md transition-colors ${
                        item.active
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
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
              <Link to="/docs" className="hover:text-foreground transition-colors">
                Documentation
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-primary font-medium">{product?.name || 'Documentation'}</span>
            </nav>

            {/* Article Header */}
            <div className="mb-8">
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {product?.category || 'Documentation'}
                </span>
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                {article?.title || 'Article Not Found'}
              </h1>
              <p className="text-xl text-muted-foreground">
                {product?.description || 'This article could not be found'}
              </p>
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
                        : "This article hasn't been created yet."
                      } {isAdmin ? "Go to the product editor to create content for this documentation." : "Please contact an administrator to create this content."}
                    </p>
                    {isAdmin && (
                      <Link 
                        to={`/product/${productId}`}
                        className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        {article ? 'Edit Article' : 'Create Article'}
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar - Table of Contents */}
        <aside className="w-64 border-l border-border bg-background/50 h-[calc(100vh-3.5rem)] overflow-y-auto sticky top-14">
          <div className="p-6">
            <h4 className="text-sm font-medium text-foreground mb-4 flex items-center">
              <span className="mr-2">On this page</span>
            </h4>
            <nav className="space-y-2">
              {tableOfContents.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  {item.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ArticleViewer;