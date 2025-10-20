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

  let requestBodyText: string | null = null;
  let requestBodyJson: any = null;

  try {
    // Attempt to read the raw text body first
    requestBodyText = await req.text();
    console.log('Raw request body received:', requestBodyText);

    // Then attempt to parse it as JSON
    if (requestBodyText) {
      requestBodyJson = JSON.parse(requestBodyText);
      console.log('Parsed request body (JSON):', requestBodyJson);
    } else {
      console.log('Request body was empty.');
      return new Response(JSON.stringify({ error: 'Request body is empty.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
  } catch (jsonError) {
    console.error('Error parsing JSON body:', jsonError.message);
    return new Response(JSON.stringify({ error: `Failed to parse request body as JSON: ${jsonError.message}. Raw body: ${requestBodyText}` }), {
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

  } catch (error) {
    console.error('Error in export-attendance-to-sheets Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});