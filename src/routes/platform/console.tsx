import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getPlatformAdminContext } from "@/lib/platform.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/platform/console")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Console" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted console access." },
    ],
  }),
  component: ConsoleLogin,
});

function ConsoleLogin() {
  const nav = useNavigate();
  const checkAdmin = useServerFn(getPlatformAdminContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      toast.error("Invalid credentials");
      return;
    }
    try {
      const ctx = await checkAdmin();
      if (!ctx.isPlatformAdmin) {
        await supabase.auth.signOut();
        toast.error("Invalid credentials");
        setLoading(false);
        return;
      }
      nav({ to: "/platform/dashboard" });
    } catch {
      await supabase.auth.signOut();
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="font-display text-2xl">Console</h1>
      <p className="mt-1 text-xs text-muted-foreground">Restricted access.</p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          required
          type="email"
          placeholder="Email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <input
          required
          type="password"
          placeholder="Password"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button
          disabled={loading}
          className="w-full rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? "…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
