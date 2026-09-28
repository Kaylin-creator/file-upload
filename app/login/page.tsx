import { AuthForm } from "@/components/auth-form";

import { login } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  confirmation_failed:
    "That confirmation link is invalid or has expired. Try logging in or signing up again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const initialError =
    typeof error === "string" ? ERROR_MESSAGES[error] : undefined;

  return (
    <AuthForm
      action={login}
      title="Log in"
      submitLabel="Log in"
      pendingLabel="Logging in…"
      passwordAutoComplete="current-password"
      alternate={{
        prompt: "Don't have an account?",
        href: "/signup",
        label: "Sign up",
      }}
      initialError={initialError}
    />
  );
}
