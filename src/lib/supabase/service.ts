import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente com service_role - bypassa RLS
// USE APENAS em API routes server-side, NUNCA no browser
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
