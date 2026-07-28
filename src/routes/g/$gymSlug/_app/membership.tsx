import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useAuth, useLang } from "@/lib/providers";
import { toast } from "sonner";
import { Pause, Play } from "lucide-react";

export const Route = createFileRoute("/g/$gymSlug/_app/membership")({
  component: MembershipPage,
});

function MembershipPage() {
  const { user, profile, refresh } = useAuth() as any;
  const { t } = useLang();
  const qc = useQueryClient();

  const { data: txns = [] } = useQuery({
    queryKey: ["txns", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase
        .from("transactions")
        .select("id, classes, days, service, type, description, payment_method, created_at, child_id, children(name)")
        .eq("member_id", user!.id)
        .order("created_at", { ascending: false })).data ?? [],
  });

  const groupUntil = profile?.group_subscription_until ?? null;
  const groupActive = !!groupUntil && new Date(groupUntil).getTime() > Date.now();
  const groupDateLabel = groupUntil
    ? new Date(groupUntil).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
    : null;

  const pausedAt = (profile as any)?.membership_paused_at ?? null;
  const pauseDaysUsed = (profile as any)?.membership_pause_days_used ?? 0;
  const pauseRemaining = Math.max(0, 45 - pauseDaysUsed);
  const isPaused = !!pausedAt;
  const pausedDays = pausedAt ? Math.ceil((Date.now() - new Date(pausedAt).getTime()) / 86400000) : 0;

  const togglePause = useMutation({
    mutationFn: async (action: "pause" | "resume") => {
      const rpc = action === "pause" ? "pause_membership" : "resume_membership";
      const { error } = await (supabase as any).rpc(rpc, { target_user: user!.id });
      if (error) throw error;
    },
    onSuccess: (_d, action) => {
      toast.success(action === "pause" ? "Membership paused" : "Membership resumed");
      refresh?.();
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title={t.membership} />
      <div className="space-y-4 px-5">
        <div data-tour="membership-group" className={`card-surface p-6 ${groupActive ? "bg-gradient-to-br from-primary/25 to-transparent" : ""}`}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Group Membership</p>
            {isPaused && <span className="rounded-pill bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Paused</span>}
          </div>
          {groupActive ? (
            <>
              <p className="font-display mt-1 text-4xl leading-none">{isPaused ? "Paused" : "Active"}</p>
              <p className="mt-2 text-sm text-muted-foreground">Until {groupDateLabel}</p>
            </>
          ) : (
            <>
              <p className="font-display mt-1 text-4xl leading-none text-muted-foreground">
                {groupUntil ? "Expired" : "Not active"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Renew at the gym to access group classes.</p>
            </>
          )}

          {(groupActive || isPaused) && (
            <div className="mt-4 border-t hairline pt-4">
              <p className="text-[11px] text-muted-foreground">
                {isPaused
                  ? `Paused for ${pausedDays} day${pausedDays===1?"":"s"} · ${pauseRemaining} of 45 days left`
                  : `${pauseRemaining} of 45 pause days remaining this cycle`}
              </p>
              {isPaused ? (
                <button
                  onClick={()=>togglePause.mutate("resume")}
                  disabled={togglePause.isPending}
                  className="mt-3 w-full rounded-pill bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                  <Play size={12}/> Resume membership
                </button>
              ) : (
                <button
                  onClick={()=>{ if (confirm(`Pause your membership? Your expiry date will be extended by however many days you stay paused (max 45 days total).`)) togglePause.mutate("pause"); }}
                  disabled={togglePause.isPending || pauseRemaining <= 0}
                  className="mt-3 w-full rounded-pill border hairline py-2.5 text-xs font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
                  <Pause size={12}/> Pause membership
                </button>
              )}
            </div>
          )}

          {groupActive && !isPaused && (
            <TrackPicker
              userId={user!.id}
              childId={null}
              current={(profile as any)?.group_track ?? null}
              onChanged={()=>{ refresh?.(); qc.invalidateQueries(); }}
            />
          )}
        </div>

        <div data-tour="membership-pt" className="card-surface p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">PT Sessions</p>
          <p className="font-display mt-1 text-6xl leading-none">
            {profile?.pt_sessions_remaining ?? 0}
            <span className="ml-2 text-xl text-muted-foreground">left</span>
          </p>
        </div>

        <div data-tour="membership-history" className="card-surface p-5">
          <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Credit history</p>
          <div className="divide-y hairline">
            {txns.length === 0 && <p className="py-4 text-sm text-muted-foreground">No entries yet</p>}
            {txns.map((tx: any) => {
              const isGroup = tx.service === "group";
              const amount = isGroup ? (tx.days ?? 0) : (tx.classes ?? 0);
              const unit = isGroup ? (amount === 1 ? "day" : "days") : (amount === 1 ? "PT session" : "PT sessions");
              const defaultDesc = isGroup
                ? (tx.type === "credit" ? "Group Membership" : "Membership adjusted")
                : (tx.type === "credit" ? "PT sessions added" : "PT sessions adjusted");
              return (
                <div key={tx.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm">{tx.description || defaultDesc}</p>
                      {tx.payment_method && (
                        <span className="rounded-pill bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {tx.payment_method}
                        </span>
                      )}
                      {tx.child_id && tx.children?.name && (
                        <span className="rounded-pill bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                          For {tx.children.name}
                        </span>
                      )}
                      <span className="rounded-pill bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {isGroup ? "Group" : "PT"}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <p className={`shrink-0 font-display text-lg ${tx.type === "credit" ? "text-emerald-400" : "text-destructive"}`}>
                    {tx.type === "credit" ? "+" : "-"}{amount}
                    <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const TRACKS: { key: "sat_mon_wed" | "sun_tue_thu"; label: string }[] = [
  { key: "sat_mon_wed", label: "Sat · Mon · Wed" },
  { key: "sun_tue_thu", label: "Sun · Tue · Thu" },
];

export function TrackPicker({ userId, childId, current, onChanged }: {
  userId: string; childId: string | null; current: string | null; onChanged: () => void;
}) {
  const setTrack = useMutation({
    mutationFn: async (track: string) => {
      const { error } = await (supabase as any).rpc("set_group_track", {
        target_user: userId, target_child: childId, track,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Booking days saved"); onChanged(); },
    onError: (e: any) => toast.error(e.message ?? "Couldn't save"),
  });

  const currentLabel = TRACKS.find(t => t.key === current)?.label ?? null;

  return (
    <div className="mt-4 border-t hairline pt-4">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Booking days</p>
      {current ? (
        <p className="mt-2 text-sm font-semibold">{currentLabel}</p>
      ) : (
        <>
          <p className="mt-1 text-[11px] text-muted-foreground">Pick your track — you can only book Mixed, Women Only and Kids classes on these days. Max 12 classes per month. This can't be changed once set.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {TRACKS.map((tr) => (
              <button
                key={tr.key}
                disabled={setTrack.isPending}
                onClick={() => { if (confirm(`Lock your track to ${tr.label}? Staff can change it later if needed.`)) setTrack.mutate(tr.key); }}
                className="rounded-pill border hairline py-2 text-[11px] font-semibold disabled:opacity-60"
              >
                {tr.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
