import { createFileRoute, redirect, useNavigate, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { useAuth, useLang } from "@/lib/providers";
import { ammanNow, toAmmanDateInput, toAmmanDateKey, fromAmmanDateInput, addAmmanDays, formatAmmanDateTime } from "@/lib/time";
import { useServerFn } from "@tanstack/react-start";
import { getAdminDashboardStats } from "@/lib/dashboard.functions";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronRight, ChevronLeft, LogOut, Megaphone, CalendarDays, Users, UserCog, ChevronsRight, LayoutDashboard, Flag, ArrowUpDown, Settings } from "lucide-react";


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
    { key: "coaches", label: t.manageCoaches, icon: UserCog },
    { key: "members", label: t.membersList, icon: Users },
    { key: "settings", label: "Gym Info", icon: Settings },
  ];
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-3 border-b hairline px-5 py-4 pt-[max(env(safe-area-inset-top),16px)]">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size={36} />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">ATT Academy</p>
            <h1 className="font-display text-2xl leading-none">{t.admin}</h1>
          </div>
        </div>
        <button onClick={signOut} className="flex items-center gap-1.5 rounded-pill border hairline px-3 py-1.5 text-xs font-semibold text-destructive">
          <LogOut size={14} /> {t.signOut}
        </button>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-5 pb-[max(env(safe-area-inset-bottom),96px)]">
        {tab === "dashboard" && <DashboardAdmin setTab={setTab} />}
        {tab === "announcements" && <AnnouncementsAdmin />}
        {tab === "classes" && <ClassesAdmin />}
        {tab === "coaches" && <CoachesAdmin />}
        {tab === "members" && <MembersAdmin />}
        {tab === "settings" && <GymInfoAdmin />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-background pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        <ul className="grid grid-cols-6 items-center px-1">

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

  return (
    <div className="space-y-4">
      <div className="card-surface p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{t.todaySnapshot}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {toAmmanDateInput(ammanNow()).slice(0, 10)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border hairline bg-card p-3">
            <p className="font-display text-3xl leading-none">{stats?.todayClasses.length ?? 0}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t.classesToday}</p>
          </div>
          <div className="rounded-2xl border hairline bg-card p-3">
            <p className="font-display text-3xl leading-none">{totalBookedToday}{totalCapacityToday > 0 ? `/${totalCapacityToday}` : ""}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t.bookingsToday}</p>
          </div>
          <div className="rounded-2xl border hairline bg-card p-3">
            <p className="font-display text-3xl leading-none">{stats?.activeGroupMembers ?? 0}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t.activeGroupMembers}</p>
          </div>
          <div className="rounded-2xl border hairline bg-card p-3">
            <p className="font-display text-3xl leading-none">{stats?.ptSessionsOnBooks ?? 0}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t.ptSessionsOnBooks}</p>
          </div>
        </div>
      </div>

      <div className="card-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{t.classesToday}</p>
          <button onClick={() => setTab("classes")} className="text-[10px] font-semibold text-primary">{t.viewAll}</button>
        </div>
        {(stats?.todayClasses.length ?? 0) === 0 ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">{t.noClassesToday}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {stats?.todayClasses.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border hairline bg-card px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{c.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatTime(c.starts_at)} • {c.coach_name || t.coach} • {c.type}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${c.full ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                    {c.booked}/{c.capacity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-surface p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t.newSignups}</p>
          <p className="mt-1 font-display text-2xl leading-none">{stats?.newSignupsThisWeek ?? 0}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">this week</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t.expiringSoon}</p>
          <p className="mt-1 font-display text-2xl leading-none">{stats?.expiringSoonCount ?? 0}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">next 7 days</p>
        </div>
      </div>

      {(stats?.expiringSoonList.length ?? 0) > 0 && (
        <div className="card-surface p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-destructive">{t.expiringSoon}</p>
          <div className="mt-3 space-y-2">
            {stats?.expiringSoonList.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl border hairline bg-card px-3 py-2">
                <p className="text-sm font-semibold">{m.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(m.group_subscription_until)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-surface p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{t.recentTransactions}</p>
        {(stats?.recentTransactions.length ?? 0) === 0 ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">No recent transactions</p>
        ) : (
          <div className="mt-3 space-y-2">
            {stats?.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-xl border hairline bg-card px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{tx.member_name}{tx.child_name ? ` • ${tx.child_name}` : ""}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {tx.type} {tx.service}{tx.classes ? ` • ${tx.classes} sessions` : ""}{tx.days ? ` • ${tx.days} days` : ""}
                  </p>
                </div>
                <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${tx.type === "credit" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                  {tx.type}
                </span>
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
type ClassType = "pt"|"women_only"|"mixed"|"kids"|"yoga"|"gymnastics";

function ClassesAdmin() {
  const qc = useQueryClient();
  const [type, setType] = useState<ClassType>("mixed");
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
  const [editForm, setEditForm] = useState<{ title: string; starts_at: string; capacity: number; coach_id: string; type: ClassType }>({ title: "", starts_at: "", capacity: 15, coach_id: "", type: "mixed" });

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
          <select value={type} onChange={(e)=>setType(e.target.value as any)} className="rounded-xl border hairline bg-card px-3 py-2 text-sm">
            <option value="mixed">Mixed</option><option value="women_only">Women Only</option><option value="yoga">Yoga</option><option value="gymnastics">Gymnastics</option><option value="pt">PT</option><option value="kids">Kids</option>
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
          <div className="card-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => changeMonth(-1)} aria-label="Previous month" className="rounded-pill hairline border p-1.5">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="font-display text-sm tracking-wide">{first.toLocaleString([], { month: "long", year: "numeric" })}</p>
              <button onClick={() => changeMonth(1)} aria-label="Next month" className="rounded-pill hairline border p-1.5">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
              {["S","M","T","W","T","F","S"].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (!d) return <div key={i} />;
                const key = toAmmanDateKey(d);
                const hasClass = daysWithClasses.has(key);
                const active = key === selectedDate;
                const isToday = key === todayKey;
                return (
                  <button key={i} onClick={() => setSelectedDate(key)}
                    className={`relative aspect-square rounded-lg text-sm transition ${
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
                    {formatAmmanDateTime(c.starts_at)} • {c.coaches?.name || "—"} • <span className="uppercase">{c.type}</span>
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
              <select value={editForm.type} onChange={(e)=>setEditForm(f=>({...f, type: e.target.value as ClassType}))} className="rounded-xl border hairline bg-card px-3 py-2 text-sm">
                <option value="mixed">Mixed</option><option value="women_only">Women Only</option><option value="yoga">Yoga</option><option value="gymnastics">Gymnastics</option><option value="pt">PT</option><option value="kids">Kids</option>
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addFor, setAddFor] = useState<string | null>(null);
  const [addKind, setAddKind] = useState<"group" | "pt">("group");
  const [childId, setChildId] = useState<string>("");
  const [days, setDays] = useState<number>(30);
  const [sessions, setSessions] = useState<number>(10);
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [note, setNote] = useState("");
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

  const resetForm = () => {
    setAddFor(null); setChildId(""); setDays(30); setSessions(10); setMethod("cash"); setNote("");
  };

  const addGroup = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("transactions").insert({
        member_id: memberId,
        child_id: childId || null,
        service: "group",
        type: "credit",
        days,
        classes: 0,
        payment_method: method,
        description: note || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Group membership renewed");
      resetForm();
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addPT = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("transactions").insert({
        member_id: memberId,
        child_id: childId || null,
        service: "pt",
        type: "credit",
        classes: sessions,
        payment_method: method,
        description: note || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("PT sessions added");
      resetForm();
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (e: any) => toast.error(e.message),
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
        const isOpen = !!expanded[m.id];
        const isAdding = addFor === m.id;
        const expiryDays = daysUntilGroupExpiry(m.group_subscription_until);
        const showFlag = expiryDays !== null && expiryDays <= 3;
        return (
          <div key={m.id} className="card-surface p-4">
            <div className="flex w-full items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => hasKids && setExpanded(s => ({ ...s, [m.id]: !s[m.id] }))}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
              >
                <div className="shrink-0 h-11 w-11 rounded-full overflow-hidden bg-muted flex items-center justify-center hairline border">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={m.name || "member"} className="h-full w-full object-cover" />
                  ) : (
                    <User size={18} className="text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg leading-tight truncate">{m.name || "—"}</p>
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
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                    {m.role} • {m.membership_status}
                  </p>
                  {hasKids && (
                    <span className="mt-2 inline-flex items-center rounded-pill bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                      {kids.length} {kids.length === 1 ? "child" : "children"}
                    </span>
                  )}
                </div>
                {hasKids && (
                  <span className="mt-1 shrink-0 text-muted-foreground">
                    {isOpen ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                  </span>
                )}
              </button>
              <Link
                to="/admin/members/$id"
                params={{ id: m.id }}
                className="shrink-0 rounded-pill border hairline px-3 py-1.5 text-[11px] font-semibold text-primary"
              >
                View <ChevronsRight size={12} className="inline"/>
              </Link>
            </div>

            {hasKids && isOpen && (
              <ul className="mt-3 space-y-1">
                {kids.map((k: any) => (
                  <li key={k.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 text-xs">
                    <span>{k.name}</span>
                    <span className="text-muted-foreground">{k.pt_sessions_remaining ?? 0} PT • {formatGroupStatus(k.group_subscription_until)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              {!isAdding ? (
                <button
                  onClick={() => { setAddFor(m.id); setAddKind("group"); setChildId(""); setDays(30); }}
                  className="rounded-pill bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                >
                  <Plus size={12} className="inline"/> Renew or Add
                </button>
              ) : (
                <div className="space-y-2 rounded-xl border hairline p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={()=>setAddKind("group")}
                      className={`rounded-pill py-1.5 text-[11px] font-semibold ${addKind==="group" ? "bg-primary text-primary-foreground" : "border hairline"}`}
                    >Group membership</button>
                    <button
                      onClick={()=>setAddKind("pt")}
                      className={`rounded-pill py-1.5 text-[11px] font-semibold ${addKind==="pt" ? "bg-primary text-primary-foreground" : "border hairline"}`}
                    >PT sessions</button>
                  </div>

                  {hasKids && (
                    <select
                      value={childId}
                      onChange={(e)=>setChildId(e.target.value)}
                      className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"
                    >
                      <option value="">Apply to {m.name || "member"}</option>
                      {kids.map((k: any) => <option key={k.id} value={k.id}>Apply to {k.name}</option>)}
                    </select>
                  )}

                  {addKind === "group" ? (
                    <>
                      <div className="flex gap-2">
                        {[30, 90, 365].map(d => (
                          <button
                            key={d}
                            onClick={()=>setDays(d)}
                            className={`flex-1 rounded-pill py-1.5 text-[11px] font-semibold ${days===d ? "bg-primary text-primary-foreground" : "border hairline"}`}
                          >{d===30?"1 month":d===90?"3 months":"12 months"}</button>
                        ))}
                      </div>
                      <input
                        type="number" min={1} value={days}
                        onChange={(e)=>setDays(Math.max(1, Number(e.target.value)))}
                        className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"
                        placeholder="# days"
                      />
                    </>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        {[10, 20].map(n => (
                          <button
                            key={n}
                            onClick={()=>setSessions(n)}
                            className={`flex-1 rounded-pill py-1.5 text-[11px] font-semibold ${sessions===n ? "bg-primary text-primary-foreground" : "border hairline"}`}
                          >{n} sessions</button>
                        ))}
                      </div>
                      <input
                        type="number" min={1} value={sessions}
                        onChange={(e)=>setSessions(Math.max(1, Number(e.target.value)))}
                        className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"
                        placeholder="# PT sessions"
                      />
                    </>
                  )}

                  <select
                    value={method} onChange={(e)=>setMethod(e.target.value as "cash"|"card")}
                    className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Cliq</option>
                  </select>
                  <input
                    placeholder="Note (optional)"
                    value={note} onChange={(e)=>setNote(e.target.value)}
                    className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    {addKind === "group" ? (
                      <button
                        onClick={()=>addGroup.mutate(m.id)}
                        disabled={addGroup.isPending || days < 1}
                        className="flex-1 rounded-pill bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                      >
                        Add {days} days
                      </button>
                    ) : (
                      <button
                        onClick={()=>addPT.mutate(m.id)}
                        disabled={addPT.isPending || sessions < 1}
                        className="flex-1 rounded-pill bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                      >
                        Add {sessions} PT {sessions===1?"session":"sessions"}
                      </button>
                    )}
                    <button
                      onClick={resetForm}
                      className="rounded-pill border hairline px-3 py-2 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GymInfoAdmin() {
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



