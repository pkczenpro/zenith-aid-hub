import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Package, Megaphone, Loader2, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SearchResult {
  id: string;
  type: 'article' | 'resource' | 'release' | 'video';
  title: string;
  description?: string;
  productId: string;
  productName?: string;
  category?: string;
}

export const GlobalSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.length < 2) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      setShowDropdown(true);

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

        // Search videos
        const { data: videos } = await supabase
          .from('product_videos')
          .select(`
            id,
            title,
            caption,
            product_id,
            products (name, category)
          `)
          .or(`title.ilike.${searchTerm},caption.ilike.${searchTerm}`)
          .limit(10);

        const allResults: SearchResult[] = [];

        // Process articles - filter by content in JS
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

        // Process release notes - filter by content in JS
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

        // Process videos
        if (videos) {
          videos.forEach((video: any) => {
            allResults.push({
              id: video.id,
              type: 'video',
              title: video.title,
              description: video.caption,
              productId: video.product_id,
              productName: video.products?.name,
              category: video.products?.category,
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
    setShowDropdown(false);
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
      case 'video':
        navigate(`/product/${result.productId}/docs?tab=videos&search=${encodeURIComponent(query)}&type=video&id=${result.id}`);
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
      case 'video':
        return <Video className="h-4 w-4" />;
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
      case 'video':
        return 'Video';
      default:
        return type;
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
      <Input
        type="text"
        placeholder="Search documentation, resources, videos, releases..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
      />

      {showDropdown && searchQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg z-50 max-h-[400px] overflow-hidden">
          <ScrollArea className="max-h-[400px]">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground px-4">
                No results found for "{searchQuery}"
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-muted-foreground">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate text-sm">{result.title}</h4>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {getTypeLabel(result.type)}
                          </Badge>
                        </div>
                        {result.description && (
                          <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
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
        </div>
      )}
    </div>
  );
};
