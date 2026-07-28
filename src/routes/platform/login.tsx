import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { getPlatformAdminContext } from "@/lib/platform.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/platform/login")({
  ssr: false,
  component: PlatformLogin,
});

function PlatformLogin() {
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
      toast.error(error?.message ?? "Sign-in failed");
      return;
    }

    try {
      const ctx = await checkAdmin();
      if (!ctx.isPlatformAdmin) {
        await supabase.auth.signOut();
        toast.error("This account does not have platform admin access");
        setLoading(false);
        return;
      }
      toast.success("Welcome back");
      nav({ to: "/platform/dashboard" });
    } catch (err: any) {
      await supabase.auth.signOut();
      toast.error(err?.message ?? "Platform admin check failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo size={80} />
        <h1 className="font-display mt-4 text-3xl">Platform admin</h1>
        <p className="mt-2 text-xs text-muted-foreground">Authorized personnel only</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <input
          required
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button
          disabled={loading}
          className="w-full rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? "…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/platform" className="hover:text-foreground">← Back</Link>
      </p>
    </div>
  );
}
