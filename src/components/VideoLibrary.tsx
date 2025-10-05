import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Play, Clock, Search, Calendar, X, List } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Video {
  id: string;
  title: string;
  caption?: string;
  video_content: string;
  created_at: string;
  order_index?: number;
  thumbnail_url?: string;
  category_id?: string;
}

interface VideoCategory {
  id: string;
  name: string;
  description?: string;
  order_index: number;
}

interface VideoLibraryProps {
  videos: Video[];
  categories?: VideoCategory[];
  onVideoSelect: (videoIndex: number) => void;
}

const VideoLibrary = ({ videos, categories = [], onVideoSelect }: VideoLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("oldest");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const extractThumbnail = (videoContent: string): string | null => {
    // Extract video ID from content for thumbnail generation
    if (videoContent.includes('youtube.com') || videoContent.includes('youtu.be')) {
      const match = videoContent.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
    if (videoContent.includes('vimeo.com')) {
      // Vimeo thumbnails require API call, using placeholder
      return null;
    }
    if (videoContent.includes('loom.com')) {
      const match = videoContent.match(/loom\.com\/embed\/([a-zA-Z0-9]+)/);
      if (match) return `https://cdn.loom.com/sessions/thumbnails/${match[1]}-00001.jpg`;
    }
    return null;
  };

  // Get unique months from videos
  const availableMonths = useMemo(() => {
    const months = videos.map(video => {
      const date = new Date(video.created_at);
      return {
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      };
    });
    const uniqueMonths = Array.from(
      new Map(months.map(m => [m.value, m])).values()
    );
    return uniqueMonths.sort((a, b) => b.value.localeCompare(a.value));
  }, [videos]);

  // Filter and sort videos
  const filteredVideos = useMemo(() => {
    let filtered = videos.filter(video => {
      const matchesSearch = 
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (video.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      const matchesMonth = selectedMonth 
        ? `${new Date(video.created_at).getFullYear()}-${String(new Date(video.created_at).getMonth() + 1).padStart(2, '0')}` === selectedMonth
        : true;

      const matchesCategory = selectedCategoryId 
        ? video.category_id === selectedCategoryId
        : true;

      return matchesSearch && matchesMonth && matchesCategory;
    });

    // Sort videos
    filtered.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        return a.title.localeCompare(b.title);
      }
    });

    return filtered;
  }, [videos, searchQuery, sortBy, selectedMonth, selectedCategoryId]);

  // Group videos by category
  const groupedVideos = useMemo(() => {
    const groups: Record<string, Video[]> = {};
    
    filteredVideos.forEach(video => {
      const categoryId = video.category_id || 'uncategorized';
      if (!groups[categoryId]) {
        groups[categoryId] = [];
      }
      groups[categoryId].push(video);
    });

    // Sort categories: first by order_index (if available), then uncategorized last
    const sortedGroups = Object.entries(groups).sort((a, b) => {
      const catA = categories.find(c => c.id === a[0]);
      const catB = categories.find(c => c.id === b[0]);
      
      if (a[0] === 'uncategorized') return 1;
      if (b[0] === 'uncategorized') return -1;
      
      const orderA = catA?.order_index ?? 999;
      const orderB = catB?.order_index ?? 999;
      
      return orderA - orderB;
    });

    return sortedGroups;
  }, [filteredVideos, categories]);

  return (
    <div className="flex w-full">
      {/* Left Sidebar - Video List Navigation */}
      <aside className="w-80 border-r border-border bg-muted/30 p-4 space-y-4 h-[calc(100vh-80px)] overflow-y-auto sticky top-0">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <List className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Video List</h2>
          </div>

          {/* Video Title List */}
          <div className="space-y-2">
            {filteredVideos.map((video, index) => {
              const originalIndex = videos.findIndex(v => v.id === video.id);
              return (
                <Button
                  key={video.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-3 px-3 hover:bg-primary/10"
                  onClick={() => onVideoSelect(originalIndex)}
                >
                  <div className="flex gap-3 items-start w-full">
                    <Badge variant="secondary" className="shrink-0 mt-0.5">
                      {index + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2">
                        {video.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(video.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Date Filter */}
          {availableMonths.length > 1 && (
            <div className="space-y-3 pt-6 border-t border-border mt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Filter by Date</span>
              </div>
              <div className="space-y-2">
                <Button
                  variant={!selectedMonth ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSelectedMonth(null)}
                >
                  All Dates
                </Button>
                {availableMonths.map((month) => (
                  <Button
                    key={month.value}
                    variant={selectedMonth === month.value ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => setSelectedMonth(month.value)}
                  >
                    {month.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-border mt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <List className="h-4 w-4" />
                <span>Filter by Category</span>
              </div>
              <div className="space-y-2">
                <Button
                  variant={!selectedCategoryId ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSelectedCategoryId(null)}
                >
                  All Categories
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategoryId === category.id ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => setSelectedCategoryId(category.id)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Video Count */}
        <div className="pt-6 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredVideos.length}</span> of{" "}
            <span className="font-semibold text-foreground">{videos.length}</span> videos
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Video Library</h1>
              <p className="text-sm text-muted-foreground">
                Browse all training videos and tutorials
              </p>
            </div>

            {/* Sort Options on Right */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort:</span>
              <Select value={sortBy} onValueChange={(value: "newest" | "oldest" | "title") => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="title">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search videos by title or description..."
              className="pl-10 h-10 bg-background border-border text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <Play className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No videos found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedMonth
                ? "Try adjusting your filters or search query"
                : "No videos available at the moment"}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedVideos.map(([categoryId, categoryVideos]) => {
              const category = categories.find(c => c.id === categoryId);
              const categoryName = category?.name || 'Uncategorized';
              
              return (
                <div key={categoryId} className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1 bg-primary rounded-full" />
                      <h2 className="text-2xl font-bold text-foreground">{categoryName}</h2>
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      {categoryVideos.length} {categoryVideos.length === 1 ? 'video' : 'videos'}
                    </Badge>
                  </div>
                  
                  {category?.description && (
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  )}

                  {/* Videos Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {categoryVideos.map((video) => {
                      const originalIndex = videos.findIndex(v => v.id === video.id);
                      const thumbnail = video.thumbnail_url || extractThumbnail(video.video_content);
                      
                      return (
                        <Card
                          key={video.id}
                          className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden"
                          onClick={() => onVideoSelect(originalIndex)}
                        >
                          <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
                            {thumbnail ? (
                              <img
                                src={thumbnail}
                                alt={video.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="h-16 w-16 text-white/60" />
                              </div>
                            )}
                            
                            {/* Play Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <div className="bg-white rounded-full p-4 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                                <Play className="h-8 w-8 text-primary fill-primary" />
                              </div>
                            </div>
                          </div>

                          <CardContent className="p-5">
                            <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                              {video.title}
                            </h3>
                            
                            {video.caption && (
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {video.caption}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {new Date(video.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default VideoLibrary;
