import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Settings,
  Edit3,
  Video, 
  Image, 
  Link,
  Upload,
  Play,
  FileText,
  Plus,
  Trash2,
  GripVertical
} from "lucide-react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";

interface Section {
  id: string;
  title: string;
  content: string;
}

const ProductEditor = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Product data - in a real app this would come from an API
  const products = {
    mobile: { name: "Mobile App", icon: "📱", color: "from-blue-500 to-blue-600" },
    web: { name: "Web Platform", icon: "💻", color: "from-purple-500 to-purple-600" },
    cloud: { name: "Cloud Services", icon: "☁️", color: "from-cyan-500 to-cyan-600" },
    security: { name: "Security Suite", icon: "🛡️", color: "from-emerald-500 to-emerald-600" },
    analytics: { name: "Analytics", icon: "📊", color: "from-orange-500 to-orange-600" },
    api: { name: "API & Integrations", icon: "⚡", color: "from-violet-500 to-violet-600" }
  };

  const currentProduct = products[productId as keyof typeof products];
  
  const [productInfo, setProductInfo] = useState({
    name: currentProduct?.name || "",
    description: "",
    version: "1.0.0",
    status: "Active"
  });
  
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [articleTitle, setArticleTitle] = useState('');
  const [sections, setSections] = useState<Section[]>([
    { id: '1', title: 'Getting Started', content: '' }
  ]);

  useEffect(() => {
    if (!currentProduct) {
      navigate('/');
      return;
    }
  }, [currentProduct, navigate]);

  // Enhanced Quill editor configuration
  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        ['blockquote', 'code-block'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        'video': function() {
          const range = this.quill.getSelection();
          if (range) {
            const url = prompt('Enter video URL (YouTube, Loom, HeyGen):');
            if (url) {
              let embedCode = '';
              
              if (url.includes('youtube.com') || url.includes('youtu.be')) {
                const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
                if (videoId) {
                  embedCode = `<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem 0;"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>`;
                }
              } else if (url.includes('loom.com')) {
                const videoId = url.match(/loom\.com\/share\/([a-f0-9]+)/)?.[1] || url.split('/').pop();
                if (videoId) {
                  embedCode = `<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem 0;"><iframe src="https://www.loom.com/embed/${videoId}" frameborder="0" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>`;
                }
              } else if (url.includes('heygen.com')) {
                let videoId = '';
                if (url.includes('/share/')) {
                  videoId = url.match(/\/share\/([^/?#]+)/)?.[1];
                } else if (url.includes('share-prod.heygen.com')) {
                  videoId = url.split('/').pop()?.split('?')[0];
                }
                
                if (videoId) {
                  embedCode = `<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem 0;"><iframe src="https://share-prod.heygen.com/${videoId}" frameborder="0" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>`;
                } else {
                  embedCode = `<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem 0;"><iframe src="${url}" frameborder="0" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>`;
                }
              }
              
              if (embedCode) {
                this.quill.clipboard.dangerouslyPasteHTML(range.index, embedCode);
              }
            }
          }
        }
      }
    }
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
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (videoId) {
        embedCode = `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="max-width: 560px;"></iframe>`;
      }
    } else if (videoUrl.includes('loom.com')) {
      const videoId = videoUrl.match(/loom\.com\/share\/([a-f0-9]+)/)?.[1] || videoUrl.split('/').pop();
      if (videoId) {
        embedCode = `<iframe width="100%" height="315" src="https://www.loom.com/embed/${videoId}" frameborder="0" allowfullscreen style="max-width: 560px;"></iframe>`;
      }
    } else if (videoUrl.includes('heygen.com')) {
      // Handle different HeyGen URL patterns
      let videoId = '';
      if (videoUrl.includes('/share/')) {
        videoId = videoUrl.match(/\/share\/([^/?#]+)/)?.[1];
      } else if (videoUrl.includes('share-prod.heygen.com')) {
        videoId = videoUrl.split('/').pop()?.split('?')[0];
      }
      
      if (videoId) {
        embedCode = `<iframe width="100%" height="315" src="https://share-prod.heygen.com/${videoId}" frameborder="0" allowfullscreen style="max-width: 560px;"></iframe>`;
      } else {
        // Fallback to the original URL if we can't parse it
        embedCode = `<iframe width="100%" height="315" src="${videoUrl}" frameborder="0" allowfullscreen style="max-width: 560px;"></iframe>`;
      }
    } else {
      embedCode = `<video controls width="100%" style="max-width: 560px;"><source src="${videoUrl}" type="video/mp4">Your browser does not support the video tag.</video>`;
    }
    
    // Add video to the current active section
    if (sections.length > 0) {
      const updatedSections = [...sections];
      const lastSectionIndex = updatedSections.length - 1;
      updatedSections[lastSectionIndex].content += `<br/>${embedCode}<br/>`;
      setSections(updatedSections);
    }
    
    setVideoUrl('');
    
    toast({
      title: "Video embedded successfully!",
      description: "Your video has been added to the current section.",
    });
  };

  const addSection = () => {
    const newSection: Section = {
      id: Date.now().toString(),
      title: `Section ${sections.length + 1}`,
      content: ''
    };
    setSections([...sections, newSection]);
  };

  const updateSectionTitle = (id: string, title: string) => {
    setSections(sections.map(section => 
      section.id === id ? { ...section, title } : section
    ));
  };

  const updateSectionContent = (id: string, content: string) => {
    setSections(sections.map(section => 
      section.id === id ? { ...section, content } : section
    ));
  };

  const deleteSection = (id: string) => {
    if (sections.length > 1) {
      setSections(sections.filter(section => section.id !== id));
    }
  };

  const handleSave = () => {
    const articleData = {
      title: articleTitle,
      sections: sections,
      productId: productId
    };
    
    console.log('Saving article:', articleData);
    
    toast({
      title: "Article saved!",
      description: `Article "${articleTitle}" has been saved with ${sections.length} sections.`,
    });
  };

  const handleViewArticle = () => {
    // Navigate to the article viewer with the current product and a mock article ID
    navigate(`/docs/${productId}/article-1`);
  };

  const handleProductInfoSave = () => {
    toast({
      title: "Product info saved!",
      description: "Product details updated successfully.",
    });
  };

  if (!currentProduct) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Navigation */}
          <div className="flex items-center space-x-4 mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="hover:bg-muted/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
            <div className="h-6 w-px bg-border"></div>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${currentProduct.color} text-white text-lg`}>
                {currentProduct.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{currentProduct.name}</h1>
                <p className="text-muted-foreground">Product Management</p>
              </div>
            </div>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="info" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Product Info</span>
              </TabsTrigger>
              <TabsTrigger value="editor" className="flex items-center space-x-2">
                <Edit3 className="h-4 w-4" />
                <span>Content Editor</span>
              </TabsTrigger>
            </TabsList>

            {/* Product Info Tab */}
            <TabsContent value="info">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="shadow-card border-0 bg-gradient-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="h-5 w-5 text-primary" />
                      <span>Product Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="product-name">Product Name</Label>
                        <Input
                          id="product-name"
                          value={productInfo.name}
                          onChange={(e) => setProductInfo(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="product-description">Description</Label>
                        <Textarea
                          id="product-description"
                          value={productInfo.description}
                          onChange={(e) => setProductInfo(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe your product and its key features..."
                          rows={4}
                          className="mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="version">Version</Label>
                          <Input
                            id="version"
                            value={productInfo.version}
                            onChange={(e) => setProductInfo(prev => ({ ...prev, version: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Input
                            id="status"
                            value={productInfo.status}
                            onChange={(e) => setProductInfo(prev => ({ ...prev, status: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleProductInfoSave}
                        className="w-full bg-gradient-button text-white border-0"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Product Info
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card border-0 bg-gradient-card">
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">24</div>
                        <div className="text-sm text-muted-foreground">Articles</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-accent">8</div>
                        <div className="text-sm text-muted-foreground">Video Tours</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-success">156</div>
                        <div className="text-sm text-muted-foreground">Views</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-warning">12</div>
                        <div className="text-sm text-muted-foreground">Tickets</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Documentation Coverage</span>
                        <Badge variant="secondary">78%</Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full" style={{ width: '78%' }}></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Content Editor Tab */}
            <TabsContent value="editor">
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
                            onClick={handleViewArticle}
                            className="bg-gradient-to-r from-secondary/10 to-accent/10 hover:from-secondary/20 hover:to-accent/20 border-secondary/20 hover:border-secondary/30"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Docs
                          </Button>
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
                        <div className="space-y-6">
                          <div>
                            <Label>Article Title</Label>
                            <Input 
                              value={articleTitle}
                              onChange={(e) => setArticleTitle(e.target.value)}
                              placeholder="Enter article title..." 
                              className="mt-1 text-lg font-semibold"
                            />
                          </div>
                          
                          {/* Master Sections */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-base font-semibold">Article Sections</Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={addSection}
                                className="flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 border-primary/20 hover:border-primary/30 transition-all duration-300"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Add Section</span>
                              </Button>
                            </div>
                            
                            {sections.map((section, index) => (
                              <Card key={section.id} className="border border-muted section-card hover-scale animate-fade-in">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3 flex-1">
                                      <div className="cursor-grab hover:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                                        <GripVertical className="h-4 w-4" />
                                      </div>
                                      <Input
                                        value={section.title}
                                        onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                                        className="font-medium section-title-input border-0 bg-transparent text-lg"
                                        placeholder="Section title..."
                                      />
                                    </div>
                                    {sections.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteSection(section.id)}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="border-2 border-dashed border-primary/20 rounded-lg overflow-hidden bg-gradient-to-br from-background to-muted/30 hover:border-primary/40 transition-colors duration-300">
                                    <ReactQuill
                                      theme="snow"
                                      value={section.content}
                                      onChange={(content) => updateSectionContent(section.id, content)}
                                      modules={modules}
                                      formats={formats}
                                      placeholder={`Write content for ${section.title}...`}
                                      className="animate-fade-in"
                                      style={{
                                        '--ql-toolbar-bg': 'linear-gradient(135deg, hsl(var(--muted)/0.5) 0%, hsl(var(--accent)/0.1) 100%)',
                                      } as React.CSSProperties}
                                    />
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-lg max-w-none bg-gradient-to-br from-background to-muted/10 p-8 rounded-lg border border-border/50">
                          <div className="text-center mb-8">
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
                              {articleTitle || 'Article Preview'}
                            </h1>
                            <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent mx-auto rounded-full"></div>
                          </div>
                          
                          {sections.map((section, index) => (
                            <div key={section.id} className="mb-12 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                              <div className="flex items-center mb-6">
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center text-white text-sm font-bold mr-4">
                                  {index + 1}
                                </div>
                                <h2 className="text-2xl font-semibold text-primary flex-1 border-b border-primary/20 pb-2">
                                  {section.title}
                                </h2>
                              </div>
                              <div 
                                dangerouslySetInnerHTML={{ __html: section.content }}
                                className="ml-12 space-y-4 text-foreground/90 leading-relaxed"
                              />
                            </div>
                          ))}
                          
                          {sections.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">No content yet. Start adding sections to see the preview.</p>
                            </div>
                          )}
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
                        <p className="text-xs text-muted-foreground mt-2">
                          Videos will be embedded in the last section of your article.
                        </p>
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
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ProductEditor;