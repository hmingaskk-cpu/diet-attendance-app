# Supabase Setup Guide for DIET Kolasib Attendance System

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "New Project"
3. Sign up or log in to your Supabase account
4. Create a new organization if you don't have one:
   - Name it something like "DIET Kolasib"
5. Create a new project:
   - Project name: "diet-kolasib-attendance"
   - Database password: Create a strong password and save it
   - Select a region closest to your location
6. Click "Create Project" (this may take a few minutes)

## Step 2: Set Up the Database Schema

1. In your Supabase dashboard, go to the "SQL Editor" in the left sidebar
2. Click "New Query"
3. Copy and paste the SQL code from `supabase-schema.sql` into the editor
4. Click "Run" to execute the schema creation

## Step 3: Configure Authentication

1. In the Supabase dashboard, go to "Authentication" → "Providers"
2. Enable "Email" as a login provider
3. Go to "Authentication" → "Settings"
4. In "Site URL", enter your app's URL (for development, you can use `http://localhost:8080`)
5. In "Redirect URLs", add:
   - `http://localhost:8080/*`
   - `http://localhost:3000/*`
   - Your production URL when ready

## Step 4: Set Up Row Level Security (RLS)

The SQL script already includes RLS policies, but you can verify them:
1. Go to "Table Editor" in the left sidebar
2. Check each table and ensure RLS is enabled
3. Go to "Policies" tab for each table to verify policies are in place

## Step 5: Get Your Supabase Credentials

1. Go to "Project Settings" → "API"
2. Copy your "Project URL" and "anon" (public) key
3. You'll need these for your app configuration

## Step 6: Configure Environment Variables in Your App

Create a `.env` file in your project root with:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Replace `your-project-url` and `your-anon-key` with the values from Step 5.

## Step 7: Install Supabase Client in Your App

Run this command in your project directory:

```bash
npm install @supabase/supabase-js
```

## Step 8: Initialize Supabase Client

Create a file `src/lib/supabaseClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## Step 9: Set Up Authentication UI

The authentication UI is already implemented in your app with LoginForm and SignupForm components. These will work with Supabase once you connect them.

## Step 10: Connect Your App to Supabase

You'll need to update your components to use the Supabase client for data operations. Here's an example for the login form:

```typescript
// In src/components/auth/LoginForm.tsx
import { supabase } from '@/lib/supabaseClient'

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    toast({
      title: "Login Failed",
      description: error.message,
      variant: "destructive"
    })
  } else {
    toast({
      title: "Login Successful",
      description: "Redirecting to dashboard...",
    })
    // Redirect to dashboard
  }
  
  setIsLoading(false)
}
```

## Additional Notes

1. The schema includes Row Level Security (RLS) policies to ensure data security
2. Admin users have more permissions than faculty users
3. The system is designed to handle 4 semesters with 6 periods each
4. Attendance records are linked to specific faculty members
5. All tables have proper indexing for performance

## Next Steps

1. Implement the data fetching logic in your components
2. Add error handling for all Supabase operations
3. Test the authentication flow
4. Implement the attendance submission functionality
5. Add the student import/export features
6. Implement the reporting functionality