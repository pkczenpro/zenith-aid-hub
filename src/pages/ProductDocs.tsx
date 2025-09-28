import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  BookOpen, 
  ArrowLeft,
  FileText,
  User,
  Building2,
  LogOut,
  ChevronRight,
  Home
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  content: any;
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

const ProductDocs = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user && productId) {
      fetchProductAndArticles();
    }
  }, [user, productId]);

  const fetchProductAndArticles = async () => {
    try {
      setLoading(true);

      if (!user) {
        navigate('/auth');
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setUserProfile(profile);

      // For clients, verify they have access to this product
      if (profile?.role === 'client') {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (!clientData) {
          toast({
            title: "Access Denied",
            description: "Client record not found.",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }

        // Check if client has access to this product
        const { data: accessData } = await supabase
          .from('client_product_access')
          .select('id')
          .eq('client_id', clientData.id)
          .eq('product_id', productId)
          .single();

        if (!accessData) {
          toast({
            title: "Access Denied",
            description: "You don't have access to this product documentation.",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }
      }

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

      // Get published articles for this product
      const { data: articlesData, error: articlesError } = await supabase
        .from('articles')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'published')
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
        // Auto-select first article if available
        if (articlesData && articlesData.length > 0) {
          setSelectedArticle(articlesData[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
      toast({
        title: "Error",
        description: "Failed to load product documentation.",
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

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderArticleContent = (content: any) => {
    if (!content) return <p className="text-muted-foreground">No content available.</p>;
    
    try {
      const contentArray = Array.isArray(content) ? content : [];
      return contentArray.map((section: any, index: number) => {
        switch (section.type) {
          case 'heading':
            const HeadingTag = section.level === 1 ? 'h1' : section.level === 2 ? 'h2' : 'h3';
            const headingClasses = section.level === 1 
              ? 'text-3xl font-bold text-foreground border-b border-border pb-3 mb-6'
              : section.level === 2 
              ? 'text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4'
              : 'text-xl font-medium text-foreground mb-3';
            
            return (
              <div key={index} className="mb-6" id={`section-${index + 1}`}>
                <HeadingTag className={headingClasses}>
                  {section.content}
                </HeadingTag>
              </div>
            );
          case 'text':
            return (
              <div key={index} className="mb-6">
                <div 
                  dangerouslySetInnerHTML={{ __html: section.content }}
                  className="prose prose-lg max-w-none text-foreground/90 leading-relaxed prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-md prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-ul:list-disc prose-ol:list-decimal prose-li:text-foreground/90 prose-video:w-full prose-video:rounded-lg [&_iframe]:w-full [&_iframe]:rounded-lg [&_video]:w-full [&_video]:rounded-lg"
                />
              </div>
            );
          case 'code':
            return (
              <div key={index} className="mb-6">
                <pre className="bg-muted border border-border rounded-lg p-4 overflow-x-auto">
                  <code className="text-sm text-foreground">{section.content}</code>
                </pre>
              </div>
            );
          case 'video':
          case 'embed':
            return (
              <div key={index} className="mb-6">
                <div className="relative rounded-lg overflow-hidden bg-muted border border-border aspect-video">
                  {section.content.includes('youtube.com') || section.content.includes('youtu.be') ? (
                    <iframe
                      src={section.content.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                      className="absolute inset-0 w-full h-full"
                      frameBorder="0"
                      allowFullScreen
                      title="Embedded Video"
                    />
                  ) : section.content.includes('vimeo.com') ? (
                    <iframe
                      src={section.content.replace('vimeo.com/', 'player.vimeo.com/video/')}
                      className="absolute inset-0 w-full h-full"
                      frameBorder="0"
                      allowFullScreen
                      title="Embedded Video"
                    />
                  ) : (
                    <div 
                      dangerouslySetInnerHTML={{ __html: section.content }}
                      className="w-full h-full"
                    />
                  )}
                </div>
              </div>
            );
          case 'image':
            return (
              <div key={index} className="mb-6">
                <div className="flex justify-center">
                  <img 
                    src={section.content} 
                    alt={section.alt || 'Content image'}
                    className="max-w-full h-auto rounded-lg shadow-md border border-border"
                  />
                </div>
                {section.caption && (
                  <p className="text-center text-sm text-muted-foreground mt-2 italic">
                    {section.caption}
                  </p>
                )}
              </div>
            );
          default:
            // Handle rich text content with embedded videos
            if (typeof section.content === 'string' && section.content.includes('<')) {
              return (
                <div key={index} className="mb-6">
                  <div 
                    dangerouslySetInnerHTML={{ __html: section.content }}
                    className="prose prose-lg max-w-none text-foreground/90 leading-relaxed prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-md prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-ul:list-disc prose-ol:list-decimal prose-li:text-foreground/90 [&_iframe]:w-full [&_iframe]:rounded-lg [&_video]:w-full [&_video]:rounded-lg"
                  />
                </div>
              );
            }
            
            // Try to handle legacy format
            if (section.content?.map) {
              return (
                <p key={index} className="mb-4 text-foreground leading-relaxed">
                  {section.content.map((item: any, i: number) => item.text).join('')}
                </p>
              );
            }
            
            return (
              <div key={index} className="mb-6">
                <p className="text-foreground/90 leading-relaxed">{section.content}</p>
              </div>
            );
        }
      });
    } catch (error) {
      console.error('Error rendering content:', error);
      return <p className="text-muted-foreground">Content could not be displayed.</p>;
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
              <span className="font-semibold text-foreground">{product.name}</span>
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
            {userProfile && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{userProfile.full_name || userProfile.email}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Articles List */}
        <div className="w-80 border-r border-border bg-background overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-primary" />
                Help Articles
              </h2>
            </div>

            {filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No articles found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? 'Try adjusting your search terms.' : 'No documentation is currently available for this product.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredArticles.map((article, index) => (
                  <div 
                    key={article.id} 
                    className={`group cursor-pointer rounded-lg p-3 transition-all duration-200 hover:bg-muted/80 border border-transparent ${
                      selectedArticle?.id === article.id 
                        ? 'bg-primary/5 border-primary/20 shadow-sm' 
                        : 'hover:border-border/50'
                    }`}
                    onClick={() => setSelectedArticle(article)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          selectedArticle?.id === article.id 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium mb-1 line-clamp-2 ${
                          selectedArticle?.id === article.id 
                            ? 'text-primary' 
                            : 'text-foreground group-hover:text-primary'
                        }`}>
                          {article.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(article.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Article Viewer */}
        <div className="flex-1 overflow-y-auto bg-background">
          {selectedArticle ? (
            <div className="max-w-4xl mx-auto p-8">
              {/* Breadcrumb */}
              <Breadcrumb className="mb-6">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      onClick={() => navigate('/dashboard')}
                      className="cursor-pointer hover:text-primary transition-colors"
                    >
                      <Home className="h-4 w-4" />
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      onClick={() => navigate('/dashboard')}
                      className="cursor-pointer hover:text-primary transition-colors"
                    >
                      Help Center
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-foreground font-medium">
                      {product?.name}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              {/* Article Header */}
              <div className="mb-8 pb-6 border-b border-border">
                <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">{selectedArticle.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    Last updated: {new Date(selectedArticle.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              {/* Article Content */}
              <div className="prose prose-lg max-w-none">
                {renderArticleContent(selectedArticle.content)}
              </div>

              {/* Article Navigation */}
              {filteredArticles.length > 1 && (
                <div className="mt-12 pt-8 border-t border-border">
                  <div className="flex justify-between items-center">
                    {(() => {
                      const currentIndex = filteredArticles.findIndex(a => a.id === selectedArticle.id);
                      const prevArticle = currentIndex > 0 ? filteredArticles[currentIndex - 1] : null;
                      const nextArticle = currentIndex < filteredArticles.length - 1 ? filteredArticles[currentIndex + 1] : null;
                      
                      return (
                        <>
                          {prevArticle ? (
                            <Button 
                              variant="outline" 
                              className="flex items-center space-x-2"
                              onClick={() => setSelectedArticle(prevArticle)}
                            >
                              <ArrowLeft className="h-4 w-4" />
                              <span>Previous</span>
                            </Button>
                          ) : <div />}
                          
                          {nextArticle ? (
                            <Button 
                              variant="outline" 
                              className="flex items-center space-x-2"
                              onClick={() => setSelectedArticle(nextArticle)}
                            >
                              <span>Next</span>
                              <ArrowLeft className="h-4 w-4 rotate-180" />
                            </Button>
                          ) : <div />}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Welcome to {product?.name} Help Center</h3>
                <p className="text-muted-foreground mb-6">
                  Select an article from the sidebar to get started, or use the search bar to find specific topics.
                </p>
                {filteredArticles.length > 0 && (
                  <Button 
                    onClick={() => setSelectedArticle(filteredArticles[0])}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Read First Article
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDocs;