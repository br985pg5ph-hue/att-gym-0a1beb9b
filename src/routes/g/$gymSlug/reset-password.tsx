import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/g/$gymSlug/reset-password")({
  ssr: false,
  component: ResetPage,
});

function ResetPage() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); nav({ to: "/home" }); }
  };
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-3xl">New password</h1>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input required minLength={6} type="password" placeholder="New password" value={pw} onChange={(e)=>setPw(e.target.value)}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
        <button className="w-full rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground">Update password</button>
      </form>
    </div>
  );
}
