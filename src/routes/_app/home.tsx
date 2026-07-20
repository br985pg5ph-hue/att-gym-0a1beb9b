import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useAuth, useLang, useChildren } from "@/lib/providers";
import { MapPin, Flame, Trophy, ChevronRight, Ticket } from "lucide-react";

export const Route = createFileRoute("/_app/home")({
  component: HomePage,
});

function HomePage() {
  const { profile, user } = useAuth();
  const { t } = useLang();
  const { selectedChild } = useChildren();
  const parentMode = !!profile?.is_parent;
  const scope = parentMode && selectedChild ? "child" : "self";

  const { data: gym } = useQuery({
    queryKey: ["gym"],
    queryFn: async () => (await supabase.from("gym_info").select("*").eq("id", 1).single()).data,
  });

  const { data: nextBooking } = useQuery({
    queryKey: ["next-booking", user?.id, scope === "child" ? selectedChild?.id : "self"],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("bookings")
        .select("id, status, child_id, classes(id, type, title, starts_at, coaches(name))")
        .eq("member_id", user!.id).eq("status", "upcoming");
      if (scope === "child") q = q.eq("child_id", selectedChild!.id);
      else q = q.is("child_id", null);
      const { data } = await q;
      const upcoming = (data ?? [])
        .filter((b: any) => b.classes && new Date(b.classes.starts_at).getTime() > Date.now() - 60 * 60 * 1000)
        .sort((a: any, b: any) => new Date(a.classes.starts_at).getTime() - new Date(b.classes.starts_at).getTime());
      return upcoming[0] ?? null;
    },
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.goodMorning : hour < 18 ? t.goodAfternoon : t.goodEvening;

  const stats = scope === "child" && selectedChild
    ? { remaining: selectedChild.classes_remaining, attended: selectedChild.classes_attended, streak: selectedChild.streak }
    : { remaining: profile?.classes_remaining ?? 0, attended: profile?.classes_attended ?? 0, streak: profile?.streak ?? 0 };

  const subtitleText = parentMode && selectedChild
    ? `${profile?.name || ""} · Viewing ${selectedChild.name}`
    : profile?.name || "";

  const formatWhen = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    if (sameDay(d, today)) return `Today · ${time}`;
    if (sameDay(d, tomorrow)) return `Tomorrow · ${time}`;
    return `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · ${time}`;
  };

  return (
    <div>
      <PageHeader
        title={`${greeting},`}
        subtitle={subtitleText}
        right={
          <div className="flex items-center gap-2">
            <ChildSwitcher />
            <Link to="/profile" className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-pill bg-primary/15 text-primary">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Logo size={44} />
              )}
            </Link>
          </div>
        }
      />


      <div className="space-y-4 px-5">
        {/* Next class */}
        <div className="card-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t.nextClass}</p>
          {nextBooking ? (
            <div className="mt-2">
              <h3 className="font-display text-3xl uppercase leading-tight">
                {((nextBooking as any).classes.title as string).replace(/\s*muay thai\s*/i, "").trim() || (nextBooking as any).classes.title}
                {" · "}
                {new Date((nextBooking as any).classes.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatWhen((nextBooking as any).classes.starts_at)}
                {(nextBooking as any).classes.coaches?.name && ` with ${(nextBooking as any).classes.coaches.name}`}
              </p>
              <Link to="/profile/bookings" className="mt-4 inline-flex items-center gap-1 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                View Details
              </Link>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">{t.noUpcoming}</p>
              <Link to="/book" className="mt-3 inline-flex items-center gap-1 rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                {t.book} <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </div>



        {/* Classes remaining */}
        <div className="card-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Ticket size={16} />
                <span className="text-[10px] uppercase tracking-widest">{t.classesLeft}</span>
              </div>
              <p className="font-display mt-1 text-4xl">{stats.remaining}</p>
            </div>
            <Link to="/book" className="shrink-0 rounded-pill bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground">
              {t.book}
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 text-muted-foreground"><Trophy size={16} /><span className="text-[10px] uppercase tracking-widest">{t.classesAttended}</span></div>
            <p className="font-display mt-1 text-3xl">{stats.attended}</p>
          </div>
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 text-muted-foreground"><Flame size={16} /><span className="text-[10px] uppercase tracking-widest whitespace-pre-line">{t.currentStreak}</span></div>
            <p className="font-display mt-1 text-3xl">{stats.streak} <span className="text-sm text-muted-foreground">{t.days}</span></p>
          </div>
        </div>



        {/* Location teaser */}
        <Link to="/location" className="card-surface block overflow-hidden">
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
        </Link>
      </div>
    </div>
  );
}
