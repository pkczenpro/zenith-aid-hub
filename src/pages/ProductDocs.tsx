import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { highlightSearchTerms, scrollToFirstHighlight } from '@/utils/textHighlight';
import VideoLibrary from '@/components/VideoLibrary';
import ChatWidget from '@/components/ChatWidget';
import PDFViewer from '@/components/PDFViewer';
import {
  Search, 
  BookOpen, 
  FileText,
  User,
  LogOut,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Menu,
  ArrowLeft,
  Download,
  Settings,
  Video,
  FileSpreadsheet,
  Briefcase,
  Plus,
  Share2,
  Moon,
  Sun,
  Grid3x3,
  Play,
  Home,
  Sparkles,
  Eye
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

interface WelcomeMessage {
  id: string;
  title: string | null;
  description: string | null;
  show_features: boolean;
  custom_button_text: string;
  is_active: boolean;
}

interface CategoryGroup {
  name: string;
  articles: Article[];
  expanded: boolean;
}

const ProductDocs = () => {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tableOfContents, setTableOfContents] = useState<{ title: string; id: string; level: number }[]>([]);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'documentation' | 'resources' | 'videos' | 'releases'>('resources');
  const [resources, setResources] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [releaseNotes, setReleaseNotes] = useState<any[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<any | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [videoViewMode, setVideoViewMode] = useState<'library' | 'player'>('library');
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<WelcomeMessage | null>(null);
  const [viewingResource, setViewingResource] = useState<any | null>(null);
  const highlightTerm = searchParams.get('search') || '';
  const searchType = searchParams.get('type') || '';
  const searchId = searchParams.get('id') || '';

  // Clear videos when productId changes to prevent showing wrong product's videos
  useEffect(() => {
    setVideos([]);
    setCurrentVideoIndex(0);
    setVideoViewMode('library');
  }, [productId]);

  useEffect(() => {
    if (user && productId) {
      fetchProductAndArticles();
    }
  }, [user, productId]);

  // Show welcome message every time for clients when product loads
  useEffect(() => {
    if (productId && !loading && product && userProfile?.role === 'client') {
      console.log('Showing welcome message for client:', { 
        hasWelcomeMessage: !!welcomeMessage,
        hasProductDesc: !!product.description,
        productId 
      });
      setShowWelcome(true);
    }
  }, [productId, loading, product, userProfile, welcomeMessage]);

  // Handle navigation from chat links after data is loaded
  useEffect(() => {
    if (searchType && searchId && !loading) {
      console.log('Navigation effect triggered:', { searchType, searchId, videosCount: videos.length });
      
      if (searchType === 'video' && videos.length > 0) {
        console.log('Setting video player view');
        setActiveTab('videos');
        const videoIndex = videos.findIndex(v => v.id === searchId);
        console.log('Found video index:', videoIndex);
        console.log('Available video IDs:', videos.map(v => v.id));
        
        if (videoIndex !== -1) {
          setCurrentVideoIndex(videoIndex);
          setVideoViewMode('player');
          console.log('Video player mode set to: player');
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        } else {
          // Video not found - silently show first video as fallback
          // (This commonly happens during product switching and will self-correct)
          console.warn('Video ID not found, showing first video');
          setCurrentVideoIndex(0);
          setVideoViewMode('player');
          // Toast removed to avoid showing errors during product switches
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        }
      } else if (searchType === 'resource' && resources.length > 0) {
        setActiveTab('resources');
        setTimeout(() => {
          const resourceElement = document.getElementById(`resource-${searchId}`);
          if (resourceElement) {
            resourceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            resourceElement.classList.add('ring-2', 'ring-primary');
            setTimeout(() => {
              resourceElement.classList.remove('ring-2', 'ring-primary');
            }, 3000);
          }
        }, 100);
      } else if (searchType === 'article' && articles.length > 0) {
        setActiveTab('documentation');
        const article = articles.find(a => a.id === searchId);
        if (article) {
          handleArticleSelect(article);
          setTimeout(() => scrollToFirstHighlight(), 100);
        }
      }
    }
  }, [searchType, searchId, loading, videos, resources, articles]);

  const fetchProductAndArticles = async () => {
    try {
      setLoading(true);

      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch resources and release notes
      await fetchResources();
      await fetchVideos();
      await fetchReleaseNotes();

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setUserProfile(profile);

      // For clients, verify they have access to this product
      if (profile?.role === 'client') {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (clientError) {
          console.error('Client lookup error:', clientError);
        }

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
        const { data: accessData, error: accessError } = await supabase
          .from('client_product_access')
          .select('id')
          .eq('client_id', clientData.id)
          .eq('product_id', productId)
          .maybeSingle();

        if (accessError) {
          console.error('Access check error:', accessError);
        }

        if (!accessData) {
          console.log('No access found for client:', clientData.id, 'product:', productId);
          toast({
            title: "Access Denied",
            description: "You don't have access to this product documentation.",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }

        console.log('Client has access to product');
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

      // Fetch welcome message for this product
      const { data: welcomeData, error: welcomeError } = await supabase
        .from('product_welcome_messages')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true)
        .maybeSingle();

      console.log('Welcome message fetch result:', welcomeData, welcomeError);

      if (welcomeData) {
        setWelcomeMessage(welcomeData);
      }

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
        
        // Group articles by extracting categories from title or use default
        const categoryMap = new Map<string, Article[]>();
        articlesData?.forEach(article => {
          // Try to extract category from title (e.g., "Introduction - Getting Started" -> "Introduction")
          const titleParts = article.title.split(' - ');
          const cat = titleParts.length > 1 ? titleParts[0].trim() : 'Documentation';
          
          if (!categoryMap.has(cat)) {
            categoryMap.set(cat, []);
          }
          categoryMap.get(cat)?.push(article);
        });
        
        const categoryGroups: CategoryGroup[] = Array.from(categoryMap.entries()).map(([name, arts]) => ({
          name,
          articles: arts,
          expanded: true
        }));
        
        setCategories(categoryGroups);
        
        // Set first category as selected
        if (categoryGroups.length > 0) {
          setSelectedCategory(categoryGroups[0].name);
        }
        
        // Auto-select first article if available
        if (articlesData && articlesData.length > 0) {
          setSelectedArticle(articlesData[0]);
          generateTableOfContents(articlesData[0]);
        }
      }

      // Highlight search terms if present
      if (highlightTerm) {
        setTimeout(() => scrollToFirstHighlight(), 300);
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

  const fetchResources = async () => {
    if (!productId) return;
    
    try {
      const { data, error } = await supabase
        .from('product_resources')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const fetchVideos = async () => {
    if (!productId) return;
    
    try {
      const { data, error } = await supabase
        .from('product_videos')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const fetchReleaseNotes = async () => {
    if (!productId) return;
    
    try {
      const { data, error } = await supabase
        .from('release_notes')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;
      setReleaseNotes(data || []);
    } catch (error) {
      console.error('Error fetching release notes:', error);
    }
  };

  const logDownload = async (resourceId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (!profileData) return;

      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', profileData.id)
        .maybeSingle();

      await supabase.from('resource_downloads').insert({
        resource_id: resourceId,
        profile_id: profileData.id,
        client_id: clientData?.id || null,
      });
    } catch (error) {
      console.error('Error logging download:', error);
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

  const toggleCategoryExpanded = (categoryName: string) => {
    setCategories(categories.map(cat => 
      cat.name === categoryName ? { ...cat, expanded: !cat.expanded } : cat
    ));
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleWelcomeClose = () => {
    setShowWelcome(false);
  };

  const handleFeatureClick = (tab: 'documentation' | 'resources' | 'videos' | 'releases') => {
    setActiveTab(tab);
    setShowWelcome(false);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const getResourceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sales_deck: 'Sales Deck',
      factsheet: 'Product Factsheet',
      case_study: 'Case Study',
      brochure: 'Product Brochure',
      tutorial: 'Tutorial',
      video: 'Video',
      other: 'Other',
    };
    return labels[type] || type;
  };


  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'sales_deck':
        return Briefcase;
      case 'factsheet':
        return FileSpreadsheet;
      case 'case_study':
        return BookOpen;
      case 'brochure':
        return FileText;
      case 'tutorial':
        return BookOpen;
      default:
        return FileText;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const processVideoContent = (content: string) => {
    if (!content) return '';
    
    // Check for video embed containers and convert them to playable iframes
    if (content.includes('video-embed-container')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const videoContainers = doc.querySelectorAll('.video-embed-container');
      
      let finalContent = content;
      
      videoContainers.forEach((container) => {
        const videoUrl = container.getAttribute('data-video-url');
        const videoType = container.getAttribute('data-video-type');
        const videoId = container.getAttribute('data-video-id');
        
        if (videoUrl && videoType) {
          let playableEmbed = '';
          
          if (videoType === 'youtube' && videoId) {
            playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
              <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1" frameBorder="0" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" title="YouTube Video"></iframe>
            </div>`;
          } else if (videoType === 'vimeo' && videoId) {
            playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
              <iframe src="https://player.vimeo.com/video/${videoId}" frameBorder="0" allowFullScreen allow="autoplay; fullscreen; picture-in-picture" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" title="Vimeo Video"></iframe>
            </div>`;
          } else if (videoType === 'loom' && videoId) {
            playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
              <iframe src="https://www.loom.com/embed/${videoId}" frameBorder="0" allowFullScreen allow="autoplay; fullscreen; picture-in-picture" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" title="Loom Video"></iframe>
            </div>`;
          } else if (videoType === 'heygen' && videoId) {
            playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
              <iframe src="https://share-prod.heygen.com/${videoId}" frameBorder="0" allowFullScreen allow="autoplay; fullscreen; picture-in-picture" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" title="HeyGen Video"></iframe>
            </div>`;
          } else if (videoType === 'direct') {
            playableEmbed = `<div class="video-player-wrapper" style="position: relative; width: 100%;">
              <video controls preload="metadata" style="width: 100%; height: auto; display: block;" crossorigin="anonymous">
                <source src="${videoUrl}" type="video/mp4">
                <source src="${videoUrl}" type="video/webm">
                <source src="${videoUrl}" type="video/ogg">
              </video>
            </div>`;
          }
          
          if (playableEmbed) {
            finalContent = finalContent.replace(container.outerHTML, playableEmbed);
          }
        }
      });
      
      return finalContent;
    }
    
    return content;
  };

  const currentCategoryArticles = categories.find(cat => cat.name === selectedCategory)?.articles || [];
  
  const filteredCategoryArticles = currentCategoryArticles.filter(article =>
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
        <h2 className={`font-semibold ${isMainSection ? 'text-2xl text-foreground mb-4' : 'text-xl text-foreground/90 mb-3'}`}>
          {section.title}
        </h2>
      </div>
    );

    // Handle content based on type or render as rich HTML
    let contentElement;
    if (typeof section.content === 'string' && section.content.includes('<')) {
      // Apply highlighting if search term exists
      const processedContent = highlightTerm 
        ? highlightSearchTerms(section.content, highlightTerm)
        : section.content;
      
      // Rich HTML content
      contentElement = (
        <div 
          dangerouslySetInnerHTML={{ __html: processedContent }}
          className="prose prose-base max-w-none text-foreground/90 leading-relaxed prose-headings:text-foreground prose-p:text-foreground/80 prose-strong:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:bg-muted/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-ul:list-disc prose-ol:list-decimal prose-li:text-foreground/80 [&_iframe]:w-full [&_iframe]:rounded-lg [&_video]:w-full [&_video]:rounded-lg"
        />
      );
    } else {
      // Plain text content
      contentElement = (
        <div className="text-foreground/80 leading-relaxed">
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            {userProfile?.role === 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/product/${productId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {product.icon_url ? (
              <img src={product.icon_url} alt="" className="h-8 w-8" />
            ) : (
              <BookOpen className="h-6 w-6 text-primary" />
            )}
            <h1 className="text-xl font-semibold text-foreground">{product.name}</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-10 h-9 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {userProfile && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{userProfile.full_name || userProfile.email}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            {userProfile?.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/product/${productId}/resources`)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Resources
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Main Navigation Tabs */}
        <div className="px-6 border-t border-border">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('resources')}
              className={`py-3 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'resources'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Sales and Marketing Material
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`py-3 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'videos'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Video tutorials
            </button>
            <button
              onClick={() => setActiveTab('documentation')}
              className={`py-3 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'documentation'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              User Manual
            </button>
            <button
              onClick={() => setActiveTab('releases')}
              className={`py-3 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'releases'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Release Notes
            </button>
          </div>
        </div>
        
        {/* Category Tabs - Only show when Documentation tab is active */}
        
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Navigation (only for documentation) */}
        {activeTab === 'documentation' && (
          <aside className="w-72 border-r border-border bg-background overflow-y-auto">
            <div className="p-4">
            {categories.map((category) => (
              <div key={category.name} className="mb-4">
                <button
                  onClick={() => toggleCategoryExpanded(category.name)}
                  className="flex items-center justify-between w-full p-2 text-sm font-semibold text-foreground hover:bg-muted rounded transition-colors"
                >
                  <span>{category.name}</span>
                  {category.expanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                
                {category.expanded && (
                  <div className="mt-1 ml-2 space-y-1">
                    {category.articles.map((article) => {
                      // Clean up title by removing category prefix if present
                      const displayTitle = article.title.includes(' - ') 
                        ? article.title.split(' - ').slice(1).join(' - ')
                        : article.title;
                      
                      return (
                        <button
                          key={article.id}
                          onClick={() => handleArticleSelect(article)}
                          className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
                            selectedArticle?.id === article.id
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{displayTitle}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            
              {categories.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No articles available</p>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {activeTab === 'documentation' ? (
            <div className="max-w-3xl mx-auto px-8 py-8">
              {selectedArticle ? (
              <div className="animate-fade-in">
                {/* Category Badge */}
                <div className="mb-4">
                  <span className="text-sm text-primary font-medium">
                    {selectedCategory}
                  </span>
                </div>

                {/* Article Title */}
                <h1 className="text-4xl font-bold text-foreground mb-6">
                  {selectedArticle.title.includes(' - ') 
                    ? selectedArticle.title.split(' - ').slice(1).join(' - ')
                    : selectedArticle.title}
                </h1>

                {/* Article Description (if exists in content) */}
                {selectedArticle.content && Array.isArray(selectedArticle.content) && selectedArticle.content[0]?.description && (
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    {selectedArticle.content[0].description}
                  </p>
                )}

                {/* Article Content */}
                <div className="prose prose-base max-w-none">
                  {renderArticleContent(selectedArticle.content)}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    Welcome to {product.name} Documentation
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {product.description || 'Select an article from the sidebar to get started'}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {filteredCategoryArticles.length > 0 && (
                      <Button onClick={() => handleArticleSelect(filteredCategoryArticles[0])}>
                        Start Reading
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('resources')}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      View Resources
                    </Button>
                  </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'resources' ? (
            <div className="container mx-auto px-8 py-8">
              {resources.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    No Resources Available
                  </h2>
                  <p className="text-muted-foreground">
                    Document resources like product factsheets, sales materials, and tutorials will appear here once they are uploaded.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Document Resources</h1>
                    <p className="text-muted-foreground">
                      Download product factsheets, sales materials, brochures, and other documents
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resources.map((resource) => {
                      const ResourceIcon = getResourceIcon(resource.resource_type);
                      return (
                        <div
                          key={resource.id}
                          id={`resource-${resource.id}`}
                          className="border border-border rounded-lg p-6 hover:border-primary/50 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                              <ResourceIcon className="h-8 w-8 text-primary" />
                            </div>
                            <span className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
                              {getResourceTypeLabel(resource.resource_type)}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {resource.title}
                          </h3>
                          {resource.description && (
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                              {resource.description}
                            </p>
                          )}
                          <div className="space-y-1 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
                            <div className="flex justify-between">
                              <span>Type:</span>
                              <span className="font-medium">{resource.file_type?.toUpperCase() || 'PDF'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Size:</span>
                              <span className="font-medium">{formatFileSize(resource.file_size)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Product:</span>
                              <span className="font-medium truncate ml-2">{product.name}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={async () => {
                                  try {
                                    await logDownload(resource.id);
                                    const response = await fetch(resource.file_url);
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = resource.file_name;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                  } catch (error) {
                                    console.error('Download error:', error);
                                    toast({
                                      title: "Download Failed",
                                      description: "Failed to download the file.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  navigator.clipboard.writeText(resource.file_url);
                                  toast({
                                    title: "Link Copied",
                                    description: "Shareable link copied to clipboard.",
                                  });
                                }}
                              >
                                <Share2 className="h-4 w-4 mr-2" />
                                Share Link
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'videos' ? (
            <div className="w-full">
              {videos.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    No Videos Available
                  </h2>
                  <p className="text-muted-foreground">
                    Video resources will appear here once they are uploaded.
                  </p>
                </div>
              ) : (
                <div className="w-full">
                  {/* View Toggle Bar */}
                  <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40 px-8 py-3">
                    <div className="flex items-center justify-center relative">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={videoViewMode === 'library' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            console.log('Switching to library view');
                            setVideoViewMode('library');
                          }}
                        >
                          <Grid3x3 className="h-4 w-4 mr-2" />
                          Library View
                        </Button>
                        <Button
                          variant={videoViewMode === 'player' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            console.log('Switching to player view');
                            setVideoViewMode('player');
                          }}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Player View
                        </Button>
                      </div>
                      <div className="absolute right-0 text-sm text-muted-foreground">
                        {videos.length} video{videos.length !== 1 ? 's' : ''} available
                      </div>
                    </div>
                  </div>

                  {/* Video Library View */}
                  {videoViewMode === 'library' ? (
                    <VideoLibrary 
                      videos={videos} 
                      onVideoSelect={(index) => {
                        setCurrentVideoIndex(index);
                        setVideoViewMode('player');
                        setShowCompletion(false);
                      }}
                    />
                   ) : (
                    /* Video Player View */
                    <div className="w-full p-8">
                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">
                            Video {currentVideoIndex + 1} of {videos.length}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(((currentVideoIndex + 1) / videos.length) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-300 ease-in-out"
                            style={{ width: `${((currentVideoIndex + 1) / videos.length) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Current Video */}
                      <div className="w-full mb-6">
                        <div 
                          dangerouslySetInnerHTML={{ __html: processVideoContent(videos[currentVideoIndex].video_content) }}
                          className="w-full [&_iframe]:w-full [&_iframe]:h-[80vh] [&_iframe]:border-0 [&_video]:w-full [&_video]:h-auto [&_.video-player-wrapper]:my-0 [&_.video-player-wrapper]:rounded-none [&_p]:hidden"
                        />
                        <div className="p-6 bg-card">
                          <h2 className="text-2xl font-bold text-foreground mb-2">{videos[currentVideoIndex].title}</h2>
                          <p className="text-sm text-muted-foreground">
                            {new Date(videos[currentVideoIndex].created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Navigation Buttons */}
                      <div className="flex items-center justify-between gap-4">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => {
                            setCurrentVideoIndex(Math.max(0, currentVideoIndex - 1));
                            setShowCompletion(false);
                          }}
                          disabled={currentVideoIndex === 0}
                          className="flex-1"
                        >
                          <ChevronLeft className="h-5 w-5 mr-2" />
                          Previous Video
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => {
                            const nextIndex = Math.min(videos.length - 1, currentVideoIndex + 1);
                            setCurrentVideoIndex(nextIndex);
                            if (nextIndex === videos.length - 1) {
                              setTimeout(() => setShowCompletion(true), 1000);
                            }
                          }}
                          disabled={currentVideoIndex === videos.length - 1}
                          className="flex-1"
                        >
                          Next Video
                          <ChevronRight className="h-5 w-5 ml-2" />
                        </Button>
                      </div>

                      {/* Completion Animation */}
                      {showCompletion && currentVideoIndex === videos.length - 1 && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
                          <div className="bg-card border-2 border-primary rounded-2xl p-12 text-center max-w-2xl mx-4 animate-scale-in shadow-2xl">
                            <div className="mb-6 text-6xl animate-pulse">🎉</div>
                            <h2 className="text-4xl font-bold text-foreground mb-4">
                              Thank You!
                            </h2>
                            <p className="text-xl text-muted-foreground mb-8">
                              You've completed the video tour for the platform
                            </p>
                            <div className="flex gap-4 justify-center">
                              <Button 
                                size="lg"
                                onClick={() => setShowCompletion(false)}
                                className="hover-scale"
                              >
                                Continue Exploring
                              </Button>
                              <Button 
                                size="lg"
                                variant="outline"
                                onClick={() => {
                                  setCurrentVideoIndex(0);
                                  setShowCompletion(false);
                                }}
                                className="hover-scale"
                              >
                                Watch Again
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Release Notes Tab */}
          {activeTab === 'releases' && (
            <div className="px-6 py-8">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground mb-2">Release Notes</h2>
                    <p className="text-muted-foreground">
                      View product updates, new features, and improvements
                    </p>
                  </div>
                  {userProfile?.role === 'admin' && (
                    <Button onClick={() => navigate(`/product/${productId}/release-notes/new`)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Release Note
                    </Button>
                  )}
                </div>

                {releaseNotes.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-lg">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground mb-2">No release notes yet</p>
                    <p className="text-sm text-muted-foreground">
                      Release notes will appear here when published
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {releaseNotes.map((release: any) => (
                      <div
                        key={release.id}
                        className="border border-border rounded-lg p-6 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => setSelectedRelease(release)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                              {release.title}
                            </h3>
                            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                              {release.version && (
                                <span className="px-2 py-1 bg-primary/10 text-primary rounded-md font-medium">
                                  v{release.version}
                                </span>
                              )}
                              <span>
                                {new Date(release.published_at || release.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {release.content && Array.isArray(release.content) && release.content.length > 0 && (
                            <div className="line-clamp-3">
                              {release.content[0]?.title}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar - Table of Contents (only for documentation with selected article) */}
        {activeTab === 'documentation' && selectedArticle && tableOfContents.length > 0 && (
          <aside className="w-64 border-l border-border bg-background overflow-y-auto">
            <div className="p-6 sticky top-0">
              <div className="flex items-center space-x-2 mb-4">
                <Menu className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  On this page
                </h3>
              </div>
              
              <nav className="space-y-1">
                {tableOfContents.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full text-left text-sm py-1.5 transition-colors hover:text-primary ${
                      item.level === 0 
                        ? 'font-medium text-foreground' 
                        : 'ml-4 text-muted-foreground'
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

      {/* Welcome Dialog */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="max-w-4xl border-0 bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden backdrop-blur-xl">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-primary/15 via-primary/8 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
          </div>
          
          <DialogHeader className="relative text-center space-y-8 pt-12 pb-6">
            {/* Product Logo/Icon with enhanced styling */}
            <div className="flex justify-center mb-4">
              {product.icon_url ? (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-primary/40 blur-3xl opacity-50 group-hover:opacity-70 transition-all duration-700 animate-pulse" />
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-background/80 via-background/60 to-background/40 backdrop-blur-md border-2 border-primary/30 shadow-2xl transform group-hover:scale-110 transition-all duration-500 hover:border-primary/50">
                    <img 
                      src={product.icon_url} 
                      alt={product.name} 
                      className="h-28 w-28 object-contain animate-fade-in drop-shadow-2xl"
                    />
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-primary/40 blur-3xl opacity-50 group-hover:opacity-70 transition-all duration-700 animate-pulse" />
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 shadow-2xl transform group-hover:scale-110 transition-all duration-500 border-2 border-primary/20">
                    <Sparkles className="h-28 w-28 text-primary-foreground animate-pulse drop-shadow-2xl" />
                  </div>
                </div>
              )}
            </div>
            
            {/* Dynamic Title - Center Aligned */}
            <DialogTitle className="text-5xl font-extrabold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent animate-fade-in leading-tight px-4 text-center">
              {welcomeMessage?.title || `Welcome to ${product.name}`}
            </DialogTitle>
            
            {/* Dynamic Description - Center Aligned */}
            <DialogDescription className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed px-6 animate-fade-in font-medium text-center">
              {welcomeMessage?.description || product.description || 
                `Explore comprehensive documentation, resources, and guides to help you get the most out of ${product.name}. Everything you need is organized and ready for you.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative space-y-10 py-8 px-4">
            {/* Feature Cards - only show if enabled */}
            {(welcomeMessage?.show_features !== false) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6">
                <button
                  onClick={() => handleFeatureClick('documentation')}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-background/80 via-background/60 to-primary/5 p-6 border-2 border-border/50 hover:border-primary/60 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 animate-scale-in hover:-translate-y-1 cursor-pointer text-left"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-start space-x-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-500 shadow-lg">
                      <BookOpen className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base text-foreground mb-2 group-hover:text-primary transition-colors duration-300">Documentation</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">Step-by-step guides and comprehensive tutorials</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleFeatureClick('resources')}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-background/80 via-background/60 to-primary/5 p-6 border-2 border-border/50 hover:border-primary/60 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 animate-scale-in hover:-translate-y-1 cursor-pointer text-left"
                  style={{ animationDelay: '0.1s' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-start space-x-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-500 shadow-lg">
                      <FileText className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base text-foreground mb-2 group-hover:text-primary transition-colors duration-300">Resources</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">Downloadable files and essential materials</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleFeatureClick('videos')}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-background/80 via-background/60 to-primary/5 p-6 border-2 border-border/50 hover:border-primary/60 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 animate-scale-in hover:-translate-y-1 cursor-pointer text-left"
                  style={{ animationDelay: '0.2s' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-start space-x-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-500 shadow-lg">
                      <Video className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base text-foreground mb-2 group-hover:text-primary transition-colors duration-300">Video Tutorials</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">Engaging visual learning content</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleFeatureClick('releases')}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-background/80 via-background/60 to-primary/5 p-6 border-2 border-border/50 hover:border-primary/60 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 animate-scale-in hover:-translate-y-1 cursor-pointer text-left"
                  style={{ animationDelay: '0.3s' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-start space-x-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-500 shadow-lg">
                      <Sparkles className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base text-foreground mb-2 group-hover:text-primary transition-colors duration-300">Release Notes</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">Latest updates and new features</p>
                    </div>
                  </div>
                </button>
              </div>
            )}
            
            {/* CTA Button */}
            <div className="px-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <Button 
                onClick={handleWelcomeClose}
                className="w-full h-16 text-lg font-bold bg-gradient-to-r from-primary via-primary/95 to-primary/90 hover:from-primary/95 hover:via-primary/90 hover:to-primary/85 shadow-2xl hover:shadow-primary/40 transition-all duration-500 group border-2 border-primary/20 hover:border-primary/40 hover:scale-[1.02]"
                size="lg"
              >
                <BookOpen className="h-6 w-6 mr-3 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500" />
                {welcomeMessage?.custom_button_text || 'Get Started - View Documentation'}
                <ChevronRight className="h-6 w-6 ml-3 group-hover:translate-x-2 transition-transform duration-500" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Release Note Detail Dialog */}
      <Dialog open={!!selectedRelease} onOpenChange={() => setSelectedRelease(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {selectedRelease && (
            <>
              <DialogHeader>
                <div className="space-y-2">
                  <DialogTitle className="text-2xl">{selectedRelease.title}</DialogTitle>
                  <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                    {selectedRelease.version && (
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-md font-medium">
                        Version {selectedRelease.version}
                      </span>
                    )}
                    <span>
                      {new Date(selectedRelease.published_at || selectedRelease.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-8 mt-6">
                {selectedRelease.content && Array.isArray(selectedRelease.content) && 
                  selectedRelease.content.map((section: any) => {
                    // Apply highlighting if search term exists
                    const processedContent = highlightTerm && section.content
                      ? highlightSearchTerms(section.content, highlightTerm)
                      : section.content;
                    
                    return (
                      <div key={section.id} className="space-y-4">
                        <h3 className="text-xl font-semibold text-foreground">{section.title}</h3>
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: processedContent }}
                        />
                      </div>
                    );
                  })
                }
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog open={!!viewingResource} onOpenChange={() => setViewingResource(null)}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle>{viewingResource?.title}</DialogTitle>
            <DialogDescription>
              {viewingResource?.description || 'Preview document'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {viewingResource && (
              <PDFViewer 
                url={viewingResource.file_url} 
                title={viewingResource.title}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default ProductDocs;
