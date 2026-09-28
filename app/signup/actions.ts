"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { parseCredentials, type AuthFormState } from "@/lib/auth-schema";
import { createClient } from "@/lib/supabase/server";

export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseCredentials(formData);
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, email };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: origin
      ? { emailRedirectTo: `${origin}/auth/callback` }
      : undefined,
  });

  if (error) {
    return { error: error.message, email };
  }

  // Email confirmation enabled: no session until the link is clicked.
  if (!data.session) {
    return { message: "Check your email to confirm your account." };
  }

  redirect("/dashboard");
}
