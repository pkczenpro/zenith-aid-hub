import { useState } from "react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Video, 
  Image, 
  Save, 
  Eye, 
  Link,
  Upload,
  Play,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WysiwygEditor = () => {
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const { toast } = useToast();

  // Custom toolbar configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video', 'color', 'background',
    'align', 'script', 'code-block'
  ];

  const handleVideoEmbed = () => {
    if (!videoUrl) return;
    
    let embedCode = '';
    
    // Handle different video platforms
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      embedCode = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    } else if (videoUrl.includes('loom.com')) {
      const videoId = videoUrl.split('/').pop();
      embedCode = `<iframe src="https://www.loom.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    } else if (videoUrl.includes('heygen.com')) {
      embedCode = `<iframe width="560" height="315" src="${videoUrl}" frameborder="0" allowfullscreen></iframe>`;
    } else {
      embedCode = `<video controls width="560"><source src="${videoUrl}" type="video/mp4">Your browser does not support the video tag.</video>`;
    }
    
    setContent(prev => prev + `<br/>${embedCode}<br/>`);
    setVideoUrl('');
    
    toast({
      title: "Video embedded successfully!",
      description: "Your video has been added to the article.",
    });
  };

  const handleSave = () => {
    toast({
      title: "Article saved!",
      description: "Your changes have been saved successfully.",
    });
  };

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold text-gradient">
            Article Editor
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create comprehensive help articles with rich formatting and embedded media
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Editor */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span>Content Editor</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPreview(!isPreview)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {isPreview ? 'Edit' : 'Preview'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      className="bg-gradient-button text-white border-0"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {!isPreview ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Article Title</Label>
                      <Input 
                        placeholder="Enter article title..." 
                        className="mt-1 text-lg font-semibold"
                      />
                    </div>
                    
                    <div>
                      <Label>Content</Label>
                      <div className="mt-2 border rounded-lg overflow-hidden">
                        <ReactQuill
                          theme="snow"
                          value={content}
                          onChange={setContent}
                          modules={modules}
                          formats={formats}
                          style={{ minHeight: '400px' }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="prose max-w-none">
                    <h1 className="text-3xl font-bold mb-6">Article Preview</h1>
                    <div 
                      dangerouslySetInnerHTML={{ __html: content }}
                      className="space-y-4"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Tools */}
          <div className="space-y-6">
            {/* Video Embedding */}
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Video className="h-5 w-5 text-primary" />
                  <span>Video Tours</span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <Label>Video URL</Label>
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Paste Loom, HeyGen, or YouTube URL..."
                    className="mt-1"
                  />
                </div>
                
                <Button 
                  onClick={handleVideoEmbed}
                  disabled={!videoUrl}
                  className="w-full bg-gradient-button text-white border-0"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Embed Video
                </Button>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Supported platforms:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">YouTube</Badge>
                    <Badge variant="secondary">Loom</Badge>
                    <Badge variant="secondary">HeyGen</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Media Upload */}
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Image className="h-5 w-5 text-primary" />
                  <span>Media Library</span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload screenshots or images
                  </p>
                  <Button variant="outline" size="sm">
                    Choose Files
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Quick Actions:</p>
                  <div className="space-y-1">
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <Image className="h-4 w-4 mr-2" />
                      Insert Image
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <Link className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Article Settings */}
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardHeader>
                <CardTitle>Article Settings</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <Tabs defaultValue="general">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="seo">SEO</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="general" className="space-y-4">
                    <div>
                      <Label>Category</Label>
                      <Input placeholder="e.g., Getting Started" className="mt-1" />
                    </div>
                    <div>
                      <Label>Tags</Label>
                      <Input placeholder="tutorial, setup, api" className="mt-1" />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="seo" className="space-y-4">
                    <div>
                      <Label>Meta Description</Label>
                      <Input placeholder="SEO description..." className="mt-1" />
                    </div>
                    <div>
                      <Label>Keywords</Label>
                      <Input placeholder="help, tutorial, guide" className="mt-1" />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WysiwygEditor;