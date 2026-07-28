import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/staff-login")({
  ssr: false,
  component: StaffLoginPage,
});

function StaffLoginPage() {
  const nav = useNavigate();
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
    const { data: prof } = await supabase
      .from("profiles")
      .select("role, gym_id")
      .eq("id", data.user.id)
      .maybeSingle();
    if (prof?.role !== "staff") {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("This account doesn't have staff access");
      return;
    }
    const gym = await fetchGym();
    if (!gym || prof.gym_id !== gym.id) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("This account belongs to a different gym");
      return;
    }

    setLoading(false);
    nav({ to: "/admin" });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center">
        <Logo size={110} />
        <h1 className="font-display mt-4 text-3xl">Staff Sign In</h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          Authorized personnel only
        </p>
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
        <div className="text-end">
          <Link to="/forgot" className="text-xs text-muted-foreground hover:text-foreground">
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
      <Link to="/auth" className="mt-8 text-center text-xs text-muted-foreground hover:text-foreground">
        ← Back
      </Link>
    </div>
  );
}
