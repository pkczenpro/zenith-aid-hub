import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, ChevronRight, BookOpen, Home, FileText, Users, Settings, Edit3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface Article {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  content: string;
  sections: { title: string; content: string }[];
  createdAt: string;
  updatedAt: string;
}

const ArticleViewer = () => {
  const { productId, articleId } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableOfContents, setTableOfContents] = useState<{ title: string; id: string }[]>([]);

  // Load saved article data from localStorage (in a real app, this would be from an API)
  useEffect(() => {
    const savedArticleKey = `article-${productId}-${articleId}`;
    const savedArticleData = localStorage.getItem(savedArticleKey);
    
    if (savedArticleData) {
      try {
        const parsedData = JSON.parse(savedArticleData);
        const loadedArticle: Article = {
          id: articleId || '1',
          title: parsedData.title || 'Untitled Article',
          subtitle: parsedData.subtitle || 'Documentation article',
          category: getProductCategory(productId),
          content: '', // We'll use sections instead
          sections: parsedData.sections || [],
          createdAt: parsedData.createdAt || new Date().toISOString().split('T')[0],
          updatedAt: parsedData.updatedAt || new Date().toISOString().split('T')[0]
        };
        
        setArticle(loadedArticle);
        
        // Generate table of contents from actual sections
        const toc = parsedData.sections?.map((section: any, index: number) => ({
          title: section.title,
          id: `section-${index + 1}`
        })) || [];
        
        setTableOfContents(toc);
      } catch (error) {
        console.error('Error loading article data:', error);
        // Fall back to empty article
        setArticle({
          id: articleId || '1',
          title: 'No Article Found',
          subtitle: 'This article hasn\'t been created yet',
          category: getProductCategory(productId),
          content: '',
          sections: [],
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0]
        });
        setTableOfContents([]);
      }
    } else {
      // No saved data, show empty state
      setArticle({
        id: articleId || '1',
        title: 'No Article Found',
        subtitle: 'This article hasn\'t been created yet',
        category: getProductCategory(productId),
        content: '',
        sections: [],
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      });
      setTableOfContents([]);
    }
  }, [articleId, productId]);

  // Helper function to get product category name
  const getProductCategory = (productId: string | undefined) => {
    const productMap: { [key: string]: string } = {
      'mobile': 'Mobile App',
      'web': 'Web Platform',
      'cloud': 'Cloud Services',
      'security': 'Security Suite',
      'analytics': 'Analytics',
      'api': 'API & Integrations'
    };
    return productMap[productId || ''] || 'Documentation';
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

  if (!article) {
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
              <span className="text-primary font-medium">{article.category}</span>
            </nav>

            {/* Article Header */}
            <div className="mb-8">
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {article.category}
                </span>
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">{article.title}</h1>
              <p className="text-xl text-muted-foreground">{article.subtitle}</p>
            </div>

            {/* Article Banner */}
            <div className="mb-8 bg-gradient-to-br from-background to-muted/50 border border-border rounded-lg p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5"></div>
              <div className="relative z-10 flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-6 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 via-red-400 to-pink-400 rounded-full flex items-center justify-center transform rotate-12">
                      <div className="w-8 h-8 bg-white rounded-full"></div>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">stripe</span>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Integration Setup</h2>
                  <p className="text-muted-foreground">Connect your application with Stripe payments</p>
                </div>
              </div>
            </div>

            {/* Article Content - Show actual sections from editor */}
            <div className="space-y-8">
              {article.sections && article.sections.length > 0 ? (
                article.sections.map((section, index) => (
                  <div key={index} className="animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                    <div className="flex items-center mb-6" id={`section-${index + 1}`}>
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center text-white text-sm font-bold mr-4">
                        {index + 1}
                      </div>
                      <h2 className="text-2xl font-semibold text-primary flex-1 border-b border-primary/20 pb-2">
                        {section.title}
                      </h2>
                    </div>
                    <div className="ml-12">
                      <div 
                        dangerouslySetInnerHTML={{ __html: section.content }}
                        className="prose prose-lg max-w-none text-foreground/90 leading-relaxed"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 bg-gradient-to-br from-background to-muted/10 rounded-lg border border-border/50">
                  <div className="max-w-md mx-auto">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No Content Available</h3>
                    <p className="text-muted-foreground mb-6">
                      This article hasn't been created yet. Go to the product editor to create content for this documentation.
                    </p>
                    <Link 
                      to={`/product/${productId}`}
                      className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Create Article
                    </Link>
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