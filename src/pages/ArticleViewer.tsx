import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, ChevronRight, BookOpen, Home, FileText, Users, Settings } from 'lucide-react';
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

  // Mock data - replace with actual data fetching
  useEffect(() => {
    const mockArticle: Article = {
      id: articleId || '1',
      title: 'Stripe Integration',
      subtitle: 'How to set up payments in your app using our Stripe integration',
      category: 'Integrations',
      content: `
        <div class="article-banner">
          <div class="banner-content">
            <h1>Stripe Integration</h1>
            <p>Complete guide to implementing Stripe payments</p>
          </div>
        </div>
        
        <p>Lovable now lets you set up Stripe entirely through <strong>chat</strong>.</p>
        
        <h2 id="chat-driven-setup">Chat-driven auto-setup (recommended)</h2>
        <p>After you connect <strong>Supabase</strong> and save your <strong>Stripe Secret Key</strong> via <strong>Add API Key</strong>, just describe what you need:</p>
        
        <ul>
          <li>"Add three subscription tiers..."</li>
          <li>"Create a one-time checkout for $99"</li>
          <li>"Set up a donation form"</li>
        </ul>
        
        <p>Lovable generates the perfect Stripe integration, creates the database tables with RLS, and UI components automatically.</p>
      `,
      sections: [
        { title: 'Key Takeaways', content: 'Main points from this article' },
        { title: 'Requirements', content: 'What you need before starting' },
        { title: 'Setup Process', content: 'Step-by-step implementation' }
      ],
      createdAt: '2024-01-15',
      updatedAt: '2024-01-20'
    };
    
    setArticle(mockArticle);
    
    // Generate table of contents
    const headings = [
      { title: 'Key Takeaways', id: 'key-takeaways' },
      { title: 'Requirements', id: 'requirements' },
      { title: 'Chat-driven Setup', id: 'chat-driven-setup' },
      { title: 'Advanced Integration', id: 'advanced-integration' },
      { title: 'Debugging & Troubleshooting', id: 'debugging' }
    ];
    setTableOfContents(headings);
  }, [articleId]);

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

            {/* Article Content */}
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: article.content }} />
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