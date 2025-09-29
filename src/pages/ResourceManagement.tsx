import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState<string>('factsheet');
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

      // Get resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('product_resources')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (resourcesError) throw resourcesError;
      setResources(resourcesData || []);
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
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid File",
          description: "Please upload a PDF file.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !productId) {
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
      setResourceType('factsheet');
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
      factsheet: 'Product Factsheet',
      sales_material: 'Sales Material',
      tutorial: 'Tutorial',
      other: 'Other',
    };
    return labels[type] || type;
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
                    Upload a PDF resource for this product.
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
                        <SelectItem value="factsheet">Product Factsheet</SelectItem>
                        <SelectItem value="sales_material">Sales Material</SelectItem>
                        <SelectItem value="tutorial">Tutorial</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="file">PDF File *</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf"
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
            {resources.map((resource) => (
              <Card key={resource.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <FileText className="h-8 w-8 text-primary" />
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                      {getResourceTypeLabel(resource.resource_type)}
                    </span>
                  </div>
                  <CardTitle className="text-lg mt-2">{resource.title}</CardTitle>
                  {resource.description && (
                    <CardDescription>{resource.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <p>File: {resource.file_name}</p>
                    <p>Size: {formatFileSize(resource.file_size)}</p>
                    <p>Uploaded: {new Date(resource.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(resource.file_url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(resource)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ResourceManagement;