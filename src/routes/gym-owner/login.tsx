import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NuvoLogo } from "@/components/NuvoLogo";
import { getPortalContext } from "@/lib/platform.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/gym-owner/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Gym owner login — Nuvo" },
      { name: "description", content: "Sign in to manage your gym's Nuvo portal, branding and member app." },
      { property: "og:title", content: "Gym owner login — Nuvo" },
      { property: "og:description", content: "Sign in to manage your gym's Nuvo portal, branding and member app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GymOwnerLogin,
});

function GymOwnerLogin() {
  const nav = useNavigate();
  const getPortal = useServerFn(getPortalContext);
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
      const { role, gym } = await getPortal();
      toast.success("Welcome back");
      if (role === "staff") {
        nav({ to: `/gym/${gym.slug}/admin` });
      } else {
        nav({ to: "/gym-owner/setup" });
      }
    } catch {
      await supabase.auth.signOut();
      toast.error("This portal is for gym staff and admins only");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <NuvoLogo size={80} />
        <h1 className="font-display mt-4 text-3xl">Gym owner portal</h1>
        <p className="mt-2 text-xs text-muted-foreground">Staff and admin sign-in for your gym</p>
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

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/gym-owner/signup" className="font-semibold text-primary">
          Sign up your gym
        </Link>
      </p>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">← Back</Link>
      </p>
    </div>
  );
}
