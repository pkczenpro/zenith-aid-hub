import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateClientRequest {
  email: string;
  password: string;
  full_name: string;
  company?: string;
  industry?: string;
  assignedProducts: string[];
  logoUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, password, full_name, company, industry, assignedProducts, logoUrl }: CreateClientRequest = await req.json();

    // Create user with admin privileges (bypasses email confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        role: 'client'
      }
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Failed to create user');
    }

    // Wait for profile to be created by trigger
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get the profile ID
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', authData.user.id)
      .single();

    if (profileError || !profileData) {
      throw new Error('Profile creation failed');
    }

    // Create client record
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert({
        profile_id: profileData.id,
        name: full_name,
        industry: industry || null,
        company: company || null,
        status: 'active',
        logo_url: logoUrl || null
      })
      .select()
      .single();

    if (clientError) {
      throw new Error(clientError.message);
    }

    // Get current admin profile for granted_by
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Admin authentication required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error('Admin user not found');
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', currentUser.id)
      .single();

    if (!adminProfile) {
      throw new Error('Admin profile not found');
    }

    // Assign products to client
    if (assignedProducts.length > 0) {
      const accessRecords = assignedProducts.map(productId => ({
        client_id: clientData.id,
        product_id: productId,
        granted_by: adminProfile.id
      }));

      const { error: accessError } = await supabaseAdmin
        .from('client_product_access')
        .insert(accessRecords);

      if (accessError) {
        throw new Error(accessError.message);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      client: clientData,
      user: authData.user
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in create-client function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);