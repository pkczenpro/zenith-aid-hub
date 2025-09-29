import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Package, Megaphone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SearchResult {
  id: string;
  type: 'article' | 'resource' | 'release';
  title: string;
  description?: string;
  productId: string;
  productName?: string;
  category?: string;
}

export const GlobalSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);

      try {
        const searchTerm = `%${searchQuery}%`;

        // Search articles (title and content)
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
          .or(`title.ilike.${searchTerm},content::text.ilike.${searchTerm}`)
          .limit(10);

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

        // Search release notes (title, version, and content)
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
          .or(`title.ilike.${searchTerm},version.ilike.${searchTerm},content::text.ilike.${searchTerm}`)
          .limit(10);

        const allResults: SearchResult[] = [];

        // Process articles
        if (articles) {
          articles.forEach((article: any) => {
            allResults.push({
              id: article.id,
              type: 'article',
              title: article.title,
              productId: article.product_id,
              productName: article.products?.name,
              category: article.products?.category,
            });
          });
        }

        // Process resources
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

        // Process release notes
        if (releases) {
          releases.forEach((release: any) => {
            allResults.push({
              id: release.id,
              type: 'release',
              title: release.title,
              description: release.version,
              productId: release.product_id,
              productName: release.products?.name,
              category: release.products?.category,
            });
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
    <>
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Search documentation, resources, releases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>

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
    </>
  );
};
