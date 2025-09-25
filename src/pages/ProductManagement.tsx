import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { 
  Plus, 
  Package, 
  Edit3, 
  Trash2, 
  ArrowLeft,
  Upload,
  Eye,
  Settings,
  FileText,
  Search,
  Image as ImageIcon
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: 'draft' | 'published' | 'archived';
  icon_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const ProductManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, isAdmin } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: '',
    status: 'draft' as 'draft' | 'published' | 'archived'
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchProducts();
  }, [isAdmin, navigate]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts((data || []).map(product => ({
        ...product,
        icon_url: product.icon_url || null
      })));
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIconUpload = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-icons')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-icons')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload product icon.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!profile?.id || !productForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Product name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      let iconUrl = null;
      if (iconFile) {
        iconUrl = await handleIconUpload(iconFile);
        if (!iconUrl) return; // Upload failed
      }

      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: productForm.name.trim(),
          description: productForm.description.trim() || null,
          category: productForm.category.trim() || null,
          status: productForm.status,
          icon_url: iconUrl,
          created_by: profile.id,
        }])
        .select()
        .single();

      if (error) throw error;

      const newProduct = { ...data, icon_url: data.icon_url || null };
      setProducts([newProduct, ...products]);
      resetForm();
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Product created successfully.",
      });
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create product.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct || !productForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Product name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      let iconUrl = selectedProduct.icon_url;
      if (iconFile) {
        const newIconUrl = await handleIconUpload(iconFile);
        if (newIconUrl) iconUrl = newIconUrl;
      }

      const { data, error } = await supabase
        .from('products')
        .update({
          name: productForm.name.trim(),
          description: productForm.description.trim() || null,
          category: productForm.category.trim() || null,
          status: productForm.status,
          icon_url: iconUrl,
        })
        .eq('id', selectedProduct.id)
        .select()
        .single();

      if (error) throw error;

      const updatedProduct = { ...data, icon_url: data.icon_url || null };
      setProducts(products.map(p => p.id === selectedProduct.id ? updatedProduct : p));
      resetForm();
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Product updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update product.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This will also delete all associated articles.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productId));
      
      toast({
        title: "Success",
        description: "Product deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete product.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setProductForm({
      name: '',
      description: '',
      category: '',
      status: 'draft'
    });
    setIconFile(null);
    setIconPreview(null);
    setSelectedProduct(null);
    setIsEditMode(false);
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      status: product.status
    });
    setIconPreview(product.icon_url);
    setIsEditMode(true);
    setIsCreateDialogOpen(true);
  };

  const handleIconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setIconPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gradient flex items-center gap-2">
                <Package className="h-8 w-8" />
                Product Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Create and manage your products and documentation
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            className="bg-gradient-button hover:shadow-button transition-all duration-300"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {product.icon_url ? (
                      <img 
                        src={product.icon_url} 
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      {product.category && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant={product.status === 'published' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {product.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {product.description || 'No description provided'}
                </p>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="flex-1"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Docs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(product)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProduct(product.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery ? 'No products match your search.' : 'Get started by creating your first product.'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => {
                  resetForm();
                  setIsCreateDialogOpen(true);
                }}
                className="bg-gradient-button hover:shadow-button transition-all duration-300"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Product
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Product Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Product' : 'Create New Product'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Product Icon */}
            <div>
              <Label htmlFor="icon">Product Icon</Label>
              <div className="flex items-center gap-4 mt-2">
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                  {iconPreview ? (
                    <img 
                      src={iconPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    id="icon"
                    type="file"
                    accept="image/*"
                    onChange={handleIconFileChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload PNG, JPG, WebP or SVG (max 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Product Name */}
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Enter product name"
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Describe your product..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                placeholder="e.g., Software, API, Service"
                className="mt-1"
              />
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={productForm.status}
                onValueChange={(value: 'draft' | 'published' | 'archived') => 
                  setProductForm({ ...productForm, status: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsCreateDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditMode ? handleUpdateProduct : handleCreateProduct}
              disabled={uploading || !productForm.name.trim()}
              className="bg-gradient-button hover:shadow-button transition-all duration-300"
            >
              {uploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  {isEditMode ? 'Update' : 'Create'} Product
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;