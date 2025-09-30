import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Trash2, Video } from 'lucide-react';
import VideoEmbed from '@/components/ui/video-embed';

interface ProductVideo {
  id: string;
  product_id: string;
  title: string;
  caption: string | null;
  video_url: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
}

const VideoManagement = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [videos, setVideos] = useState<ProductVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    if (productId) {
      fetchProductAndVideos();
    }
  }, [productId, user]);

  const fetchProductAndVideos = async () => {
    try {
      setLoading(true);

      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Fetch videos
      const { data: videosData, error: videosError } = await supabase
        .from('product_videos')
        .select('*')
        .eq('product_id', productId)
        .order('order_index', { ascending: true });

      if (videosError) throw videosError;
      setVideos(videosData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load product videos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVideoEmbed = (url: string) => {
    setVideoUrl(url);
  };

  const handleUpload = async () => {
    if (!title.trim() || !videoUrl.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.id) {
      toast({
        title: "Error",
        description: "User profile not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('product_videos')
        .insert({
          product_id: productId,
          title: title.trim(),
          caption: caption.trim() || null,
          video_url: videoUrl,
          created_by: profile.id,
          order_index: videos.length,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Video added successfully",
      });

      // Reset form
      setTitle('');
      setCaption('');
      setVideoUrl('');
      setIsDialogOpen(false);

      // Refresh videos
      fetchProductAndVideos();
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        title: "Error",
        description: "Failed to add video",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const { error } = await supabase
        .from('product_videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Video deleted successfully",
      });

      fetchProductAndVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/product/${productId}`)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Product</span>
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-semibold text-foreground">
              {product?.name} - Videos
            </h1>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Video</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Video</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Enter video title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Caption
                  </label>
                  <Textarea
                    placeholder="Enter video caption (optional)"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Video URL <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Enter or embed video URL"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="mb-2"
                  />
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground flex-1">
                      Or use the embed button to add a video from YouTube, Vimeo, Loom, HeyGen, etc.
                    </p>
                    <div className="flex-shrink-0">
                      <Video className="h-4 w-4 inline mr-1 text-muted-foreground" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = prompt('Enter video URL:');
                          if (url) handleVideoEmbed(url);
                        }}
                      >
                        Embed Video
                      </Button>
                    </div>
                  </div>
                </div>

                {videoUrl && (
                  <div className="border border-border rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Preview:</p>
                    <VideoEmbed url={videoUrl} />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpload}>
                    Add Video
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-8">
        {videos.length === 0 ? (
          <div className="text-center py-12">
            <Video className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Videos Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start by adding your first video to this product.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {videos.map((video) => (
              <Card key={video.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{video.title}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(video.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {video.caption && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {video.caption}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <VideoEmbed url={video.video_url} />
                  <p className="text-xs text-muted-foreground mt-2">
                    Added on {new Date(video.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default VideoManagement;