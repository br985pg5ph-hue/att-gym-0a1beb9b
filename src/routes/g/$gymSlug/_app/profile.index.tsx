import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/lib/gym";
import { PageHeader } from "@/components/AppShell";
import { useAuth, useLang } from "@/lib/providers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Gift, Settings, LogOut, ChevronRight, User, Phone, Users, Pencil, MapPin, UserCog } from "lucide-react";
import { useChildren } from "@/lib/providers";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.2-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.134 1.585 5.939L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export const Route = createFileRoute("/g/$gymSlug/_app/profile/")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { gym } = useGym();
  const gymInfo = gym as (NonNullable<typeof gym> & { instagram_url?: string | null; whatsapp_number?: string | null }) | null;

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  const { children: kids } = useChildren();
  const rows = [
    { icon: UserCog, label: "Edit Profile", to: "/profile/edit" },
    { icon: CalendarCheck, label: t.myBookings, to: "/profile/bookings" },
    ...(profile?.is_parent
      ? [{ icon: Users, label: `My Children${kids.length ? ` (${kids.length})` : ""}`, to: "/profile/children" as const }]
      : []),
    { icon: Gift, label: t.refer, to: "/profile/referral" },
    { icon: Settings, label: t.settings, to: "/profile/settings" },
  ] as const;



  return (
    <div>
      <PageHeader title={t.profile} />
      <div className="space-y-4 px-5">
        <div className="card-surface flex items-center gap-4 p-5">
          <Link to="/profile/edit" aria-label="Edit profile photo" className="relative shrink-0">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-pill bg-primary/15 text-primary">
              {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" alt="" /> : <User size={28} />}
            </div>
            <span className="absolute -bottom-0.5 -end-0.5 grid h-6 w-6 place-items-center rounded-pill bg-primary text-primary-foreground ring-2 ring-background">
              <Pencil size={12} />
            </span>
          </Link>
          <div className="min-w-0">

            <h2 className="font-display truncate text-2xl leading-none">{profile?.name || "—"}</h2>
            {profile?.member_code && (
              <p className="mt-1 font-mono text-[11px] tracking-widest text-muted-foreground">Member ID: {profile.member_code}</p>
            )}
            {profile?.membership_paused_at ? (
              <span className="mt-1 inline-block rounded-pill bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Paused
              </span>
            ) : profile?.membership_status === "inactive" ? (
              <span className="mt-1 inline-block rounded-pill bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t.membershipInactive}
              </span>
            ) : (
              <span className="mt-1 inline-block rounded-pill bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                {t.membershipActive}
              </span>
            )}

          </div>
        </div>


        <div className="card-surface divide-y hairline overflow-hidden" data-tour="profile-menu">
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

        <div className="card-surface p-5">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">{t.connectWithUs}</p>
          <div className="mt-4 flex items-center justify-center gap-4">
            {gymInfo?.instagram_url && (
              <a href={gymInfo.instagram_url} target="_blank" rel="noreferrer" className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95">
                <InstagramIcon className="h-6 w-6" />
              </a>
            )}
            {gymInfo?.whatsapp_number && (
              <a href={`https://wa.me/${String(gymInfo.whatsapp_number).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95">
                <WhatsAppIcon className="h-6 w-6" />
              </a>
            )}
            {gymInfo?.phone && (
              <a href={`tel:${gymInfo.phone}`} className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95">
                <Phone className="h-6 w-6" />
              </a>
            )}
          </div>
        </div>

        {/* Location */}
        <a
          href={gymInfo?.maps_url || "/location"}
          target={gymInfo?.maps_url ? "_blank" : undefined}
          rel={gymInfo?.maps_url ? "noreferrer" : undefined}
          className="card-surface block overflow-hidden"
        >
          {gym && (
            <iframe
              title="Gym location map"
              src={`https://www.google.com/maps?q=${gym.lat},${gym.lng}&z=16&output=embed`}
              className="pointer-events-none h-40 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
          <div className="flex items-center gap-3 p-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-primary/15 text-primary"><MapPin size={20} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.ourLocation}</p>
              <p className="truncate text-sm font-medium">{gym?.address || "—"}</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground flip-rtl" />
          </div>
        </a>
      </div>
    </div>
  );
}
