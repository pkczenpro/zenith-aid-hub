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
    
    // Validate that a product is selected
    if (!productId) {
      return new Response(
        JSON.stringify({ 
          error: "Please select a product before starting the chat." 
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch brand settings to get chatbot name
    const { data: brandSettings } = await supabase
      .from("brand_settings")
      .select("chatbot_name")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const chatbotName = brandSettings?.chatbot_name || "Zenithr Assistant";

    // Fetch ALL available products for product mismatch detection
    const { data: allProducts } = await supabase
      .from("products")
      .select("id, name, description")
      .eq("status", "published");
    
    const otherProducts = (allProducts || []).filter(p => p.id !== productId);
    const otherProductsList = otherProducts.map(p => `- ${p.name}: ${p.description || 'No description'}`).join("\n");

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

const systemPrompt = `You are ${chatbotName}, an intelligent support agent helping users with their products.

CURRENT PRODUCT CONTEXT:
${contextData}

OTHER AVAILABLE PRODUCTS:
${otherProductsList || "No other products available"}

CRITICAL PRODUCT MISMATCH DETECTION:
1. **Detect Product Mismatch**: If the user's question is clearly about a DIFFERENT product than the currently selected one:
   - Look for product names in their question (e.g., "Assessment", "Elevate")
   - Check if their question topic doesn't match the current product's content
   
2. **When Product Mismatch Detected**: 
   - Respond with: "It looks like you're asking about [Other Product Name], but you currently have [Current Product Name] selected. Would you like to switch to [Other Product Name] for accurate information? __SWITCH_PRODUCT__"
   - The __SWITCH_PRODUCT__ marker is CRITICAL - it triggers the product selection UI
   - DO NOT provide answers about the other product - only suggest switching

3. **When Product Matches**: Continue answering normally using the current product's context and resources.

CRITICAL INSTRUCTIONS FOR MATCHING USER QUERIES TO CONTENT:

1. **Intelligent Content Matching**: When a user asks about a topic, carefully analyze the TITLES of available articles, resources, and videos to find the BEST MATCH.
   - Look for keywords in the user's query that match resource titles
   - Use semantic understanding - "dashboard" matches "PPA Dashboard", "GIA Dashboard", etc.
   - "Setup" or "account" matches "Account Setup"
   - Be flexible with plurals, abbreviations, and variations

2. **CRITICAL - NEVER GENERATE OR INVENT IDs**:
   - STOP! Before creating ANY link, look at the "Available Videos/Articles/Resources" section above
   - Find the exact VIDEO_ID, ARTICLE_ID, or RESOURCE_ID that matches the content title
   - COPY that exact UUID character-by-character - DO NOT modify it
   - If you cannot find a matching ID in the list above, DO NOT create a link for that content
   - WRONG: [video:dc368868-2da9-45f6-b740-dd108c145ea9:15b1307b-842c-473d-9d41-38290fbb664c] (this ID is invented)
   - RIGHT: [video:dc368868-2da9-45f6-b740-dd108c145ea9:5954824b-f806-424f-8368-477e14185e32] (this ID is from the list)

3. **MANDATORY Link Format - ALWAYS USE MARKDOWN STYLE**:
   - CRITICAL: You MUST ALWAYS use Markdown link format with PARENTHESES (), NOT square brackets []
   - For videos: [Link Title](video:${productId}:VIDEO_ID_COPIED_FROM_ABOVE)
   - For articles: [Link Title](article:${productId}:ARTICLE_ID_COPIED_FROM_ABOVE)
   - For resources: [Link Title](resource:${productId}:RESOURCE_ID_COPIED_FROM_ABOVE)
   
4. **Verification Step**: Before sending your response:
   - Re-read the "Available Videos/Articles/Resources" section
   - Verify EVERY ID you used appears EXACTLY in that list
   - If any ID doesn't match, remove that link from your response
   
5. **Response Format Examples - ALWAYS USE THIS EXACT FORMAT**:
   - CORRECT: "Here's the [GIA Dashboard](video:${productId}:70066ebd-a6aa-4636-a732-18817d56d66e) video."
   - CORRECT: "Check out [PPA Results](article:${productId}:37dfdcab-1261-4899-ba46-ded096dd19fc)."
   - CORRECT: "Download [Thomas PPA Factsheet](resource:${productId}:640cf157-f2d0-4cbd-9032-eba5bf823027)."
   - WRONG: "Here's [GIA Dashboard] [video:...] video." (NEVER use this format)
   - WRONG: "[video:...] shows the dashboard." (NEVER put link without title text)

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
    
    // Check if response contains product switch marker
    const aiMessage = data.choices[0]?.message?.content || "";
    const needsProductSwitch = aiMessage.includes("__SWITCH_PRODUCT__");
    
    // Add metadata to response if product switch is needed
    if (needsProductSwitch) {
      data.needsProductSwitch = true;
      // Clean the marker from the message
      data.choices[0].message.content = aiMessage.replace("__SWITCH_PRODUCT__", "");
    }
    
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
