import { createClient } from '@supabase/supabase-js';

// Use environment variables for better security and flexibility
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oxtbseyzixridlqsplam.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94dGJzZXl6aXhyaWRscXNwbGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwMzUxNDQsImV4cCI6MjA1NzYxMTE0NH0.iyt2-DUkg1ROlPQaDPPIW8oEkPOaG2GerZ6QsrpvvAQ';

// Create a single instance of the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
}); 