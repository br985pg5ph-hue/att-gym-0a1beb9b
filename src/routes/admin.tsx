import { createFileRoute, redirect, useNavigate, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { useAuth, useLang, useTheme } from "@/lib/providers";
import { ammanNow, toAmmanDateInput, toAmmanDateKey, fromAmmanDateInput, addAmmanDays, formatAmmanDateTime } from "@/lib/time";
import { useServerFn } from "@tanstack/react-start";
import { getAdminDashboardStats } from "@/lib/dashboard.functions";
import { toast } from "sonner";
import { Plus, Trash2, ChevronRight, ChevronLeft, LogOut, Megaphone, CalendarDays, Users, UserCog, ChevronsRight, LayoutDashboard, Flag, ArrowUpDown, Settings, User, Sun, Moon, Wallet, TrendingUp, Tags, Eye, EyeOff, Pencil } from "lucide-react";
import { useClassTypeDefs, labelOf, type ClassTypeDef } from "@/lib/classTypes";


export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (prof?.role !== "staff") throw redirect({ to: "/home" });
  },
  component: AdminPage,
});

type Tab = "dashboard" | "announcements" | "classes" | "coaches" | "members" | "settings";

function AdminPage() {
  const { t } = useLang();
  const { theme, setTheme } = useTheme();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("dashboard");
  const pathname = useRouterState({ select: s => s.location.pathname });
  const isChild = pathname !== "/admin" && pathname !== "/admin/";
  if (isChild) return <Outlet />;
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
    nav({ to: "/auth", replace: true });
  };
  const nextTheme = theme === "dark" ? "light" : "dark";
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-3 border-b hairline px-5 py-4 pt-[max(env(safe-area-inset-top),16px)]">
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
              <Logo size={36} />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">ATT Academy</p>
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
      <main className={`mx-auto ${tab === "dashboard" ? "max-w-6xl" : "max-w-3xl"} px-5 py-5 pb-[max(env(safe-area-inset-bottom),96px)]`}>
        {tab === "dashboard" && <DashboardAdmin setTab={setTab} />}
        {tab === "announcements" && <AnnouncementsAdmin />}
        {tab === "classes" && <ClassesAdmin />}
        {tab === "coaches" && <CoachesAdmin />}
        {tab === "members" && <MembersAdmin />}
        {tab === "settings" && <GymInfoAdmin setTab={setTab} />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-background pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        <ul className="grid grid-cols-4 items-center px-1">

          {tabs.map(x => {
            const active = tab === x.key;
            const Icon = x.icon;
            return (
              <li key={x.key}>
                <button
                  onClick={()=>setTab(x.key)}
                  className={`flex w-full flex-col items-center justify-center gap-1 rounded-pill px-1 py-1.5 text-[10px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
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
        <div className="flex items-center gap-2">
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
            <Settings size={14} /> Gym Info
          </button>
        </div>
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
                    to="/admin/members/$id"
                    params={{ id: m.id }}
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
  const [tag, setTag] = useState("News");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({ tag, title, body, author_id: user!.id });
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
      <div className="space-y-2">
        {data.map((a: any) => (
          <div key={a.id} className="card-surface flex items-start justify-between gap-3 p-4">
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

  const nowIso = new Date().toISOString();
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["admin-classes", view],
    queryFn: async () => {
      let q = supabase.from("classes")
        .select("id, type, title, starts_at, capacity, coach_id, cancelled_at, coaches(name), bookings(id, status, member_id, child_id, children(name))");
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
    queryKey: ["coaches"], queryFn: async () => (await supabase.from("coaches").select("*").order("sort_order")).data ?? [],
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
          rows.push({ type, coach_id: coachId || null, title, starts_at: cur.toISOString(), capacity });
          cur = addAmmanDays(cur, stepDays);
        }
        if (rows.length === 0) throw new Error("No classes generated for the selected range");
        const { error } = await supabase.from("classes").insert(rows);
        if (error) throw error;
        return rows.length;
      }

      const { error } = await supabase.from("classes").insert({ type, coach_id: coachId || null, title, starts_at: start.toISOString(), capacity });
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

  return (
    <div className="space-y-4">
      <div className="card-surface space-y-2 p-4">
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
        <button onClick={()=>create.mutate()} disabled={!title || !startsAt || (recurring && !endDate) || create.isPending}
          className="w-full rounded-pill bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"><Plus size={14} className="inline"/> {recurring ? "Add recurring classes" : "Add class"}</button>
      </div>

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
        const changeMonth = (delta: number) => {
          setViewedMonth(new Date(y, m + delta, 1));
        };
        return (
          <div className="card-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <button onClick={() => changeMonth(-1)} aria-label="Previous month" className="rounded-pill hairline border p-1">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <p className="font-display text-xs tracking-wide">{first.toLocaleString([], { month: "long", year: "numeric" })}</p>
              <button onClick={() => changeMonth(1)} aria-label="Next month" className="rounded-pill hairline border p-1">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] text-muted-foreground">
              {["S","M","T","W","T","F","S"].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                if (!d) return <div key={i} />;
                const key = toAmmanDateKey(d);
                const hasClass = daysWithClasses.has(key);
                const active = key === selectedDate;
                const isToday = key === todayKey;
                return (
                  <button key={i} onClick={() => setSelectedDate(key)}
                    className={`relative h-8 rounded-lg text-[11px] transition ${
                      active ? "bg-primary text-primary-foreground font-semibold" :
                      isToday ? "border hairline" : "hover:bg-muted"
                    }`}>
                    {d.getDate()}
                    {!active && hasClass && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-muted-foreground/60" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="flex gap-2">
        {(["upcoming","past","cancelled"] as ClassView[]).map(v => (
          <button key={v} onClick={()=>setView(v)}
            className={`flex-1 rounded-pill px-3 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors ${view===v ? "bg-primary text-primary-foreground" : "border hairline bg-card text-muted-foreground"}`}>
            {v}
          </button>
        ))}
      </div>

      <p className="font-display text-sm tracking-wide text-muted-foreground">
        {new Date(selectedDate).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      </p>
      {isLoading && <p className="text-center text-xs text-muted-foreground py-4">Loading…</p>}
      {(() => {
        const filtered = classes.filter((c: any) => c.starts_at.slice(0, 10) === selectedDate);
        if (!isLoading && filtered.length === 0) {
          return <p className="text-center text-xs text-muted-foreground py-4">No {view} classes on this day</p>;
        }
        return null;
      })()}
      <div className="space-y-2">
        {classes.filter((c: any) => c.starts_at.slice(0, 10) === selectedDate).map((c: any) => {
          const active = (c.bookings ?? []).filter((b:any)=>b.status==="upcoming");
          const booked = active.length;
          const left = Math.max(0, c.capacity - booked);
          const full = left === 0;
          const isCancelled = !!c.cancelled_at;
          return (
            <div key={c.id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-lg leading-none">{c.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatAmmanDateTime(c.starts_at)} • {c.coaches?.name || "—"} • <span className="uppercase">{labelOf(allTypeDefs, c.type)}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-pill bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest">{booked} booked</span>
                    {!isCancelled && (
                      <span className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${full ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                        {full ? "Full" : `${left} left`}
                      </span>
                    )}
                    {isCancelled && (
                      <span className="rounded-pill bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-destructive">Cancelled</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">of {c.capacity}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {view === "upcoming" && (
                    <>
                      <button onClick={()=>openEdit(c)} className="rounded-pill border hairline px-3 py-1.5 text-[11px] font-semibold">Edit</button>
                      <button
                        onClick={() => { if (confirm(`Cancel this class? ${booked} booking${booked===1?"":"s"} will be cancelled and credits refunded.`)) cancelClass.mutate(c.id); }}
                        className="rounded-pill border hairline px-3 py-1.5 text-[11px] font-semibold text-destructive"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {view === "cancelled" && (
                    <>
                      <button onClick={()=>restoreClass.mutate(c.id)} className="rounded-pill border hairline px-3 py-1.5 text-[11px] font-semibold text-primary">Restore</button>
                      <button onClick={()=>{ if (confirm("Delete this class permanently?")) deleteClass.mutate(c.id); }} className="rounded-pill border hairline px-3 py-1.5 text-[11px] font-semibold text-destructive">Delete</button>
                    </>
                  )}
                  {view === "past" && (
                    <button onClick={()=>{ if (confirm("Delete this past class record permanently?")) deleteClass.mutate(c.id); }} className="rounded-pill border hairline px-3 py-1.5 text-[11px] font-semibold text-destructive">Delete</button>
                  )}
                </div>
              </div>
              {active.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {active.map((b: any) => (
                    <li key={b.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 text-xs">
                      <span>
                        {b.child_id
                          ? <>{b.children?.name ?? "Child"} <span className="text-muted-foreground">(child of {b.profiles?.name ?? "member"})</span></>
                          : (b.profiles?.name ?? "Member")}
                      </span>
                      {view === "upcoming" && (
                        <button onClick={()=>removeAttendee.mutate(b.id)} className="text-destructive text-[10px]">Remove</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

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
    </div>
  );
}



function CoachesAdmin() {
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState(""); const [photoUrl, setPhotoUrl] = useState("");
  const { data = [] } = useQuery({ queryKey: ["coaches"], queryFn: async () => (await supabase.from("coaches").select("*").order("sort_order")).data ?? [] });
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coaches").insert({ name, specialty, bio, photo_url: photoUrl || null });
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
  const { data = [] } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => (await supabase.from("profiles")
      .select("id, name, member_code, membership_status, pt_sessions_remaining, group_subscription_until, role, avatar_url, children(id, name, group_subscription_until, pt_sessions_remaining, avatar_url)")
      .eq("role", "member")
      .order("name")).data ?? [],
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
                to="/admin/members/$id"
                params={{ id: m.id }}
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

function GymInfoAdmin({ setTab }: { setTab: (t: Tab) => void }) {
  const qc = useQueryClient();
  const { data: gym, isLoading } = useQuery({
    queryKey: ["gym"],
    queryFn: async () => (await supabase.from("gym_info").select("*").eq("id", 1).single()).data,
  });
  const [form, setForm] = useState<{ name: string; address: string; phone: string; instagram_url: string; whatsapp_number: string; maps_url: string; lat: string; lng: string }>({
    name: "", address: "", phone: "", instagram_url: "", whatsapp_number: "", maps_url: "", lat: "", lng: "",
  });
  const [hydrated, setHydrated] = useState(false);
  if (gym && !hydrated) {
    setHydrated(true);
    setForm({
      name: gym.name ?? "",
      address: gym.address ?? "",
      phone: gym.phone ?? "",
      instagram_url: (gym as any).instagram_url ?? "",
      whatsapp_number: (gym as any).whatsapp_number ?? "",
      maps_url: (gym as any).maps_url ?? "",
      lat: gym.lat != null ? String(gym.lat) : "",
      lng: gym.lng != null ? String(gym.lng) : "",
    });
  }
  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name || null,
        address: form.address || null,
        phone: form.phone || null,
        instagram_url: form.instagram_url || null,
        whatsapp_number: form.whatsapp_number || null,
        maps_url: form.maps_url || null,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
      };
      const { error } = await supabase.from("gym_info").update(payload).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Gym info updated"); qc.invalidateQueries({ queryKey: ["gym"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  const field = (label: string, key: keyof typeof form, placeholder?: string, type = "text") => (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border hairline bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );

  if (isLoading) return <p className="text-center text-xs text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <button
        onClick={() => setTab("dashboard")}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft size={16} /> Back to Dashboard
      </button>
      <div className="card-surface p-5">
        <h2 className="font-display text-xl">Gym Info</h2>
        <p className="mt-1 text-xs text-muted-foreground">Edits appear instantly on the members' Profile and Location pages.</p>
      </div>
      <div className="card-surface space-y-3 p-5">
        {field("Gym name", "name")}
        {field("Address", "address")}
        {field("Phone", "phone", "+962...")}
        {field("Instagram URL", "instagram_url", "https://instagram.com/...")}
        {field("WhatsApp number", "whatsapp_number", "+962...")}
        {field("Google Maps link", "maps_url", "https://maps.app.goo.gl/...")}
        <div className="grid grid-cols-2 gap-3">
          {field("Latitude", "lat", "31.95", "number")}
          {field("Longitude", "lng", "35.91", "number")}
        </div>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="w-full rounded-pill bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}



