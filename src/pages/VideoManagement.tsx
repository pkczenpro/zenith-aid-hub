import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Trash2, Video, FolderPlus, Edit2, GripVertical } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import VideoEmbedButton from '@/components/VideoEmbedButton';

interface VideoCategory {
  id: string;
  product_id: string;
  name: string;
  description?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface ProductVideo {
  id: string;
  product_id: string;
  title: string;
  video_content: string;
  category_id?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  thumbnail_url?: string;
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
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [videos, setVideos] = useState<ProductVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<ProductVideo | null>(null);
  const [editingCategory, setEditingCategory] = useState<VideoCategory | null>(null);
  
  // Video form state
  const [title, setTitle] = useState('');
  const [videoContent, setVideoContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const quillRef = useRef<any>(null);

  // Category form state
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

  useEffect(() => {
    if (productId) {
      fetchProductData();
    }
  }, [productId, user]);

  const fetchProductData = async () => {
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

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('video_categories')
        .select('*')
        .eq('product_id', productId)
        .order('order_index', { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch videos
      const { data: videosData, error: videosError } = await supabase
        .from('product_videos')
        .select('*')
        .eq('product_id', productId)
        .order('order_index', { ascending: true });

      if (videosError) throw videosError;
      setVideos((videosData as any[] || []).map((v: any) => ({
        id: v.id,
        product_id: v.product_id,
        title: v.title,
        video_content: v.video_content || '',
        category_id: v.category_id,
        order_index: v.order_index,
        created_at: v.created_at,
        updated_at: v.updated_at,
        thumbnail_url: v.thumbnail_url,
      })));

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load product data",
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
    editor.insertEmbed(insertIndex, 'video', videoHtml);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenVideoDialog = (video?: ProductVideo) => {
    if (video) {
      setEditingVideo(video);
      setTitle(video.title);
      setVideoContent(video.video_content);
      // Convert null to 'uncategorized' for the select component
      setSelectedCategoryId(video.category_id || 'uncategorized');
      setThumbnailPreview(video.thumbnail_url || null);
    } else {
      setEditingVideo(null);
      setTitle('');
      setVideoContent('');
      setSelectedCategoryId('uncategorized');
      setThumbnailFile(null);
      setThumbnailPreview(null);
    }
    setIsVideoDialogOpen(true);
  };

  const handleCloseVideoDialog = () => {
    setIsVideoDialogOpen(false);
    setEditingVideo(null);
    setTitle('');
    setVideoContent('');
    setSelectedCategoryId('uncategorized');
    setThumbnailFile(null);
    setThumbnailPreview(null);
  };

  const handleOpenCategoryDialog = (category?: VideoCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryDescription(category.description || '');
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDescription('');
    }
    setIsCategoryDialogOpen(true);
  };

  const handleCloseCategoryDialog = () => {
    setIsCategoryDialogOpen(false);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
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
      if (editingCategory) {
        const { error } = await supabase
          .from('video_categories')
          .update({
            name: categoryName.trim(),
            description: categoryDescription.trim() || null,
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast({ title: "Success", description: "Category updated successfully" });
      } else {
        const { error } = await supabase
          .from('video_categories')
          .insert([{
            product_id: productId,
            name: categoryName.trim(),
            description: categoryDescription.trim() || null,
            created_by: profile.id,
            order_index: categories.length,
          }] as any);

        if (error) throw error;
        toast({ title: "Success", description: "Category created successfully" });
      }

      handleCloseCategoryDialog();
      fetchProductData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingCategory ? 'update' : 'create'} category`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure? Videos in this category will become uncategorized.')) return;

    try {
      const { error } = await supabase
        .from('video_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      toast({ title: "Success", description: "Category deleted successfully" });
      fetchProductData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleUploadVideo = async () => {
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
      let thumbnailUrl = editingVideo?.thumbnail_url || null;

      if (thumbnailFile) {
        const fileExt = thumbnailFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${productId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('video-thumbnails')
          .upload(filePath, thumbnailFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('video-thumbnails')
          .getPublicUrl(filePath);

        thumbnailUrl = publicUrl;
      }

      // Convert "uncategorized" to null for database
      const categoryIdForDb = selectedCategoryId === 'uncategorized' ? null : selectedCategoryId || null;

      if (editingVideo) {
        const { error } = await supabase
          .from('product_videos')
          .update({
            title: title.trim(),
            video_content: videoContent,
            category_id: categoryIdForDb,
            thumbnail_url: thumbnailUrl,
          })
          .eq('id', editingVideo.id);

        if (error) throw error;
        toast({ title: "Success", description: "Video updated successfully" });
      } else {
        const { error } = await supabase
          .from('product_videos')
          .insert([{
            product_id: productId,
            title: title.trim(),
            video_content: videoContent,
            category_id: categoryIdForDb,
            created_by: profile.id,
            order_index: videos.length,
            thumbnail_url: thumbnailUrl,
          }] as any);

        if (error) throw error;
        toast({ title: "Success", description: "Video added successfully" });
      }

      handleCloseVideoDialog();
      fetchProductData();
    } catch (error) {
      console.error('Error saving video:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingVideo ? 'update' : 'add'} video`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const { error } = await supabase
        .from('product_videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;
      toast({ title: "Success", description: "Video deleted successfully" });
      fetchProductData();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive",
      });
    }
  };

  const processVideoContent = (content: string) => {
    if (!content) return '';
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
            playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1rem 0; border-radius: 8px;">
              <iframe src="https://www.youtube.com/embed/${videoId}" frameBorder="0" allowFullScreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>
            </div>`;
          } else if (videoType === 'vimeo' && videoId) {
            playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1rem 0; border-radius: 8px;">
              <iframe src="https://player.vimeo.com/video/${videoId}" frameBorder="0" allowFullScreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>
            </div>`;
          } else if (videoType === 'loom' && videoId) {
            playableEmbed = `<div class="video-player-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1rem 0; border-radius: 8px;">
              <iframe src="https://www.loom.com/embed/${videoId}" frameBorder="0" allowFullScreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>
            </div>`;
          }
          if (playableEmbed) finalContent = finalContent.replace(container.outerHTML, playableEmbed);
        }
      });
      return finalContent;
    }
    return content;
  };

  const getVideosByCategory = (categoryId?: string) => {
    return videos.filter(v => v.category_id === categoryId);
  };

  const uncategorizedVideos = videos.filter(v => !v.category_id);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/product/${productId}`)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <h1 className="text-xl font-bold">{product?.name} - Videos</h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenCategoryDialog()} variant="outline">
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? 'Edit' : 'Create'} Category</DialogTitle>
                  <DialogDescription>
                    {editingCategory ? 'Update' : 'Add a new'} video category to organize your content
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cat-name">Category Name</Label>
                    <Input
                      id="cat-name"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="e.g., Account Setup, Onboarding"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cat-desc">Description (Optional)</Label>
                    <Textarea
                      id="cat-desc"
                      value={categoryDescription}
                      onChange={(e) => setCategoryDescription(e.target.value)}
                      placeholder="Brief description of this category"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCloseCategoryDialog}>Cancel</Button>
                    <Button onClick={handleSaveCategory}>
                      {editingCategory ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenVideoDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Video
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingVideo ? 'Edit' : 'Add'} Video</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Video title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category (Optional)</Label>
                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uncategorized">No Category</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Thumbnail (Optional)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                    />
                    {thumbnailPreview && (
                      <img src={thumbnailPreview} alt="Preview" className="mt-2 h-32 rounded" />
                    )}
                  </div>
                  <div>
                    <Label>Video Content</Label>
                    <div className="flex gap-2 mb-2">
                      <VideoEmbedButton onVideoEmbed={handleVideoEmbed} />
                    </div>
                    <ReactQuill
                      ref={quillRef}
                      value={videoContent}
                      onChange={setVideoContent}
                      className="stable-section-editor"
                      placeholder="Embed a video above or add additional content..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCloseVideoDialog}>Cancel</Button>
                    <Button onClick={handleUploadVideo}>
                      {editingVideo ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container px-6 py-8">
        <div className="space-y-8">
          {/* Categories with videos */}
          {categories.map(category => {
            const categoryVideos = getVideosByCategory(category.id);
            return (
              <Card key={category.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      {category.name}
                    </CardTitle>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenCategoryDialog(category)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {categoryVideos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No videos in this category yet</p>
                  ) : (
                    <div className="grid gap-4">
                      {categoryVideos.map(video => (
                        <Card key={video.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium mb-2">{video.title}</h4>
                              <div
                                className="prose prose-sm"
                                dangerouslySetInnerHTML={{
                                  __html: processVideoContent(video.video_content)
                                }}
                              />
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenVideoDialog(video)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteVideo(video.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Uncategorized videos */}
          {uncategorizedVideos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Uncategorized Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {uncategorizedVideos.map(video => (
                    <Card key={video.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium mb-2">{video.title}</h4>
                          <div
                            className="prose prose-sm"
                            dangerouslySetInnerHTML={{
                              __html: processVideoContent(video.video_content)
                            }}
                          />
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenVideoDialog(video)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteVideo(video.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {categories.length === 0 && videos.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No videos or categories yet</p>
                <div className="flex gap-2">
                  <Button onClick={() => handleOpenCategoryDialog()} variant="outline">
                    <FolderPlus className="mr-2 h-4 w-4" />
                    Create Category
                  </Button>
                  <Button onClick={() => handleOpenVideoDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Video
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default VideoManagement;
