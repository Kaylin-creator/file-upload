import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Don't rely on proxy.ts alone for protection.
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
    </main>
  );
}
