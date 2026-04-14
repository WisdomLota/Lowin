import { createBrowserClient } from '@supabase/ssr'

// This creates a Supabase client for use in browser/client components.
// It uses the public anon key — row-level security on the database
// controls what each user can actually read/write.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}