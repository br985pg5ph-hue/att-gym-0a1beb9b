import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useAuth, useLang } from "@/lib/providers";

export const Route = createFileRoute("/_app/membership")({
  component: MembershipPage,
});

function MembershipPage() {
  const { user, profile } = useAuth();
  const { t } = useLang();

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

  return (
    <div>
      <PageHeader title={t.membership} />
      <div className="space-y-4 px-5">
        <div className={`card-surface p-6 ${groupActive ? "bg-gradient-to-br from-primary/25 to-transparent" : ""}`}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Group Membership</p>
          {groupActive ? (
            <>
              <p className="font-display mt-1 text-4xl leading-none">Active</p>
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
        </div>

        <div className="card-surface p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">PT Sessions</p>
          <p className="font-display mt-1 text-6xl leading-none">
            {profile?.pt_sessions_remaining ?? 0}
            <span className="ml-2 text-xl text-muted-foreground">left</span>
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Pay at the gym (cash or cliq) and staff will top up your sessions here.
          </p>
        </div>

        <div className="card-surface p-5">
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
