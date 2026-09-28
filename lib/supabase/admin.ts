import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

// Service-role client: BYPASSES Row Level Security.
// Only use it where RLS must be bypassed, and add a comment at each call site
// explaining why the user-scoped client (lib/supabase/server.ts) is not enough.
// Never derive a userId for it from client input; take it from requireUser().
// Currently unused: public.users rows are created by the on_auth_user_created trigger.
export function createAdminClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
