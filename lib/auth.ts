import "server-only";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export class UnauthorizedError extends Error {
  readonly status = 401;
  readonly code = "UNAUTHENTICATED";

  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// For route handlers. Returns the session user plus a user-scoped (RLS) client,
// or throws UnauthorizedError. The userId must always come from here, never
// from the request body or query.
export async function requireUser(): Promise<{
  user: User;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  // getUser() verifies the session with the Auth server (catches revoked sessions).
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError();
  }
  return { user, supabase };
}
