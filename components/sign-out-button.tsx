"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setError("Couldn't sign out. Try again.");
      setPending(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        aria-busy={pending}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
