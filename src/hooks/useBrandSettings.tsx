import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BrandSettings {
  chatbot_name: string;
  chatbot_icon_url: string | null;
  chatbot_brand_color: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

const DEFAULT_SETTINGS: BrandSettings = {
  chatbot_name: "Zenithr Assistant",
  chatbot_icon_url: null,
  chatbot_brand_color: "262 83% 58%",
  primary_color: "262 83% 58%",
  secondary_color: "240 5% 96%",
  accent_color: "212 100% 47%",
};

export const useBrandSettings = () => {
  const [settings, setSettings] = useState<BrandSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    
    // Subscribe to changes in brand settings
    const channel = supabase
      .channel("brand_settings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "brand_settings",
        },
        (payload) => {
          if (payload.new) {
            const newSettings = payload.new as BrandSettings;
            setSettings(newSettings);
            applySettings(newSettings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
        setSettings(data as BrandSettings);
        applySettings(data as BrandSettings);
      } else {
        applySettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error("Error loading brand settings:", error);
      applySettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const applySettings = (brandSettings: BrandSettings) => {
    const root = document.documentElement;
    root.style.setProperty("--primary", brandSettings.primary_color);
    root.style.setProperty("--accent", brandSettings.accent_color);
    root.style.setProperty("--secondary", brandSettings.secondary_color);
    
    // Update gradients that use these colors
    root.style.setProperty(
      "--gradient-hero",
      `linear-gradient(135deg, hsl(${brandSettings.primary_color}), hsl(${brandSettings.accent_color}))`
    );
    root.style.setProperty(
      "--gradient-button",
      `linear-gradient(135deg, hsl(${brandSettings.primary_color}), hsl(${brandSettings.primary_color}))`
    );
  };

  return { settings, loading };
};
