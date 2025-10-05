import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Eye, Sparkles } from 'lucide-react';
import Header from '@/components/Header';

interface Product {
  id: string;
  name: string;
  icon_url?: string;
}

interface WelcomeMessage {
  id?: string;
  title: string;
  description: string;
  show_features: boolean;
  custom_button_text: string;
  is_active: boolean;
}

const WelcomeMessageManager = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<WelcomeMessage>({
    title: '',
    description: '',
    show_features: true,
    custom_button_text: 'View Documentation',
    is_active: true,
  });

  useEffect(() => {
    if (user && productId) {
      fetchData();
    }
  }, [user, productId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Fetch existing welcome message
      const { data: messageData } = await supabase
        .from('product_welcome_messages')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();

      if (messageData) {
        setWelcomeMessage({
          id: messageData.id,
          title: messageData.title || '',
          description: messageData.description || '',
          show_features: messageData.show_features,
          custom_button_text: messageData.custom_button_text,
          is_active: messageData.is_active,
        });
      } else {
        // Set default title and description based on product
        setWelcomeMessage(prev => ({
          ...prev,
          title: `Welcome to ${productData.name}`,
          description: productData.description || `Explore comprehensive documentation, resources, and guides to help you get the most out of ${productData.name}.`,
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!productId || !user) return;

    try {
      setSaving(true);

      const messageData = {
        product_id: productId,
        title: welcomeMessage.title,
        description: welcomeMessage.description,
        show_features: welcomeMessage.show_features,
        custom_button_text: welcomeMessage.custom_button_text,
        is_active: welcomeMessage.is_active,
        created_by: user.id,
      };

      if (welcomeMessage.id) {
        // Update existing
        const { error } = await supabase
          .from('product_welcome_messages')
          .update(messageData)
          .eq('id', welcomeMessage.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('product_welcome_messages')
          .insert(messageData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Welcome message saved successfully.',
      });

      fetchData();
    } catch (error) {
      console.error('Error saving welcome message:', error);
      toast({
        title: 'Error',
        description: 'Failed to save welcome message.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/product/${productId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Product
            </Button>
            {product && (
              <div className="flex items-center space-x-3">
                {product.icon_url && (
                  <img src={product.icon_url} alt="" className="h-8 w-8" />
                )}
                <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
              </div>
            )}
          </div>
          <Button
            onClick={() => navigate(`/product/${productId}/docs`)}
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>

        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Welcome Message</CardTitle>
                <CardDescription>
                  Customize the welcome message that clients see when they first visit this product's documentation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder={`Welcome to ${product?.name}`}
                value={welcomeMessage.title}
                onChange={(e) => setWelcomeMessage({ ...welcomeMessage, title: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Leave empty to use default: "Welcome to {product?.name}"</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter a welcoming description..."
                value={welcomeMessage.description}
                onChange={(e) => setWelcomeMessage({ ...welcomeMessage, description: e.target.value })}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">This will be displayed below the title</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="button_text">Button Text</Label>
              <Input
                id="button_text"
                placeholder="View Documentation"
                value={welcomeMessage.custom_button_text}
                onChange={(e) => setWelcomeMessage({ ...welcomeMessage, custom_button_text: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-accent/20">
              <div className="space-y-0.5">
                <Label htmlFor="show_features">Show Feature Cards</Label>
                <p className="text-sm text-muted-foreground">Display the feature overview cards in the welcome dialog</p>
              </div>
              <Switch
                id="show_features"
                checked={welcomeMessage.show_features}
                onCheckedChange={(checked) => setWelcomeMessage({ ...welcomeMessage, show_features: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-accent/20">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Active</Label>
                <p className="text-sm text-muted-foreground">Show welcome message to clients on their first visit</p>
              </div>
              <Switch
                id="is_active"
                checked={welcomeMessage.is_active}
                onCheckedChange={(checked) => setWelcomeMessage({ ...welcomeMessage, is_active: checked })}
              />
            </div>

            <div className="pt-4 flex justify-end space-x-3">
              <Button
                onClick={handleSave}
                disabled={saving}
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default WelcomeMessageManager;
