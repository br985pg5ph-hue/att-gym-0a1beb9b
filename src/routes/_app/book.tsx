import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useAuth, useLang, useChildren } from "@/lib/providers";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/book")({
  component: BookPage,
});


const TYPES = [
  { key: "all", labelKey: "all" as const },
  { key: "pt", labelKey: "pt" as const },
  { key: "women_only", labelKey: "womenOnly" as const },
  { key: "mixed", labelKey: "mixed" as const },
  { key: "kids", labelKey: "kids" as const },
];

const AMMAN_TZ = "Asia/Amman";
function fmtDay(d: Date) {
  // Format YYYY-MM-DD in Amman local time, regardless of the device's timezone.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AMMAN_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${day}`;
}
function ammanNow(): Date {
  // A Date whose local getters (year/month/date) reflect Amman wall-clock time.
  return new Date(new Date().toLocaleString("en-US", { timeZone: AMMAN_TZ }));
}

function BookPage() {
  const { t } = useLang();
  const { user, profile, refresh } = useAuth();
  const { selectedChild, refreshChildren } = useChildren();
  const parentMode = !!profile?.is_parent;
  const bookingForChild = parentMode && selectedChild ? selectedChild : null;
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(fmtDay(new Date()));
  const [filter, setFilter] = useState<string>(bookingForChild ? "kids" : "all");
  const [pickedId, setPickedId] = useState<string | null>(null);

  // Month grid (declared here so month-scoped queries can use it) — anchored to Amman time
  const today = ammanNow();
  const todayKey = fmtDay(new Date());
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [viewedMonth, setViewedMonth] = useState<Date>(currentMonthStart);
  const y = viewedMonth.getFullYear();
  const m = viewedMonth.getMonth();

  const isCurrentMonth = y === today.getFullYear() && m === today.getMonth();
  const monthStartIso = isCurrentMonth
    ? new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    : new Date(y, m, 1).toISOString();
  const nextMonthStartIso = new Date(y, m + 1, 1).toISOString();

  const { data: classes = [] } = useQuery({
    queryKey: ["classes", y, m],
    queryFn: async () => {
      const { data } = await supabase.from("classes")
        .select("id, type, title, starts_at, duration_min, capacity, coaches(name)")
        .gte("starts_at", monthStartIso)
        .lt("starts_at", nextMonthStartIso)
        .is("cancelled_at", null)
        .order("starts_at");
      return data ?? [];
    },
  });

  const { data: myBookings = [] } = useQuery({
    queryKey: ["my-bookings", user?.id, bookingForChild?.id ?? "self"],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("bookings").select("id, class_id, status, child_id").eq("member_id", user!.id);
      if (bookingForChild) q = q.eq("child_id", bookingForChild.id);
      else q = q.is("child_id", null);
      return (await q).data ?? [];
    },
  });

  const classIds = classes.map((c: any) => c.id);
  const { data: counts = {} } = useQuery({
    queryKey: ["class-counts", y, m, classIds.length],
    enabled: classIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("bookings")
        .select("class_id, status")
        .eq("status", "upcoming")
        .in("class_id", classIds);
      const map: Record<string, number> = {};
      (data ?? []).forEach((b: any) => { map[b.class_id] = (map[b.class_id] ?? 0) + 1; });
      return map;
    },
  });


  const bookedClassIds = new Set(myBookings.filter((b: any) => b.status === "upcoming").map((b: any) => b.class_id));
  const daysWithBookings = new Set(
    myBookings.filter((b: any) => b.status === "upcoming")
      .map((b: any) => classes.find((c: any) => c.id === b.class_id))
      .filter(Boolean).map((c: any) => c.starts_at.slice(0, 10))
  );

  const effectiveFilter = bookingForChild ? "kids" : (filter === "kids" ? "all" : filter);
  const ptRemaining = profile?.pt_sessions_remaining ?? 0;
  const groupActiveSelf = !!profile?.group_subscription_until && new Date(profile.group_subscription_until).getTime() > Date.now();
  const groupActiveChild = !!bookingForChild?.group_subscription_until && new Date(bookingForChild!.group_subscription_until!).getTime() > Date.now();

  const isEligible = (type: string) => {
    if (type === "kids") return groupActiveChild;
    if (type === "pt") return !bookingForChild && ptRemaining > 0;
    // mixed / women_only
    return !bookingForChild && groupActiveSelf;
  };

  const eligibilityMessage = (type: string): string => {
    if (type === "kids") return `${bookingForChild?.name ?? "Child"}'s group membership isn't active`;
    if (type === "pt") return "No PT sessions remaining";
    return "Your group membership isn't active";
  };

  const daySlots = classes.filter((c: any) => {
    if (c.starts_at.slice(0, 10) !== selectedDate) return false;
    if (!bookingForChild && c.type === "kids") return false;
    return effectiveFilter === "all" || c.type === effectiveFilter;
  });

  const pickedClass = pickedId ? (daySlots.find((c: any) => c.id === pickedId) as any) : null;

  const book = useMutation({
    mutationFn: async (classId: string) => {
      const payload: any = { member_id: user!.id, class_id: classId, status: "upcoming" };
      if (bookingForChild) payload.child_id = bookingForChild.id;
      const { error } = await supabase.from("bookings").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bookingForChild ? `Booked for ${bookingForChild.name}!` : "Booked!");
      setPickedId(null);
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["all-bookings"] });
      qc.invalidateQueries({ queryKey: ["class-counts"] });
      qc.invalidateQueries({ queryKey: ["next-booking"] });
      qc.invalidateQueries({ queryKey: ["txns"] });
      refresh();
      refreshChildren();
    },

    onError: (e: any) => toast.error(e.message ?? "Booking failed"),
  });

  // Month grid derived values
  const first = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));

  const changeMonth = (delta: number) => {
    const next = new Date(y, m + delta, 1);
    setViewedMonth(next);
    const sel = new Date(selectedDate);
    if (sel.getFullYear() !== next.getFullYear() || sel.getMonth() !== next.getMonth()) {
      setSelectedDate(fmtDay(next));
    }
  };

  return (
    <div>
        <PageHeader
          title={t.book}
          subtitle={bookingForChild ? `Booking for ${bookingForChild.name}` : undefined}
          right={<ChildSwitcher />}
        />


      <div className="px-5">
        <div className="card-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => changeMonth(-1)}
              disabled={isCurrentMonth}
              aria-label="Previous month"
              className="rounded-pill hairline border p-1.5 disabled:invisible"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="font-display text-sm tracking-wide">
              {first.toLocaleString([], { month: "long", year: "numeric" })}
            </p>
            <button
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              className="rounded-pill hairline border p-1.5"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
            {["S","M","T","W","T","F","S"].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const key = fmtDay(d);
              const hasBooking = daysWithBookings.has(key);
              const active = key === selectedDate;
              const isToday = key === todayKey;
              return (
                <button key={i} onClick={() => setSelectedDate(key)}
                  className={`relative aspect-square rounded-lg text-sm transition ${
                    active ? "bg-primary text-primary-foreground font-semibold" :
                    isToday ? "border hairline" : "hover:bg-muted"
                  }`}>
                  {d.getDate()}
                  {hasBooking && !active && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {!bookingForChild && (
          <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {TYPES.filter((tp) => tp.key !== "kids").map((tp) => (
              <button key={tp.key} onClick={() => setFilter(tp.key)}
                className={`shrink-0 rounded-pill border px-3 py-1.5 text-xs font-medium transition ${
                  filter === tp.key ? "border-primary bg-primary text-primary-foreground" : "hairline bg-card"
                }`}>
                {t[tp.labelKey]}
              </button>
            ))}
          </div>
        )}
        {bookingForChild && (
          <p className="mt-3 rounded-pill bg-primary/10 px-3 py-2 text-center text-[11px] font-medium text-primary">
            Showing Kids classes only
          </p>
        )}


        {(() => {
          const warnings: string[] = [];
          if (bookingForChild) {
            if (!groupActiveChild) warnings.push(`${bookingForChild.name}'s group membership isn't active — renew at the gym`);
          } else {
            if (!groupActiveSelf) warnings.push("Your group membership isn't active — renew at the gym to book group classes");
            if (ptRemaining <= 0) warnings.push("No PT sessions remaining — visit the gym to add more");
          }
          if (warnings.length === 0) return null;
          return (
            <div className="mt-3 space-y-2">
              {warnings.map((w, i) => (
                <div key={i} className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-xs font-medium text-destructive">
                  {w}
                </div>
              ))}
            </div>
          );
        })()}

        <div className="mt-2 space-y-2">
          {daySlots.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No classes this day</p>}
          {daySlots.map((c: any) => {
            const cnt = counts[c.id] ?? 0;
            const full = cnt >= c.capacity;
            const booked = bookedClassIds.has(c.id);
            const picked = pickedId === c.id;
            const eligible = isEligible(c.type);
            const disabled = full || booked || !eligible;
            return (
              <button key={c.id} onClick={() => !disabled && setPickedId(picked ? null : c.id)}
                className={`card-surface flex w-full items-center justify-between p-4 text-start transition ${
                  picked ? "border-primary ring-1 ring-primary" : ""
                } ${disabled ? "opacity-60" : ""}`}>
                <div className="min-w-0">
                  <p className="font-display text-lg leading-none">{c.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(c.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {c.coaches?.name && ` • ${c.coaches.name}`}
                  </p>
                  {!eligible && !booked && !full && (
                    <p className="mt-1 text-[10px] font-medium text-destructive">{eligibilityMessage(c.type)}</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-pill px-3 py-1 text-[10px] font-semibold uppercase ${
                  booked ? "bg-silver/20 text-silver" : full ? "bg-destructive/20 text-destructive" : "bg-primary/15 text-primary"
                }`}>
                  {booked ? t.booked : full ? t.full : `${c.capacity - cnt} ${t.slotsLeft}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-md px-5">
        {(() => {
          const pickedIneligible = pickedClass && !isEligible(pickedClass.type);
          const disabled = !pickedId || pickedIneligible || book.isPending;
          const label = book.isPending
            ? "…"
            : !pickedId
              ? t.selectSlot
              : pickedIneligible
                ? eligibilityMessage(pickedClass.type)
                : t.confirmBooking;
          return (
            <button
              disabled={disabled}
              onClick={() => pickedId && !pickedIneligible && book.mutate(pickedId)}
              className="w-full rounded-pill bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {label}
            </button>
          );
        })()}
      </div>
    </div>
  );
}
