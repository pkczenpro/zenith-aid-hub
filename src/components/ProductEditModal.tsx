import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
}

interface ProductEditModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (productId: string, updates: { name?: string; description?: string; icon_url?: string }) => Promise<boolean>;
}

const ProductEditModal = ({ product, isOpen, onClose, onUpdate }: ProductEditModalProps) => {
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description || '',
    icon_url: product.icon_url || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const success = await onUpdate(product.id, {
      name: formData.name,
      description: formData.description,
      icon_url: formData.icon_url
    });
    
    if (success) {
      onClose();
    }
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setFormData({
      name: product.name,
      description: product.description || '',
      icon_url: product.icon_url || ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter product description..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="icon_url">Icon URL</Label>
            <div className="flex gap-2">
              <Input
                id="icon_url"
                value={formData.icon_url}
                onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                placeholder="https://example.com/icon.png"
              />
            </div>
            {formData.icon_url && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <img 
                  src={formData.icon_url} 
                  alt="Icon preview" 
                  className="w-6 h-6 rounded object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span>Icon preview</span>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditModal;