import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/providers";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft, Minus, Plus, X, Mail, Phone, CalendarPlus } from "lucide-react";

export const Route = createFileRoute("/admin/members/$id")({
  ssr: false,
  component: MemberDetailPage,
});

function MemberDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: member } = useQuery({
    queryKey: ["admin-member", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("id, name, phone, membership_status, pt_sessions_remaining, group_subscription_until, streak, classes_attended, is_parent, created_at, children(id, name, group_subscription_until)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
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
      .select("id, classes, type, source, payment_method, description, created_at, child_id, children(name)")
      .eq("member_id", id)
      .order("created_at", { ascending: false })
      .limit(30)).data ?? [],
  });

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjChildId, setAdjChildId] = useState("");
  const [adjClasses, setAdjClasses] = useState(1);
  const [adjType, setAdjType] = useState<"credit" | "debit">("debit");
  const [adjNote, setAdjNote] = useState("");
  const [bookOpen, setBookOpen] = useState(false);

  const adjust = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transactions").insert({
        member_id: id,
        child_id: adjChildId || null,
        classes: adjClasses,
        type: adjType,
        source: "admin_adjustment",
        payment_method: adjType === "credit" ? "cash" : null,
        description: adjNote || (adjType === "debit" ? "Admin removed classes" : "Admin added classes"),
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Balance updated");
      setAdjustOpen(false); setAdjChildId(""); setAdjClasses(1); setAdjNote(""); setAdjType("debit");
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

  const kids = (member as any)?.children ?? [];
  const now = Date.now();
  const upcoming = bookings.filter((b: any) => b.status === "upcoming" && new Date(b.classes?.starts_at).getTime() >= now);
  const past = bookings.filter((b: any) => !(b.status === "upcoming" && new Date(b.classes?.starts_at).getTime() >= now));

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

      <main className="mx-auto max-w-3xl space-y-4 px-5 py-5 pb-[max(env(safe-area-inset-bottom),40px)]">
        {/* Overview */}
        <section className="card-surface p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="font-display text-3xl leading-none">{member?.pt_sessions_remaining ?? 0}</p><p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Classes left</p></div>
            <div><p className="font-display text-3xl leading-none">{member?.classes_attended ?? 0}</p><p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Attended</p></div>
            <div><p className="font-display text-3xl leading-none">{member?.streak ?? 0}</p><p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Streak</p></div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest">
            <span className={`rounded-pill px-2 py-0.5 font-semibold ${member?.membership_status === "active" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{member?.membership_status || "—"}</span>
            {member?.is_parent && <span className="rounded-pill bg-muted px-2 py-0.5 font-semibold">Parent</span>}
            {member?.phone && <span className="inline-flex items-center gap-1 text-muted-foreground normal-case tracking-normal"><Phone size={12}/>{member.phone}</span>}
          </div>
        </section>

        {/* Kids */}
        {kids.length > 0 && (
          <section className="card-surface p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Children</p>
            <ul className="mt-2 space-y-1">
              {kids.map((k: any) => (
                <li key={k.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 text-sm">
                  <span>{k.name}</span>
                  <span className="text-xs text-muted-foreground">{0} left</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Adjust classes */}
        <section className="card-surface p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg leading-none">Adjust classes</p>
            {!adjustOpen && (
              <button onClick={()=>setAdjustOpen(true)} className="rounded-pill bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">Add / Remove</button>
            )}
          </div>
          {adjustOpen && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={()=>setAdjType("credit")} className={`rounded-pill py-2 text-xs font-semibold ${adjType==="credit" ? "bg-primary text-primary-foreground" : "border hairline"}`}><Plus size={12} className="inline"/> Add</button>
                <button onClick={()=>setAdjType("debit")} className={`rounded-pill py-2 text-xs font-semibold ${adjType==="debit" ? "bg-destructive text-destructive-foreground" : "border hairline"}`}><Minus size={12} className="inline"/> Remove</button>
              </div>
              {kids.length > 0 && (
                <select value={adjChildId} onChange={(e)=>setAdjChildId(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm">
                  <option value="">Apply to {member?.name || "member"}</option>
                  {kids.map((k: any) => <option key={k.id} value={k.id}>Apply to {k.name}</option>)}
                </select>
              )}
              <input type="number" min={1} value={adjClasses} onChange={(e)=>setAdjClasses(Math.max(1, Number(e.target.value)))} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm" placeholder="# classes"/>
              {(() => {
                const available = adjChildId
                  ? (0)
                  : (member?.pt_sessions_remaining ?? 0);
                const overDraw = adjType === "debit" && adjClasses > available;
                return (
                  <>
                    {adjType === "debit" && (
                      <p className={`text-[11px] ${overDraw ? "text-destructive" : "text-muted-foreground"}`}>Only {available} available</p>
                    )}
                    <input placeholder="Note (optional)" value={adjNote} onChange={(e)=>setAdjNote(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
                    <div className="flex gap-2">
                      <button onClick={()=>adjust.mutate()} disabled={adjust.isPending || overDraw} className={`flex-1 rounded-pill py-2 text-xs font-semibold disabled:opacity-60 ${adjType==="credit" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
                        {adjType==="credit" ? "Add" : "Remove"} {adjClasses} {adjClasses===1 ? "class" : "classes"}
                      </button>
                      <button onClick={()=>setAdjustOpen(false)} className="rounded-pill border hairline px-3 py-2 text-xs font-semibold">Cancel</button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </section>

        {/* Book a class */}
        <section className="card-surface flex items-center justify-between p-4">
          <div>
            <p className="font-display text-lg leading-none">Book a class</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Book on behalf of {member?.name || "member"}{kids.length > 0 ? " or a child" : ""}</p>
          </div>
          <button onClick={()=>setBookOpen(true)} className="rounded-pill bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground inline-flex items-center gap-1">
            <CalendarPlus size={12}/> Book
          </button>
        </section>

        {/* Upcoming bookings */}
        <section>
          <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Upcoming bookings ({upcoming.length})</p>
          <div className="space-y-2">
            {upcoming.length === 0 && <p className="text-xs text-muted-foreground">No upcoming bookings</p>}
            {upcoming.map((b: any) => (
              <div key={b.id} className="card-surface flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-display text-base leading-none">{b.classes?.title || "Class"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{b.classes?.starts_at ? new Date(b.classes.starts_at).toLocaleString() : "—"}</p>
                  {b.child_id && <p className="mt-1 text-[10px] uppercase tracking-widest text-primary">For {b.children?.name || "child"}</p>}
                </div>
                <button onClick={()=>{ if (confirm("Cancel this booking? Credit will be refunded.")) cancelBooking.mutate(b.id); }} className="shrink-0 rounded-pill border hairline px-3 py-1.5 text-[11px] font-semibold text-destructive">
                  <X size={12} className="inline"/> Cancel
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Past bookings */}
        {past.length > 0 && (
          <section>
            <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">History</p>
            <div className="space-y-1">
              {past.slice(0, 20).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs">
                  <span className="truncate">{b.classes?.title || "Class"} {b.child_id && <span className="text-muted-foreground">· {b.children?.name}</span>}</span>
                  <span className="shrink-0 text-muted-foreground">{b.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Transactions */}
        <section>
          <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Class transactions</p>
          <div className="space-y-1">
            {txns.length === 0 && <p className="text-xs text-muted-foreground">No transactions yet</p>}
            {txns.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="truncate">
                    <span className={t.type === "credit" ? "text-primary font-semibold" : "text-destructive font-semibold"}>
                      {t.type === "credit" ? "+" : "−"}{t.classes}
                    </span>{" "}
                    <span className="text-muted-foreground">{t.source || t.type}</span>
                    {t.child_id && <span className="text-muted-foreground"> · {t.children?.name}</span>}
                  </p>
                  {t.description && <p className="truncate text-muted-foreground">{t.description}</p>}
                </div>
                <span className="shrink-0 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
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
  void selectedChild;
  const targetBalance = childId ? 0 : memberBalance;

  const noCredits = targetBalance <= 0;

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

        <div className="mb-3 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">{childId ? selectedChild?.name : memberName}</span>
          <span className={noCredits ? "font-semibold text-destructive" : "text-muted-foreground"}>
            {noCredits ? "No classes remaining" : `${targetBalance} classes left`}
          </span>
        </div>

        <div className="space-y-2">
          {isLoading && <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>}
          {!isLoading && dayClasses.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No classes this day</p>}
          {dayClasses
            .filter((c: any) => (childId ? true : c.type !== "kids"))
            .map((c: any) => {
              const activeCount = (c.bookings ?? []).filter((b: any) => b.status === "upcoming").length;
              const left = Math.max(0, (c.capacity ?? 0) - activeCount);
              const full = left === 0;
              const alreadyBooked = bookedClassIds.has(c.id);
              const disabled = noCredits || full || alreadyBooked || pendingId === c.id;
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
