import React, { useState } from 'react';
import { Video, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface VideoEmbedButtonProps {
  onVideoEmbed: (videoHtml: string) => void;
  disabled?: boolean;
}

const VideoEmbedButton: React.FC<VideoEmbedButtonProps> = ({ onVideoEmbed, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const { toast } = useToast();

  const handleEmbed = () => {
    if (!videoUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid video URL",
        variant: "destructive",
      });
      return;
    }

    // Validate video URL
    const isValidVideoUrl = 
      videoUrl.includes('youtube.com') ||
      videoUrl.includes('youtu.be') ||
      videoUrl.includes('vimeo.com') ||
      videoUrl.includes('loom.com') ||
      videoUrl.includes('heygen.com') ||
      /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(videoUrl);

    if (!isValidVideoUrl) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid video URL (YouTube, Vimeo, Loom, HeyGen, or direct video file)",
        variant: "destructive",
      });
      return;
    }

    // Create video embed with thumbnail preview for editor
    let thumbnailUrl = '';
    let embedHtml = '';
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (videoId) {
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        embedHtml = `<div class="video-embed-container" data-video-url="${videoUrl}" data-video-type="youtube" data-video-id="${videoId}" style="position: relative; margin: 1rem 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); cursor: pointer; background: #000;">
          <img src="${thumbnailUrl}" alt="Video thumbnail" style="width: 100%; height: auto; display: block;" onerror="this.src='data:image/svg+xml;base64,${btoa(`<svg width="640" height="360" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1f2937"/><circle cx="320" cy="180" r="40" fill="rgba(255,255,255,0.1)"/><polygon points="305,165 345,180 305,195" fill="white"/><text x="320" y="220" text-anchor="middle" fill="white" font-size="14">YouTube Video</text></svg>`)}'">
          <div class="play-button" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 68px; height: 48px; background: rgba(255, 0, 0, 0.8); border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255, 0, 0, 1)'; this.style.transform='translate(-50%, -50%) scale(1.1)'" onmouseout="this.style.background='rgba(255, 0, 0, 0.8)'; this.style.transform='translate(-50%, -50%) scale(1)'">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="margin-left: 2px;"><polygon points="5,3 19,12 5,21 5,3"></polygon></svg>
          </div>
        </div>`;
      }
    } else if (videoUrl.includes('vimeo.com')) {
      const videoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) {
        embedHtml = `<div class="video-embed-container" data-video-url="${videoUrl}" data-video-type="vimeo" data-video-id="${videoId}" style="position: relative; aspect-ratio: 16/9; margin: 1rem 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); cursor: pointer; background: linear-gradient(135deg, #1ab7ea 0%, #1ab7ea 100%);">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-align: center;">
            <div style="width: 68px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="margin-left: 2px;"><polygon points="5,3 19,12 5,21 5,3"></polygon></svg>
            </div>
            <div style="font-size: 14px; font-weight: 500;">Vimeo Video</div>
          </div>
        </div>`;
      }
    } else if (videoUrl.includes('loom.com')) {
      const videoId = videoUrl.match(/loom\.com\/share\/([a-f0-9]+)/)?.[1] || videoUrl.split('/').pop();
      if (videoId) {
        embedHtml = `<div class="video-embed-container" data-video-url="${videoUrl}" data-video-type="loom" data-video-id="${videoId}" style="position: relative; aspect-ratio: 16/9; margin: 1rem 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); cursor: pointer; background: linear-gradient(135deg, #625df5 0%, #625df5 100%);">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-align: center;">
            <div style="width: 68px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="margin-left: 2px;"><polygon points="5,3 19,12 5,21 5,3"></polygon></svg>
            </div>
            <div style="font-size: 14px; font-weight: 500;">Loom Video</div>
          </div>
        </div>`;
      }
    } else if (videoUrl.includes('heygen.com')) {
      let videoId = '';
      if (videoUrl.includes('/share/')) {
        videoId = videoUrl.match(/\/share\/([^/?#]+)/)?.[1];
      } else if (videoUrl.includes('share-prod.heygen.com')) {
        videoId = videoUrl.split('/').pop()?.split('?')[0];
      }
      
      if (videoId) {
        embedHtml = `<div class="video-embed-container" data-video-url="${videoUrl}" data-video-type="heygen" data-video-id="${videoId}" style="position: relative; aspect-ratio: 16/9; margin: 1rem 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); cursor: pointer; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-align: center;">
            <div style="width: 68px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="margin-left: 2px;"><polygon points="5,3 19,12 5,21 5,3"></polygon></svg>
            </div>
            <div style="font-size: 14px; font-weight: 500;">HeyGen Video</div>
          </div>
        </div>`;
      }
    } else if (videoUrl.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
      embedHtml = `<div class="video-embed-container" data-video-url="${videoUrl}" data-video-type="direct" style="position: relative; width: 100%; margin: 1rem 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); background: #000;">
        <div class="video-thumbnail" style="position: relative; width: 100%; padding-bottom: 56.25%; background: linear-gradient(135deg, #1f2937 0%, #374151 100%);">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-align: center;">
            <div class="play-button" style="width: 68px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; cursor: pointer; transition: all 0.3s ease; border: 2px solid rgba(255,255,255,0.3);" 
                 onmouseover="this.style.background='rgba(255,255,255,0.3)'; this.style.transform='scale(1.1)'" 
                 onmouseout="this.style.background='rgba(255,255,255,0.2)'; this.style.transform='scale(1)'"
                 onclick="
                   var container = this.closest('.video-embed-container');
                   container.innerHTML = '<video controls autoplay style=\\'width: 100%; height: auto; display: block; border-radius: 8px; background: #000;\\'><source src=\\'${videoUrl}\\' type=\\'video/mp4\\'><source src=\\'${videoUrl}\\' type=\\'video/webm\\'><source src=\\'${videoUrl}\\' type=\\'video/ogg\\'><div style=\\'padding: 2rem; text-align: center; color: white; background: #1f2937;\\'><p>Your browser does not support HTML5 video.</p><a href=\\'${videoUrl}\\' target=\\'_blank\\' style=\\'color: #60a5fa;\\'>Open video in new window</a></div></video>';
                 ">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="margin-left: 2px;"><polygon points="5,3 19,12 5,21 5,3"></polygon></svg>
            </div>
            <div style="font-size: 14px; font-weight: 500;">Click to Play Video</div>
            <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Direct Video File</div>
          </div>
        </div>
      </div>`;
    }

    if (embedHtml) {
      onVideoEmbed(embedHtml);
      setVideoUrl('');
      setIsOpen(false);
      
      toast({
        title: "Video embedded successfully!",
        description: "Your video thumbnail has been added to the content.",
      });
    }
  };

  const handleCancel = () => {
    setVideoUrl('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Video className="h-4 w-4" />
          Embed Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Embed Video
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Video URL
            </label>
            <Input
              placeholder="https://procapita.training/wp-content/uploads/2025/09/Account-Setup.mp4"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleEmbed()}
              className="w-full"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supports YouTube, Vimeo, Loom, HeyGen, and direct video files (.mp4, .webm, etc.)
            </p>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleEmbed}>
              <Plus className="h-4 w-4 mr-1" />
              Embed Video
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoEmbedButton;