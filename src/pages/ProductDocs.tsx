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

  // Build hierarchical structure for navigation
  const buildHierarchicalStructure = () => {
    return filteredArticles.map(article => {
      const contentArray = Array.isArray(article.content) ? article.content : [];
      const mainSections = contentArray.filter((s: any) => s.level === 0 || !s.level);
      
      return {
        ...article,
        sections: mainSections.map((section: any) => {
          const subsections = contentArray.filter((sub: any) => sub.level === 1 && sub.parent_id === section.id);
          return {
            ...section,
            subsections: subsections
          };
        })
      };
    });
  };

  const hierarchicalArticles = buildHierarchicalStructure();

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
    // Display section title
    const titleElement = (
      <div className="mb-4">
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
        {/* Sidebar - Hierarchical Navigation */}
        <div className="w-80 border-r border-border bg-background overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-primary" />
                Documentation
              </h2>
            </div>

            {/* Product Overview */}
            <div className="mb-4">
              <div 
                className={`group cursor-pointer rounded-lg p-3 transition-all duration-200 hover:bg-muted/80 border border-transparent ${
                  !selectedArticle 
                    ? 'bg-primary/5 border-primary/20 shadow-sm' 
                    : 'hover:border-border/50'
                }`}
                onClick={() => setSelectedArticle(null)}
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className={`font-medium ${!selectedArticle ? 'text-primary' : 'text-foreground'}`}>
                    Product Overview
                  </span>
                </div>
              </div>
            </div>

            {hierarchicalArticles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No articles found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? 'Try adjusting your search terms.' : 'No documentation is currently available for this product.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {hierarchicalArticles.map((article, articleIndex) => (
                  <div key={article.id} className="mb-2">
                    {/* Article Header */}
                    <div 
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
                            {articleIndex + 1}
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

                    {/* Sections and Subsections */}
                    {selectedArticle?.id === article.id && article.sections.length > 0 && (
                      <div className="ml-4 mt-2 space-y-1">
                        {article.sections.map((section: any, sectionIndex: number) => (
                          <div key={section.id || sectionIndex}>
                            {/* Section */}
                            <div 
                              className="cursor-pointer rounded-md p-2 text-sm hover:bg-muted/60 transition-colors"
                              onClick={() => {
                                const element = document.getElementById(`section-${sectionIndex}`);
                                element?.scrollIntoView({ behavior: 'smooth' });
                              }}
                            >
                              <div className="flex items-center space-x-2">
                                <div className="w-1 h-1 bg-primary/60 rounded-full"></div>
                                <span className="text-foreground/80 hover:text-primary">
                                  {section.title || `Section ${sectionIndex + 1}`}
                                </span>
                              </div>
                            </div>

                            {/* Subsections */}
                            {section.subsections && section.subsections.length > 0 && (
                              <div className="ml-4 space-y-1">
                                {section.subsections.map((subsection: any, subsectionIndex: number) => (
                                  <div 
                                    key={subsection.id || subsectionIndex}
                                    className="cursor-pointer rounded-md p-2 text-sm hover:bg-muted/40 transition-colors"
                                    onClick={() => {
                                      const element = document.getElementById(`subsection-${sectionIndex}-${subsectionIndex}`);
                                      element?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <div className="w-1 h-1 bg-primary/40 rounded-full"></div>
                                      <span className="text-foreground/70 hover:text-primary text-xs">
                                        {subsection.title || `Subsection ${subsectionIndex + 1}`}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
                      onClick={() => setSelectedArticle(null)}
                      className="cursor-pointer hover:text-primary transition-colors"
                    >
                      {product?.name}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-foreground font-medium">
                      {selectedArticle.title}
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
              
              {/* Article Content with proper section IDs */}
              <div className="prose prose-lg max-w-none">
                {(() => {
                  const contentArray = Array.isArray(selectedArticle.content) ? selectedArticle.content : [];
                  const mainSections = contentArray.filter((s: any) => s.level === 0 || !s.level);
                  const subsections = contentArray.filter((s: any) => s.level === 1);
                  
                  return mainSections.map((section: any, sectionIndex: number) => {
                    const sectionSubsections = subsections.filter((sub: any) => sub.parent_id === section.id);
                    
                    return (
                      <div key={sectionIndex} className="mb-8" id={`section-${sectionIndex}`}>
                        <div className="mb-4">
                          <h3 className="font-semibold text-xl text-primary border-b border-primary/20 pb-2">
                            {section.title}
                          </h3>
                        </div>
                        <div className="mb-6">
                          {typeof section.content === 'string' && section.content.includes('<') ? (
                            <div 
                              dangerouslySetInnerHTML={{ __html: section.content }}
                              className="prose prose-lg max-w-none text-foreground/90 leading-relaxed prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-md prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-ul:list-disc prose-ol:list-decimal prose-li:text-foreground/90 [&_iframe]:w-full [&_iframe]:rounded-lg [&_video]:w-full [&_video]:rounded-lg [&_.video-container]:my-4"
                            />
                          ) : (
                            <div className="text-foreground/90 leading-relaxed">
                              {section.content}
                            </div>
                          )}
                        </div>
                        
                        {/* Subsections */}
                        {sectionSubsections.length > 0 && (
                          <div className="ml-6 mt-4 space-y-4">
                            {sectionSubsections.map((subsection: any, subsectionIndex: number) => (
                              <div key={subsectionIndex} id={`subsection-${sectionIndex}-${subsectionIndex}`}>
                                <div className="mb-4">
                                  <h4 className="font-semibold text-lg text-foreground/90">
                                    {subsection.title}
                                  </h4>
                                </div>
                                <div className="mb-6">
                                  {typeof subsection.content === 'string' && subsection.content.includes('<') ? (
                                    <div 
                                      dangerouslySetInnerHTML={{ __html: subsection.content }}
                                      className="prose prose-lg max-w-none text-foreground/90 leading-relaxed prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-md prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-ul:list-disc prose-ol:list-decimal prose-li:text-foreground/90 [&_iframe]:w-full [&_iframe]:rounded-lg [&_video]:w-full [&_video]:rounded-lg [&_.video-container]:my-4"
                                    />
                                  ) : (
                                    <div className="text-foreground/90 leading-relaxed">
                                      {subsection.content}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
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
                <div className="h-24 w-24 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  {product.icon_url ? (
                    <img src={product.icon_url} alt="" className="h-12 w-12" />
                  ) : (
                    <BookOpen className="h-12 w-12 text-primary-foreground" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{product?.name}</h2>
                <p className="text-muted-foreground mb-6">
                  {product?.description || 'Welcome to the product documentation. Select an article from the sidebar to get started.'}
                </p>
                {hierarchicalArticles.length > 0 && (
                  <Button 
                    onClick={() => setSelectedArticle(hierarchicalArticles[0])}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Start Reading
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