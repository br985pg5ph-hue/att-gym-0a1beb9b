import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { gp } from "@/lib/gym";
import { NuvoLogo } from "@/components/NuvoLogo";

export const Route = createFileRoute("/g/$gymSlug/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user!.id)
      .maybeSingle();

    const allowed = ["staff", "admin", "owner"];
    if (!prof || !allowed.includes(prof.role)) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("This portal is for gym staff and admins only.");
      return;
    }
    setLoading(false);
    nav({ to: gp("/admin") });
  };

  return (
    <div className="nuvo-site min-h-screen w-full bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-10 sm:px-10">
        <div className="w-full sm:mx-auto sm:max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <NuvoLogo size={64} />
            <h1 className="mt-4 font-display text-4xl tracking-tight">
              Nuvo<span className="text-primary">.</span>
            </h1>
            <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              Gym portal login
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              required
              type="email"
              placeholder="Work email"
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
            <div className="text-end">
              <Link to={gp("/forgot")} className="text-xs text-muted-foreground hover:text-foreground">
                Forgot password?
              </Link>
            </div>
            <button
              disabled={loading}
              className="w-full rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {loading ? "…" : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            This portal is for gym staff and owners. Members sign in through their gym's own app.
          </p>
        </div>
      </div>
    </div>
  );
}
