import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useAuth, useLang } from "@/lib/providers";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Gift, CreditCard, Settings, LogOut, ChevronRight, User } from "lucide-react";

export const Route = createFileRoute("/_app/profile/")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  const rows = [
    { icon: CalendarCheck, label: t.myBookings, to: "/profile/bookings" },
    { icon: Gift, label: t.refer, to: "/profile/referral" },
    { icon: CreditCard, label: t.payments, to: "/profile/payments" },
    { icon: Settings, label: t.settings, to: "/profile/settings" },
  ] as const;

  return (
    <div>
      <PageHeader title={t.profile} />
      <div className="space-y-4 px-5">
        <div className="card-surface flex items-center gap-4 p-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-pill bg-primary/15 text-primary">
            {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" alt="" /> : <User size={28} />}
          </div>
          <div className="min-w-0">
            <h2 className="font-display truncate text-2xl leading-none">{profile?.name || "—"}</h2>
            <span className="mt-1 inline-block rounded-pill bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
              {t.membershipActive}
            </span>
          </div>
        </div>

        <Link to="/profile/payments" className="card-surface block p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.wallet}</p>
          <div className="mt-1 flex items-end justify-between">
            <p className="font-display text-4xl">{Number(profile?.wallet_balance ?? 0).toFixed(2)} <span className="text-xl text-muted-foreground">JOD</span></p>
            <span className="rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">{t.topUp}</span>
          </div>
        </Link>

        <div className="card-surface divide-y hairline overflow-hidden">
          {rows.map(r => {
            const Icon = r.icon;
            return (
              <Link key={r.to} to={r.to as any} className="flex items-center gap-3 px-5 py-4">
                <Icon size={18} className="text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">{r.label}</span>
                <ChevronRight size={16} className="text-muted-foreground flip-rtl" />
              </Link>
            );
          })}
          <button onClick={signOut} className="flex w-full items-center gap-3 px-5 py-4 text-start text-destructive">
            <LogOut size={18} />
            <span className="flex-1 text-sm font-medium">{t.signOut}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
