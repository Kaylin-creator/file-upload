"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { AuthFormState } from "@/lib/auth-schema";

type AuthFormProps = {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  title: string;
  submitLabel: string;
  pendingLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
  alternate: { prompt: string; href: string; label: string };
  initialError?: string;
};

export function AuthForm({
  action,
  title,
  submitLabel,
  pendingLabel,
  passwordAutoComplete,
  alternate,
  initialError,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    error: initialError,
  });

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold">{title}</h1>

        {state.message ? (
          <p
            role="status"
            className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800"
          >
            {state.message}
          </p>
        ) : (
          <form action={formAction} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={state.email}
                disabled={pending}
                aria-invalid={Boolean(state.error)}
                aria-describedby={state.error ? "form-error" : undefined}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 disabled:opacity-60"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={passwordAutoComplete}
                required
                minLength={8}
                disabled={pending}
                aria-invalid={Boolean(state.error)}
                aria-describedby={state.error ? "form-error" : undefined}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 disabled:opacity-60"
              />
            </div>

            {state.error && (
              <p id="form-error" role="alert" className="text-sm text-red-600">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-black px-3 py-2 font-medium text-white disabled:opacity-60"
            >
              {pending && (
                <span
                  aria-hidden
                  className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                />
              )}
              {pending ? pendingLabel : submitLabel}
            </button>
          </form>
        )}

        <p className="text-sm text-zinc-600">
          {alternate.prompt}{" "}
          <Link href={alternate.href} className="font-medium underline">
            {alternate.label}
          </Link>
        </p>
      </div>
    </main>
  );
}
