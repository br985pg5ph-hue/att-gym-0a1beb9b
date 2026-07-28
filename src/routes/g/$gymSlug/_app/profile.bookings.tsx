import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useAuth, useLang, useChildren } from "@/lib/providers";
import { toast } from "sonner";
import { ChevronLeft, User } from "lucide-react";

export const Route = createFileRoute("/g/$gymSlug/_app/profile/bookings")({
  component: BookingsPage,
});

function BookingsPage() {
  const { user, profile, refresh } = useAuth();
  const { t } = useLang();
  const { children: kids, refreshChildren } = useChildren();

  const parentMode = !!profile?.is_parent;
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["all-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("bookings")
      .select("id, status, created_at, child_id, classes(id, title, type, starts_at, coaches(name))")
      .eq("member_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const childName = (id: string | null) => id ? (kids.find((c) => c.id === id)?.name ?? "Child") : null;

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cancelled"); qc.invalidateQueries({ queryKey: ["all-bookings"] }); qc.invalidateQueries({ queryKey: ["my-bookings"] }); qc.invalidateQueries({ queryKey: ["class-counts"] }); qc.invalidateQueries({ queryKey: ["next-booking"] }); qc.invalidateQueries({ queryKey: ["txns"] }); refresh(); refreshChildren(); },
  });

  const now = Date.now();
  const CANCEL_WINDOW_MS = 12 * 60 * 60 * 1000;
  const upcoming = data.filter((b: any) => b.status === "upcoming" && new Date(b.classes.starts_at).getTime() > now);
  const past = data.filter((b: any) => !(b.status === "upcoming" && new Date(b.classes.starts_at).getTime() > now));

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4">
        <Link to={gp("/profile")} className="grid h-9 w-9 place-items-center rounded-pill hover:bg-muted"><ChevronLeft size={20} className="flip-rtl" /></Link>
      </div>
      <PageHeader title={t.myBookings} />

      <div className="space-y-6 px-5">
        <section>
          <h2 className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{t.upcoming}</h2>
          <div className="space-y-2">
            {upcoming.length === 0 && <p className="py-4 text-sm text-muted-foreground">—</p>}
            {upcoming.map((b: any) => {
              const startsAt = new Date(b.classes.starts_at).getTime();
              const canCancel = startsAt - now >= CANCEL_WINDOW_MS;
              const hoursUntil = Math.max(0, Math.round((startsAt - now) / 3_600_000));
              return (
                <div key={b.id} className="card-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg leading-none">{b.classes.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(b.classes.starts_at).toLocaleString([], { weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}</p>
                      {parentMode && b.child_id && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-pill bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <User size={10} /> {childName(b.child_id)}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (!canCancel) { toast.error(`Cancellations must be made at least 12 hours before class (${hoursUntil}h left)`); return; }
                        cancel.mutate(b.id);
                      }}
                      disabled={!canCancel}
                      className="rounded-pill border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t.cancel}
                    </button>
                  </div>
                  {!canCancel && (
                    <p className="mt-2 text-[11px] text-muted-foreground">Cancellation window closed (starts in {hoursUntil}h — must cancel 12h+ before).</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{t.past}</h2>
          <div className="space-y-2">
            {past.length === 0 && <p className="py-4 text-sm text-muted-foreground">—</p>}
            {past.map((b: any) => (
              <div key={b.id} className="card-surface flex items-center justify-between p-4 opacity-60">
                <div className="min-w-0">
                  <p className="font-display text-lg leading-none">{b.classes.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(b.classes.starts_at).toLocaleString([], { weekday:"short", month:"short", day:"numeric" })}</p>
                  {parentMode && b.child_id && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-pill bg-muted px-2 py-0.5 text-[10px] font-semibold">
                      <User size={10} /> {childName(b.child_id)}
                    </span>
                  )}
                </div>
                <span className="rounded-pill bg-muted px-3 py-1 text-[10px] font-semibold uppercase text-muted-foreground">{b.status === "cancelled" ? t.cancelled : t.completed}</span>
              </div>

            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
