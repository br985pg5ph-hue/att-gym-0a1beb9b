import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { useLang } from "@/lib/providers";

export const Route = createFileRoute("/signup")({
  ssr: false,
  component: SignUpPage,
});

function flagEmoji(iso: string) {
  return iso
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

const COUNTRIES: { code: string; name: string; iso: string }[] = [
  { code: "+1", name: "United States", iso: "us" },
  { code: "+7", name: "Russia", iso: "ru" },
  { code: "+20", name: "Egypt", iso: "eg" },
  { code: "+27", name: "South Africa", iso: "za" },
  { code: "+30", name: "Greece", iso: "gr" },
  { code: "+31", name: "Netherlands", iso: "nl" },
  { code: "+32", name: "Belgium", iso: "be" },
  { code: "+33", name: "France", iso: "fr" },
  { code: "+34", name: "Spain", iso: "es" },
  { code: "+36", name: "Hungary", iso: "hu" },
  { code: "+39", name: "Italy", iso: "it" },
  { code: "+40", name: "Romania", iso: "ro" },
  { code: "+41", name: "Switzerland", iso: "ch" },
  { code: "+43", name: "Austria", iso: "at" },
  { code: "+44", name: "United Kingdom", iso: "gb" },
  { code: "+45", name: "Denmark", iso: "dk" },
  { code: "+46", name: "Sweden", iso: "se" },
  { code: "+47", name: "Norway", iso: "no" },
  { code: "+48", name: "Poland", iso: "pl" },
  { code: "+49", name: "Germany", iso: "de" },
  { code: "+51", name: "Peru", iso: "pe" },
  { code: "+52", name: "Mexico", iso: "mx" },
  { code: "+53", name: "Cuba", iso: "cu" },
  { code: "+54", name: "Argentina", iso: "ar" },
  { code: "+55", name: "Brazil", iso: "br" },
  { code: "+56", name: "Chile", iso: "cl" },
  { code: "+57", name: "Colombia", iso: "co" },
  { code: "+58", name: "Venezuela", iso: "ve" },
  { code: "+60", name: "Malaysia", iso: "my" },
  { code: "+61", name: "Australia", iso: "au" },
  { code: "+62", name: "Indonesia", iso: "id" },
  { code: "+63", name: "Philippines", iso: "ph" },
  { code: "+64", name: "New Zealand", iso: "nz" },
  { code: "+65", name: "Singapore", iso: "sg" },
  { code: "+66", name: "Thailand", iso: "th" },
  { code: "+81", name: "Japan", iso: "jp" },
  { code: "+82", name: "South Korea", iso: "kr" },
  { code: "+84", name: "Vietnam", iso: "vn" },
  { code: "+86", name: "China", iso: "cn" },
  { code: "+90", name: "Turkey", iso: "tr" },
  { code: "+91", name: "India", iso: "in" },
  { code: "+92", name: "Pakistan", iso: "pk" },
  { code: "+93", name: "Afghanistan", iso: "af" },
  { code: "+94", name: "Sri Lanka", iso: "lk" },
  { code: "+95", name: "Myanmar", iso: "mm" },
  { code: "+98", name: "Iran", iso: "ir" },
  { code: "+211", name: "South Sudan", iso: "ss" },
  { code: "+212", name: "Morocco", iso: "ma" },
  { code: "+213", name: "Algeria", iso: "dz" },
  { code: "+216", name: "Tunisia", iso: "tn" },
  { code: "+218", name: "Libya", iso: "ly" },
  { code: "+220", name: "Gambia", iso: "gm" },
  { code: "+221", name: "Senegal", iso: "sn" },
  { code: "+222", name: "Mauritania", iso: "mr" },
  { code: "+223", name: "Mali", iso: "ml" },
  { code: "+224", name: "Guinea", iso: "gn" },
  { code: "+225", name: "Ivory Coast", iso: "ci" },
  { code: "+226", name: "Burkina Faso", iso: "bf" },
  { code: "+227", name: "Niger", iso: "ne" },
  { code: "+228", name: "Togo", iso: "tg" },
  { code: "+229", name: "Benin", iso: "bj" },
  { code: "+230", name: "Mauritius", iso: "mu" },
  { code: "+231", name: "Liberia", iso: "lr" },
  { code: "+232", name: "Sierra Leone", iso: "sl" },
  { code: "+233", name: "Ghana", iso: "gh" },
  { code: "+234", name: "Nigeria", iso: "ng" },
  { code: "+235", name: "Chad", iso: "td" },
  { code: "+236", name: "Central African Republic", iso: "cf" },
  { code: "+237", name: "Cameroon", iso: "cm" },
  { code: "+238", name: "Cape Verde", iso: "cv" },
  { code: "+239", name: "São Tomé and Príncipe", iso: "st" },
  { code: "+240", name: "Equatorial Guinea", iso: "gq" },
  { code: "+241", name: "Gabon", iso: "ga" },
  { code: "+242", name: "Congo", iso: "cg" },
  { code: "+243", name: "DR Congo", iso: "cd" },
  { code: "+244", name: "Angola", iso: "ao" },
  { code: "+245", name: "Guinea-Bissau", iso: "gw" },
  { code: "+246", name: "British Indian Ocean Territory", iso: "io" },
  { code: "+248", name: "Seychelles", iso: "sc" },
  { code: "+249", name: "Sudan", iso: "sd" },
  { code: "+250", name: "Rwanda", iso: "rw" },
  { code: "+251", name: "Ethiopia", iso: "et" },
  { code: "+252", name: "Somalia", iso: "so" },
  { code: "+253", name: "Djibouti", iso: "dj" },
  { code: "+254", name: "Kenya", iso: "ke" },
  { code: "+255", name: "Tanzania", iso: "tz" },
  { code: "+256", name: "Uganda", iso: "ug" },
  { code: "+257", name: "Burundi", iso: "bi" },
  { code: "+258", name: "Mozambique", iso: "mz" },
  { code: "+260", name: "Zambia", iso: "zm" },
  { code: "+261", name: "Madagascar", iso: "mg" },
  { code: "+262", name: "Réunion", iso: "re" },
  { code: "+263", name: "Zimbabwe", iso: "zw" },
  { code: "+264", name: "Namibia", iso: "na" },
  { code: "+265", name: "Malawi", iso: "mw" },
  { code: "+266", name: "Lesotho", iso: "ls" },
  { code: "+267", name: "Botswana", iso: "bw" },
  { code: "+268", name: "Eswatini", iso: "sz" },
  { code: "+269", name: "Comoros", iso: "km" },
  { code: "+290", name: "Saint Helena", iso: "sh" },
  { code: "+291", name: "Eritrea", iso: "er" },
  { code: "+297", name: "Aruba", iso: "aw" },
  { code: "+298", name: "Faroe Islands", iso: "fo" },
  { code: "+299", name: "Greenland", iso: "gl" },
  { code: "+350", name: "Gibraltar", iso: "gi" },
  { code: "+351", name: "Portugal", iso: "pt" },
  { code: "+352", name: "Luxembourg", iso: "lu" },
  { code: "+353", name: "Ireland", iso: "ie" },
  { code: "+354", name: "Iceland", iso: "is" },
  { code: "+355", name: "Albania", iso: "al" },
  { code: "+356", name: "Malta", iso: "mt" },
  { code: "+357", name: "Cyprus", iso: "cy" },
  { code: "+358", name: "Finland", iso: "fi" },
  { code: "+359", name: "Bulgaria", iso: "bg" },
  { code: "+370", name: "Lithuania", iso: "lt" },
  { code: "+371", name: "Latvia", iso: "lv" },
  { code: "+372", name: "Estonia", iso: "ee" },
  { code: "+373", name: "Moldova", iso: "md" },
  { code: "+374", name: "Armenia", iso: "am" },
  { code: "+375", name: "Belarus", iso: "by" },
  { code: "+376", name: "Andorra", iso: "ad" },
  { code: "+377", name: "Monaco", iso: "mc" },
  { code: "+378", name: "San Marino", iso: "sm" },
  { code: "+379", name: "Vatican City", iso: "va" },
  { code: "+380", name: "Ukraine", iso: "ua" },
  { code: "+381", name: "Serbia", iso: "rs" },
  { code: "+382", name: "Montenegro", iso: "me" },
  { code: "+383", name: "Kosovo", iso: "xk" },
  { code: "+385", name: "Croatia", iso: "hr" },
  { code: "+386", name: "Slovenia", iso: "si" },
  { code: "+387", name: "Bosnia and Herzegovina", iso: "ba" },
  { code: "+389", name: "North Macedonia", iso: "mk" },
  { code: "+420", name: "Czech Republic", iso: "cz" },
  { code: "+421", name: "Slovakia", iso: "sk" },
  { code: "+423", name: "Liechtenstein", iso: "li" },
  { code: "+500", name: "Falkland Islands", iso: "fk" },
  { code: "+501", name: "Belize", iso: "bz" },
  { code: "+502", name: "Guatemala", iso: "gt" },
  { code: "+503", name: "El Salvador", iso: "sv" },
  { code: "+504", name: "Honduras", iso: "hn" },
  { code: "+505", name: "Nicaragua", iso: "ni" },
  { code: "+506", name: "Costa Rica", iso: "cr" },
  { code: "+507", name: "Panama", iso: "pa" },
  { code: "+508", name: "Saint Pierre and Miquelon", iso: "pm" },
  { code: "+509", name: "Haiti", iso: "ht" },
  { code: "+590", name: "Guadeloupe", iso: "gp" },
  { code: "+591", name: "Bolivia", iso: "bo" },
  { code: "+592", name: "Guyana", iso: "gy" },
  { code: "+593", name: "Ecuador", iso: "ec" },
  { code: "+594", name: "French Guiana", iso: "gf" },
  { code: "+595", name: "Paraguay", iso: "py" },
  { code: "+596", name: "Martinique", iso: "mq" },
  { code: "+597", name: "Suriname", iso: "sr" },
  { code: "+598", name: "Uruguay", iso: "uy" },
  { code: "+599", name: "Curaçao", iso: "cw" },
  { code: "+670", name: "East Timor", iso: "tl" },
  { code: "+672", name: "Norfolk Island", iso: "nf" },
  { code: "+673", name: "Brunei", iso: "bn" },
  { code: "+674", name: "Nauru", iso: "nr" },
  { code: "+675", name: "Papua New Guinea", iso: "pg" },
  { code: "+676", name: "Tonga", iso: "to" },
  { code: "+677", name: "Solomon Islands", iso: "sb" },
  { code: "+678", name: "Vanuatu", iso: "vu" },
  { code: "+679", name: "Fiji", iso: "fj" },
  { code: "+680", name: "Palau", iso: "pw" },
  { code: "+681", name: "Wallis and Futuna", iso: "wf" },
  { code: "+682", name: "Cook Islands", iso: "ck" },
  { code: "+683", name: "Niue", iso: "nu" },
  { code: "+685", name: "Samoa", iso: "ws" },
  { code: "+686", name: "Kiribati", iso: "ki" },
  { code: "+687", name: "New Caledonia", iso: "nc" },
  { code: "+688", name: "Tuvalu", iso: "tv" },
  { code: "+689", name: "French Polynesia", iso: "pf" },
  { code: "+690", name: "Tokelau", iso: "tk" },
  { code: "+691", name: "Micronesia", iso: "fm" },
  { code: "+692", name: "Marshall Islands", iso: "mh" },
  { code: "+850", name: "North Korea", iso: "kp" },
  { code: "+852", name: "Hong Kong", iso: "hk" },
  { code: "+853", name: "Macau", iso: "mo" },
  { code: "+855", name: "Cambodia", iso: "kh" },
  { code: "+856", name: "Laos", iso: "la" },
  { code: "+880", name: "Bangladesh", iso: "bd" },
  { code: "+886", name: "Taiwan", iso: "tw" },
  { code: "+960", name: "Maldives", iso: "mv" },
  { code: "+961", name: "Lebanon", iso: "lb" },
  { code: "+962", name: "Jordan", iso: "jo" },
  { code: "+963", name: "Syria", iso: "sy" },
  { code: "+964", name: "Iraq", iso: "iq" },
  { code: "+965", name: "Kuwait", iso: "kw" },
  { code: "+966", name: "Saudi Arabia", iso: "sa" },
  { code: "+967", name: "Yemen", iso: "ye" },
  { code: "+968", name: "Oman", iso: "om" },
  { code: "+970", name: "Palestine", iso: "ps" },
  { code: "+971", name: "United Arab Emirates", iso: "ae" },
  { code: "+972", name: "Israel", iso: "il" },
  { code: "+973", name: "Bahrain", iso: "bh" },
  { code: "+974", name: "Qatar", iso: "qa" },
  { code: "+975", name: "Bhutan", iso: "bt" },
  { code: "+976", name: "Mongolia", iso: "mn" },
  { code: "+977", name: "Nepal", iso: "np" },
  { code: "+992", name: "Tajikistan", iso: "tj" },
  { code: "+993", name: "Turkmenistan", iso: "tm" },
  { code: "+994", name: "Azerbaijan", iso: "az" },
  { code: "+995", name: "Georgia", iso: "ge" },
  { code: "+996", name: "Kyrgyzstan", iso: "kg" },
  { code: "+998", name: "Uzbekistan", iso: "uz" },
];

function CountrySelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = COUNTRIES.find((c) => c.code === value) || COUNTRIES[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-[46px] items-center gap-2 rounded-xl border hairline bg-card px-3 text-sm outline-none focus:border-primary"
      >
        <span className="text-base leading-none">{flagEmoji(selected.iso)}</span>
        <span>{selected.code}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-64 overflow-auto rounded-xl border hairline bg-card p-1 shadow-lg">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                onChange(c.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted ${c.code === value ? "bg-muted" : ""}`}
            >
              <span className="text-base leading-none">{flagEmoji(c.iso)}</span>
              <span className="font-medium">{c.code}</span>
              <span className="ml-1 truncate text-muted-foreground">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}



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
            {COUNTRY_CODES.map(c => <option key={c} value={c}>{c}</option>)}
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
