import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the Google Sheets Web App URL from Supabase secrets
    const googleSheetsWebAppUrl = Deno.env.get('GOOGLE_SHEETS_WEB_APP_URL');

    if (!googleSheetsWebAppUrl) {
      throw new Error('GOOGLE_SHEETS_WEB_APP_URL secret is not set.');
    }

    const { attendanceRecords, semesterName } = await req.json();

    if (!attendanceRecords || !Array.isArray(attendanceRecords) || !semesterName) {
      return new Response(JSON.stringify({ error: 'Invalid request body. Expected attendanceRecords array and semesterName.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Prepare data for Google Apps Script
    const dataToSend = attendanceRecords.map((record: any) => ({
      date: record.date,
      period: record.period,
      studentName: record.studentName, // Assuming studentName is passed from frontend
      rollNumber: record.rollNumber,   // Assuming rollNumber is passed from frontend
      isPresent: record.is_present,
      semesterName: semesterName,
    }));

    // Send data to Google Apps Script Web App
    const response = await fetch(googleSheetsWebAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSend),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      console.error('Error from Google Apps Script:', result.error || response.statusText);
      throw new Error(result.error || 'Failed to export data to Google Sheets.');
    }

    return new Response(JSON.stringify({ message: 'Attendance data exported successfully to Google Sheets.', result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});