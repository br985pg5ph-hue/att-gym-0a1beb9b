import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { AuthBrand } from "@/components/AuthBrand";
import { useLang } from "@/lib/providers";
import { resolveMemberEntry } from "@/lib/memberRouting";

export const Route = createFileRoute("/app/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Nuvo" },
      { name: "description", content: "Sign in to Nuvo to book classes and manage your gym membership." },
      { property: "og:title", content: "Sign in — Nuvo" },
      { property: "og:description", content: "Sign in to Nuvo to book classes and manage your gym membership." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppAuthPage,
});

function AppAuthPage() {
  const nav = useNavigate();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const routeOn = useCallback(
    async (userId: string) => {
      nav({ to: (await resolveMemberEntry(userId)) as any });
    },
    [nav],
  );

  // Social sign-in returns here with a session already set.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      try {
        await routeOn(data.session.user.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sign-in failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeOn]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    try {
      await routeOn(data.user!.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    }
    setLoading(false);
  };

  const oauth = async (provider: "google" | "apple") => {
    const r = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/app/auth`,
    });
    if (r.error) return toast.error("Sign-in failed");
    if (r.redirected) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return toast.error("Sign-in failed");
    try {
      await routeOn(data.user.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
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
              <Link to="/app/forgot" className="text-xs text-muted-foreground hover:text-foreground">
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

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /><span>{t.or}</span><div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            <button onClick={() => oauth("google")} className="w-full rounded-pill border hairline bg-card py-3 text-sm font-medium">
              {t.continueWithGoogle}
            </button>
            <button onClick={() => oauth("apple")} className="w-full rounded-pill border hairline bg-card py-3 text-sm font-medium">
              {t.continueWithApple}
            </button>
          </div>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            New to Nuvo?{" "}
            <Link to="/app/signup" className="font-semibold text-primary">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
