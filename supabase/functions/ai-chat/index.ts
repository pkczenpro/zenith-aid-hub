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
Product ID: ${productId}
Description: ${product?.description || ""}

CRITICAL: When linking to content, you MUST use the exact Product ID provided above: ${productId}

Available Articles (use [article:${productId}:ARTICLE_ID] format):
${articlesData.map(a => {
  const contentText = typeof a.content === 'string' ? a.content : JSON.stringify(a.content);
  return `- TITLE: "${a.title}" | ARTICLE_ID: ${a.id} | PREVIEW: ${contentText.substring(0, 150)}...`;
}).join("\n") || "No articles available"}

Available Resources (use [resource:${productId}:RESOURCE_ID] format):
${resourcesData.map(r => `- TITLE: "${r.title}" | RESOURCE_ID: ${r.id} | TYPE: ${r.resource_type} | DESC: ${r.description || "No description"}`).join("\n") || "No resources available"}

Available Videos (use [video:${productId}:VIDEO_ID] format):
${videosData.map(v => `- TITLE: "${v.title}" | VIDEO_ID: ${v.id} | CAPTION: ${v.caption || "No caption"}`).join("\n") || "No videos available"}`;
    }

    const systemPrompt = `You are Zenithr Assistant, an intelligent support agent helping users with Zenithr products.

${contextData}

CRITICAL INSTRUCTIONS FOR MATCHING USER QUERIES TO CONTENT:

1. **Intelligent Content Matching**: When a user asks about a topic, carefully analyze the TITLES of available articles, resources, and videos to find the BEST MATCH.
   - Look for keywords in the user's query that match resource titles
   - Use semantic understanding - "dashboard" matches "PPA Dashboard", "GIA Dashboard", etc.
   - "Setup" or "account" matches "Account Setup"
   - Be flexible with plurals, abbreviations, and variations

3. **CRITICAL - Link Format Requirements**:
   - You MUST use the EXACT VIDEO_ID, ARTICLE_ID, and RESOURCE_ID values listed above
   - NEVER make up or hallucinate UUIDs - ONLY use the IDs explicitly listed in the context
   - ALWAYS copy the exact UUID from the context above when creating links
   - Double-check that the ID you're using appears in the "Available Videos/Articles/Resources" section
   - For articles: [article:EXACT_PRODUCT_UUID:ARTICLE_UUID_FROM_LIST_ABOVE]
   - For resources: [resource:EXACT_PRODUCT_UUID:RESOURCE_UUID_FROM_LIST_ABOVE]
   - For videos: [video:EXACT_PRODUCT_UUID:VIDEO_UUID_FROM_LIST_ABOVE]
   
3. **Response Format**: When linking to content, use this exact format with the actual UUIDs:
   - "Here's the [Resource Title] [video:dc368868-2da9-45f6-b740-dd108c145ea9:VIDEO_UUID] that covers what you're looking for."
   - "You can find information about this in our [Article Title] [article:dc368868-2da9-45f6-b740-dd108c145ea9:ARTICLE_UUID]."
   - "Download this helpful [Resource Name] [resource:dc368868-2da9-45f6-b740-dd108c145ea9:RESOURCE_UUID]."

4. **Multiple Matches**: If multiple resources match, suggest the most relevant one first, then mention others as alternatives.

5. **No Match Found**: If you can't find a specific match, list the closest available resources and ask the user to clarify.

REMEMBER: Always use the actual Product UUID from the context, NOT the product name!

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
    
    // Log the AI response for debugging
    console.log("AI Response:", data.choices[0]?.message?.content);
    
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
