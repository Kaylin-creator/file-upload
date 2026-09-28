"use server";

import { redirect } from "next/navigation";

import { parseCredentials, type AuthFormState } from "@/lib/auth-schema";
import { createClient } from "@/lib/supabase/server";

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseCredentials(formData);
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Don't reveal whether the email exists.
    const message =
      error.code === "email_not_confirmed"
        ? "Confirm your email before logging in."
        : "Invalid email or password.";
    return { error: message, email };
  }

  redirect("/dashboard");
}
