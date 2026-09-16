import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://meujwpicsfxgkphvrojs.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_61JunVsMNH4gsYu5y0SBXw_dNtYXaKT';

  return createBrowserClient(supabaseUrl, supabaseKey);
}
