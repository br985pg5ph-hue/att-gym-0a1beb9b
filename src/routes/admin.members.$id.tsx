import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/providers";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft, Minus, Plus, X, Phone, CalendarPlus, User, Dumbbell, Users, Calendar, CreditCard, Mail, Cake, Pause, Play, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getMemberEmail, deleteMemberByStaff } from "@/lib/account.functions";

export const Route = createFileRoute("/admin/members/$id")({
  ssr: false,
  component: MemberDetailPage,
});

function formatGroupStatus(until: string | null | undefined): string {
  if (!until) return "No group membership";
  const d = new Date(until);
  if (isNaN(d.getTime())) return "No group membership";
  if (d.getTime() <= Date.now()) return "Group expired";
  return `Active until ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function MemberDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: member } = useQuery({
    queryKey: ["admin-member", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("id, name, member_code, phone, membership_status, pt_sessions_remaining, group_subscription_until, group_track, group_subscription_started_at, streak, classes_attended, is_parent, created_at, date_of_birth, membership_paused_at, membership_pause_days_used, avatar_url, children(id, name, group_subscription_until, group_track, group_subscription_started_at, pt_sessions_remaining, avatar_url)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const fetchEmail = useServerFn(getMemberEmail);
  const { data: emailData } = useQuery({
    queryKey: ["admin-member-email", id],
    queryFn: () => fetchEmail({ data: { userId: id } }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-member-bookings", id],
    queryFn: async () => (await supabase.from("bookings")
      .select("id, status, created_at, child_id, children(name), classes(id, title, starts_at, type)")
      .eq("member_id", id)
      .order("created_at", { ascending: false })).data ?? [],
  });

  const { data: txns = [] } = useQuery({
    queryKey: ["admin-member-txns", id],
    queryFn: async () => (await supabase.from("transactions")
      .select("id, classes, days, service, type, source, payment_method, description, created_at, child_id, children(name)")
      .eq("member_id", id)
      .order("created_at", { ascending: false })
      .limit(30)).data ?? [],
  });

  const [activeTab, setActiveTab] = useState<"upcoming" | "history" | "transactions">("upcoming");
  const [groupOpen, setGroupOpen] = useState(false);
  const [ptOpen, setPtOpen] = useState(false);

  const [ptAdjSessions, setPtAdjSessions] = useState(1);
  const [ptAdjType, setPtAdjType] = useState<"credit" | "debit">("debit");
  const [ptAdjNote, setPtAdjNote] = useState("");
  const [ptAdjChildId, setPtAdjChildId] = useState("");

  const [grpAdjChildId, setGrpAdjChildId] = useState("");
  const [grpAdjDays, setGrpAdjDays] = useState(30);
  const [grpAdjType, setGrpAdjType] = useState<"credit" | "debit">("credit");
  const [grpAdjNote, setGrpAdjNote] = useState("");

  const [bookOpen, setBookOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const deleteFn = useServerFn(deleteMemberByStaff);
  const deleteMember = useMutation({
    mutationFn: async () => {
      await deleteFn({ data: { userId: id } });
    },
    onSuccess: () => {
      toast.success("Client account deleted");
      qc.invalidateQueries({ queryKey: ["admin-members"] });
      nav({ to: "/admin" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const adjustPT = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transactions").insert({
        member_id: id,
        child_id: ptAdjChildId || null,
        service: "pt",
        classes: ptAdjSessions,
        type: ptAdjType,
        source: "admin_adjustment",
        payment_method: ptAdjType === "credit" ? "cash" : null,
        description: ptAdjNote || (ptAdjType === "debit" ? "Admin removed PT sessions" : "Admin added PT sessions"),
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("PT sessions updated");
      setPtAdjSessions(1); setPtAdjNote(""); setPtAdjType("debit"); setPtAdjChildId(""); setPtOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-member", id] });
      qc.invalidateQueries({ queryKey: ["admin-member-txns", id] });
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const adjustGroup = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transactions").insert({
        member_id: id,
        child_id: grpAdjChildId || null,
        service: "group",
        classes: 0,
        days: grpAdjDays,
        type: grpAdjType,
        source: "admin_adjustment",
        payment_method: grpAdjType === "credit" ? "cash" : null,
        description: grpAdjNote || (grpAdjType === "debit" ? "Admin removed membership days" : "Admin added membership days"),
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Group membership updated");
      setGrpAdjChildId(""); setGrpAdjDays(30); setGrpAdjNote(""); setGrpAdjType("credit"); setGroupOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-member", id] });
      qc.invalidateQueries({ queryKey: ["admin-member-txns", id] });
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelBooking = useMutation({
    mutationFn: async (bid: string) => {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking cancelled — credit refunded");
      qc.invalidateQueries({ queryKey: ["admin-member-bookings", id] });
      qc.invalidateQueries({ queryKey: ["admin-member", id] });
      qc.invalidateQueries({ queryKey: ["admin-member-txns", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePause = useMutation({
    mutationFn: async (action: "pause" | "resume") => {
      const rpc = action === "pause" ? "pause_membership" : "resume_membership";
      const { error } = await (supabase as any).rpc(rpc, { target_user: id });
      if (error) throw error;
    },
    onSuccess: (_d, action) => {
      toast.success(action === "pause" ? "Membership paused" : "Membership resumed");
      qc.invalidateQueries({ queryKey: ["admin-member", id] });
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const kids = (member as any)?.children ?? [];
  const now = Date.now();
  const upcoming = bookings.filter((b: any) => b.status === "upcoming" && new Date(b.classes?.starts_at).getTime() >= now);
  const past = bookings.filter((b: any) => !(b.status === "upcoming" && new Date(b.classes?.starts_at).getTime() >= now));

  const activeStatus = member?.membership_status === "active";

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b hairline px-5 py-4 pt-[max(env(safe-area-inset-top),16px)]">
        <button onClick={()=>nav({ to: "/admin" })} className="rounded-pill border hairline p-2"><ArrowLeft size={16}/></button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Member</p>
          <h1 className="font-display text-2xl leading-none truncate">{member?.name || "—"}</h1>
        </div>
        <Logo size={32} />
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 pb-[max(env(safe-area-inset-bottom),40px)] md:px-6 lg:px-8">
        {/* Member header card */}
        <section className="card-surface p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
                {(member as any)?.avatar_url ? (
                  <img src={(member as any).avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User size={28} className="text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-display text-2xl leading-none">{member?.name || "—"}</h2>
                  <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${activeStatus ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {member?.membership_status || "—"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-mono text-muted-foreground">
                  Member ID: {(member as any)?.member_code || "—"}
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {member?.created_at && <span>Joined {new Date(member.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>}
                  {member?.is_parent && <span className="rounded-pill bg-muted px-2 py-0.5 text-[10px] font-semibold">Parent</span>}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {member?.phone && (
                    <a href={`tel:${member.phone}`} className="inline-flex items-center gap-1.5 rounded-pill bg-muted/30 px-3 py-1.5 text-xs text-foreground hover:bg-muted/50">
                      <Phone size={12} className="text-primary" />
                      <span>{member.phone}</span>
                    </a>
                  )}
                  {emailData?.email && (
                    <a href={`mailto:${emailData.email}`} className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-pill bg-muted/30 px-3 py-1.5 text-xs text-foreground hover:bg-muted/50">
                      <Mail size={12} className="text-primary" />
                      <span className="truncate">{emailData.email}</span>
                    </a>
                  )}
                  {(member as any)?.date_of_birth && (
                    <div className="inline-flex items-center gap-1.5 rounded-pill bg-muted/30 px-3 py-1.5 text-xs text-foreground">
                      <Cake size={12} className="text-primary" />
                      <span>{new Date((member as any).date_of_birth).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button onClick={()=>setBookOpen(true)} className="rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground inline-flex items-center gap-1.5">
                <CalendarPlus size={14}/> Book class
              </button>
              <button onClick={()=>{ setDeleteConfirmName(""); setDeleteOpen(true); }} className="rounded-pill border hairline px-4 py-2 text-xs font-semibold text-destructive inline-flex items-center gap-1.5 hover:bg-destructive/10">
                <Trash2 size={14}/> Delete account
              </button>
            </div>
          </div>
        </section>

        {/* Stats grid */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Dumbbell size={14}/>
              <p className="text-[10px] uppercase tracking-widest font-semibold">PT left</p>
            </div>
            <p className="mt-2 font-display text-3xl leading-none">{member?.pt_sessions_remaining ?? 0}</p>
          </div>
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={14}/>
              <p className="text-[10px] uppercase tracking-widest font-semibold">Attended</p>
            </div>
            <p className="mt-2 font-display text-3xl leading-none">{member?.classes_attended ?? 0}</p>
          </div>
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users size={14}/>
              <p className="text-[10px] uppercase tracking-widest font-semibold">Kids</p>
            </div>
            <p className="mt-2 font-display text-3xl leading-none">{kids.length}</p>
          </div>
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard size={14}/>
              <p className="text-[10px] uppercase tracking-widest font-semibold">Group</p>
            </div>
            <p className="mt-2 text-sm font-semibold leading-tight">{formatGroupStatus((member as any)?.group_subscription_until)}</p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-5 lg:col-span-2">
            {/* Kids */}
            {kids.length > 0 && (
              <section className="card-surface p-5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Children</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {kids.map((k: any) => (
                    <div key={k.id} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted">
                        <User size={16} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{k.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {k.pt_sessions_remaining ?? 0} PT · {formatGroupStatus(k.group_subscription_until)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Activity tabs */}
            <section className="card-surface overflow-hidden">
              <div className="border-b hairline px-5 pt-1">
                <nav className="flex gap-5" aria-label="Tabs">
                  {(["upcoming", "history", "transactions"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`relative py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {tab}
                      {tab === "upcoming" && <span className="ml-1.5 rounded-pill bg-primary/15 px-1.5 py-0.5 text-[9px] text-primary">{upcoming.length}</span>}
                      {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-5">
                {activeTab === "upcoming" && (
                  <div className="space-y-3">
                    {upcoming.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No upcoming bookings</p>}
                    {upcoming.map((b: any) => (
                      <div key={b.id} className="flex items-start justify-between gap-3 rounded-xl bg-muted/30 p-3">
                        <div className="min-w-0">
                          <p className="font-display text-base leading-none">{b.classes?.title || "Class"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(b.classes?.starts_at)}</p>
                          {b.child_id && <p className="mt-1 text-[10px] uppercase tracking-widest text-primary">For {b.children?.name || "child"}</p>}
                        </div>
                        <button onClick={()=>{ if (confirm("Cancel this booking? Credit will be refunded.")) cancelBooking.mutate(b.id); }} className="shrink-0 rounded-pill border hairline px-3 py-1.5 text-[11px] font-semibold text-destructive">
                          <X size={12} className="inline"/> Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "history" && (
                  <div className="space-y-2">
                    {past.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No history yet</p>}
                    {past.slice(0, 20).map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5 text-xs">
                        <div className="min-w-0">
                          <span className="font-medium">{b.classes?.title || "Class"}</span>
                          {b.child_id && <span className="text-muted-foreground"> · {b.children?.name}</span>}
                          <p className="mt-0.5 text-muted-foreground">{formatDateTime(b.classes?.starts_at)}</p>
                        </div>
                        <span className="shrink-0 rounded-pill bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">{b.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "transactions" && (
                  <div className="space-y-2">
                    {txns.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No transactions yet</p>}
                    {txns.map((t: any) => {
                      const isGroup = t.service === "group";
                      const amount = isGroup ? (t.days ?? 0) : (t.classes ?? 0);
                      const unit = isGroup
                        ? (amount === 1 ? "day" : "days")
                        : (amount === 1 ? "PT session" : "PT sessions");
                      return (
                        <div key={t.id} className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5 text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="truncate">
                              <span className={t.type === "credit" ? "text-primary font-semibold" : "text-destructive font-semibold"}>
                                {t.type === "credit" ? "+" : "−"}{amount} {unit}
                              </span>{" "}
                              <span className="text-muted-foreground">{t.source || t.type}</span>
                              {t.child_id && <span className="text-muted-foreground"> · {t.children?.name}</span>}
                            </p>
                            {t.description && <p className="truncate text-muted-foreground">{t.description}</p>}
                          </div>
                          <span className="shrink-0 pl-2 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right column: management controls */}
          <div className="space-y-5">
            {/* Pause membership */}
            {(() => {
              const m: any = member || {};
              const isPaused = !!m.membership_paused_at;
              const used = m.membership_pause_days_used ?? 0;
              const remaining = Math.max(0, 45 - used);
              const hasActive = m.group_subscription_until && new Date(m.group_subscription_until).getTime() > Date.now();
              const pausedSince = isPaused ? new Date(m.membership_paused_at) : null;
              const pausedDays = pausedSince ? Math.ceil((Date.now() - pausedSince.getTime()) / 86400000) : 0;
              return (
                <section className="card-surface p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg leading-none">Membership pause</h3>
                    {isPaused && <span className="rounded-pill bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Paused</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isPaused
                      ? `Paused for ${pausedDays} day${pausedDays===1?"":"s"} · ${remaining} of 45 days left`
                      : `${remaining} of 45 pause days remaining this cycle`}
                  </p>
                  {isPaused ? (
                    <button
                      onClick={()=>togglePause.mutate("resume")}
                      disabled={togglePause.isPending}
                      className="mt-4 w-full rounded-pill bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                      <Play size={12}/> Resume membership
                    </button>
                  ) : (
                    <button
                      onClick={()=>togglePause.mutate("pause")}
                      disabled={togglePause.isPending || !hasActive || remaining <= 0}
                      className="mt-4 w-full rounded-pill border hairline py-2.5 text-xs font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
                      <Pause size={12}/> Pause membership
                    </button>
                  )}
                  {!hasActive && !isPaused && <p className="mt-2 text-[11px] text-muted-foreground">No active group membership to pause.</p>}
                </section>
              );
            })()}

            {/* Group Membership */}
            {(() => {
              const until = member?.group_subscription_until ? new Date(member.group_subscription_until) : null;
              const isActive = !!until && until.getTime() > Date.now();
              const daysLeft = until ? Math.max(0, Math.ceil((until.getTime() - Date.now()) / 86400000)) : 0;
              return (
                <section className="card-surface overflow-hidden">
                  <div className="flex items-start justify-between gap-3 border-b hairline p-5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                        <Calendar size={18}/>
                      </div>
                      <div>
                        <h3 className="font-display text-lg leading-none">Group Membership</h3>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {isActive ? `${daysLeft} day${daysLeft===1?"":"s"} remaining` : until ? "Expired" : "Not active"}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-4xl leading-none">{isActive ? daysLeft : 0}</span>
                      <span className="text-xs text-muted-foreground">day{daysLeft===1?"":"s"} left</span>
                    </div>
                    {until && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {isActive ? "Until" : "Ended"} {until.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                    {!groupOpen ? (
                      <button onClick={()=>setGroupOpen(true)} className="mt-4 w-full rounded-pill bg-primary py-2.5 text-xs font-semibold text-primary-foreground inline-flex items-center justify-center gap-1.5">
                        <Plus size={12}/> Renew or adjust
                      </button>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={()=>setGrpAdjType("credit")} className={`rounded-pill py-2 text-xs font-semibold inline-flex items-center justify-center gap-1 ${grpAdjType==="credit" ? "bg-primary text-primary-foreground" : "border hairline"}`}><Plus size={12}/> Add days</button>
                          <button onClick={()=>setGrpAdjType("debit")} className={`rounded-pill py-2 text-xs font-semibold inline-flex items-center justify-center gap-1 ${grpAdjType==="debit" ? "bg-destructive text-destructive-foreground" : "border hairline"}`}><Minus size={12}/> Remove</button>
                        </div>
                        {kids.length > 0 && (
                          <select value={grpAdjChildId} onChange={(e)=>setGrpAdjChildId(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm">
                            <option value="">Apply to {member?.name || "member"}</option>
                            {kids.map((k: any) => <option key={k.id} value={k.id}>Apply to {k.name}</option>)}
                          </select>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          {[30, 90].map(d => (
                            <button key={d} onClick={()=>setGrpAdjDays(d)}
                              className={`rounded-pill py-2 text-[11px] font-semibold ${grpAdjDays===d ? "bg-primary text-primary-foreground" : "border hairline"}`}>
                              {d===30?"1 mo":"3 mo"}
                            </button>
                          ))}
                        </div>
                        <input type="number" min={1} value={grpAdjDays} onChange={(e)=>setGrpAdjDays(Math.max(1, Number(e.target.value)))} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm" placeholder="# days"/>
                        <input placeholder="Note (optional)" value={grpAdjNote} onChange={(e)=>setGrpAdjNote(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
                        <div className="flex gap-2">
                          <button onClick={()=>adjustGroup.mutate()} disabled={adjustGroup.isPending || grpAdjDays < 1} className={`flex-1 rounded-pill py-2 text-xs font-semibold disabled:opacity-60 ${grpAdjType==="credit" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
                            {grpAdjType==="credit" ? "Add" : "Remove"} {grpAdjDays} day{grpAdjDays===1?"":"s"}
                          </button>
                          <button onClick={()=>setGroupOpen(false)} className="rounded-pill border hairline px-3 py-2 text-xs font-semibold">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            })()}

            {/* Booking days (track) — for member and each child */}
            <TrackAdminPanel member={member} kids={kids} onChanged={()=>qc.invalidateQueries({ queryKey: ["admin-member", id] })} />

            {/* PT Sessions */}
            {(() => {
              const ptCount = member?.pt_sessions_remaining ?? 0;
              return (
                <section className="card-surface overflow-hidden">
                  <div className="flex items-start justify-between gap-3 border-b hairline p-5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                        <Dumbbell size={18}/>
                      </div>
                      <div>
                        <h3 className="font-display text-lg leading-none">PT Sessions</h3>
                        <p className="mt-1 text-[11px] text-muted-foreground">Private one-on-one credits</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${ptCount > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {ptCount > 0 ? "Available" : "None"}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-4xl leading-none">{ptCount}</span>
                      <span className="text-xs text-muted-foreground">session{ptCount===1?"":"s"} remaining</span>
                    </div>
                    {!ptOpen ? (
                      <button onClick={()=>setPtOpen(true)} className="mt-4 w-full rounded-pill bg-primary py-2.5 text-xs font-semibold text-primary-foreground inline-flex items-center justify-center gap-1.5">
                        <Plus size={12}/> Add or adjust
                      </button>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={()=>setPtAdjType("credit")} className={`rounded-pill py-2 text-xs font-semibold inline-flex items-center justify-center gap-1 ${ptAdjType==="credit" ? "bg-primary text-primary-foreground" : "border hairline"}`}><Plus size={12}/> Add</button>
                          <button onClick={()=>setPtAdjType("debit")} className={`rounded-pill py-2 text-xs font-semibold inline-flex items-center justify-center gap-1 ${ptAdjType==="debit" ? "bg-destructive text-destructive-foreground" : "border hairline"}`}><Minus size={12}/> Remove</button>
                        </div>
                        <input type="number" min={1} value={ptAdjSessions} onChange={(e)=>setPtAdjSessions(Math.max(1, Number(e.target.value)))} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm" placeholder="# PT sessions"/>
                        {kids.length > 0 && (
                          <select value={ptAdjChildId} onChange={(e)=>setPtAdjChildId(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm">
                            <option value="">Apply to {member?.name || "member"}</option>
                            {kids.map((k: any) => <option key={k.id} value={k.id}>Apply to {k.name}</option>)}
                          </select>
                        )}
                        {(() => {
                          const targetChild = kids.find((k: any) => k.id === ptAdjChildId);
                          const available = ptAdjChildId ? (targetChild?.pt_sessions_remaining ?? 0) : (member?.pt_sessions_remaining ?? 0);
                          const overDraw = ptAdjType === "debit" && ptAdjSessions > available;
                          return (
                            <>
                              {ptAdjType === "debit" && (
                                <p className={`text-[11px] ${overDraw ? "text-destructive" : "text-muted-foreground"}`}>Only {available} available</p>
                              )}
                              <input placeholder="Note (optional)" value={ptAdjNote} onChange={(e)=>setPtAdjNote(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
                              <div className="flex gap-2">
                                <button onClick={()=>adjustPT.mutate()} disabled={adjustPT.isPending || overDraw} className={`flex-1 rounded-pill py-2 text-xs font-semibold disabled:opacity-60 ${ptAdjType==="credit" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
                                  {ptAdjType==="credit" ? "Add" : "Remove"} {ptAdjSessions} PT
                                </button>
                                <button onClick={()=>setPtOpen(false)} className="rounded-pill border hairline px-3 py-2 text-xs font-semibold">Cancel</button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </section>
              );
            })()}

          </div>
        </div>
      </main>

      {bookOpen && member && (
        <BookClassModal
          memberId={id}
          memberName={member.name || "Member"}
          memberBalance={member.pt_sessions_remaining ?? 0}
          kids={kids}
          existingUpcoming={upcoming}
          onClose={()=>setBookOpen(false)}
          onBooked={()=>{
            setBookOpen(false);
            toast.success("Class booked");
            qc.invalidateQueries({ queryKey: ["admin-member", id] });
            qc.invalidateQueries({ queryKey: ["admin-member-bookings", id] });
            qc.invalidateQueries({ queryKey: ["admin-member-txns", id] });
            qc.invalidateQueries({ queryKey: ["admin-members"] });
          }}
        />
      )}
    </div>
  );
}

function BookClassModal({ memberId, memberName, memberBalance, kids, existingUpcoming, onClose, onBooked }: {
  memberId: string;
  memberName: string;
  memberBalance: number;
  kids: any[];
  existingUpcoming: any[];
  onClose: () => void;
  onBooked: () => void;
}) {
  const [childId, setChildId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pendingId, setPendingId] = useState<string | null>(null);

  const dayStart = new Date(`${date}T00:00:00`).toISOString();
  const dayEnd = new Date(new Date(`${date}T00:00:00`).getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data: dayClasses = [], isLoading } = useQuery({
    queryKey: ["admin-book-day", date],
    queryFn: async () => (await supabase.from("classes")
      .select("id, type, title, starts_at, capacity, coaches(name), bookings(id, status)")
      .gte("starts_at", dayStart)
      .lt("starts_at", dayEnd)
      .is("cancelled_at", null)
      .order("starts_at")).data ?? [],
  });

  const selectedChild = kids.find((k) => k.id === childId);
  const childPT = selectedChild?.pt_sessions_remaining ?? 0;

  const bookedClassIds = new Set(
    existingUpcoming
      .filter((b: any) => (childId ? b.child_id === childId : !b.child_id))
      .map((b: any) => b.classes?.id)
      .filter(Boolean)
  );

  const book = async (classId: string) => {
    setPendingId(classId);
    const { error } = await supabase.from("bookings").insert({
      member_id: memberId,
      class_id: classId,
      child_id: childId || null,
      status: "upcoming",
    });
    setPendingId(null);
    if (error) return toast.error(error.message);
    onBooked();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e)=>e.stopPropagation()} className="max-h-[90vh] w-full max-w-md overflow-auto rounded-t-3xl border-t hairline bg-background p-6 pb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Book a class</h2>
          <button onClick={onClose} className="text-sm text-muted-foreground">Close</button>
        </div>

        {kids.length > 0 && (
          <select value={childId} onChange={(e)=>setChildId(e.target.value)} className="mb-3 w-full rounded-xl border hairline bg-card px-3 py-2 text-sm">
            <option value="">Book for {memberName}</option>
            {kids.map((k: any) => <option key={k.id} value={k.id}>Book for {k.name}</option>)}
          </select>
        )}

        <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="mb-3 w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>

        <div className="mb-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{childId ? selectedChild?.name : memberName}</span>
          <span>{childId ? `${childPT} PT left` : `${memberBalance} PT left`}</span>
        </div>

        <div className="space-y-2">
          {isLoading && <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>}
          {!isLoading && dayClasses.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No classes this day</p>}
          {dayClasses
            .filter((c: any) => {
              if (childId) return c.type === "kids" || c.type === "pt";
              return c.type !== "kids";
            })
            .map((c: any) => {
              const activeCount = (c.bookings ?? []).filter((b: any) => b.status === "upcoming").length;
              const left = Math.max(0, (c.capacity ?? 0) - activeCount);
              const full = left === 0;
              const alreadyBooked = bookedClassIds.has(c.id);
              const isPT = c.type === "pt";
              const noCreditsForThis = isPT && (childId ? childPT <= 0 : memberBalance <= 0);
              const disabled = noCreditsForThis || full || alreadyBooked || pendingId === c.id;
              return (
                <div key={c.id} className="card-surface flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="font-display text-base leading-none truncate">{c.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(c.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {c.coaches?.name ? ` · ${c.coaches.name}` : ""}
                      {c.type === "kids" ? " · Kids" : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] uppercase tracking-widest ${full ? "text-destructive" : "text-muted-foreground"}`}>
                      {full ? "Full" : `${left} left`}
                    </span>
                    <button
                      onClick={()=>book(c.id)}
                      disabled={disabled}
                      className="rounded-pill bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {alreadyBooked ? "Booked" : pendingId === c.id ? "…" : "Book"}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

const TRACK_OPTIONS: { key: "sat_mon_wed" | "sun_tue_thu"; label: string; short: string }[] = [
  { key: "sat_mon_wed", label: "Sat · Mon · Wed", short: "SMW" },
  { key: "sun_tue_thu", label: "Sun · Tue · Thu", short: "STT" },
];

function trackLabel(t: string | null | undefined): string {
  return TRACK_OPTIONS.find((o) => o.key === t)?.label ?? "Not set";
}

function TrackAdminPanel({ member, kids, onChanged }: { member: any; kids: any[]; onChanged: () => void }) {
  const setTrack = useMutation({
    mutationFn: async (args: { targetUser: string; targetChild: string | null; track: string }) => {
      const { error } = await (supabase as any).rpc("set_group_track", {
        target_user: args.targetUser,
        target_child: args.targetChild,
        track: args.track,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Booking days updated"); onChanged(); },
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });

  if (!member) return null;

  const Row = ({ label, current, onPick }: { label: string; current: string | null; onPick: (t: string) => void }) => (
    <div className="rounded-xl border hairline p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{label}</p>
        <span className="rounded-pill bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {trackLabel(current)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {TRACK_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => onPick(o.key)}
            disabled={setTrack.isPending}
            className={`rounded-pill py-2 text-[11px] font-semibold ${current === o.key ? "bg-primary text-primary-foreground" : "border hairline"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <section className="card-surface p-5">
      <h3 className="font-display text-lg leading-none">Booking days</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">Mixed / Women Only / Kids classes can only be booked on chosen days. Max 12 per month.</p>
      <div className="mt-3 space-y-2">
        <Row
          label={member.name || "Member"}
          current={member.group_track ?? null}
          onPick={(track) => setTrack.mutate({ targetUser: member.id, targetChild: null, track })}
        />
        {kids.map((k: any) => (
          <Row
            key={k.id}
            label={k.name}
            current={k.group_track ?? null}
            onPick={(track) => setTrack.mutate({ targetUser: member.id, targetChild: k.id, track })}
          />
        ))}
      </div>
    </section>
  );
}
