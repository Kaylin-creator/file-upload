import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env.public";
import type { Database } from "@/types/database";

// Client for Client Components. Session lives in cookies shared with the server.
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
