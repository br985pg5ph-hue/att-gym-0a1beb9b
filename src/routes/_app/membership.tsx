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
        .select("id, classes, type, description, payment_method, created_at, child_id, children(name)")
        .eq("member_id", user!.id)
        .order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div>
      <PageHeader title={t.membership} />
      <div className="space-y-4 px-5">
        <div className="card-surface p-6 bg-gradient-to-br from-primary/25 to-transparent">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Classes Remaining</p>
          <p className="font-display mt-1 text-6xl leading-none">
            {profile?.classes_remaining ?? 0}
            <span className="ml-2 text-xl text-muted-foreground">classes left</span>
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Pay at the gym (cash or card) and staff will top up your classes here.
          </p>
        </div>

        <div className="card-surface p-5">
          <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Class credit history</p>
          <div className="divide-y hairline">
            {txns.length === 0 && <p className="py-4 text-sm text-muted-foreground">No class credits yet</p>}
            {txns.map((tx: any) => (
              <div key={tx.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm">
                      {tx.description || (tx.type === "credit" ? "Classes added" : "Classes adjusted")}
                    </p>
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
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <p className={`shrink-0 font-display text-lg ${tx.type === "credit" ? "text-emerald-400" : "text-destructive"}`}>
                  {tx.type === "credit" ? "+" : "-"}{tx.classes}
                  <span className="ml-1 text-xs text-muted-foreground">classes</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
