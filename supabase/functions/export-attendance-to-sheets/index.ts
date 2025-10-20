import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Edge Function received request.');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:');
  for (const [key, value] of req.headers.entries()) {
    console.log(`  ${key}: ${value}`);
  }

  let requestBodyJson: any = null;

  try {
    // Attempt to parse the request body directly as JSON
    requestBodyJson = await req.json();
    console.log('Parsed request body (JSON):', requestBodyJson);

    if (!requestBodyJson || Object.keys(requestBodyJson).length === 0) {
      console.log('Request body was empty or invalid JSON.');
      return new Response(JSON.stringify({ error: 'Request body is empty or invalid JSON.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
  } catch (jsonError: any) {
    console.error('Error parsing JSON body:', jsonError.message);
    return new Response(JSON.stringify({ error: `Failed to parse request body as JSON: ${jsonError.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    const { date, period, semesterName, facultyName, studentsAttendance } = requestBodyJson;

    const googleSheetsWebAppUrl = Deno.env.get('GOOGLE_SHEETS_WEB_APP_URL');

    if (!googleSheetsWebAppUrl) {
      throw new Error('Google Sheets Web App URL is not configured.');
    }

    const response = await fetch(googleSheetsWebAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date,
        period,
        semesterName,
        facultyName,
        studentsAttendance,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to export to Google Sheet: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify({ message: 'Attendance exported to Google Sheet successfully.', result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in export-attendance-to-sheets Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});