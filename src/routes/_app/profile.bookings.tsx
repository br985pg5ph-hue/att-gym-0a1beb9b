import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useAuth, useLang } from "@/lib/providers";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_app/profile/bookings")({
  component: BookingsPage,
});

function BookingsPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["all-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("bookings")
      .select("id, status, created_at, classes(id, title, type, starts_at, coaches(name))")
      .eq("member_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cancelled"); qc.invalidateQueries({ queryKey: ["all-bookings"] }); qc.invalidateQueries({ queryKey: ["my-bookings"] }); qc.invalidateQueries({ queryKey: ["class-counts"] }); },
  });

  const now = Date.now();
  const upcoming = data.filter((b: any) => b.status === "upcoming" && new Date(b.classes.starts_at).getTime() > now);
  const past = data.filter((b: any) => !(b.status === "upcoming" && new Date(b.classes.starts_at).getTime() > now));

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4">
        <Link to="/profile" className="grid h-9 w-9 place-items-center rounded-pill hover:bg-muted"><ChevronLeft size={20} className="flip-rtl" /></Link>
      </div>
      <PageHeader title={t.myBookings} />
      <div className="space-y-6 px-5">
        <section>
          <h2 className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{t.upcoming}</h2>
          <div className="space-y-2">
            {upcoming.length === 0 && <p className="py-4 text-sm text-muted-foreground">—</p>}
            {upcoming.map((b: any) => (
              <div key={b.id} className="card-surface flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="font-display text-lg leading-none">{b.classes.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(b.classes.starts_at).toLocaleString([], { weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}</p>
                </div>
                <button onClick={() => cancel.mutate(b.id)} className="rounded-pill border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive">{t.cancel}</button>
              </div>
            ))}
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
