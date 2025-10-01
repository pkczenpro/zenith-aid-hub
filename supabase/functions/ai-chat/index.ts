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
    let articlesData = [];
    let resourcesData = [];
    let videosData = [];
    
    if (productId) {
      // Fetch articles
      const { data: articles } = await supabase
        .from("articles")
        .select("id, title, content")
        .eq("product_id", productId)
        .eq("status", "published");
      articlesData = articles || [];

      // Fetch resources
      const { data: resources } = await supabase
        .from("product_resources")
        .select("id, title, description, file_url, resource_type")
        .eq("product_id", productId);
      resourcesData = resources || [];

      // Fetch videos
      const { data: videos } = await supabase
        .from("product_videos")
        .select("id, title, caption, video_content")
        .eq("product_id", productId)
        .order("order_index", { ascending: true });
      videosData = videos || [];

      // Fetch product info
      const { data: product } = await supabase
        .from("products")
        .select("name, description")
        .eq("id", productId)
        .single();

      // Build detailed context string with searchable content
      contextData = `Product: ${product?.name || "Unknown"}
Description: ${product?.description || ""}

Available Articles (use [article:ID] to link):
${articlesData.map(a => {
  const contentText = typeof a.content === 'string' ? a.content : JSON.stringify(a.content);
  return `- TITLE: "${a.title}" | ID: ${a.id} | PREVIEW: ${contentText.substring(0, 150)}...`;
}).join("\n") || "No articles available"}

Available Resources (use [resource:ID] to link):
${resourcesData.map(r => `- TITLE: "${r.title}" | ID: ${r.id} | TYPE: ${r.resource_type} | DESC: ${r.description || "No description"}`).join("\n") || "No resources available"}

Available Videos (use [video:ID] to link):
${videosData.map(v => `- TITLE: "${v.title}" | ID: ${v.id} | CAPTION: ${v.caption || "No caption"}`).join("\n") || "No videos available"}`;
    }

    const systemPrompt = `You are Zenithr Assistant, an intelligent support agent helping users with Zenithr products.

${contextData}

CRITICAL INSTRUCTIONS FOR MATCHING USER QUERIES TO CONTENT:

1. **Intelligent Content Matching**: When a user asks about a topic, carefully analyze the TITLES of available articles, resources, and videos to find the BEST MATCH.
   - Look for keywords in the user's query that match resource titles
   - Use semantic understanding - "dashboard" matches "PPA Dashboard", "GIA Dashboard", etc.
   - "Setup" or "account" matches "Account Setup"
   - Be flexible with plurals, abbreviations, and variations

2. **Direct Linking**: When you find a matching resource, ALWAYS include the link tag in your response:
   - For articles: [article:ID]
   - For resources: [resource:ID]
   - For videos: [video:ID]
   
3. **Response Format**: When linking to content, use this exact format:
   - "Here's the [Resource Title] [video:ID] that covers what you're looking for."
   - "You can find information about this in our [Article Title] [article:ID]."
   - "Download this helpful [Resource Name] [resource:ID]."

4. **Multiple Matches**: If multiple resources match, suggest the most relevant one first, then mention others as alternatives.

5. **No Match Found**: If you can't find a specific match, list the closest available resources and ask the user to clarify.

Examples of good responses:
- User: "Show me dashboard video" → "Here's the PPA Dashboard [video:xxx] tutorial that shows you how to use the dashboard."
- User: "How do I set up my account?" → "Check out the Account Setup [video:xxx] guide that walks you through the setup process."
- User: "Download user guide" → "Here's the User Guide [resource:xxx] you can download."

If no product is selected yet, ask the user which product they need help with.
Keep responses concise, friendly, and always include the link tags when referencing content.`;

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
