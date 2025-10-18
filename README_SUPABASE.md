# DIET Kolasib Attendance System - Supabase Setup

This document provides instructions for setting up Supabase for the DIET Kolasib Attendance System.

## Prerequisites

1. Node.js installed on your machine
2. A Supabase account (free tier available at [supabase.com](https://supabase.com))

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Create a new organization (e.g., "DIET Kolasib")
4. Create a new project:
   - Project name: "diet-kolasib-attendance"
   - Database password: Create a strong password
   - Select a region closest to your location
5. Wait for the project to be created (this may take a few minutes)

### 2. Set Up the Database Schema

1. In your Supabase dashboard, go to the "SQL Editor" in the left sidebar
2. Click "New Query"
3. Copy and paste the SQL code from `supabase-schema.sql` into the editor
4. Click "Run" to execute the schema creation

### 3. Configure Authentication

1. In the Supabase dashboard, go to "Authentication" → "Providers"
2. Enable "Email" as a login provider
3. Go to "Authentication" → "Settings"
4. In "Site URL", enter your app's URL (for development, use `http://localhost:8080`)
5. In "Redirect URLs", add:
   - `http://localhost:8080/*`
   - Your production URL when ready

### 4. Get Your Supabase Credentials

1. Go to "Project Settings" → "API"
2. Copy your "Project URL" and "anon" (public) key

### 5. Configure Environment Variables

Create a `.env` file in your project root with:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Replace `your-project-url` and `your-anon-key` with the values from step 4.

### 6. Install Dependencies

Run this command in your project directory:

```bash
npm install @supabase/supabase-js
```

### 7. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:8080`
3. Try signing up and logging in to verify the authentication works
4. Check that you can access the dashboard and other protected pages

## Database Schema Overview

The system uses four main tables:

1. **users**: Stores faculty and admin information
2. **semesters**: Contains the four semesters (1st to 4th)
3. **students**: Student information linked to semesters
4. **attendance_records**: Daily attendance records for each student

## Security Features

- Row Level Security (RLS) is enabled on all tables
- Admin users have more permissions than faculty users
- Users can only access data relevant to their role
- Authentication is required for all protected routes

## Next Steps

1. Implement the student import/export functionality
2. Add more detailed reporting features
3. Implement data validation and error handling
4. Add unit tests for the database operations
5. Set up continuous deployment for your application

## Troubleshooting

If you encounter issues:

1. Verify your environment variables are correctly set
2. Check that your Supabase project URL and API key are correct
3. Ensure you've run the SQL schema setup
4. Check the browser console for any JavaScript errors
5. Review the Supabase dashboard logs for database errors

For additional help, refer to the [Supabase documentation](https://supabase.com/docs).