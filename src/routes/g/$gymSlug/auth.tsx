import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useLang } from "@/lib/providers";

export const Route = createFileRoute("/g/$gymSlug/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else nav({ to: gp("/home") });
  };

  const oauth = async (provider: "google" | "apple") => {
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) toast.error("Sign-in failed");
    else if (!r.redirected) nav({ to: gp("/home") });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center">
        <h1 className="font-display text-3xl">{t.appName}</h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{t.tagline}</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input required type="email" placeholder={t.email} value={email} onChange={(e)=>setEmail(e.target.value)}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
        <input required type="password" placeholder={t.password} value={password} onChange={(e)=>setPassword(e.target.value)}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
        <div className="text-end">
          <Link to={gp("/forgot")} className="text-xs text-muted-foreground hover:text-foreground">{t.forgotPassword}</Link>
        </div>
        <button disabled={loading} className="w-full rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {loading ? "…" : t.signIn}
        </button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /><span>{t.or}</span><div className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-2">
        <button onClick={()=>oauth("google")} className="w-full rounded-pill border hairline bg-card py-3 text-sm font-medium">
          {t.continueWithGoogle}
        </button>
        <button onClick={()=>oauth("apple")} className="w-full rounded-pill border hairline bg-card py-3 text-sm font-medium">
          {t.continueWithApple}
        </button>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        {t.dontHaveAccount} <Link to={gp("/signup")} className="font-semibold text-primary">{t.signUp}</Link>
      </p>
      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        Are you a gym owner? <Link to="/platform/signup" className="font-semibold text-primary">Sign up your gym</Link>
      </p>
    </div>
  );
}
