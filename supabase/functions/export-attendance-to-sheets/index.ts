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
  console.log('Request headers:', req.headers);

  let requestBody;
  try {
    requestBody = await req.json();
    console.log('Parsed request body:', requestBody);
  } catch (jsonError) {
    console.error('Error parsing JSON body:', jsonError.message);
    try {
      const rawBody = await req.text();
      console.error('Raw request body:', rawBody);
    } catch (textError) {
      console.error('Could not read raw request body:', textError.message);
    }
    return new Response(JSON.stringify({ error: 'Failed to parse request body as JSON. Ensure Content-Type is application/json and body is valid JSON.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    const { date, period, semesterName, facultyName, studentsAttendance } = requestBody;

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