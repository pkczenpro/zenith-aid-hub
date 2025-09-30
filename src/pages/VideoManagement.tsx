import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Trash2, Video } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import VideoEmbedButton from '@/components/VideoEmbedButton';

interface ProductVideo {
  id: string;
  product_id: string;
  title: string;
  video_content: string;
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
  const [videoContent, setVideoContent] = useState('');
  const quillRef = useRef<any>(null);

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

  const handleVideoEmbed = (videoHtml: string) => {
    if (!videoHtml || !quillRef.current) return;

    const editor = quillRef.current.getEditor();
    const range = editor.getSelection() || editor.getLength();
    const insertIndex = typeof range === 'number' ? range : range.index || editor.getLength();

    // Insert the video HTML into the editor
    editor.insertEmbed(insertIndex, 'video', videoHtml);
  };

  const handleUpload = async () => {
    if (!title.trim() || !videoContent.trim()) {
      toast({
        title: "Error",
        description: "Please add a title and embed a video",
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
          video_content: videoContent,
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
      setVideoContent('');
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

  const processVideoContent = (content: string) => {
    if (!content) return '';
    
    // Check for video embed containers and convert them to playable iframes
    if (content.includes('video-embed-container')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const videoContainers = doc.querySelectorAll('.video-embed-container');
      
      let finalContent = content;
      
      videoContainers.forEach((container) => {
        const videoUrl = container.getAttribute('data-video-url');
        const videoType = container.getAttribute('data-video-type');
        const videoId = container.getAttribute('data-video-id');
        
        if (videoUrl && videoType) {
          let playableEmbed = '';
          
          if (videoType === 'youtube' && videoId) {
            playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1rem 0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1" frameBorder="0" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;" title="YouTube Video"></iframe>
            </div>`;
          } else if (videoType === 'vimeo' && videoId) {
            playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1rem 0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <iframe src="https://player.vimeo.com/video/${videoId}" frameBorder="0" allowFullScreen allow="autoplay; fullscreen; picture-in-picture" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;" title="Vimeo Video"></iframe>
            </div>`;
          } else if (videoType === 'loom' && videoId) {
            playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1rem 0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <iframe src="https://www.loom.com/embed/${videoId}" frameBorder="0" allowFullScreen allow="autoplay; fullscreen; picture-in-picture" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;" title="Loom Video"></iframe>
            </div>`;
          } else if (videoType === 'heygen' && videoId) {
            playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1rem 0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <iframe src="https://share-prod.heygen.com/${videoId}" frameBorder="0" allowFullScreen allow="autoplay; fullscreen; picture-in-picture" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;" title="HeyGen Video"></iframe>
            </div>`;
          } else if (videoType === 'direct') {
            playableEmbed = `<div class="video-player-wrapper" style="position: relative; width: 100%; margin: 1rem 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); background: #000;">
              <video controls preload="metadata" style="width: 100%; height: auto; display: block; min-height: 300px;" crossorigin="anonymous">
                <source src="${videoUrl}" type="video/mp4">
                <source src="${videoUrl}" type="video/webm">
                <source src="${videoUrl}" type="video/ogg">
              </video>
            </div>`;
          }
          
          if (playableEmbed) {
            finalContent = finalContent.replace(container.outerHTML, playableEmbed);
          }
        }
      });
      
      return finalContent;
    }
    
    return content;
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
                <DialogDescription>
                  Add a video to this product by providing a title, caption, and video URL.
                </DialogDescription>
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">
                      Video Content <span className="text-destructive">*</span>
                    </label>
                    <VideoEmbedButton onVideoEmbed={handleVideoEmbed} />
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      value={videoContent}
                      onChange={setVideoContent}
                      modules={{
                        toolbar: [
                          [{ header: [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline'],
                          [{ list: 'ordered' }, { list: 'bullet' }],
                          ['link', 'video'],
                          ['clean'],
                        ],
                      }}
                      formats={[
                        'header',
                        'bold',
                        'italic',
                        'underline',
                        'list',
                        'bullet',
                        'link',
                        'video',
                      ]}
                      placeholder="Add description and click 'Embed Video' button to add your video..."
                      className="bg-background"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click "Embed Video" button above to add videos from YouTube, Vimeo, Loom, HeyGen, or direct video files
                  </p>
                </div>

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
          <div className="grid grid-cols-1 gap-6">
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
                </CardHeader>
                <CardContent>
                  <div 
                    dangerouslySetInnerHTML={{ __html: processVideoContent(video.video_content) }}
                    className="prose prose-lg max-w-none [&_iframe]:w-full [&_iframe]:rounded-lg [&_video]:w-full [&_video]:rounded-lg [&_.video-player-wrapper]:my-4"
                  />
                  <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
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