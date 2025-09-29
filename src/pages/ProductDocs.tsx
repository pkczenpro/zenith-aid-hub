import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
  const [tableOfContents, setTableOfContents] = useState<{ title: string; id: string; level: number }[]>([]);

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
        .order('created_at', { ascending: true });

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
          generateTableOfContents(articlesData[0]);
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

  const generateTableOfContents = (article: Article) => {
    if (article?.content && Array.isArray(article.content)) {
      const toc = article.content
        .filter((section: any) => section.title)
        .map((section: any, index: number) => ({
          title: section.title,
          id: `section-${index}`,
          level: section.level || 0
        }));
      setTableOfContents(toc);
    } else {
      setTableOfContents([]);
    }
  };

  const handleArticleSelect = (article: Article) => {
    setSelectedArticle(article);
    generateTableOfContents(article);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCurrentArticleIndex = () => {
    return articles.findIndex(a => a.id === selectedArticle?.id);
  };

  const goToPreviousArticle = () => {
    const currentIndex = getCurrentArticleIndex();
    if (currentIndex > 0) {
      handleArticleSelect(articles[currentIndex - 1]);
    }
  };

  const goToNextArticle = () => {
    const currentIndex = getCurrentArticleIndex();
    if (currentIndex < articles.length - 1) {
      handleArticleSelect(articles[currentIndex + 1]);
    }
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderArticleContent = (content: any) => {
    if (!content) return <p className="text-muted-foreground">No content available.</p>;
    
    try {
      const contentArray = Array.isArray(content) ? content : [];
      
      // Group sections by hierarchy
      const mainSections = contentArray.filter((s: any) => s.level === 0 || !s.level);
      const subsections = contentArray.filter((s: any) => s.level === 1);
      
      return mainSections.map((section: any, index: number) => {
        const sectionSubsections = subsections.filter((sub: any) => sub.parent_id === section.id);
        
        return (
          <div key={index} className="mb-8">
            {renderSectionContent(section, index, true)}
            {sectionSubsections.length > 0 && (
              <div className="ml-6 mt-4 space-y-4">
                {sectionSubsections.map((subsection: any, subIndex: number) => (
                  <div key={subIndex}>
                    {renderSectionContent(subsection, subIndex, false)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      });
    } catch (error) {
      console.error('Error rendering content:', error);
      return <p className="text-muted-foreground">Content could not be displayed.</p>;
    }
  };

  const renderSectionContent = (section: any, index: number, isMainSection: boolean = true) => {
    const sectionId = `section-${index}`;
    
    // Display section title with ID for TOC navigation
    const titleElement = (
      <div id={sectionId} className="mb-4 scroll-mt-24">
        <h3 className={`font-semibold ${isMainSection ? 'text-xl text-primary border-b border-primary/20 pb-2' : 'text-lg text-foreground/90'}`}>
          {section.title}
        </h3>
      </div>
    );

    // Handle content based on type or render as rich HTML
    let contentElement;
    if (typeof section.content === 'string' && section.content.includes('<')) {
      // Rich HTML content
      contentElement = (
        <div 
          dangerouslySetInnerHTML={{ __html: section.content }}
          className="prose prose-lg max-w-none text-foreground/90 leading-relaxed prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-md prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-ul:list-disc prose-ol:list-decimal prose-li:text-foreground/90 [&_iframe]:w-full [&_iframe]:rounded-lg [&_video]:w-full [&_video]:rounded-lg [&_.video-container]:my-4"
        />
      );
    } else {
      // Plain text content
      contentElement = (
        <div className="text-foreground/90 leading-relaxed">
          {section.content}
        </div>
      );
    }

    return (
      <div>
        {titleElement}
        <div className="mb-6">
          {contentElement}
        </div>
      </div>
    );
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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left section */}
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="hover:bg-accent"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </div>

            {/* Center section - Search */}
            <div className="flex-1 max-w-xl mx-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search documentation..."
                  className="pl-10 bg-background/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Right section */}
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
        </div>
      </header>

      <div className="flex bg-background">
        {/* Left Sidebar - Navigation */}
        <aside className="w-80 border-r border-border bg-card/30 overflow-y-auto sticky top-16 h-[calc(100vh-4rem)]">
          <div className="p-6">
            {/* Product Info */}
            <div className="mb-6 pb-6 border-b border-border">
              <div className="flex items-center space-x-3 mb-2">
                <div className="h-10 w-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-sm">
                  {product.icon_url ? (
                    <img src={product.icon_url} alt="" className="h-6 w-6" />
                  ) : (
                    <BookOpen className="h-6 w-6 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{product.name}</h2>
                  <p className="text-xs text-muted-foreground">Documentation</p>
                </div>
              </div>
            </div>

            {/* Product Overview */}
            <div className="mb-4">
              <button
                className={`w-full text-left rounded-lg p-3 transition-all ${
                  !selectedArticle 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'hover:bg-muted/50 text-foreground'
                }`}
                onClick={() => {
                  setSelectedArticle(null);
                  setTableOfContents([]);
                }}
              >
                <div className="flex items-center space-x-2">
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Overview</span>
                </div>
              </button>
            </div>

            {/* Articles List */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Articles
              </h3>
              
              {filteredArticles.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'No articles found' : 'No articles available'}
                  </p>
                </div>
              ) : (
                filteredArticles.map((article, index) => (
                  <button
                    key={article.id}
                    className={`w-full text-left rounded-lg p-3 transition-all ${
                      selectedArticle?.id === article.id
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-muted/50 text-foreground'
                    }`}
                    onClick={() => handleArticleSelect(article)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                        selectedArticle?.id === article.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2 mb-1">
                          {article.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(article.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-8">
            {!selectedArticle ? (
              // Product Overview
              <div className="animate-fade-in">
                <Breadcrumb className="mb-6">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={() => navigate('/dashboard')} className="cursor-pointer hover:text-primary flex items-center">
                        <Home className="h-4 w-4" />
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{product.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                <div className="mb-8">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="h-16 w-16 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md">
                      {product.icon_url ? (
                        <img src={product.icon_url} alt="" className="h-8 w-8" />
                      ) : (
                        <BookOpen className="h-8 w-8 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-foreground mb-2">{product.name}</h1>
                      {product.category && (
                        <Badge variant="secondary" className="text-sm">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {product.description && (
                    <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                      {product.description}
                    </p>
                  )}
                </div>

                <Separator className="my-8" />

                {articles.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center">
                      <FileText className="h-6 w-6 mr-2 text-primary" />
                      Documentation Articles
                    </h2>
                    <div className="grid gap-4">
                      {articles.map((article, index) => (
                        <Card 
                          key={article.id}
                          className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                          onClick={() => handleArticleSelect(article)}
                        >
                          <CardHeader className="flex flex-row items-center space-x-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <span className="text-lg font-semibold text-primary">{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-xl group-hover:text-primary transition-colors">
                                {article.title}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                Updated {new Date(article.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Article Content
              <div className="animate-fade-in">
                <Breadcrumb className="mb-8">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={() => navigate('/dashboard')} className="cursor-pointer hover:text-primary flex items-center">
                        <Home className="h-4 w-4" />
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={() => {
                        setSelectedArticle(null);
                        setTableOfContents([]);
                      }} className="cursor-pointer hover:text-primary">
                        {product.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{selectedArticle.title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                <article>
                  <header className="mb-8 pb-6 border-b border-border">
                    <h1 className="text-4xl font-bold text-foreground mb-4">{selectedArticle.title}</h1>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        Article
                      </span>
                      <span>•</span>
                      <span>Updated {new Date(selectedArticle.updated_at).toLocaleDateString()}</span>
                    </div>
                  </header>

                  <div className="prose prose-lg max-w-none">
                    {selectedArticle.content && Array.isArray(selectedArticle.content) && selectedArticle.content.length > 0 ? (
                      renderArticleContent(selectedArticle.content)
                    ) : (
                      <div className="text-center py-12 bg-muted/30 rounded-lg">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No content available for this article.</p>
                      </div>
                    )}
                  </div>
                </article>

                {/* Article Navigation */}
                {articles.length > 1 && (
                  <nav className="mt-12 pt-8 border-t border-border">
                    <div className="flex items-center justify-between gap-4">
                      {getCurrentArticleIndex() > 0 ? (
                        <Button
                          variant="outline"
                          onClick={goToPreviousArticle}
                          className="group flex-1 h-auto p-4 justify-start"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0 group-hover:-translate-x-1 transition-transform" />
                          <div className="text-left min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Previous</div>
                            <div className="font-medium truncate">{articles[getCurrentArticleIndex() - 1]?.title}</div>
                          </div>
                        </Button>
                      ) : (
                        <div className="flex-1"></div>
                      )}
                      
                      {getCurrentArticleIndex() < articles.length - 1 ? (
                        <Button
                          variant="outline"
                          onClick={goToNextArticle}
                          className="group flex-1 h-auto p-4 justify-end"
                        >
                          <div className="text-right min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Next</div>
                            <div className="font-medium truncate">{articles[getCurrentArticleIndex() + 1]?.title}</div>
                          </div>
                          <ChevronRight className="h-4 w-4 ml-2 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      ) : (
                        <div className="flex-1"></div>
                      )}
                    </div>
                  </nav>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Table of Contents */}
        {selectedArticle && tableOfContents.length > 0 && (
          <aside className="w-64 border-l border-border bg-card/30 overflow-y-auto sticky top-16 h-[calc(100vh-4rem)] hidden xl:block">
            <div className="p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                On This Page
              </h3>
              <nav className="space-y-2">
                {tableOfContents.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const element = document.getElementById(item.id);
                      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`block w-full text-left text-sm py-1.5 px-3 rounded-md transition-colors hover:bg-muted/50 hover:text-primary ${
                      item.level === 0 ? 'font-medium text-foreground' : 'text-muted-foreground pl-6'
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default ProductDocs;
