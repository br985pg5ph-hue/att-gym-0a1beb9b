import { createFileRoute, redirect, useNavigate, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { useAuth, useLang, useTheme } from "@/lib/providers";
import { useGym, gp } from "@/lib/gym";
import { fetchMembershipBySlug, isStaffRole } from "@/lib/membership";
import { ammanNow, toAmmanDateInput, toAmmanDateKey, fromAmmanDateInput, addAmmanDays, formatAmmanDateTime } from "@/lib/time";
import { useServerFn } from "@tanstack/react-start";
import { getAdminDashboardStats } from "@/lib/dashboard.functions";
import { toast } from "sonner";
import { Plus, Trash2, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, LogOut, Megaphone, CalendarDays, Users, UserCog, ChevronsRight, LayoutDashboard, Flag, ArrowUpDown, Settings, User, Sun, Moon, Wallet, TrendingUp, Tags, Eye, EyeOff, Pencil, Lock } from "lucide-react";
import { useClassTypeDefs, labelOf, type ClassTypeDef } from "@/lib/classTypes";
import { GymSetupPanel } from "@/components/GymSetupPanel";


export const Route = createFileRoute("/gym/$gymSlug/admin")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? (search.tab as Tab) : undefined,
  }),
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: gp("/auth") });
    const membership = await fetchMembershipBySlug(data.user.id, params.gymSlug);
    if (!membership) throw redirect({ to: gp("/staff-login") });
    if (!isStaffRole(membership.role)) throw redirect({ to: gp("/home") });
  },


  component: AdminPage,
});

type Tab = "dashboard" | "announcements" | "classes" | "coaches" | "members" | "settings";

/** Tabs that stay locked until the gym is approved by the platform. */
const RESTRICTED_TABS: Tab[] = ["announcements", "classes", "coaches", "members"];

function AdminPage() {
  const { t } = useLang();
  const { theme, setTheme } = useTheme();
  const nav = useNavigate();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>(search.tab ?? "dashboard");
  const { gymSlug } = Route.useParams();
  const { gym } = useGym();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const base = `/gym/${gymSlug}/admin`;
  const isChild = pathname !== base && pathname !== `${base}/`;
  if (isChild) return <Outlet />;
  const isPendingGym = gym?.status === "pending";
  const locked = isPendingGym && RESTRICTED_TABS.includes(tab);
  const tabs: Array<{ key: Tab; label: string; icon: typeof Megaphone }> = [
    { key: "dashboard", label: t.dashboard, icon: LayoutDashboard },
    { key: "announcements", label: t.manageAnnouncements, icon: Megaphone },
    { key: "classes", label: t.manageClasses, icon: CalendarDays },
    { key: "members", label: t.membersList, icon: Users },
  ];

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: gp("/auth"), replace: true });
  };
  const nextTheme = theme === "dark" ? "light" : "dark";
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const sectionTitle =
    tab === "dashboard" ? t.dashboard
    : tab === "announcements" ? t.manageAnnouncements
    : tab === "classes" ? t.manageClasses
    : tab === "members" ? t.membersList
    : tab === "coaches" ? "Coaches"
    : "Gym setup";

  const secondary: Array<{ key: Tab; label: string; icon: typeof Megaphone }> = [
    { key: "coaches", label: "Coaches", icon: UserCog },
    { key: "settings", label: "Gym setup", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r hairline bg-card/40 lg:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          <Logo size={40} logoUrl={gym?.logo_url} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{gym?.name ?? "Nuvo"}</p>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t.admin}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {tabs.map((x) => {
            const active = tab === x.key;
            const Icon = x.icon;
            const isLocked = isPendingGym && RESTRICTED_TABS.includes(x.key);
            return (
              <button
                key={x.key}
                onClick={() => setTab(x.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-primary/10 text-primary" : isLocked ? "text-muted-foreground/50 hover:bg-muted" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
                <span className="truncate">{x.label}</span>
                {isLocked && <Lock size={12} className="ml-auto" />}
              </button>
            );
          })}
        </nav>
        <div className="space-y-1 border-t hairline p-3">
          {secondary.map((x) => {
            const active = tab === x.key;
            const Icon = x.icon;
            return (
              <button
                key={x.key}
                onClick={() => setTab(x.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={18} />
                <span>{x.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setTheme(nextTheme)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ThemeIcon size={18} /> {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut size={18} /> {t.signOut}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile header */}
        <header className="flex items-center justify-between gap-3 border-b hairline px-5 py-4 pt-[max(env(safe-area-inset-top),16px)] lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            {tab === "coaches" || tab === "settings" ? (
              <button
                onClick={() => setTab("dashboard")}
                className="flex items-center gap-1.5 rounded-pill border hairline px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft size={14} /> {t.dashboard}
              </button>
            ) : (
              <>
                <Logo size={36} logoUrl={gym?.logo_url} />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{gym?.name ?? "Nuvo"}</p>
                  <h1 className="font-display text-2xl leading-none">{t.admin}</h1>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(nextTheme)}
              aria-label={`Switch to ${nextTheme} mode`}
              className="flex h-8 w-8 items-center justify-center rounded-full border hairline text-muted-foreground transition-colors hover:text-foreground"
            >
              <ThemeIcon size={16} />
            </button>
            <button onClick={signOut} className="flex items-center gap-1.5 rounded-pill border hairline px-3 py-1.5 text-xs font-semibold text-destructive">
              <LogOut size={14} /> {t.signOut}
            </button>
          </div>
        </header>

        {/* Desktop header */}
        <header className="sticky top-0 z-30 hidden items-center justify-between gap-4 border-b hairline bg-background/90 px-8 py-5 backdrop-blur lg:flex">
          <div className="min-w-0">
            <h1 className="font-display truncate text-3xl leading-none">{sectionTitle}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{gym?.name ?? "Nuvo"}</p>
          </div>
          {isPendingGym && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-600">
              <Lock size={13} /> Approval pending
            </span>
          )}
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-5 py-5 pb-[max(env(safe-area-inset-bottom),96px)] lg:px-8 lg:py-8 lg:pb-12">
          {isPendingGym && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
              <Lock size={18} className="mt-0.5 shrink-0 text-yellow-500" />
              <div>
                <p className="text-sm font-semibold text-yellow-500">Approval pending</p>
                <p className="text-xs text-yellow-500/80">
                  Finish your gym setup below while we review your application. Classes, members, coaches and announcements unlock once your gym is approved.
                </p>
              </div>
            </div>
          )}
          {locked ? (
            <div className="card-surface flex flex-col items-center gap-3 p-8 text-center">
              <Lock size={24} className="text-muted-foreground" />
              <h2 className="font-display text-xl">Locked until approval</h2>
              <p className="max-w-sm text-xs text-muted-foreground">
                This is part of the full Nuvo platform. You'll get access as soon as your gym is approved — meanwhile you can complete your gym setup.
              </p>
              <button
                onClick={() => setTab("settings")}
                className="rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Open gym setup
              </button>
            </div>
          ) : (
            <div className={tab === "announcements" || tab === "coaches" || tab === "settings" ? "mx-auto w-full max-w-4xl" : ""}>
              {tab === "dashboard" && <DashboardAdmin setTab={setTab} />}
              {tab === "announcements" && <AnnouncementsAdmin />}
              {tab === "classes" && <ClassesAdmin />}
              {tab === "coaches" && <CoachesAdmin />}
              {tab === "members" && <MembersAdmin />}
              {tab === "settings" && <GymSetupPanel />}
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-background pb-[max(env(safe-area-inset-bottom),8px)] pt-2 lg:hidden">
        <ul className="grid grid-cols-4 items-center px-1">

          {tabs.map(x => {
            const active = tab === x.key;
            const Icon = x.icon;
            const isLocked = isPendingGym && RESTRICTED_TABS.includes(x.key);
            return (
              <li key={x.key}>
                <button
                  onClick={()=>setTab(x.key)}
                  className={`relative flex w-full flex-col items-center justify-center gap-1 rounded-pill px-1 py-1.5 text-[10px] font-medium transition-colors ${active ? "text-primary" : isLocked ? "text-muted-foreground/50" : "text-muted-foreground"}`}
                >
                  <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                  {isLocked && <Lock size={10} className="absolute right-1/4 top-0" />}
                  <span className="text-center leading-none">{x.label}</span>
                </button>
              </li>
            );
          })}

        </ul>
      </nav>
    </div>
  );
}


function DashboardAdmin({ setTab }: { setTab: (t: Tab) => void }) {
  const { t } = useLang();
  const { profile } = useAuth();
  const isGymAdmin = profile?.role === "admin" || profile?.role === "owner";

  const fetchStats = useServerFn(getAdminDashboardStats);
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetchStats(),
  });

  const totalBookedToday = (stats?.todayClasses ?? []).reduce((sum, c) => sum + c.booked, 0);
  const totalCapacityToday = (stats?.todayClasses ?? []).reduce((sum, c) => sum + c.capacity, 0);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });

  const todayKey = toAmmanDateInput(ammanNow()).slice(0, 10);
  const todayLabel = new Date(todayKey).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const occupancy = totalCapacityToday > 0 ? Math.round((totalBookedToday / totalCapacityToday) * 100) : 0;

  const kpis = [
    { label: t.classesToday, value: stats?.todayClasses.length ?? 0, sub: `${totalBookedToday}/${totalCapacityToday || 0} booked`, icon: CalendarDays, tone: "primary" as const },
    { label: t.activeGroupMembers, value: stats?.activeGroupMembers ?? 0, sub: "with active subscription", icon: Users, tone: "default" as const },
    { label: t.ptSessionsOnBooks, value: stats?.ptSessionsOnBooks ?? 0, sub: "outstanding PT credits", icon: UserCog, tone: "default" as const },
    { label: t.newSignups, value: stats?.newSignupsThisWeek ?? 0, sub: "this week", icon: Plus, tone: "default" as const },
  ];

  const [trendRange, setTrendRange] = useState<7 | 30>(7);
  const signupTrendData = (stats?.signupTrend ?? []).slice(-trendRange);
  const maxSignupCount = Math.max(1, ...signupTrendData.map((d) => d.count));

  const revenueTodayTotal = Object.values(stats?.revenueToday ?? {}).reduce((a, b) => a + b, 0);
  const revenueWeekTotal = Object.values(stats?.revenueWeek ?? {}).reduce((a, b) => a + b, 0);

  const membershipTotal = Object.values(stats?.membershipBreakdown ?? {}).reduce((a, b) => a + b, 0) || 1;
  const membershipSegments = [
    { key: "active", label: t.active, count: stats?.membershipBreakdown.active ?? 0, color: "bg-emerald-500" },
    { key: "paused", label: t.paused, count: stats?.membershipBreakdown.paused ?? 0, color: "bg-amber-500" },
    { key: "expired", label: t.expired, count: stats?.membershipBreakdown.expired ?? 0, color: "bg-destructive" },
    { key: "never", label: t.neverSubscribed, count: stats?.membershipBreakdown.never ?? 0, color: "bg-muted-foreground" },
  ];

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{t.todaySnapshot}</p>
          <h2 className="font-display text-3xl leading-none">{todayLabel}</h2>
        </div>
        {isGymAdmin && (
        <div className="flex items-center gap-2 lg:hidden">

          <button
            onClick={() => setTab("coaches")}
            className="flex items-center gap-2 rounded-pill border hairline bg-card px-4 py-2 text-xs font-semibold transition-colors hover:bg-card/80"
          >
            <UserCog size={14} /> Coaches
          </button>
          <button
            onClick={() => setTab("settings")}
            className="flex items-center gap-2 rounded-pill border hairline bg-card px-4 py-2 text-xs font-semibold transition-colors hover:bg-card/80"
          >
            <Settings size={14} /> Gym Setup
          </button>
        </div>
        )}

      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`card-surface relative overflow-hidden p-4 ${k.tone === "primary" ? "bg-gradient-to-br from-primary/15 to-transparent" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{k.label}</span>
                <Icon size={16} className={k.tone === "primary" ? "text-primary" : "text-muted-foreground"} />
              </div>
              <p className="font-display mt-3 text-4xl leading-none">{k.value}</p>
              <p className="mt-2 text-[10px] text-muted-foreground">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: today's classes (2 cols) */}
        <div className="card-surface p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{t.classesToday}</p>
              <p className="mt-1 text-xs text-muted-foreground">Occupancy {occupancy}% · {totalBookedToday}/{totalCapacityToday || 0} seats</p>
            </div>
            <button onClick={() => setTab("classes")} className="rounded-pill border hairline px-3 py-1 text-[10px] font-semibold text-primary">{t.viewAll}</button>
          </div>

          {/* Occupancy bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-pill bg-muted">
            <div className="h-full rounded-pill bg-primary transition-all" style={{ width: `${occupancy}%` }} />
          </div>

          {(stats?.todayClasses.length ?? 0) === 0 ? (
            <p className="mt-6 py-8 text-center text-xs text-muted-foreground">{t.noClassesToday}</p>
          ) : (
            <div className="mt-4 space-y-2">
              {stats?.todayClasses.map((c) => {
                const pct = c.capacity > 0 ? Math.round((c.booked / c.capacity) * 100) : 0;
                return (
                  <div key={c.id} className="rounded-xl border hairline bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-lg leading-none">{formatTime(c.starts_at)}</span>
                          <span className="rounded-pill bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{c.type}</span>
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold">{c.title}</p>
                        <p className="text-[10px] text-muted-foreground">{c.coach_name || t.coach}</p>
                      </div>
                      <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${c.full ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                        {c.booked}/{c.capacity}
                      </span>
                    </div>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-pill bg-muted">
                      <div className={`h-full rounded-pill ${c.full ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: revenue + membership + expiring soon + members */}
        <div className="space-y-4">
          {/* Revenue snapshot */}
          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{t.revenueSnapshot}</p>
              <Wallet size={16} className="text-muted-foreground" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border hairline bg-card p-3">
                <p className="text-[10px] text-muted-foreground">{t.salesToday}</p>
                <p className="font-display mt-1 text-2xl leading-none">{revenueTodayTotal}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {(stats?.revenueToday?.cash ?? 0)} {t.cash} · {(stats?.revenueToday?.card ?? 0)} {t.cliq}
                </p>
              </div>
              <div className="rounded-xl border hairline bg-card p-3">
                <p className="text-[10px] text-muted-foreground">{t.salesThisWeek}</p>
                <p className="font-display mt-1 text-2xl leading-none">{revenueWeekTotal}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {(stats?.revenueWeek?.cash ?? 0)} {t.cash} · {(stats?.revenueWeek?.card ?? 0)} {t.cliq}
                </p>
              </div>
            </div>
          </div>

          {/* Membership status breakdown */}
          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{t.membershipStatus}</p>
              <span className="font-display text-2xl leading-none">{membershipTotal}</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-pill bg-muted">
              {membershipSegments.map((seg) => (
                <div
                  key={seg.key}
                  className={`float-left h-full ${seg.color}`}
                  style={{ width: `${(seg.count / membershipTotal) * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {membershipSegments.map((seg) => (
                <div key={seg.key} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${seg.color}`} />
                  <span className="text-[10px] text-muted-foreground">{seg.label}</span>
                  <span className="ml-auto text-[10px] font-semibold">{seg.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-destructive">{t.expiringSoon}</p>
                <p className="mt-1 text-xs text-muted-foreground">Next 7 days</p>
              </div>
              <span className="font-display text-3xl leading-none">{stats?.expiringSoonCount ?? 0}</span>
            </div>
            {(stats?.expiringSoonList.length ?? 0) === 0 ? (
              <p className="mt-4 py-4 text-center text-xs text-muted-foreground">No expirations coming up</p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {stats?.expiringSoonList.map((m) => (
                  <Link
                    key={m.id}
                    to={gp(`/admin/members/${m.id}`)}
                    className="flex items-center justify-between rounded-xl border hairline bg-card px-3 py-2 transition-colors hover:border-primary/40"
                  >
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-pill bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">{formatDate(m.group_subscription_until)}</span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setTab("members")}
            className="card-surface flex w-full items-center justify-between p-5 text-left transition-colors hover:border-primary/40"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Members</p>
              <p className="font-display mt-1 text-2xl leading-none">Manage roster</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Search, renew, and book on behalf</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Signup trend chart */}
      <div className="card-surface p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{t.signupTrend}</p>
          </div>
          <div className="flex rounded-pill border hairline p-0.5">
            {[7, 30].map((range) => (
              <button
                key={range}
                onClick={() => setTrendRange(range as 7 | 30)}
                className={`rounded-pill px-2.5 py-1 text-[10px] font-semibold transition-colors ${trendRange === range ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {range === 7 ? t.last7Days : t.last30Days}
              </button>
            ))}
          </div>
        </div>
        {signupTrendData.length === 0 ? (
          <p className="mt-6 py-6 text-center text-xs text-muted-foreground">No signup data</p>
        ) : (
          <div className="mt-4 flex h-28 items-end justify-between gap-1">
            {signupTrendData.map((d) => {
              const heightPct = Math.round((d.count / maxSignupCount) * 100);
              const label = new Date(d.date).toLocaleDateString(undefined, { weekday: "narrow" });
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full max-w-[18px] rounded-t-sm bg-primary/80 transition-all hover:bg-primary"
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                    title={`${d.date}: ${d.count}`}
                  />
                  <span className="text-[9px] text-muted-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent transactions - full width table-ish */}
      <div className="card-surface p-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{t.recentTransactions}</p>
          <span className="text-[10px] text-muted-foreground">Last 5</span>
        </div>
        {(stats?.recentTransactions.length ?? 0) === 0 ? (
          <p className="mt-6 py-6 text-center text-xs text-muted-foreground">No recent transactions</p>
        ) : (
          <div className="mt-3 divide-y divide-[color:var(--color-hairline)]">
            {stats?.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-pill ${tx.type === "credit" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                    {tx.type === "credit" ? <Plus size={16} /> : <ChevronsRight size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{tx.member_name}{tx.child_name ? ` · ${tx.child_name}` : ""}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {tx.service}{tx.classes ? ` · ${tx.classes} sessions` : ""}{tx.days ? ` · ${tx.days} days` : ""}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">{tx.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function AnnouncementsAdmin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { gymId } = useGym();
  const [tag, setTag] = useState("News");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["admin-announcements", gymId],
    enabled: !!gymId,
    queryFn: async () => (await supabase.from("announcements").select("*").eq("gym_id", gymId!).order("created_at", { ascending: false })).data ?? [],
  });
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({ tag, title, body, author_id: user!.id, gym_id: gymId! });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); setBody(""); toast.success("Posted"); qc.invalidateQueries({ queryKey: ["admin-announcements"] }); qc.invalidateQueries({ queryKey: ["announcements"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("announcements").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-announcements"] }),
  });
  return (
    <div className="space-y-4">
      <div className="card-surface space-y-2 p-4">
        <div className="flex gap-2">
          <select value={tag} onChange={(e)=>setTag(e.target.value)} className="rounded-xl border hairline bg-card px-3 py-2 text-sm">
            <option>News</option><option>Event</option><option>Update</option>
          </select>
          <input placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)}
            className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <textarea placeholder="Body" value={body} onChange={(e)=>setBody(e.target.value)} rows={3}
          className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        <button onClick={()=>create.mutate()} disabled={!title || !body || create.isPending}
          className="w-full rounded-pill bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
          <Plus size={14} className="inline"/> Post
        </button>
      </div>
      <div className="grid gap-2 xl:grid-cols-2">
        {data.map((a: any) => (
          <div key={a.id} className="card-surface flex items-start justify-between gap-3 p-4 transition-colors hover:border-primary/40">

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{a.tag}</p>
              <p className="font-display text-lg leading-tight">{a.title}</p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.body}</p>
            </div>
            <button onClick={()=>del.mutate(a.id)} className="shrink-0 text-destructive"><Trash2 size={16}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

type ClassView = "upcoming" | "past" | "cancelled";

function ClassesAdmin() {
  const qc = useQueryClient();
  const { data: typeDefs = [] } = useClassTypeDefs({ onlyActive: true });
  const { data: allTypeDefs = [] } = useClassTypeDefs({ onlyActive: false });
  const [type, setType] = useState<string>("mixed");
  const [coachId, setCoachId] = useState("");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(toAmmanDateInput(ammanNow()));
  const [capacity, setCapacity] = useState(15);
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"daily"|"weekly">("weekly");
  const [endDate, setEndDate] = useState("");
  const [view, setView] = useState<ClassView>("upcoming");
  const [selectedDate, setSelectedDate] = useState<string>(toAmmanDateKey(new Date()));
  const [viewedMonth, setViewedMonth] = useState<Date>(() => {
    const n = ammanNow();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; starts_at: string; capacity: number; coach_id: string; type: string }>({ title: "", starts_at: "", capacity: 15, coach_id: "", type: "mixed" });
  const [addOpen, setAddOpen] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const nowIso = new Date().toISOString();
  const { gymId } = useGym();
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["admin-classes", view, gymId],
    enabled: !!gymId,
    queryFn: async () => {
      let q = supabase.from("classes")
        .select("id, type, title, starts_at, capacity, coach_id, cancelled_at, coaches(name), bookings(id, status, member_id, child_id, children(name))")
        .eq("gym_id", gymId!);
      if (view === "upcoming") q = q.gte("starts_at", nowIso).is("cancelled_at", null).order("starts_at", { ascending: true });
      else if (view === "past") q = q.lt("starts_at", nowIso).is("cancelled_at", null).order("starts_at", { ascending: false });
      else q = q.not("cancelled_at", "is", null).order("cancelled_at", { ascending: false });
      const { data: cls } = await q;
      const list = cls ?? [];
      const memberIds = Array.from(new Set(list.flatMap((c: any) => (c.bookings ?? []).map((b: any) => b.member_id).filter(Boolean))));
      let nameMap: Record<string, string> = {};
      if (memberIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, name").in("id", memberIds);
        nameMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.name]));
      }
      return list.map((c: any) => ({
        ...c,
        bookings: (c.bookings ?? []).map((b: any) => ({ ...b, profiles: { name: nameMap[b.member_id] ?? "Member" } })),
      }));
    },
  });
  const { data: coaches = [] } = useQuery({
    queryKey: ["coaches", gymId], enabled: !!gymId,
    queryFn: async () => (await supabase.from("coaches").select("*").eq("gym_id", gymId!).order("sort_order")).data ?? [],
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-classes"] });
    qc.invalidateQueries({ queryKey: ["classes"] });
    qc.invalidateQueries({ queryKey: ["home"] });
    qc.invalidateQueries({ queryKey: ["book"] });
    qc.invalidateQueries({ queryKey: ["upcoming"] });
    qc.invalidateQueries({ queryKey: ["profile-bookings"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!title || !startsAt) throw new Error("Title and start time are required");
      const start = fromAmmanDateInput(startsAt);
      if (isNaN(start.getTime())) throw new Error("Invalid start time");

      if (recurring) {
        if (!endDate) throw new Error("Pick an end date");
        if (!frequency) throw new Error("Pick a frequency");
        const end = fromAmmanDateInput(endDate + "T23:59:59");
        if (end < start) throw new Error("End date must be on or after the start date");
        const maxEnd = addAmmanDays(start, 90);
        if (end > maxEnd) throw new Error("Recurring series cannot exceed 90 days");

        const stepDays = frequency === "daily" ? 1 : 7;
        const rows: any[] = [];
        let cur = start;
        while (cur <= end && rows.length < 200) {
          rows.push({ type, coach_id: coachId || null, title, starts_at: cur.toISOString(), capacity, gym_id: gymId! });
          cur = addAmmanDays(cur, stepDays);
        }
        if (rows.length === 0) throw new Error("No classes generated for the selected range");
        const { error } = await supabase.from("classes").insert(rows);
        if (error) throw error;
        return rows.length;
      }

      const { error } = await supabase.from("classes").insert({ type, coach_id: coachId || null, title, starts_at: start.toISOString(), capacity, gym_id: gymId! });
      if (error) throw error;
      return 1;
    },
    onSuccess: (n) => { setTitle(""); setStartsAt(toAmmanDateInput(ammanNow())); setEndDate(""); setRecurring(false); toast.success(n && n > 1 ? `${n} classes added` : "Class added"); invalidateAll(); },
    onError: (e: any) => toast.error(e.message),
  });
  const cancelClass = useMutation({
    mutationFn: async (id: string) => {
      const { error: bErr } = await supabase.from("bookings").update({ status: "cancelled" }).eq("class_id", id).eq("status", "upcoming");
      if (bErr) throw bErr;
      const { error } = await supabase.from("classes").update({ cancelled_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Class cancelled"); invalidateAll(); },
    onError: (e: any) => toast.error(e.message),
  });
  const restoreClass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").update({ cancelled_at: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Class restored"); invalidateAll(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteClass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Class deleted"); invalidateAll(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateClass = useMutation({
    mutationFn: async () => {
      if (!editId) return;
      const startsAtUtc = fromAmmanDateInput(editForm.starts_at);
      if (isNaN(startsAtUtc.getTime())) throw new Error("Invalid start time");
      const { error } = await supabase.from("classes").update({
        title: editForm.title,
        starts_at: startsAtUtc.toISOString(),
        capacity: editForm.capacity,
        coach_id: editForm.coach_id || null,
        type: editForm.type,
      }).eq("id", editId);
      if (error) throw error;
    },
    onSuccess: () => { setEditId(null); toast.success("Class updated"); invalidateAll(); },
    onError: (e: any) => toast.error(e.message),
  });
  const removeAttendee = useMutation({
    mutationFn: async (bid: string) => { const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bid); if (error) throw error; },
    onSuccess: () => { toast.success("Booking cancelled — credit refunded"); invalidateAll(); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (c: any) => {
    setEditForm({ title: c.title ?? "", starts_at: toAmmanDateInput(new Date(c.starts_at)), capacity: c.capacity, coach_id: c.coach_id ?? "", type: c.type });
    setEditId(c.id);
  };

  // Palette for class-type dots (cycles by index)
  const typeDotColor = (idx: number) => {
    const palette = ["bg-primary", "bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-cyan-500"];
    return palette[idx % palette.length];
  };
  const dayClasses = classes.filter((c: any) => c.starts_at.slice(0, 10) === selectedDate);
  // Counts per type in current view
  const typeCounts = new Map<string, number>();
  classes.forEach((c: any) => typeCounts.set(c.type, (typeCounts.get(c.type) ?? 0) + 1));
  const initialsOf = (name?: string) => (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? "").join("") || "?";

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Schedule</p>
          <h2 className="font-display text-2xl leading-none">Classes</h2>
          <p className="mt-1 text-xs text-muted-foreground">Pick a day, expand a class to see attendees.</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="shrink-0 rounded-pill bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-primary-foreground"
        >
          <Plus size={12} className="-mt-0.5 mr-1 inline"/> Add class
        </button>
      </div>

      {/* Unified workspace shell */}
      <div className="grid overflow-hidden rounded-2xl border hairline bg-card md:grid-cols-[280px_1fr]">
        {/* SIDEBAR */}
        <aside className="border-b hairline bg-muted/20 p-4 md:border-b-0 md:border-r">
          {(() => {
            const y = viewedMonth.getFullYear();
            const m = viewedMonth.getMonth();
            const first = new Date(y, m, 1);
            const daysInMonth = new Date(y, m + 1, 0).getDate();
            const startPad = first.getDay();
            const cells: Array<Date | null> = [];
            for (let i = 0; i < startPad; i++) cells.push(null);
            for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
            const todayKey = toAmmanDateKey(new Date());
            const daysWithClasses = new Set<string>(classes.map((c: any) => c.starts_at.slice(0, 10)));
            const changeMonth = (delta: number) => setViewedMonth(new Date(y, m + delta, 1));
            return (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{first.toLocaleString([], { month: "long", year: "numeric" })}</span>
                  <div className="flex gap-1">
                    <button onClick={() => changeMonth(-1)} aria-label="Previous month" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => changeMonth(1)} aria-label="Next month" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-medium text-muted-foreground/70">
                  {["S","M","T","W","T","F","S"].map((d, i) => <div key={i}>{d}</div>)}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {cells.map((d, i) => {
                    if (!d) return <div key={i} className="h-7" />;
                    const key = toAmmanDateKey(d);
                    const hasClass = daysWithClasses.has(key);
                    const active = key === selectedDate;
                    const isToday = key === todayKey;
                    return (
                      <button key={i} onClick={() => setSelectedDate(key)}
                        className={`relative flex h-7 items-center justify-center rounded-md text-[11px] transition ${
                          active ? "bg-primary font-bold text-primary-foreground" :
                          isToday ? "bg-muted font-semibold" : "hover:bg-muted"
                        }`}>
                        {d.getDate()}
                        {!active && hasClass && (
                          <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Class Types shortcut list */}
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Class Types</span>
              <button onClick={() => setTypesOpen(v => !v)} className="text-[10px] font-semibold uppercase tracking-widest text-primary hover:underline">
                {typesOpen ? "Hide" : "Manage"}
              </button>
            </div>
            <div className="space-y-1.5">
              {typeDefs.map((d, idx) => (
                <div key={d.key} className="flex items-center gap-3 rounded-pill border hairline bg-card/60 px-3 py-1.5 text-xs">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${typeDotColor(idx)}`} />
                  <span className="flex-1 truncate font-medium">{d.label}</span>
                  <span className="text-[10px] text-muted-foreground">{typeCounts.get(d.key) ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex min-w-0 flex-col">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 border-b hairline bg-muted/10 px-4 py-3">
            <div className="flex gap-0.5 rounded-pill bg-muted/50 p-0.5">
              {(["upcoming","past","cancelled"] as ClassView[]).map(v => (
                <button key={v} onClick={()=>setView(v)}
                  className={`rounded-pill px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors ${view===v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {v}
                </button>
              ))}
            </div>
            <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">
              {dayClasses.length} {dayClasses.length === 1 ? "class" : "classes"}
            </span>
          </div>

          {/* Agenda */}
          <div className="min-h-[320px] space-y-4 p-4">
            <div className="flex items-center gap-3">
              <span className="font-display text-lg leading-none">
                {new Date(selectedDate).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </span>
              <div className="h-px flex-1 bg-border/60" />
            </div>

            {isLoading && <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>}
            {!isLoading && dayClasses.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed hairline py-10 text-center">
                <p className="text-xs text-muted-foreground">No {view} classes on this day</p>
                {view === "upcoming" && (
                  <button onClick={()=>setAddOpen(true)} className="text-[11px] font-semibold uppercase tracking-widest text-primary">+ Add class</button>
                )}
              </div>
            )}

            <div className="space-y-2">
              {dayClasses.map((c: any) => {
                const active = (c.bookings ?? []).filter((b:any)=>b.status==="upcoming");
                const booked = active.length;
                const left = Math.max(0, c.capacity - booked);
                const full = left === 0;
                const isCancelled = !!c.cancelled_at;
                const isExpanded = expandedId === c.id;
                const typeIdx = Math.max(0, typeDefs.findIndex((d: any) => d.key === c.type));
                const time = new Date(c.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Amman" });
                const shown = active.slice(0, 3);
                const overflow = Math.max(0, booked - shown.length);
                return (
                  <div key={c.id} className={`overflow-hidden rounded-xl border transition-colors ${isExpanded ? "border-primary/40 bg-muted/20" : "hairline bg-card hover:border-white/20"}`}>
                    <button onClick={() => setExpandedId(isExpanded ? null : c.id)} className="flex w-full items-center gap-4 p-3 text-left">
                      <div className={`w-14 shrink-0 font-mono text-xs font-medium ${isExpanded ? "text-primary" : "text-muted-foreground"}`}>{time}</div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${typeDotColor(typeIdx)}`} />
                          <span className="truncate text-sm font-semibold">{c.title}</span>
                          {isCancelled ? (
                            <span className="shrink-0 rounded bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-destructive">Cancelled</span>
                          ) : (
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${full ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                              {full ? "Full" : `${booked}/${c.capacity}`}
                            </span>
                          )}
                        </div>
                        <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                          {c.coaches?.name || "No coach"} • {labelOf(allTypeDefs, c.type)}
                        </span>
                      </div>
                      <div className="hidden items-center gap-3 sm:flex">
                        {booked > 0 && (
                          <div className="flex -space-x-1.5">
                            {shown.map((b: any, i: number) => (
                              <span key={b.id} className="grid h-6 w-6 place-items-center rounded-full border-2 border-card bg-muted text-[9px] font-bold" style={{ zIndex: 10 - i }}>
                                {initialsOf(b.child_id ? b.children?.name : b.profiles?.name)}
                              </span>
                            ))}
                            {overflow > 0 && (
                              <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground">+{overflow}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180 text-primary" : ""}`} />
                    </button>

                    {isExpanded && (
                      <div className="grid gap-4 border-t hairline bg-card/60 p-4 md:grid-cols-[1fr_180px]">
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Attendees ({booked})</span>
                            <span className="text-[10px] text-muted-foreground">{left} spot{left===1?"":"s"} left</span>
                          </div>
                          {active.length === 0 ? (
                            <p className="rounded-lg border border-dashed hairline py-6 text-center text-[11px] text-muted-foreground">No attendees yet</p>
                          ) : (
                            <ul className="space-y-1">
                              {active.map((b: any) => (
                                <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-xs">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-[9px] font-bold">
                                      {initialsOf(b.child_id ? b.children?.name : b.profiles?.name)}
                                    </span>
                                    <span className="truncate">
                                      {b.child_id
                                        ? <>{b.children?.name ?? "Child"} <span className="text-muted-foreground">· child of {b.profiles?.name ?? "member"}</span></>
                                        : (b.profiles?.name ?? "Member")}
                                    </span>
                                  </div>
                                  {view === "upcoming" && (
                                    <button onClick={()=>removeAttendee.mutate(b.id)} className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-destructive hover:underline">Remove</button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex flex-row gap-2 md:flex-col">
                          {view === "upcoming" && (
                            <>
                              <button onClick={()=>openEdit(c)} className="flex-1 rounded-pill border hairline bg-card px-3 py-2 text-[11px] font-semibold uppercase tracking-widest">Edit</button>
                              <button
                                onClick={() => { if (confirm(`Cancel this class? ${booked} booking${booked===1?"":"s"} will be cancelled and credits refunded.`)) cancelClass.mutate(c.id); }}
                                className="flex-1 rounded-pill border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-destructive"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {view === "cancelled" && (
                            <>
                              <button onClick={()=>restoreClass.mutate(c.id)} className="flex-1 rounded-pill border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-primary">Restore</button>
                              <button onClick={()=>{ if (confirm("Delete this class permanently?")) deleteClass.mutate(c.id); }} className="flex-1 rounded-pill border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-destructive">Delete</button>
                            </>
                          )}
                          {view === "past" && (
                            <button onClick={()=>{ if (confirm("Delete this past class record permanently?")) deleteClass.mutate(c.id); }} className="flex-1 rounded-pill border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-destructive">Delete</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Add class modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={()=>setAddOpen(false)}>
          <div className="w-full max-w-md space-y-2 rounded-2xl bg-card p-4 shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">New class</h3>
              <button onClick={()=>setAddOpen(false)} className="text-xs text-muted-foreground">Close</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={type} onChange={(e)=>setType(e.target.value)} className="rounded-xl border hairline bg-card px-3 py-2 text-sm">
                {typeDefs.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
              <select value={coachId} onChange={(e)=>setCoachId(e.target.value)} className="rounded-xl border hairline bg-card px-3 py-2 text-sm">
                <option value="">Coach…</option>
                {coaches.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <input placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
            <div className="grid grid-cols-2 gap-2">
              <input type="datetime-local" value={startsAt} onChange={(e)=>setStartsAt(e.target.value)} className="rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
              <input type="number" placeholder="Capacity" value={capacity} onChange={(e)=>setCapacity(Number(e.target.value))} className="rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
            </div>
            <label className="flex items-center gap-2 px-1 pt-1 text-xs font-medium">
              <input type="checkbox" checked={recurring} onChange={(e)=>setRecurring(e.target.checked)} className="h-4 w-4 accent-primary"/>
              Recurring class
            </label>
            {recurring && (
              <div className="grid grid-cols-2 gap-2">
                <select value={frequency} onChange={(e)=>setFrequency(e.target.value as any)} className="rounded-xl border hairline bg-card px-3 py-2 text-sm">
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
                <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} placeholder="End date" className="rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
              </div>
            )}
            <button onClick={()=>{ create.mutate(undefined, { onSuccess: () => setAddOpen(false) }); }} disabled={!title || !startsAt || (recurring && !endDate) || create.isPending}
              className="w-full rounded-pill bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
              <Plus size={14} className="inline"/> {recurring ? "Add recurring classes" : "Add class"}
            </button>
          </div>
        </div>
      )}

      {editId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={()=>setEditId(null)}>
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-card p-4 shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Edit class</h3>
              <button onClick={()=>setEditId(null)} className="text-xs text-muted-foreground">Close</button>
            </div>
            <input value={editForm.title} onChange={(e)=>setEditForm(f=>({...f, title: e.target.value}))} placeholder="Title" className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
            <div className="grid grid-cols-2 gap-2">
              <select value={editForm.type} onChange={(e)=>setEditForm(f=>({...f, type: e.target.value}))} className="rounded-xl border hairline bg-card px-3 py-2 text-sm">
                {allTypeDefs.map((d) => <option key={d.key} value={d.key}>{d.label}{d.active ? "" : " (hidden)"}</option>)}
              </select>
              <select value={editForm.coach_id} onChange={(e)=>setEditForm(f=>({...f, coach_id: e.target.value}))} className="rounded-xl border hairline bg-card px-3 py-2 text-sm">
                <option value="">Coach…</option>
                {coaches.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="datetime-local" value={editForm.starts_at} onChange={(e)=>setEditForm(f=>({...f, starts_at: e.target.value}))} className="rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
              <input type="number" value={editForm.capacity} onChange={(e)=>setEditForm(f=>({...f, capacity: Number(e.target.value)}))} className="rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
            </div>
            <button onClick={()=>updateClass.mutate()} disabled={updateClass.isPending || !editForm.title || !editForm.starts_at}
              className="w-full rounded-pill bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">Save changes</button>
          </div>
        </div>
      )}

      {/* Class Types manager — revealed by sidebar "Manage" link */}
      {typesOpen && (
        <div>
          <ClassTypesAdmin />
        </div>
      )}
    </div>
  );
}





function CoachesAdmin() {
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState(""); const [photoUrl, setPhotoUrl] = useState("");
  const { gymId } = useGym();
  const { data = [] } = useQuery({ queryKey: ["coaches", gymId], enabled: !!gymId, queryFn: async () => (await supabase.from("coaches").select("*").eq("gym_id", gymId!).order("sort_order")).data ?? [] });
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coaches").insert({ name, specialty, bio, photo_url: photoUrl || null, gym_id: gymId! });
      if (error) throw error;
    },
    onSuccess: () => { setName(""); setSpecialty(""); setBio(""); setPhotoUrl(""); toast.success("Added"); qc.invalidateQueries({ queryKey: ["coaches"] }); },
  });
  const del = useMutation({ mutationFn: async (id: string) => { await supabase.from("coaches").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["coaches"] }) });
  return (
    <div className="space-y-4">
      <div className="card-surface space-y-2 p-4">
        <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
        <input placeholder="Specialty" value={specialty} onChange={(e)=>setSpecialty(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
        <textarea placeholder="Bio" value={bio} onChange={(e)=>setBio(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm" rows={2}/>
        <input placeholder="Photo URL (optional)" value={photoUrl} onChange={(e)=>setPhotoUrl(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
        <button onClick={()=>create.mutate()} disabled={!name || !specialty} className="w-full rounded-pill bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">Add coach</button>
      </div>
      <div className="space-y-2">
        {data.map((c: any) => (
          <div key={c.id} className="card-surface flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-display text-lg leading-none">{c.name}</p>
              <p className="text-[10px] uppercase tracking-widest text-primary">{c.specialty}</p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.bio}</p>
            </div>
            <button onClick={()=>del.mutate(c.id)} className="shrink-0 text-destructive"><Trash2 size={16}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatGroupStatus(until: string | null | undefined): string {
  if (!until) return "Group: none";
  const d = new Date(until);
  if (isNaN(d.getTime())) return "Group: none";
  if (d.getTime() <= Date.now()) return "Group: expired";
  return `Group: active until ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function daysUntilGroupExpiry(until: string | null | undefined): number | null {
  if (!until) return null;
  const expiry = new Date(until);
  if (isNaN(expiry.getTime())) return null;
  const now = ammanNow();
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.ceil((expiry.getTime() - now.getTime()) / msPerDay);
  return diff;
}

function MembersAdmin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useLang();
  const { gymId } = useGym();
  const { data = [] } = useQuery({
    queryKey: ["admin-members", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const [{ data: rows }, { data: kids }] = await Promise.all([
        supabase
          .from("gym_members")
          .select("user_id, member_code, membership_status, pt_sessions_remaining, group_subscription_until, role, profiles(id, name, avatar_url)")
          .eq("role", "member")
          .eq("gym_id", gymId!),
        supabase
          .from("children")
          .select("id, parent_id, name, group_subscription_until, pt_sessions_remaining, avatar_url")
          .eq("gym_id", gymId!),
      ]);
      const kidsByParent: Record<string, any[]> = {};
      for (const k of (kids ?? []) as any[]) {
        (kidsByParent[k.parent_id] ??= []).push(k);
      }
      return ((rows ?? []) as any[])
        .map((m) => ({
          id: m.user_id,
          name: m.profiles?.name ?? "Member",
          avatar_url: m.profiles?.avatar_url ?? null,
          member_code: m.member_code,
          membership_status: m.membership_status,
          pt_sessions_remaining: m.pt_sessions_remaining,
          group_subscription_until: m.group_subscription_until,
          role: m.role,
          children: kidsByParent[m.user_id] ?? [],
        }))
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    },
  });
  const [search, setSearch] = useState("");
  
  const [sortBy, setSortBy] = useState<"name" | "member_code" | "expiry" | "pt">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const q = search.trim().toLowerCase();
  const filtered = q
    ? (data as any[]).filter((m) =>
        (m.name ?? "").toLowerCase().includes(q) ||
        (m.member_code ?? "").toLowerCase().includes(q) ||
        (m.children ?? []).some((k: any) => (k.name ?? "").toLowerCase().includes(q))
      )
    : (data as any[]);

  const sorted = [...filtered].sort((a: any, b: any) => {
    let cmp = 0;
    if (sortBy === "name") cmp = (a.name ?? "").localeCompare(b.name ?? "");
    else if (sortBy === "member_code") cmp = (a.member_code ?? "").localeCompare(b.member_code ?? "");
    else if (sortBy === "expiry") {
      const da = a.group_subscription_until ? new Date(a.group_subscription_until).getTime() : Infinity;
      const db = b.group_subscription_until ? new Date(b.group_subscription_until).getTime() : Infinity;
      cmp = da - db;
    } else if (sortBy === "pt") {
      cmp = (a.pt_sessions_remaining ?? 0) - (b.pt_sessions_remaining ?? 0);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });


  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, child name, or member code"
          className="min-w-0 flex-1 rounded-pill border hairline bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <div className="relative shrink-0">
          <select
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split(":") as [typeof sortBy, typeof sortDir];
              setSortBy(field);
              setSortDir(dir);
            }}
            className="h-[42px] appearance-none rounded-pill border hairline bg-card pl-3 pr-8 text-xs font-semibold outline-none focus:border-primary"
          >
            <option value="name:asc">{t.sortNameAsc}</option>
            <option value="name:desc">{t.sortNameDesc}</option>
            <option value="member_code:asc">{t.sortMemberIdAsc}</option>
            <option value="member_code:desc">{t.sortMemberIdDesc}</option>
            <option value="expiry:asc">{t.sortExpiryAsc}</option>
            <option value="expiry:desc">{t.sortExpiryDesc}</option>
            <option value="pt:desc">{t.sortPtDesc}</option>
            <option value="pt:asc">{t.sortPtAsc}</option>
          </select>
          <ArrowUpDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      {sorted.length === 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground">No members found.</p>
      )}
      {sorted.map((m: any) => {
        const kids = m.children ?? [];
        const hasKids = kids.length > 0;

        const expiryDays = daysUntilGroupExpiry(m.group_subscription_until);
        const showFlag = expiryDays !== null && expiryDays <= 3;
        return (
          <div key={m.id} className="card-surface p-4">
            <div className="flex w-full items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="shrink-0 h-11 w-11 rounded-full overflow-hidden bg-muted flex items-center justify-center hairline border">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={m.name || "member"} className="h-full w-full object-cover" />
                  ) : (
                    <User size={18} className="text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg leading-tight truncate">{m.name || "—"}</p>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${m.membership_status === "active" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}
                    >
                      {m.membership_status}
                    </span>
                    {showFlag && (
                      <span
                        title={expiryDays! < 0 ? "Subscription expired" : expiryDays === 0 ? "Expires today" : `${expiryDays} day${expiryDays === 1 ? "" : "s"} left`}
                        className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-destructive"
                      >
                        <Flag size={10} />
                        {expiryDays! < 0 ? "Expired" : expiryDays === 0 ? "Today" : `${expiryDays}d`}
                      </span>
                    )}
                  </div>
                  {m.member_code && (
                    <p className="mt-0.5 font-mono text-[10px] tracking-widest text-primary">Member ID: {m.member_code}</p>
                  )}
                  {hasKids && (
                    <span className="mt-2 inline-flex items-center rounded-pill bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                      {kids.length} {kids.length === 1 ? "child" : "children"}
                    </span>
                  )}
                </div>
              </div>
              <Link
                to={gp(`/admin/members/${m.id}`)}
                className="shrink-0 rounded-pill border hairline px-3 py-1.5 text-[11px] font-semibold text-primary"
              >
                View
              </Link>
            </div>

          </div>
        );
      })}
    </div>
  );
}

function ClassTypesAdmin() {
  const qc = useQueryClient();
  const { gymId } = useGym();
  const { data: defs = [], isLoading } = useClassTypeDefs({ onlyActive: false });
  const [showForm, setShowForm] = useState(false);
  const empty = { key: "", label: "", gender_restriction: "none", credit_source: "group", kids_only: false, track_restricted: false, sort_order: 100 } as {
    key: string; label: string; gender_restriction: "none"|"female"|"male"; credit_source: "group"|"pt"; kids_only: boolean; track_restricted: boolean; sort_order: number;
  };
  const [form, setForm] = useState(empty);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["class-type-defs"] });
    qc.invalidateQueries({ queryKey: ["book"] });
    qc.invalidateQueries({ queryKey: ["admin-classes"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const key = form.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      if (!key || !form.label.trim()) throw new Error("Key and label required");
      if (editingKey) {
        const { error } = await supabase.from("class_type_defs" as any).update({
          label: form.label.trim(),
          gender_restriction: form.gender_restriction,
          credit_source: form.credit_source,
          kids_only: form.kids_only,
          track_restricted: form.track_restricted,
          sort_order: form.sort_order,
        }).eq("gym_id", gymId!).eq("key", editingKey);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("class_type_defs" as any).insert({
          key,
          label: form.label.trim(),
          gender_restriction: form.gender_restriction,
          credit_source: form.credit_source,
          kids_only: form.kids_only,
          track_restricted: form.track_restricted,
          sort_order: form.sort_order,
          is_builtin: false,
          active: true,
          gym_id: gymId!,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editingKey ? "Class type updated" : "Class type added"); setForm(empty); setShowForm(false); setEditingKey(null); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  const toggleActive = useMutation({
    mutationFn: async (d: ClassTypeDef) => {
      const { error } = await supabase.from("class_type_defs" as any).update({ active: !d.active }).eq("gym_id", gymId!).eq("key", d.key);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (d: ClassTypeDef) => {
      if (!confirm(`Delete class type "${d.label}"? Existing classes using it will keep the type but new bookings will fail. Consider hiding instead.`)) return;
      const { error } = await supabase.from("class_type_defs" as any).delete().eq("gym_id", gymId!).eq("key", d.key);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (d: ClassTypeDef) => {
    setEditingKey(d.key);
    setForm({
      key: d.key,
      label: d.label,
      gender_restriction: d.gender_restriction,
      credit_source: d.credit_source,
      kids_only: d.kids_only,
      track_restricted: d.track_restricted,
      sort_order: d.sort_order,
    });
    setShowForm(true);
  };

  const cancelEdit = () => { setEditingKey(null); setForm(empty); setShowForm(false); };

  return (
    <div className="card-surface space-y-3 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl"><Tags size={18}/> Class Types</h2>
          <p className="mt-1 text-xs text-muted-foreground">Add custom class types with their own rules. Built-ins can be edited or hidden but not deleted.</p>
        </div>
        {!showForm && (
          <button onClick={() => { setForm(empty); setEditingKey(null); setShowForm(true); }} className="rounded-pill bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">
            <Plus size={12} className="inline"/> Add type
          </button>
        )}
      </div>

      {isLoading && <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>}

      <ul className="divide-y hairline">
        {defs.map((d) => (
          <li key={d.key} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {d.label}
                {d.is_builtin && <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">built-in</span>}
                {!d.active && <span className="rounded-pill bg-destructive/15 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-destructive">hidden</span>}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                <span className="font-mono">{d.key}</span> · {d.credit_source === "pt" ? "PT credits" : "Group membership"}
                {d.gender_restriction !== "none" && ` · ${d.gender_restriction}-only`}
                {d.kids_only && " · kids-only"}
                {d.track_restricted && " · track-restricted"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => toggleActive.mutate(d)} title={d.active ? "Hide" : "Show"} className="rounded-pill border hairline p-1.5 text-muted-foreground">
                {d.active ? <Eye size={14}/> : <EyeOff size={14}/>}
              </button>
              <button onClick={() => startEdit(d)} title="Edit" className="rounded-pill border hairline p-1.5 text-muted-foreground">
                <Pencil size={14}/>
              </button>
              {!d.is_builtin && (
                <button onClick={() => remove.mutate(d)} title="Delete" className="rounded-pill border hairline p-1.5 text-destructive">
                  <Trash2 size={14}/>
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {showForm && (
        <div className="mt-2 space-y-2 rounded-xl border hairline bg-muted/30 p-3">
          <p className="font-display text-sm">{editingKey ? "Edit type" : "New type"}</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Key</span>
              <input value={form.key} disabled={!!editingKey} onChange={(e)=>setForm({...form, key: e.target.value})} placeholder="boxing" className="mt-1 w-full rounded-xl border hairline bg-card px-3 py-2 text-sm font-mono disabled:opacity-60"/>
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Label</span>
              <input value={form.label} onChange={(e)=>setForm({...form, label: e.target.value})} placeholder="Boxing" className="mt-1 w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Credit source</span>
              <select value={form.credit_source} onChange={(e)=>setForm({...form, credit_source: e.target.value as "group"|"pt"})} className="mt-1 w-full rounded-xl border hairline bg-card px-3 py-2 text-sm">
                <option value="group">Group membership</option>
                <option value="pt">PT sessions</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Gender restriction</span>
              <select
                value={form.kids_only ? "kids" : form.gender_restriction}
                onChange={(e)=>{
                  const v = e.target.value;
                  if (v === "kids") setForm({...form, kids_only: true, gender_restriction: "none"});
                  else setForm({...form, kids_only: false, gender_restriction: v as "none"|"female"|"male"});
                }}
                className="mt-1 w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"
              >
                <option value="none">None</option>
                <option value="female">Female only</option>
                <option value="male">Male only</option>
                <option value="kids">Kids only</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Sort order</span>
              <input type="number" value={form.sort_order} onChange={(e)=>setForm({...form, sort_order: Number(e.target.value)})} className="mt-1 w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
            </label>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={form.kids_only} onChange={(e)=>setForm({...form, kids_only: e.target.checked})} className="h-4 w-4 accent-primary"/>
              Kids-only (requires booking under a child account)
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={form.track_restricted} onChange={(e)=>setForm({...form, track_restricted: e.target.checked})} className="h-4 w-4 accent-primary"/>
              Track-restricted (member must book on their chosen days; counts toward 12/month cap)
            </label>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button onClick={()=>save.mutate()} disabled={save.isPending} className="flex-1 rounded-pill bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
              {save.isPending ? "Saving…" : editingKey ? "Save changes" : "Add type"}
            </button>
            <button onClick={cancelEdit} className="rounded-pill border hairline px-4 py-2 text-xs font-semibold">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}




