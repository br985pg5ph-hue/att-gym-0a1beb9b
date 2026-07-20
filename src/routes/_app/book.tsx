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

function fmtDay(d: Date) { return d.toISOString().slice(0, 10); }

function BookPage() {
  const { t } = useLang();
  const { user, profile } = useAuth();
  const { selectedChild } = useChildren();
  const parentMode = !!profile?.is_parent;
  const bookingForChild = parentMode && selectedChild ? selectedChild : null;
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(fmtDay(new Date()));
  const [filter, setFilter] = useState<string>(bookingForChild ? "kids" : "all");
  const [pickedId, setPickedId] = useState<string | null>(null);

  // Month grid (declared here so month-scoped queries can use it)
  const today = new Date();
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

  const effectiveFilter = bookingForChild ? "kids" : filter;
  const remaining = bookingForChild ? (bookingForChild.classes_remaining ?? 0) : (profile?.classes_remaining ?? 0);
  const noCredits = remaining <= 0;

  const daySlots = classes.filter((c: any) => c.starts_at.slice(0, 10) === selectedDate && (effectiveFilter === "all" || c.type === effectiveFilter));

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
              const isToday = key === fmtDay(new Date());
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
            {TYPES.map((tp) => (
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


        {remaining <= 0 && (
          <div className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-xs font-medium text-destructive">
            {bookingForChild
              ? `${bookingForChild.name} has no classes remaining`
              : "No classes remaining — visit the gym to add more"}
          </div>
        )}

        <div className="mt-2 space-y-2">
          {daySlots.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No classes this day</p>}
          {daySlots.map((c: any) => {
            const cnt = counts[c.id] ?? 0;
            const full = cnt >= c.capacity;
            const booked = bookedClassIds.has(c.id);
            const picked = pickedId === c.id;
            const disabled = full || booked || noCredits;
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
        <button
          disabled={noCredits || !pickedId || book.isPending}
          onClick={() => pickedId && book.mutate(pickedId)}
          className="w-full rounded-pill bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {book.isPending ? "…" : noCredits ? "No classes left" : pickedId ? t.confirmBooking : t.selectSlot}
        </button>
      </div>
    </div>
  );
}
