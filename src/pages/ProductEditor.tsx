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

  const handleVideoEmbedInSection = (sectionId: string, videoUrl: string) => {
    if (!videoUrl) return;
    
    let embedCode = '';
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (videoId) {
        embedCode = `<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem 0;"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>`;
      }
    } else if (videoUrl.includes('loom.com')) {
      const videoId = videoUrl.match(/loom\.com\/share\/([a-f0-9]+)/)?.[1] || videoUrl.split('/').pop();
      if (videoId) {
        embedCode = `<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem 0;"><iframe src="https://www.loom.com/embed/${videoId}" frameborder="0" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>`;
      }
    } else if (videoUrl.includes('heygen.com')) {
      let videoId = '';
      if (videoUrl.includes('/share/')) {
        videoId = videoUrl.match(/\/share\/([^/?#]+)/)?.[1];
      } else if (videoUrl.includes('share-prod.heygen.com')) {
        videoId = videoUrl.split('/').pop()?.split('?')[0];
      }
      
      if (videoId) {
        embedCode = `<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem 0;"><iframe src="https://share-prod.heygen.com/${videoId}" frameborder="0" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>`;
      } else {
        embedCode = `<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem 0;"><iframe src="${videoUrl}" frameborder="0" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>`;
      }
    }
    
    if (embedCode) {
      const updatedSections = sections.map(section => 
        section.id === sectionId 
          ? { ...section, content: section.content + '<br/>' + embedCode + '<br/>' }
          : section
      );
      setSections(updatedSections);
      
      toast({
        title: "Video embedded successfully!",
        description: "Your video has been added to the section.",
      });
    }
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
      subtitle: `${currentProduct?.name} documentation`,
      sections: sections,
      productId: productId,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };
    
    // Save to localStorage (in a real app, this would be saved to a database)
    const savedArticleKey = `article-${productId}-article-1`;
    localStorage.setItem(savedArticleKey, JSON.stringify(articleData));
    
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
              <div className="max-w-none">
                {/* Document Header */}
                <div className="bg-gradient-to-r from-background via-muted/10 to-background border border-border/50 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${currentProduct.color} text-white text-xl`}>
                        {currentProduct.icon}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-foreground">Document Editor</h2>
                        <p className="text-sm text-muted-foreground">Create comprehensive documentation for {currentProduct.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleViewArticle}
                        className="bg-gradient-to-r from-secondary/10 to-accent/10 hover:from-secondary/20 hover:to-accent/20 border-secondary/20 hover:border-secondary/30"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Published
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPreview(!isPreview)}
                        className="bg-gradient-to-r from-accent/10 to-primary/10 hover:from-accent/20 hover:to-primary/20 border-accent/20 hover:border-accent/30"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {isPreview ? 'Edit Mode' : 'Preview'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        className="bg-gradient-button text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Publish Article
                      </Button>
                    </div>
                  </div>
                  
                  {/* Article Title Input */}
                  <div>
                    <Input 
                      value={articleTitle}
                      onChange={(e) => setArticleTitle(e.target.value)}
                      placeholder="Enter your article title here..." 
                      className="text-2xl font-bold border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:ring-0 focus:outline-none px-0 py-2"
                    />
                  </div>
                </div>

                {!isPreview ? (
                  /* Writing Mode */
                  <div className="space-y-1">
                    {/* Section Management */}
                    <div className="flex items-center justify-between mb-6 px-4">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="font-medium text-foreground">Document Sections</span>
                        <span className="text-sm text-muted-foreground">({sections.length})</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addSection}
                        className="flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 border-primary/20 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md"
                      >
                        <Plus className="h-4 w-4" />
                        <span>New Section</span>
                      </Button>
                    </div>
                    
                    {/* Document Sections */}
                    <div className="space-y-6">
                      {sections.map((section, index) => (
                        <div key={section.id} className="group animate-fade-in bg-white dark:bg-gray-900/50 border border-border/50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                          {/* Section Header */}
                          <div className="flex items-center justify-between p-4 border-b border-border/30 bg-gradient-to-r from-muted/30 via-muted/10 to-muted/30 rounded-t-xl">
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {index + 1}
                                </div>
                                <div className="cursor-grab hover:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                              </div>
                              <Input
                                value={section.title}
                                onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                                className="font-semibold text-lg border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:ring-0 focus:outline-none px-0"
                                placeholder={`Section ${index + 1} title...`}
                              />
                            </div>
                            {sections.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteSection(section.id)}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          {/* Rich Text Editor - Always Visible */}
                          <div className="bg-background">
                            <div className="editor-wrapper" style={{ minHeight: '350px' }}>
                              <ReactQuill
                                theme="snow"
                                value={section.content}
                                onChange={(content) => {
                                  console.log('Content changing for section:', section.id, content);
                                  updateSectionContent(section.id, content);
                                }}
                                modules={modules}
                                formats={formats}
                                placeholder={`Start writing content for "${section.title || `Section ${index + 1}`}"...`}
                                className="section-editor"
                                style={{
                                  height: '350px',
                                  backgroundColor: 'hsl(var(--background))',
                                  color: 'hsl(var(--foreground))',
                                }}
                              />
                            </div>
                            
                            {/* Quick Tools Bar */}
                            <div className="flex items-center justify-between p-4 bg-muted/20 border-t border-border/30">
                              <div className="flex items-center space-x-2">
                                <div className="text-xs text-muted-foreground">Quick tools:</div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const url = prompt('Enter video URL (YouTube, Loom, HeyGen):');
                                    if (url) {
                                      handleVideoEmbedInSection(section.id, url);
                                    }
                                  }}
                                  className="text-primary hover:text-primary hover:bg-primary/10 h-7 px-2"
                                >
                                  <Video className="h-3 w-3 mr-1" />
                                  Video
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-accent hover:text-accent hover:bg-accent/10 h-7 px-2"
                                >
                                  <Image className="h-3 w-3 mr-1" />
                                  Image
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {section.content.replace(/<[^>]*>/g, '').length} characters
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add First Section Prompt */}
                      {sections.length === 0 && (
                        <div className="text-center py-16 bg-gradient-to-br from-muted/20 to-muted/5 border-2 border-dashed border-border rounded-xl">
                          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                          <h3 className="text-lg font-semibold text-foreground mb-2">Start Your Documentation</h3>
                          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Create structured sections to organize your content effectively
                          </p>
                          <Button
                            onClick={addSection}
                            className="bg-gradient-button text-white border-0 shadow-lg hover:shadow-xl"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Section
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Preview Mode */
                  <div className="max-w-4xl mx-auto">
                    <div className="bg-white dark:bg-gray-900/50 border border-border/50 rounded-xl shadow-lg p-8">
                      <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-4">
                          {articleTitle || 'Untitled Article'}
                        </h1>
                        <div className="w-24 h-1 bg-gradient-to-r from-primary to-accent mx-auto rounded-full mb-6"></div>
                        <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <div className={`w-4 h-4 rounded ${currentProduct.color}`}></div>
                            <span>{currentProduct.name}</span>
                          </div>
                          <span>•</span>
                          <span>{sections.length} sections</span>
                          <span>•</span>
                          <span>Documentation</span>
                        </div>
                      </div>
                      
                      {sections.map((section, index) => (
                        <div key={section.id} className="mb-16 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                          <div className="flex items-start mb-6">
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center text-white text-sm font-bold mr-6 mt-1">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h2 className="text-3xl font-bold text-foreground mb-3">
                                {section.title}
                              </h2>
                              <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-accent rounded-full"></div>
                            </div>
                          </div>
                          <div className="ml-16">
                            <div 
                              dangerouslySetInnerHTML={{ __html: section.content }}
                              className="prose prose-lg max-w-none text-foreground/90 leading-relaxed"
                            />
                          </div>
                        </div>
                      ))}
                      
                      {sections.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <h3 className="text-xl font-semibold mb-2">No content to preview</h3>
                          <p className="text-lg">Switch to edit mode and start adding sections.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Floating Toolbar for Writing Mode */}
                {!isPreview && sections.length > 0 && (
                  <div className="fixed bottom-6 right-6 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-xl p-3 z-50">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-muted-foreground px-2">
                        {sections.length} sections
                      </div>
                      <div className="w-px h-6 bg-border"></div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addSection}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSave}
                        className="text-accent hover:text-accent hover:bg-accent/10"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ProductEditor;