import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { gp, useGymSlug } from "@/lib/gym";
import { fetchMembershipBySlug, isStaffRole } from "@/lib/membership";
import { AuthBrand } from "@/components/AuthBrand";

export const Route = createFileRoute("/gym/$gymSlug/auth")({
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
    const membership = await fetchMembershipBySlug(data.user!.id, gymSlug);
    setLoading(false);
    if (!membership) {
      toast.error("This account isn't a member of this gym yet");
      return;
    }
    await supabase.from("profiles").update({ active_gym_id: membership.gym_id }).eq("id", data.user!.id);
    if (isStaffRole(membership.role)) {
      nav({ to: gp("/admin") });
    } else {
      nav({ to: gp("/home") });
    }
  };

  return (
    <div className="nuvo-site min-h-screen w-full bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-10 sm:px-10">
        <div className="w-full sm:mx-auto sm:max-w-md">
          <AuthBrand subtitle="Sign in" />

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
            Members and gym staff sign in here — you'll land on the right place automatically.
          </p>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            New member?{" "}
            <Link to={gp("/signup")} className="font-semibold text-primary">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
