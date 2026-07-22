import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useAuth, useLang, useChildren } from "@/lib/providers";
import { ammanNow, toAmmanDateKey } from "@/lib/time";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/book")({
  component: BookPage,
});


const TYPES = [
  { key: "all", labelKey: "all" as const },
  { key: "pt", labelKey: "pt" as const },
  { key: "women_only", labelKey: "womenOnly" as const },
  { key: "mixed", labelKey: "mixed" as const },
  { key: "yoga", labelKey: "yoga" as const },
  { key: "gymnastics", labelKey: "gymnastics" as const },
  { key: "kids", labelKey: "kids" as const },
];


function BookPage() {
  const { t } = useLang();
  const { user, profile, refresh } = useAuth();
  const { selectedChild, refreshChildren } = useChildren();
  const parentMode = !!profile?.is_parent;
  const bookingForChild = parentMode && selectedChild ? selectedChild : null;
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(toAmmanDateKey(new Date()));
  const [filter, setFilter] = useState<string>("all");
  const [pickedId, setPickedId] = useState<string | null>(null);

  // Month grid (declared here so month-scoped queries can use it) — anchored to Amman time
  const today = ammanNow();
  const todayKey = toAmmanDateKey(new Date());
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
  const daysWithClasses = new Set(classes.map((c: any) => c.starts_at.slice(0, 10)));

  // Adult sees all; child sees only kids + pt
  const memberGender = (profile as any)?.gender ?? null;
  const isFemale = memberGender === "female";
  const FEMALE_ONLY = new Set(["women_only", "yoga", "gymnastics"]);
  const effectiveFilter = bookingForChild ? (filter === "pt" ? "pt" : filter === "kids" ? "kids" : "all") : (filter === "kids" ? "all" : filter);
  const ptRemainingSelf = profile?.pt_sessions_remaining ?? 0;
  const ptRemainingChild = (bookingForChild as any)?.pt_sessions_remaining ?? 0;
  const selfPaused = !!(profile as any)?.membership_paused_at;
  const groupActiveSelf = !selfPaused && !!profile?.group_subscription_until && new Date(profile.group_subscription_until).getTime() > Date.now();
  const groupActiveChild = !!bookingForChild?.group_subscription_until && new Date(bookingForChild!.group_subscription_until!).getTime() > Date.now();

  const trackSelf = (profile as any)?.group_track ?? null;
  const trackChild = (bookingForChild as any)?.group_track ?? null;
  const effectiveTrack = bookingForChild ? trackChild : trackSelf;
  const TRACK_DOWS: Record<string, number[]> = { sat_mon_wed: [6,1,3], sun_tue_thu: [0,2,4] };
  const isOnTrack = (starts_at: string): boolean => {
    if (!effectiveTrack) return false;
    const dow = new Date(new Date(starts_at).toLocaleString("en-US", { timeZone: "Asia/Amman" })).getDay();
    return (TRACK_DOWS[effectiveTrack] ?? []).includes(dow);
  };
  const TRACK_RESTRICTED = new Set(["mixed", "women_only", "kids"]);

  const isEligible = (type: string, starts_at?: string) => {
    if (type === "kids") {
      if (!groupActiveChild) return false;
      if (starts_at && !isOnTrack(starts_at)) return false;
      return true;
    }
    if (type === "pt") return bookingForChild ? ptRemainingChild > 0 : ptRemainingSelf > 0;
    // mixed / women_only / yoga / gymnastics — adult group only
    if (bookingForChild || !groupActiveSelf) return false;
    if (FEMALE_ONLY.has(type) && !isFemale) return false;
    if (TRACK_RESTRICTED.has(type) && starts_at && !isOnTrack(starts_at)) return false;
    return true;
  };

  const eligibilityMessage = (type: string, starts_at?: string): string => {
    if (type === "kids") {
      if (!groupActiveChild) return `${bookingForChild?.name ?? "Child"}'s group membership isn't active`;
      if (!effectiveTrack) return "Pick booking days first";
      if (starts_at && !isOnTrack(starts_at)) return "Not on your booking days";
      return "";
    }
    if (type === "pt") return bookingForChild ? `${bookingForChild.name} has no PT sessions` : "No PT sessions remaining";
    if (FEMALE_ONLY.has(type) && !isFemale) {
      return memberGender === null ? "Set your gender in Profile to book" : "Female members only";
    }
    if (selfPaused) return "Membership paused";
    if (!groupActiveSelf) return "Your group membership isn't active";
    if (TRACK_RESTRICTED.has(type) && !effectiveTrack) return "Pick booking days first";
    if (TRACK_RESTRICTED.has(type) && starts_at && !isOnTrack(starts_at)) return "Not on your booking days";
    return "";
  };


  const daySlots = classes.filter((c: any) => {
    if (c.starts_at.slice(0, 10) !== selectedDate) return false;
    // Adults never see kids classes; children only see kids or pt
    if (!bookingForChild && c.type === "kids") return false;
    if (bookingForChild && c.type !== "kids" && c.type !== "pt") return false;
    // Hide female-only classes from male / gender-unset adults
    if (!bookingForChild && FEMALE_ONLY.has(c.type) && !isFemale) return false;
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
      setSelectedDate(toAmmanDateKey(next));
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
        <div className="card-surface p-4" data-tour="calendar">
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
              const key = toAmmanDateKey(d);
              const hasBooking = daysWithBookings.has(key);
              const hasClass = daysWithClasses.has(key);
              const active = key === selectedDate;
              const isToday = key === todayKey;
              return (
                <button key={i} onClick={() => setSelectedDate(key)}
                  data-tour-day={hasBooking ? "booking" : hasClass ? "class" : undefined}
                  className={`relative aspect-square rounded-lg text-sm transition ${
                    active ? "bg-primary text-primary-foreground font-semibold" :
                    isToday ? "border hairline" : "hover:bg-muted"
                  }`}>
                  {d.getDate()}
                  {!active && (hasBooking || hasClass) && (
                    <span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${hasBooking ? "bg-primary" : "bg-muted-foreground/60"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {!bookingForChild && memberGender === null && (
          <Link
            to="/profile/edit"
            className="mt-4 block rounded-2xl border hairline bg-card p-4 transition active:scale-[0.99] hover:border-primary"
          >
            <p className="text-xs font-semibold">Complete your profile</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Set your gender in Profile → Edit to book group classes.</p>
          </Link>
        )}
        {!bookingForChild && (
          <div className="mt-4 grid grid-cols-3 gap-2" data-tour="filters">
            {TYPES.filter((tp) => tp.key !== "kids" && (isFemale || !FEMALE_ONLY.has(tp.key))).map((tp) => (
              <button key={tp.key} onClick={() => setFilter(tp.key)}
                className={`rounded-pill border px-2 py-2 text-[11px] font-medium leading-tight transition ${
                  filter === tp.key ? "border-primary bg-primary text-primary-foreground" : "hairline bg-card"
                }`}>
                {t[tp.labelKey]}
              </button>
            ))}
          </div>
        )}
        {bookingForChild && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {TYPES.filter((tp) => tp.key === "all" || tp.key === "kids" || tp.key === "pt").map((tp) => (
              <button key={tp.key} onClick={() => setFilter(tp.key)}
                className={`rounded-pill border px-2 py-2 text-[11px] font-medium leading-tight transition ${
                  filter === tp.key ? "border-primary bg-primary text-primary-foreground" : "hairline bg-card"
                }`}>
                {t[tp.labelKey]}
              </button>
            ))}
          </div>
        )}


        {(() => {
          const needsTrack = bookingForChild
            ? (groupActiveChild && !trackChild)
            : (groupActiveSelf && !selfPaused && !trackSelf);
          if (!needsTrack) return null;
          const target = bookingForChild ? bookingForChild.name : "you";
          return (
            <div className="mt-3 rounded-2xl border hairline bg-card p-4">
              <p className="text-xs font-semibold">Choose booking days for {target}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Mixed / Women Only / Kids classes lock to a track (max 12/month). Ask staff if you need to change it later.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { key: "sat_mon_wed", label: "Sat · Mon · Wed" },
                  { key: "sun_tue_thu", label: "Sun · Tue · Thu" },
                ].map((tr) => (
                  <button
                    key={tr.key}
                    onClick={async () => {
                      if (!confirm(`Lock ${target === "you" ? "your" : target + "'s"} track to ${tr.label}?`)) return;
                      const { error } = await (supabase as any).rpc("set_group_track", {
                        target_user: user!.id,
                        target_child: bookingForChild ? bookingForChild.id : null,
                        track: tr.key,
                      });
                      if (error) toast.error(error.message);
                      else { toast.success("Booking days saved"); refresh(); refreshChildren(); }
                    }}
                    className="rounded-pill border hairline py-2 text-[11px] font-semibold"
                  >
                    {tr.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="mt-2 space-y-2" data-tour="slots">
          {daySlots.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No classes this day</p>}
          {daySlots.map((c: any) => {
            const cnt = counts[c.id] ?? 0;
            const full = cnt >= c.capacity;
            const booked = bookedClassIds.has(c.id);
            const picked = pickedId === c.id;
            const eligible = isEligible(c.type, c.starts_at);
            const past = new Date(c.starts_at).getTime() <= Date.now();
            const disabled = full || booked || !eligible || past;
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
                  {!eligible && !booked && !full && !past && (
                    <p className="mt-1 text-[10px] font-medium text-destructive">{eligibilityMessage(c.type, c.starts_at)}</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-pill px-3 py-1 text-[10px] font-semibold uppercase ${
                  booked ? "bg-silver/20 text-silver" : (full || past) ? "bg-destructive/20 text-destructive" : "bg-primary/15 text-primary"
                }`}>
                  {booked ? t.booked : past ? "Started" : full ? t.full : `${c.capacity - cnt} ${t.slotsLeft}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-md px-5">
        {(() => {
          const pickedIneligible = pickedClass && !isEligible(pickedClass.type, pickedClass.starts_at);
          const disabled = !pickedId || pickedIneligible || book.isPending;
          const label = book.isPending
            ? "…"
            : !pickedId
              ? t.selectSlot
              : pickedIneligible
                ? eligibilityMessage(pickedClass.type, pickedClass.starts_at)
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
