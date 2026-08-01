import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useLang } from "@/lib/providers";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Gift, Copy, ChevronLeft, MessageSquare, Share2 } from "lucide-react";
import { gp, useGym } from "@/lib/gym";

export const Route = createFileRoute("/gym/$gymSlug/_app/profile/referral")({
  component: ReferralPage,
});

function ReferralPage() {
  const { user, profile } = useAuth();
  const { t } = useLang();
  const { gym } = useGym();
  const gymName = gym?.name ?? "my gym";
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const code = profile?.referral_code ?? "";
  const link = typeof window !== "undefined" ? `${window.location.origin}/app/signup?ref=${code}` : "";

  const { data: stats } = useQuery({
    queryKey: ["referral-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_referral_stats");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { joined: Number(row?.joined ?? 0), rewards: Number(row?.rewards ?? 0) };
    },
  });


  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const share = async () => {
    const shareData = { title: `Join ${gymName}`, text: `Join me at ${gymName}! Use my code ${code}`, url: link };
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share && (!(navigator as any).canShare || (navigator as any).canShare(shareData))) {
        await (navigator as any).share(shareData);
        return;
      }
    } catch { /* user cancelled or share failed — fall through to copy */ }
    try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1800);
  };
  const sms = () => { window.location.href = `sms:?body=${encodeURIComponent(`Join me at ${gymName}! Use my code ${code} — ${link}`)}`; };

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4">
        <Link to={gp("/profile")} className="grid h-9 w-9 place-items-center rounded-pill hover:bg-muted"><ChevronLeft size={20} className="flip-rtl" /></Link>
      </div>
      <PageHeader title={t.refer} />
      <div className="space-y-4 px-5">
        <div className="card-surface p-6 text-center bg-gradient-to-br from-primary/20 via-transparent to-transparent">
          <Gift className="mx-auto text-primary" size={44} />
          <p className="font-display mt-3 text-3xl">{t.freeClass}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.perReferral}</p>
        </div>

        <div className="card-surface p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.referralCode}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="font-display truncate text-3xl tracking-widest">{code}</p>
            <button onClick={copy} className={`shrink-0 rounded-pill px-4 py-2 text-xs font-semibold transition ${copied ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"}`}>
              {copied ? t.copied : <span className="inline-flex items-center gap-1"><Copy size={12} />{t.copy}</span>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={sms} className="card-surface flex items-center justify-center gap-2 p-4 text-xs font-medium"><MessageSquare size={14}/> {t.shareMsg}</button>
          <button onClick={share} className={`card-surface flex items-center justify-center gap-2 p-4 text-xs font-medium transition ${linkCopied ? "bg-emerald-500 text-white" : ""}`}>
            <Share2 size={14}/> {linkCopied ? "✓ Link copied" : t.shareLink}
          </button>
        </div>

        <div className="card-surface p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.howItWorks}</p>
          <ol className="mt-3 space-y-3 text-sm">
            <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-pill bg-primary text-primary-foreground text-xs font-bold">1</span> Share your code with a friend</li>
            <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-pill bg-primary text-primary-foreground text-xs font-bold">2</span> They sign up and book their first class</li>
            <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-pill bg-primary text-primary-foreground text-xs font-bold">3</span> You get 1 free class credit</li>
          </ol>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[{ l: "Joined", v: stats?.joined ?? 0 }, { l: "Rewards", v: stats?.rewards ?? 0 }].map((s) => (
            <div key={s.l} className="card-surface p-4 text-center">
              <p className="font-display text-2xl">{s.v}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
