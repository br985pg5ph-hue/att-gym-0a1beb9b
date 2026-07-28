import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { CountrySelect } from "@/components/CountrySelect";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { useLang } from "@/lib/providers";
import { GYM_SLUG } from "@/lib/gym";

const searchSchema = z.object({
  ref: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/g/$gymSlug/g/$gymSlug/signup")({
  ssr: false,
  validateSearch: zodValidator(searchSchema),
  component: SignUpPage,
});




function SignUpPage() {
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    if (!gender) return toast.error("Please select your gender");
    setLoading(true);
    const meta: Record<string, string> = { name, phone: `${cc}${phone}`, gender, gym_slug: GYM_SLUG };
    const trimmedRef = referral.trim();
    if (trimmedRef) meta.referral_code = trimmedRef;
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: meta,
      },
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    setLoading(false);
    if (data.session) {
      toast.success("Account created!");
      nav({ to: gp("/onboarding") });
    } else {
      toast.message("Check your email", {
        description: "Confirm your account before signing in.",
      });
      nav({ to: gp("/auth") });
    }
  };


  const oauth = async (provider: "google" | "apple") => {
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) toast.error("Sign-in failed");
    else if (!r.redirected) nav({ to: gp("/onboarding") });
  };



  return (
    <div className="mx-auto w-full max-w-md px-6 py-10">
      <div className="mb-6 flex flex-col items-center">
        <Logo size={80} />
        <h1 className="font-display mt-3 text-3xl">{t.createAccount}</h1>
      </div>




      <form onSubmit={submit} className="space-y-3">
        <input required placeholder={t.name} value={name} onChange={(e)=>setName(e.target.value)}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
        <input required type="email" placeholder={t.email} value={email} onChange={(e)=>setEmail(e.target.value)}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
        <div className="flex gap-2">
          <CountrySelect value={cc} onChange={setCc} />
          <input required type="tel" placeholder={t.phone} value={phone} onChange={(e)=>setPhone(e.target.value)}
            className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["male","female"] as const).map((g) => (
            <button type="button" key={g} onClick={() => setGender(g)}
              className={`rounded-pill border px-4 py-3 text-sm font-medium capitalize transition ${
                gender === g ? "border-primary bg-primary text-primary-foreground" : "hairline bg-card"
              }`}>
              {g}
            </button>
          ))}
        </div>
        <input required type="password" placeholder={t.password} value={password} onChange={(e)=>setPassword(e.target.value)}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
        <input required type="password" placeholder={t.confirmPassword} value={confirm} onChange={(e)=>setConfirm(e.target.value)}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
        <input placeholder="Referral code (optional)" value={referral} onChange={(e)=>setReferral(e.target.value)} maxLength={32}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />

        <button disabled={loading} className="w-full rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {loading ? "…" : t.createAccount}

        </button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /><span>{t.or}</span><div className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-2">
        <button onClick={()=>oauth("google")} className="w-full rounded-pill border hairline bg-card py-3 text-sm font-medium">{t.continueWithGoogle}</button>
        <button onClick={()=>oauth("apple")} className="w-full rounded-pill border hairline bg-card py-3 text-sm font-medium">{t.continueWithApple}</button>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        {t.haveAccount} <Link to={gp("/auth")} className="font-semibold text-primary">{t.signIn}</Link>
      </p>
    </div>
  );
}
