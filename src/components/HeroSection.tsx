import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, BookOpen, Users, MessageCircle, Plus, FileText, Package, Megaphone, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  id: string;
  type: 'article' | 'resource' | 'release';
  title: string;
  description?: string;
  productId: string;
  productName?: string;
  category?: string;
}

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const stats = [
    { icon: BookOpen, label: "Training Videos", value: "11+" },
    { icon: Users, label: "Happy Users", value: "10K+" },
    { icon: MessageCircle, label: "Tickets Resolved", value: "25K+" },
  ];

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);

      try {
        const searchTerm = `%${searchQuery}%`;

        // Search articles - search title only, then filter content in JS
        const { data: articles } = await supabase
          .from('articles')
          .select(`
            id,
            title,
            content,
            product_id,
            products (name, category)
          `)
          .eq('status', 'published')
          .ilike('title', searchTerm)
          .limit(20);

        // Search resources
        const { data: resources } = await supabase
          .from('product_resources')
          .select(`
            id,
            title,
            description,
            product_id,
            products (name, category)
          `)
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(10);

        // Search release notes - search title and version only, then filter content in JS
        const { data: releases } = await supabase
          .from('release_notes')
          .select(`
            id,
            title,
            version,
            content,
            product_id,
            products (name, category)
          `)
          .eq('status', 'published')
          .or(`title.ilike.${searchTerm},version.ilike.${searchTerm}`)
          .limit(20);

        const allResults: SearchResult[] = [];

        if (articles) {
          articles.forEach((article: any) => {
            const contentStr = JSON.stringify(article.content || '').toLowerCase();
            const matchesContent = contentStr.includes(searchQuery.toLowerCase());
            const matchesTitle = article.title.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (matchesTitle || matchesContent) {
              allResults.push({
                id: article.id,
                type: 'article',
                title: article.title,
                productId: article.product_id,
                productName: article.products?.name,
                category: article.products?.category,
              });
            }
          });
        }

        if (resources) {
          resources.forEach((resource: any) => {
            allResults.push({
              id: resource.id,
              type: 'resource',
              title: resource.title,
              description: resource.description,
              productId: resource.product_id,
              productName: resource.products?.name,
              category: resource.products?.category,
            });
          });
        }

        if (releases) {
          releases.forEach((release: any) => {
            const contentStr = JSON.stringify(release.content || '').toLowerCase();
            const matchesContent = contentStr.includes(searchQuery.toLowerCase());
            const matchesTitle = release.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesVersion = release.version?.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (matchesTitle || matchesVersion || matchesContent) {
              allResults.push({
                id: release.id,
                type: 'release',
                title: release.title,
                description: release.version,
                productId: release.product_id,
                productName: release.products?.name,
                category: release.products?.category,
              });
            }
          });
        }

        setResults(allResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleResultClick = (result: SearchResult) => {
    const query = searchQuery;
    setIsOpen(false);
    setSearchQuery("");
    setResults([]);

    switch (result.type) {
      case 'article':
        navigate(`/docs/${result.productId}/${result.id}?search=${encodeURIComponent(query)}`);
        break;
      case 'resource':
        navigate(`/product/${result.productId}/docs?search=${encodeURIComponent(query)}&type=resource&id=${result.id}`);
        break;
      case 'release':
        navigate(`/product/${result.productId}/docs?search=${encodeURIComponent(query)}&type=release&id=${result.id}`);
        break;
    }
  };

  const handleSearch = () => {
    if (searchQuery.length >= 2) {
      setIsOpen(true);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'article':
        return <FileText className="h-4 w-4" />;
      case 'resource':
        return <Package className="h-4 w-4" />;
      case 'release':
        return <Megaphone className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'article':
        return 'Article';
      case 'resource':
        return 'Resource';
      case 'release':
        return 'Release Note';
      default:
        return type;
    }
  };

  return (
    <section className="relative py-20 px-4 bg-gradient-hero overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20"></div>
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary-glow/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center space-y-8">
          {/* Main Heading */}
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              {user ? (
                <>
                  Welcome back,{" "}
                  <span className="text-primary-glow">{profile?.full_name?.split(' ')[0] || 'User'}</span>
                </>
              ) : (
                <>
                  Welcome to{" "}
                  <span className="text-primary-glow">Thomas Accredited Help Center</span>
                </>
              )}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              {user 
                ? `${isAdmin ? 'Manage your help center and support your clients' : 'Find answers and get the support you need'}`
                : 'Find answers, get support, and discover everything you need to succeed with our products'
              }
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto animate-slide-up">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input 
                placeholder={user ? "Search your documentation..." : "What can we help you with today?"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-12 pr-4 py-6 text-lg bg-white/95 backdrop-blur border-0 rounded-2xl shadow-2xl focus-visible:ring-2 focus-visible:ring-white/50"
              />
              <Button 
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-button text-white border-0 rounded-xl px-6"
              >
                Search
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          {user && (
            <div className="flex flex-wrap justify-center gap-3 animate-slide-up">
              {isAdmin 
                ? ["Client Management", "Documentation Editor", "Analytics", "Settings"].map((link) => (
                    <Button key={link} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur">
                      {link}
                    </Button>
                  ))
                : ["Getting Started", "My Products", "Support Tickets", "FAQ"].map((link) => (
                    <Button key={link} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur">
                      {link}
                    </Button>
                  ))
              }
            </div>
          )}

          {/* Actions */}
          {user ? (
            <div className="flex justify-center gap-4 mt-8 animate-slide-up">
              {isAdmin ? (
                <>
                  <Link to="/clients">
                    <Button 
                      variant="outline" 
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Manage Clients
                    </Button>
                  </Link>
                  <Link to="/products">
                    <Button 
                      className="bg-gradient-button text-white border-0 shadow-lg hover:shadow-xl"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Manage Products
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Get Support
                  </Button>
                  <Button 
                    className="bg-gradient-button text-white border-0 shadow-lg hover:shadow-xl"
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Browse Documentation
                  </Button>
                </>
              )}
            </div>
          ) : (
            <></>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 animate-slide-up">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur border-white/20 card-hover">
                <CardContent className="p-6 text-center">
                  <stat.icon className="h-8 w-8 text-white mx-auto mb-3" />
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-white/80">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Search Results Dialog */}
      <Dialog open={isOpen && searchQuery.length >= 2} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setSearchQuery("");
          setResults([]);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Results
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] pr-4">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No results found for "{searchQuery}"
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-muted-foreground">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{result.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {getTypeLabel(result.type)}
                          </Badge>
                        </div>
                        {result.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {result.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {result.productName && (
                            <>
                              <span>{result.productName}</span>
                              {result.category && (
                                <>
                                  <span>•</span>
                                  <span>{result.category}</span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default HeroSection;