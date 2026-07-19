import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { useLang } from "@/lib/providers";

export const Route = createFileRoute("/signup")({
  ssr: false,
  component: SignUpPage,
});

const COUNTRY_CODES = [
  { code: "+961", name: "Lebanon" }, { code: "+971", name: "UAE" }, { code: "+966", name: "KSA" },
  { code: "+974", name: "Qatar" }, { code: "+965", name: "Kuwait" }, { code: "+973", name: "Bahrain" },
  { code: "+968", name: "Oman" }, { code: "+962", name: "Jordan" }, { code: "+20", name: "Egypt" },
  { code: "+1", name: "USA/Canada" }, { code: "+44", name: "UK" }, { code: "+33", name: "France" },
  { code: "+49", name: "Germany" }, { code: "+90", name: "Turkey" },
];



function SignUpPage() {
  const nav = useNavigate();
  const { t } = useLang();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cc, setCc] = useState("+961");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name, phone: `${cc}${phone}` },
      },
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    setLoading(false);
    toast.success("Account created!");
    nav({ to: "/home" });
  };

  const oauth = async (provider: "google" | "apple") => {
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) toast.error("Sign-in failed");
    else if (!r.redirected) nav({ to: "/home" });
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
          <select value={cc} onChange={(e)=>setCc(e.target.value)}
            className="rounded-xl border hairline bg-card px-3 py-3 text-sm outline-none focus:border-primary">
            {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code} {c.name}</option>)}
          </select>
          <input required type="tel" placeholder={t.phone} value={phone} onChange={(e)=>setPhone(e.target.value)}
            className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
        </div>
        <input required type="password" placeholder={t.password} value={password} onChange={(e)=>setPassword(e.target.value)}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
        <input required type="password" placeholder={t.confirmPassword} value={confirm} onChange={(e)=>setConfirm(e.target.value)}
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
        {t.haveAccount} <Link to="/auth" className="font-semibold text-primary">{t.signIn}</Link>
      </p>
    </div>
  );
}
