import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useAuth, useLang, useChildren } from "@/lib/providers";
import { Flame, Trophy, ChevronRight, Ticket, Newspaper, User, Users, ShieldCheck, ShieldAlert } from "lucide-react";

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

  const { data: latestNews } = useQuery({
    queryKey: ["latest-news"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(1)).data?.[0] ?? null,
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

  const jordanTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Amman" }));
  const hour = jordanTime.getHours();
  const greeting = hour >= 5 && hour < 12 ? t.goodMorning : hour >= 12 && hour < 17 ? t.goodAfternoon : hour >= 17 && hour < 22 ? t.goodEvening : t.goodNight;

  const groupUntil = scope === "child" && selectedChild
    ? selectedChild.group_subscription_until
    : profile?.group_subscription_until ?? null;
  const isPaused = scope !== "child" && !!(profile as any)?.membership_paused_at;
  const groupActive = !isPaused && !!groupUntil && new Date(groupUntil).getTime() > Date.now();
  const groupHolderName = scope === "child" && selectedChild ? selectedChild.name : (profile?.name ?? "");
  const ptRemaining = scope === "child" && selectedChild
    ? (selectedChild as any).pt_sessions_remaining ?? 0
    : profile?.pt_sessions_remaining ?? 0;
  const { data: attendedCount = 0 } = useQuery({
    queryKey: ["attended-count", user?.id, scope === "child" ? selectedChild?.id : "self"],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("bookings")
        .select("id, classes!inner(starts_at)", { count: "exact", head: true })
        .eq("member_id", user!.id)
        .eq("status", "upcoming")
        .lt("classes.starts_at", new Date().toISOString());
      if (scope === "child") q = q.eq("child_id", selectedChild!.id);
      else q = q.is("child_id", null);
      const { count } = await q;
      return count ?? 0;
    },
  });
  const stats = { attended: attendedCount, streak: scope === "child" && selectedChild ? selectedChild.streak : profile?.streak ?? 0 };

  const groupDateLabel = groupUntil
    ? new Date(groupUntil).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
    : null;

  const subtitleText = profile?.name || "";

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
                <User size={24} />
              )}
            </Link>
          </div>
        }
      />


      <div className="space-y-4 px-5">
        {/* Next class */}
        <div className="card-surface p-5" data-tour="next-session">
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



        {/* Group membership status */}
        <div data-tour="group-card" className={`card-surface p-5 ${groupActive ? "bg-gradient-to-br from-primary/20 to-transparent" : ""}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className={`flex items-center gap-2 ${groupActive ? "text-primary" : isPaused ? "text-silver" : "text-muted-foreground"}`}>
                {groupActive ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                <span className="text-[10px] uppercase tracking-widest">Group Membership</span>
              </div>
              {isPaused ? (
                <>
                  <p className="font-display mt-1 text-2xl leading-tight">Paused</p>
                  <p className="mt-1 text-xs text-muted-foreground">Resume from Membership to book group classes</p>
                </>
              ) : groupActive ? (
                <>
                  <p className="font-display mt-1 text-2xl leading-tight">
                    {scope === "child" ? `${groupHolderName} - Active` : "Active"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Until {groupDateLabel}</p>
                </>
              ) : (
                <>
                  <p className="font-display mt-1 text-2xl leading-tight text-muted-foreground">
                    {groupUntil ? "Expired" : "Not active"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Renew at the gym to book group classes</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3" data-tour="pt-card">
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 text-muted-foreground"><Ticket size={16} /><span className="text-[10px] uppercase tracking-widest whitespace-pre-line">{"PRIVATE\nSESSIONS"}</span></div>
            <p className="font-display mt-1 text-3xl">{ptRemaining} <span className="text-sm text-muted-foreground">left</span></p>
          </div>
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 text-muted-foreground"><Trophy size={16} style={{ color: stats.attended >= 51 ? "#FFD700" : stats.attended >= 16 ? "#C0C0C0" : "#CD7F32" }} /><span className="text-[10px] uppercase tracking-widest whitespace-pre-line">{t.classesAttended}</span></div>
            <p className="font-display mt-1 text-3xl">{stats.attended}</p>
          </div>
        </div>




        {/* Latest news + Coaches */}
        <div className="space-y-3" data-tour="news-widget">
          <Link to="/news" className="card-surface block p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-primary/15 text-primary">
                <Newspaper size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.latestNews ?? "Latest News"}</p>
                <p className="truncate text-sm font-medium">
                  {latestNews?.title ?? "No announcements yet"}
                </p>
                {latestNews?.body && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{latestNews.body}</p>
                )}
              </div>
              <ChevronRight size={18} className="text-muted-foreground flip-rtl" />
            </div>
          </Link>

          {/* Coaches */}
          <Link to="/coaches" className="card-surface block p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-primary/15 text-primary">
                <Users size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.coaches}</p>
                <p className="truncate text-sm font-medium">Meet the team</p>
              </div>
              <ChevronRight size={18} className="text-muted-foreground flip-rtl" />
            </div>
          </Link>
        </div>


      </div>
    </div>
  );
}
