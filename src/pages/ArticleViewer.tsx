import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ChevronRight, BookOpen, Home, FileText, Settings, Edit3, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import LMSVideoPlayer from '@/components/LMSVideoPlayer';

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
        navigate('/dashboard');
        return;
      }

      // Validate UUID format for articleId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(articleId)) {
        console.error('ArticleViewer - Invalid article ID format:', articleId);
        toast({
          title: "Invalid Article",
          description: "The article ID format is invalid.",
          variant: "destructive",
        });
        navigate(`/product/${productId}/docs`);
        return;
      }

      // Check access for non-admin users
      if (!isAdmin && user && profile) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();

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
            navigate('/dashboard');
            return;
          }
        }
      }

      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (productError) {
        console.error('Error fetching product:', productError);
        toast({
          title: "Error",
          description: "Failed to load product information",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      if (!productData) {
        toast({
          title: "Product Not Found",
          description: "The requested product could not be found.",
          variant: "destructive",
        });
        navigate('/dashboard');
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
        .eq('status', 'published')
        .maybeSingle();

      if (articleError) {
        console.error('Error fetching article:', articleError);
        toast({
          title: "Error",
          description: "Failed to load article",
          variant: "destructive",
        });
        navigate(`/product/${productId}/docs`);
        return;
      }

      if (!articleData) {
        toast({
          title: "Article Not Found",
          description: "The requested article could not be found.",
          variant: "destructive",
        });
        navigate(`/product/${productId}/docs`);
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
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content: any[]) => {
    if (!content || !Array.isArray(content)) return null;

    // Group sections by hierarchy
    const mainSections = content.filter((s: any) => s.level === 0 || !s.level);
    const subsections = content.filter((s: any) => s.level === 1);
    
    return mainSections.map((section, index) => {
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
      // Check for video embed containers and process them
      if (section.content.includes('video-embed-container')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(section.content, 'text/html');
        const videoContainers = doc.querySelectorAll('.video-embed-container');
        
        let processedContent = section.content;
        
        videoContainers.forEach((container) => {
          const videoUrl = container.getAttribute('data-video-url');
          const videoType = container.getAttribute('data-video-type');
          const videoId = container.getAttribute('data-video-id');
          
          if (videoUrl && videoType) {
            let playableEmbed = '';
            
            if (videoType === 'youtube' && videoId) {
              playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1rem 0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1" frameBorder="0" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;" title="YouTube Video"></iframe>
              </div>`;
            } else if (videoType === 'vimeo' && videoId) {
              playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1rem 0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <iframe src="https://player.vimeo.com/video/${videoId}" frameBorder="0" allowFullScreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;" title="Vimeo Video"></iframe>
              </div>`;
            } else if (videoType === 'loom' && videoId) {
              playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1rem 0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <iframe src="https://www.loom.com/embed/${videoId}" frameBorder="0" allowFullScreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;" title="Loom Video"></iframe>
              </div>`;
            } else if (videoType === 'heygen' && videoId) {
              playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1rem 0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <iframe src="https://share-prod.heygen.com/${videoId}" frameBorder="0" allowFullScreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;" title="HeyGen Video"></iframe>
              </div>`;
            } else if (videoType === 'direct') {
              playableEmbed = `<div class="video-player-wrapper" style="position: relative; width: 100%; margin: 1rem 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); background: #000;">
                <video controls preload="metadata" style="width: 100%; height: auto; display: block; min-height: 300px;" crossorigin="anonymous">
                  <source src="${videoUrl}" type="video/mp4">
                  <source src="${videoUrl}" type="video/webm">
                  <source src="${videoUrl}" type="video/ogg">
                  <div style="padding: 2rem; text-align: center; color: white; background: #1f2937;">
                    <p style="margin-bottom: 1rem;">Your browser doesn't support HTML5 video.</p>
                    <a href="${videoUrl}" target="_blank" style="color: #60a5fa; text-decoration: underline;">Open video in new window</a>
                  </div>
                </video>
              </div>`;
            }
            
            // Replace the thumbnail container with the playable embed
            processedContent = processedContent.replace(container.outerHTML, playableEmbed);
          }
        });
        
        contentElement = (
          <div 
            dangerouslySetInnerHTML={{ __html: processedContent }}
            className="prose prose-lg max-w-none text-foreground/90 leading-relaxed prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-md prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-ul:list-disc prose-ol:list-decimal prose-li:text-foreground/90 [&_iframe]:w-full [&_iframe]:rounded-lg [&_video]:w-full [&_video]:rounded-lg [&_.video-player-wrapper]:my-4"
          />
        );
      } else {
        // Regular rich HTML content
        contentElement = (
          <div 
            dangerouslySetInnerHTML={{ __html: section.content }}
            className="prose prose-lg max-w-none text-foreground/90 leading-relaxed prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-md prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-ul:list-disc prose-ol:list-decimal prose-li:text-foreground/90 [&_iframe]:w-full [&_iframe]:rounded-lg [&_video]:w-full [&_video]:rounded-lg [&_.video-container]:my-4"
          />
        );
      }
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

  useEffect(() => {
    const handleVideoEmbeds = () => {
      const videoContainers = document.querySelectorAll('.video-embed-container:not([data-processed])');
      
      videoContainers.forEach((container) => {
        const videoUrl = container.getAttribute('data-video-url');
        const videoType = container.getAttribute('data-video-type');
        const videoId = container.getAttribute('data-video-id');
        
        if (!videoUrl || !videoType || !videoId) return;
        
        // Mark as processed to avoid re-processing
        container.setAttribute('data-processed', 'true');
        
        // Create click handler for YouTube thumbnails
        if (videoType === 'youtube') {
          const playButton = container.querySelector('.play-button');
          if (playButton) {
            playButton.addEventListener('click', () => {
              const embedHtml = `
                <div class="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
                  <iframe
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1"
                    class="absolute inset-0 w-full h-full"
                    frameborder="0"
                    allowfullscreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    title="YouTube Video"
                  ></iframe>
                </div>
              `;
              container.innerHTML = embedHtml;
            });
          }
        }
      });
    };

    // Handle video embeds on mount and when content changes
    const observer = new MutationObserver(() => {
      setTimeout(handleVideoEmbeds, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Initial call with delay to ensure DOM is ready
    setTimeout(handleVideoEmbeds, 500);
    
    return () => observer.disconnect();
  }, [article]);

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
              <button 
                onClick={() => navigate(`/product/${productId}/docs`)}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full text-left"
              >
                <Home className="h-4 w-4" />
                <span>Overview</span>
              </button>
            </div>

            <Separator className="my-4" />

            {/* Dynamic Articles Navigation */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Articles</h4>
              <div className="space-y-1">
                {allArticles.map((art) => (
                  <button
                    key={art.id}
                    onClick={() => navigate(`/docs/${productId}/${art.id}`)}
                    className={`block px-3 py-2 text-sm rounded-md transition-colors w-full text-left ${
                      art.id === articleId
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{art.title}</span>
                    </div>
                  </button>
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
            <Breadcrumb className="mb-6">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate('/dashboard')} className="cursor-pointer hover:text-primary">
                    <Home className="h-4 w-4" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate(`/product/${productId}/docs`)} className="cursor-pointer hover:text-primary">
                    {product?.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground font-medium">
                    {article?.title || 'Article Not Found'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

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
              {article && article.content ? (
                <>
                  {/* Handle both structured content (array) and direct HTML content (string) */}
                  {Array.isArray(article.content) && article.content.length > 0 ? (
                    renderContent(article.content)
                  ) : typeof article.content === 'string' && article.content ? (
                    <div className="animate-fade-in">
                      <div 
                        dangerouslySetInnerHTML={{ __html: article.content }}
                        className="prose prose-lg max-w-none text-foreground/90 leading-relaxed 
                                   prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground 
                                   prose-code:text-primary prose-code:bg-primary/10 prose-code:px-2 prose-code:py-1 prose-code:rounded 
                                   prose-a:text-primary prose-a:no-underline hover:prose-a:underline 
                                   prose-img:rounded-lg prose-img:shadow-md prose-img:border prose-img:border-border 
                                   prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r 
                                   prose-ul:list-disc prose-ol:list-decimal prose-li:text-foreground/90 
                                   prose-table:border-collapse prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2 prose-td:border prose-td:border-border prose-td:p-2
                                   prose-video:rounded-lg prose-video:shadow-md prose-video:max-w-full
                                   [&_iframe]:rounded-lg [&_iframe]:shadow-md [&_iframe]:border [&_iframe]:border-border
                                   [&_video]:rounded-lg [&_video]:shadow-md [&_video]:border [&_video]:border-border [&_video]:max-w-full [&_video]:h-auto
                                   [&_.video-container]:rounded-lg [&_.video-container]:shadow-md [&_.video-container]:overflow-hidden"
                      />
                    </div>
                  ) : (
                    renderContent(article.content)
                  )}
                  
                  {/* Article Navigation */}
                  <div className="mt-12 pt-8 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      {/* Previous Article */}
                      <div className="flex-1">
                        {(() => {
                          const currentIndex = allArticles.findIndex(art => art.id === articleId);
                          const prevArticle = currentIndex > 0 ? allArticles[currentIndex - 1] : null;
                          
                          return prevArticle ? (
                            <button
                              onClick={() => navigate(`/docs/${productId}/${prevArticle.id}`)}
                              className="group flex items-center space-x-3 p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 max-w-sm w-full text-left"
                            >
                              <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                              <div className="text-left">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Previous</p>
                                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                  {prevArticle.title}
                                </p>
                              </div>
                            </button>
                          ) : (
                            <div className="max-w-sm" /> // Empty space for alignment
                          );
                        })()}
                      </div>
                      
                      {/* Next Article */}
                      <div className="flex-1 flex justify-end">
                        {(() => {
                          const currentIndex = allArticles.findIndex(art => art.id === articleId);
                          const nextArticle = currentIndex < allArticles.length - 1 ? allArticles[currentIndex + 1] : null;
                          
                          return nextArticle ? (
                            <button
                              onClick={() => navigate(`/docs/${productId}/${nextArticle.id}`)}
                              className="group flex items-center space-x-3 p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 max-w-sm w-full text-right"
                            >
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Next</p>
                                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                  {nextArticle.title}
                                </p>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </button>
                          ) : (
                            <div className="max-w-sm" /> // Empty space for alignment
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </>
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