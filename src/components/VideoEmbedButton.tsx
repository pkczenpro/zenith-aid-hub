import React, { useState } from 'react';
import { Video, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface VideoEmbedButtonProps {
  onVideoEmbed: (videoUrl: string) => void;
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

    onVideoEmbed(videoUrl);
    setVideoUrl('');
    setIsOpen(false);
    
    toast({
      title: "Video embedded successfully!",
      description: "Your video has been added to the content.",
    });
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