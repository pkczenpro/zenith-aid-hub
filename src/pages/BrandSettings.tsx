import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Palette, MessageSquare, Globe, Upload } from "lucide-react";

interface BrandSettings {
  id: string;
  chatbot_name: string;
  chatbot_icon_url: string | null;
  chatbot_brand_color: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

const BrandSettings = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BrandSettings>({
    id: "",
    chatbot_name: "Zenithr Assistant",
    chatbot_icon_url: null,
    chatbot_brand_color: "262 83% 58%",
    primary_color: "262 83% 58%",
    secondary_color: "240 5% 96%",
    accent_color: "212 100% 47%",
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    loadSettings();
  }, [isAdmin, navigate]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("brand_settings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading brand settings:", error);
      toast.error("Failed to load brand settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get current user's profile ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("User not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const settingsData = {
        chatbot_name: settings.chatbot_name,
        chatbot_icon_url: settings.chatbot_icon_url,
        chatbot_brand_color: settings.chatbot_brand_color,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        accent_color: settings.accent_color,
        updated_by: profile.id,
      };

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from("brand_settings")
          .update(settingsData)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from("brand_settings")
          .insert([settingsData])
          .select()
          .single();

        if (error) throw error;
        if (data) setSettings(data);
      }

      // Apply settings to CSS variables immediately
      applySettings(settings);
      
      toast.success("Brand settings saved successfully! Changes applied globally.");
    } catch (error) {
      console.error("Error saving brand settings:", error);
      toast.error("Failed to save brand settings");
    } finally {
      setSaving(false);
    }
  };

  const applySettings = (newSettings: BrandSettings) => {
    const root = document.documentElement;
    root.style.setProperty("--primary", newSettings.primary_color);
    root.style.setProperty("--accent", newSettings.accent_color);
    root.style.setProperty("--secondary", newSettings.secondary_color);
  };

  const handleColorChange = (field: keyof BrandSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const hslToHex = (hsl: string): string => {
    const [h, s, l] = hsl.split(" ").map(v => parseFloat(v));
    const hDecimal = h / 360;
    const sDecimal = s / 100;
    const lDecimal = l / 100;
    
    const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
    const x = c * (1 - Math.abs(((hDecimal * 6) % 2) - 1));
    const m = lDecimal - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (hDecimal < 1/6) {
      r = c; g = x; b = 0;
    } else if (hDecimal < 2/6) {
      r = x; g = c; b = 0;
    } else if (hDecimal < 3/6) {
      r = 0; g = c; b = x;
    } else if (hDecimal < 4/6) {
      r = 0; g = x; b = c;
    } else if (hDecimal < 5/6) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }
    
    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    
    if (max === min) {
      return `0 0% ${Math.round(l * 100)}%`;
    }
    
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    let h = 0;
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Brand Settings</h1>
        <p className="text-muted-foreground">
          Customize your chatbot and website theme colors
        </p>
      </div>

      <div className="space-y-6">
        {/* Chatbot Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chatbot Branding
            </CardTitle>
            <CardDescription>
              Customize the appearance of your AI chatbot assistant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="chatbot_name">Chatbot Name</Label>
              <Input
                id="chatbot_name"
                value={settings.chatbot_name}
                onChange={(e) => setSettings({ ...settings, chatbot_name: e.target.value })}
                placeholder="Zenithr Assistant"
              />
            </div>

            <div>
              <Label htmlFor="chatbot_brand_color">Chatbot Brand Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={hslToHex(settings.chatbot_brand_color)}
                  onChange={(e) => handleColorChange("chatbot_brand_color", hexToHsl(e.target.value))}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.chatbot_brand_color}
                  onChange={(e) => handleColorChange("chatbot_brand_color", e.target.value)}
                  placeholder="262 83% 58%"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Format: H S% L% (e.g., 262 83% 58%)
              </p>
            </div>

            <div>
              <Label htmlFor="chatbot_icon">Chatbot Icon</Label>
              <div className="flex gap-2">
                <Input
                  id="chatbot_icon"
                  value={settings.chatbot_icon_url || ""}
                  onChange={(e) => setSettings({ ...settings, chatbot_icon_url: e.target.value })}
                  placeholder="URL to chatbot icon"
                />
                <Button variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Website Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Website Theme
            </CardTitle>
            <CardDescription>
              Customize your website's primary colors and theme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={hslToHex(settings.primary_color)}
                  onChange={(e) => handleColorChange("primary_color", hexToHsl(e.target.value))}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => handleColorChange("primary_color", e.target.value)}
                  placeholder="262 83% 58%"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Main brand color used throughout the site
              </p>
            </div>

            <div>
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={hslToHex(settings.secondary_color)}
                  onChange={(e) => handleColorChange("secondary_color", hexToHsl(e.target.value))}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.secondary_color}
                  onChange={(e) => handleColorChange("secondary_color", e.target.value)}
                  placeholder="240 5% 96%"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Secondary background and UI elements
              </p>
            </div>

            <div>
              <Label htmlFor="accent_color">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={hslToHex(settings.accent_color)}
                  onChange={(e) => handleColorChange("accent_color", hexToHsl(e.target.value))}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.accent_color}
                  onChange={(e) => handleColorChange("accent_color", e.target.value)}
                  placeholder="212 100% 47%"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Accent color for highlights and buttons
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Preview
            </CardTitle>
            <CardDescription>
              Preview how your colors will look
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div 
                  className="w-20 h-20 rounded-lg border-2 border-border shadow-sm"
                  style={{ backgroundColor: `hsl(${settings.primary_color})` }}
                />
                <div 
                  className="w-20 h-20 rounded-lg border-2 border-border shadow-sm"
                  style={{ backgroundColor: `hsl(${settings.secondary_color})` }}
                />
                <div 
                  className="w-20 h-20 rounded-lg border-2 border-border shadow-sm"
                  style={{ backgroundColor: `hsl(${settings.accent_color})` }}
                />
                <div 
                  className="w-20 h-20 rounded-lg border-2 border-border shadow-sm"
                  style={{ backgroundColor: `hsl(${settings.chatbot_brand_color})` }}
                />
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span className="w-20 text-center">Primary</span>
                <span className="w-20 text-center">Secondary</span>
                <span className="w-20 text-center">Accent</span>
                <span className="w-20 text-center">Chatbot</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BrandSettings;
