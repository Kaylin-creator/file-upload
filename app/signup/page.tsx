import { AuthForm } from "@/components/auth-form";

import { signup } from "./actions";

export default function SignupPage() {
  return (
    <AuthForm
      action={signup}
      title="Create an account"
      submitLabel="Sign up"
      pendingLabel="Creating account…"
      passwordAutoComplete="new-password"
      alternate={{
        prompt: "Already have an account?",
        href: "/login",
        label: "Log in",
      }}
    />
  );
}
