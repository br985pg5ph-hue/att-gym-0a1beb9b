import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthBrand } from "@/components/AuthBrand";
import { toast } from "sonner";
import { fetchGym, gp, useGymSlug } from "@/lib/gym";

export const Route = createFileRoute("/gym/$gymSlug/staff-login")({
  ssr: false,
  component: StaffLoginPage,
});

function StaffLoginPage() {
  const nav = useNavigate();
  const gymSlug = useGymSlug();
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
    const membership = await fetchMembershipBySlug(data.user.id, gymSlug);
    if (!membership) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("This account isn't linked to this gym");
      return;
    }
    if (!isStaffRole(membership.role)) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("This account doesn't have staff access");
      return;
    }
    await supabase.from("profiles").update({ active_gym_id: membership.gym_id }).eq("id", data.user.id);


    setLoading(false);
    nav({ to: gp("/admin") });
  };

  return (
    <div className="nuvo-site mx-auto flex min-h-screen w-full max-w-md flex-col justify-center bg-background px-6 py-10">
      <AuthBrand subtitle="Staff sign in — authorized personnel only" />
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
        <div className="text-end">
          <Link to={gp("/forgot")} className="text-xs text-muted-foreground hover:text-foreground">
            Forgot password?
          </Link>
        </div>
        <button
          disabled={loading}
          className="w-full rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? "…" : "Sign In"}
        </button>
      </form>
      <Link to={gp("/auth")} className="mt-8 text-center text-xs text-muted-foreground hover:text-foreground">
        ← Back
      </Link>
      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        Want to add your gym? <Link to="/gym-owner/signup" className="font-semibold text-primary">Sign up your gym</Link>
      </p>
    </div>
  );
}
