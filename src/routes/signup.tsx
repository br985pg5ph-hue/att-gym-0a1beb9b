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
  "+1","+7","+20","+27","+30","+31","+32","+33","+34","+36","+39","+40","+41","+43","+44","+45","+46","+47","+48","+49",
  "+51","+52","+53","+54","+55","+56","+57","+58","+60","+61","+62","+63","+64","+65","+66","+81","+82","+84","+86","+90",
  "+91","+92","+93","+94","+95","+98","+211","+212","+213","+216","+218","+220","+221","+222","+223","+224","+225","+226",
  "+227","+228","+229","+230","+231","+232","+233","+234","+235","+236","+237","+238","+239","+240","+241","+242","+243",
  "+244","+245","+246","+248","+249","+250","+251","+252","+253","+254","+255","+256","+257","+258","+260","+261","+262",
  "+263","+264","+265","+266","+267","+268","+269","+290","+291","+297","+298","+299","+350","+351","+352","+353","+354",
  "+355","+356","+357","+358","+359","+370","+371","+372","+373","+374","+375","+376","+377","+378","+379","+380","+381",
  "+382","+383","+385","+386","+387","+389","+420","+421","+423","+500","+501","+502","+503","+504","+505","+506","+507",
  "+508","+509","+590","+591","+592","+593","+594","+595","+596","+597","+598","+599","+670","+672","+673","+674","+675",
  "+676","+677","+678","+679","+680","+681","+682","+683","+685","+686","+687","+688","+689","+690","+691","+692","+800",
  "+808","+850","+852","+853","+855","+856","+870","+880","+886","+960","+961","+962","+963","+964","+965","+966","+967",
  "+968","+970","+971","+972","+973","+974","+975","+976","+977","+992","+993","+994","+995","+996","+998",
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
    nav({ to: "/onboarding" });
  };

  const oauth = async (provider: "google" | "apple") => {
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) toast.error("Sign-in failed");
    else if (!r.redirected) nav({ to: "/onboarding" });
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
