import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, productId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch relevant articles and resources for context
    let contextData = "";
    
    if (productId) {
      // Fetch articles
      const { data: articles } = await supabase
        .from("articles")
        .select("id, title, content")
        .eq("product_id", productId)
        .eq("status", "published");

      // Fetch resources
      const { data: resources } = await supabase
        .from("product_resources")
        .select("id, title, description, file_url")
        .eq("product_id", productId);

      // Fetch videos
      const { data: videos } = await supabase
        .from("product_videos")
        .select("id, title, caption")
        .eq("product_id", productId);

      // Fetch product info
      const { data: product } = await supabase
        .from("products")
        .select("name, description")
        .eq("id", productId)
        .single();

      // Build context string
      contextData = `Product: ${product?.name || "Unknown"}
Description: ${product?.description || ""}

Available Articles:
${articles?.map(a => `- ${a.title} (ID: ${a.id}): ${a.content.substring(0, 200)}...`).join("\n") || "No articles available"}

Available Resources:
${resources?.map(r => `- ${r.title} (ID: ${r.id}): ${r.description || ""}`).join("\n") || "No resources available"}

Available Videos:
${videos?.map(v => `- ${v.title} (ID: ${v.id}): ${v.caption || ""}`).join("\n") || "No videos available"}`;
    }

    const systemPrompt = `You are Zenithr Assistant, an intelligent support agent helping users with Zenithr products.

${contextData}

Your responsibilities:
1. Help users troubleshoot issues with their selected product
2. Recommend relevant articles, resources, and videos from the available content
3. Provide clear, concise answers to FAQs
4. When citing articles or resources, ALWAYS include the ID in this format: [article:ID] or [resource:ID] or [video:ID]
5. Be friendly, professional, and solution-oriented

When recommending content:
- Use [article:ID] format for articles (e.g., "Check out our guide [article:abc123]")
- Use [resource:ID] format for downloadable resources (e.g., "Download this resource [resource:xyz456]")
- Use [video:ID] format for videos (e.g., "Watch this tutorial [video:vid789]")

If no product is selected yet, ask the user which product they need help with.
Keep responses concise and actionable.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
