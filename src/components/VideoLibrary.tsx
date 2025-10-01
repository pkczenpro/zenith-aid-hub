import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Clock } from "lucide-react";

interface Video {
  id: string;
  title: string;
  caption?: string;
  video_content: string;
  created_at: string;
  order_index?: number;
}

interface VideoLibraryProps {
  videos: Video[];
  onVideoSelect: (videoIndex: number) => void;
}

const VideoLibrary = ({ videos, onVideoSelect }: VideoLibraryProps) => {
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

  return (
    <div className="container mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Video Library</h1>
        <p className="text-muted-foreground">
          Browse all training videos and tutorials
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video, index) => {
          const thumbnail = extractThumbnail(video.video_content);
          
          return (
            <Card
              key={video.id}
              className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden"
              onClick={() => onVideoSelect(index)}
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

                {/* Video Number Badge */}
                <div className="absolute top-3 left-3">
                  <Badge variant="secondary" className="bg-black/60 text-white border-0">
                    Video {index + 1}
                  </Badge>
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
};

export default VideoLibrary;
