import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Edge Function: admin-update-user-password invoked.');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);

  let userId: string | undefined;
  let newPassword: string | undefined;

  try {
    const requestBody = await req.json();
    userId = requestBody.userId;
    newPassword = requestBody.newPassword;
    console.log('Parsed request body - userId:', userId ? 'present' : 'missing', 'newPassword:', newPassword ? 'present' : 'missing');

    if (!userId || !newPassword) {
      console.error('Validation Error: User ID or new password missing from request body.');
      return new Response(JSON.stringify({ error: 'User ID and new password are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment variables check - SUPABASE_URL:', supabaseUrl ? 'present' : 'missing', 'SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'present' : 'missing');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Configuration Error: Supabase URL or Service Role Key is not set in environment variables.');
      return new Response(JSON.stringify({ error: 'Server configuration error: Supabase credentials missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Update the user's password using the admin client
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error('Supabase Admin API Error updating user password:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log('User password updated successfully for userId:', userId);
    return new Response(JSON.stringify({ message: 'User password updated successfully.', user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Unexpected error in admin-update-user-password Edge Function:', error.message);
    return new Response(JSON.stringify({ error: `An unexpected error occurred: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});