import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, FileText, Trash2, Download, Loader2, Video, FileSpreadsheet, Briefcase, BookOpen, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PDFViewer from '@/components/PDFViewer';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  file_type: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
  download_count?: number;
}

interface DownloadLog {
  id: string;
  downloaded_at: string;
  profile_id: string;
  profiles?: {
    full_name: string | null;
    email: string;
  };
  clients?: {
    name: string;
    company: string | null;
  };
}

interface Product {
  id: string;
  name: string;
}

const ResourceManagement = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [downloadLogs, setDownloadLogs] = useState<DownloadLog[]>([]);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingResource, setViewingResource] = useState<Resource | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState<string>('sales_deck');
  const [fileType, setFileType] = useState<string>('pdf');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (user && productId) {
      fetchProductAndResources();
    }
  }, [user, productId]);

  const fetchProductAndResources = async () => {
    try {
      setLoading(true);

      // Get product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Get resources with download counts
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('product_resources')
        .select(`
          *,
          resource_downloads(count)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (resourcesError) throw resourcesError;
      
      const resourcesWithCounts = (resourcesData || []).map((r: any) => ({
        ...r,
        download_count: r.resource_downloads?.[0]?.count || 0,
      }));
      
      setResources(resourcesWithCounts);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load resources.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validPdfTypes = ['application/pdf'];
      const validPptxTypes = ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'];
      
      if (!validPdfTypes.includes(selectedFile.type) && !validPptxTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid File",
          description: "Please upload a PDF or PPTX file only.",
          variant: "destructive",
        });
        e.target.value = ''; // Reset input
        return;
      }
      
      // Auto-detect file type
      if (validPdfTypes.includes(selectedFile.type)) {
        setFileType('pdf');
      } else if (validPptxTypes.includes(selectedFile.type)) {
        setFileType('pptx');
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !productId || !resourceType || !fileType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select a file.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('product-resources')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-resources')
        .getPublicUrl(fileName);

      // Insert resource record
      const { error: insertError } = await supabase
        .from('product_resources')
        .insert({
          product_id: productId,
          title,
          description: description || null,
          resource_type: resourceType,
          file_type: fileType,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user!.id,
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Resource uploaded successfully.",
      });

      // Reset form
      setTitle('');
      setDescription('');
      setResourceType('sales_deck');
      setFileType('pdf');
      setFile(null);
      setIsDialogOpen(false);

      // Refresh resources
      fetchProductAndResources();
    } catch (error) {
      console.error('Error uploading resource:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload resource. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const fetchDownloadLogs = async (resourceId: string) => {
    try {
      const { data, error } = await supabase
        .from('resource_downloads')
        .select(`
          *,
          profiles:profile_id(full_name, email),
          clients:client_id(name, company)
        `)
        .eq('resource_id', resourceId)
        .order('downloaded_at', { ascending: false });

      if (error) throw error;
      setDownloadLogs(data || []);
    } catch (error) {
      console.error('Error fetching download logs:', error);
    }
  };

  const logDownload = async (resourceId: string) => {
    try {
      // Get current user's client info if they're a client
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (!profileData) return;

      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', profileData.id)
        .maybeSingle();

      await supabase.from('resource_downloads').insert({
        resource_id: resourceId,
        profile_id: profileData.id,
        client_id: clientData?.id || null,
      });

      // Refresh resources to update count
      fetchProductAndResources();
    } catch (error) {
      console.error('Error logging download:', error);
    }
  };

  const handleDelete = async (resource: Resource) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      // Extract file path from URL
      const urlParts = resource.file_url.split('/product-resources/');
      const filePath = urlParts[1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('product-resources')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('product_resources')
        .delete()
        .eq('id', resource.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Resource deleted successfully.",
      });

      fetchProductAndResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete resource.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getResourceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sales_deck: 'Sales Deck',
      factsheet: 'Product Factsheet',
      case_study: 'Case Study',
      brochure: 'Product Brochure',
      tutorial: 'Tutorial',
      video: 'Video',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'sales_deck':
        return Briefcase;
      case 'factsheet':
        return FileSpreadsheet;
      case 'case_study':
        return BookOpen;
      case 'brochure':
        return FileText;
      case 'tutorial':
        return BookOpen;
      default:
        return FileText;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/product/${productId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Product
              </Button>
              <h1 className="text-2xl font-bold text-foreground">
                Resource Center - {product?.name}
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="default"
                onClick={() => navigate(`/product/${productId}/videos`)}
                className="bg-primary text-primary-foreground"
              >
                <Video className="h-4 w-4 mr-2" />
                Manage Videos
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate(`/product/${productId}/release-notes/new`)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Release Note
              </Button>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Resource
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload New Resource</DialogTitle>
                  <DialogDescription>
                    Upload PDF or PowerPoint (PPTX) files for this product.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Product Factsheet Q1 2025"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of the resource"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="resourceType">Resource Type *</Label>
                    <Select value={resourceType} onValueChange={setResourceType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales_deck">Sales Deck</SelectItem>
                        <SelectItem value="factsheet">Product Factsheet</SelectItem>
                        <SelectItem value="case_study">Case Study</SelectItem>
                        <SelectItem value="brochure">Product Brochure</SelectItem>
                        <SelectItem value="tutorial">Tutorial</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="file">File * (PDF or PPTX)</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.pptx,.ppt"
                      onChange={handleFileChange}
                    />
                    {file && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {file.name}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {resources.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg text-muted-foreground mb-2">No resources yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your first resource to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => {
              const ResourceIcon = getResourceIcon(resource.resource_type);
              return (
                <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <ResourceIcon className="h-8 w-8 text-primary" />
                      </div>
                      <span className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
                        {getResourceTypeLabel(resource.resource_type)}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                    {resource.description && (
                      <CardDescription className="line-clamp-2">{resource.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Type:</span>
                        <span className="font-medium">{resource.file_type.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Size:</span>
                        <span className="font-medium">{formatFileSize(resource.file_size)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                       <span>Product:</span>
                        <span className="font-medium truncate ml-2">{product?.name}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span>Downloads:</span>
                        <span className="font-medium text-primary">{resource.download_count || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                   <CardFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={async () => {
                        try {
                          await logDownload(resource.id);
                          const response = await fetch(resource.file_url);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = resource.file_name;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error('Download error:', error);
                          toast({
                            title: "Download Failed",
                            description: "Failed to download the file.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        fetchDownloadLogs(resource.id);
                        setShowActivityLog(true);
                      }}
                      title="View Activity Log"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(resource)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* PDF Viewer Dialog */}
      <Dialog open={!!viewingResource} onOpenChange={() => setViewingResource(null)}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle>{viewingResource?.title}</DialogTitle>
            <DialogDescription>
              {viewingResource?.description || 'Preview document'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {viewingResource && (
              <PDFViewer 
                url={viewingResource.file_url} 
                title={viewingResource.title}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourceManagement;