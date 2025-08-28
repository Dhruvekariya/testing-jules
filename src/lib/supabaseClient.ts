import { createClient } from '@supabase/supabase-js';

// IMPORTANT: These variables should be set in your .env.local file.
// NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
// NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are not set. Please set them in your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
