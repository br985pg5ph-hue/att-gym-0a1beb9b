import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { CountrySelect } from "@/components/CountrySelect";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AuthBrand } from "@/components/AuthBrand";
import { toast } from "sonner";
import { useLang } from "@/lib/providers";

const searchSchema = z.object({
  ref: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/app/signup")({
  ssr: false,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Create your Nuvo account" },
      { name: "description", content: "Join Nuvo, find your gym and start booking classes from your phone." },
      { property: "og:title", content: "Create your Nuvo account" },
      { property: "og:description", content: "Join Nuvo, find your gym and start booking classes from your phone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppSignUpPage,
});

function AppSignUpPage() {
  const nav = useNavigate();
  const { t } = useLang();
  const { ref } = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cc, setCc] = useState("+962");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [referral, setReferral] = useState(ref || "");
  const [loading, setLoading] = useState(false);

  const complete =
    name.trim().length > 1 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) &&
    phone.trim().length >= 6 &&
    !!gender &&
    password.length >= 6 &&
    confirm.length >= 6;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your name");
    if (!email.trim()) return toast.error("Please enter your email");
    if (!phone.trim()) return toast.error("Please enter your phone number");
    if (!gender) return toast.error("Please select your gender");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);

    const meta: Record<string, string> = { name, phone: `${cc}${phone}`, gender };
    const trimmedRef = referral.trim();
    if (trimmedRef) meta.referral_code = trimmedRef;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/app`, data: meta },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      toast.success("Account created!");
      // Members choose their gym as the first step inside the app.
      nav({ to: "/app/join" });
    } else {
      toast.message("Check your email", { description: "Confirm your account before signing in." });
      nav({ to: "/app/auth" });
    }
  };

  const oauth = async (provider: "google" | "apple") => {
    const r = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/app/auth`,
    });
    if (r.error) return toast.error("Sign-in failed");
    if (r.redirected) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return toast.error("Sign-in failed");
    nav({ to: "/app" });
  };

  return (
    <div className="nuvo-site min-h-screen w-full bg-background">
      <div className="mx-auto w-full max-w-md px-6 py-10">
        <AuthBrand subtitle={t.createAccount} size={56} />

        <form onSubmit={submit} className="space-y-3">
          <input required placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
          <input required type="email" placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
          <div className="flex gap-2">
            <CountrySelect value={cc} onChange={setCc} />
            <input required type="tel" placeholder={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <div className="grid grid-cols-2 gap-2">
              {(["male", "female"] as const).map((g) => (
                <button type="button" key={g} onClick={() => setGender(g)}
                  className={`rounded-pill border px-4 py-3 text-sm font-medium capitalize transition ${
                    gender === g ? "border-primary bg-primary text-primary-foreground" : "hairline bg-card"
                  }`}>
                  {g}
                </button>
              ))}
            </div>
            {!gender && <p className="mt-1 text-xs text-muted-foreground">Please select your gender</p>}
          </div>
          <input required minLength={6} type="password" placeholder={t.password} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
          <input required minLength={6} type="password" placeholder={t.confirmPassword} value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
          <input placeholder="Referral code (optional)" value={referral} onChange={(e) => setReferral(e.target.value)} maxLength={32}
            className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />

          <button disabled={loading || !complete} className="w-full rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {loading ? "…" : t.createAccount}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /><span>{t.or}</span><div className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-2">
          <button onClick={() => oauth("google")} className="w-full rounded-pill border hairline bg-card py-3 text-sm font-medium">{t.continueWithGoogle}</button>
          <button onClick={() => oauth("apple")} className="w-full rounded-pill border hairline bg-card py-3 text-sm font-medium">{t.continueWithApple}</button>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          {t.haveAccount} <Link to="/app/auth" className="font-semibold text-primary">{t.signIn}</Link>
        </p>
      </div>
    </div>
  );
}
