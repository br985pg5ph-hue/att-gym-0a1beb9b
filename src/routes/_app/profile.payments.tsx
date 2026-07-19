import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useAuth, useLang } from "@/lib/providers";
import { toast } from "sonner";
import { ChevronLeft, Plus, CreditCard, Apple } from "lucide-react";

export const Route = createFileRoute("/_app/profile/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const { user, profile, refresh } = useAuth();
  const { t } = useLang();
  const qc = useQueryClient();

  const { data: txns = [] } = useQuery({
    queryKey: ["txns", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("transactions").select("*").eq("member_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const topUp = useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase.from("transactions").insert({ member_id: user!.id, amount, type: "credit", description: `Wallet top-up +$${amount}` });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Wallet topped up"); await refresh(); qc.invalidateQueries({ queryKey: ["txns"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4">
        <Link to="/profile" className="grid h-9 w-9 place-items-center rounded-pill hover:bg-muted"><ChevronLeft size={20} className="flip-rtl" /></Link>
      </div>
      <PageHeader title={t.payments} />
      <div className="space-y-4 px-5">
        <div className="card-surface p-6 bg-gradient-to-br from-primary/25 to-transparent">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.wallet}</p>
          <p className="font-display mt-1 text-5xl">{Number(profile?.wallet_balance ?? 0).toFixed(2)} <span className="text-2xl text-muted-foreground">JOD</span></p>
          <div className="mt-4 flex gap-2">
            {[10, 25, 50].map(v => (
              <button key={v} disabled={topUp.isPending} onClick={()=>topUp.mutate(v)}
                className="flex-1 rounded-pill bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">+{v} JOD</button>
            ))}

          </div>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Current Plan</p>
              <p className="font-display mt-1 text-2xl">Unlimited</p>
            </div>
            <button className="rounded-pill border hairline px-4 py-2 text-xs font-semibold">{t.changePlan}</button>
          </div>
        </div>

        <div className="card-surface p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Payment methods</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3 rounded-xl border hairline p-3"><CreditCard size={18}/><span className="text-sm">•••• 4242</span></div>
            <div className="flex items-center gap-3 rounded-xl border hairline p-3"><Apple size={18}/><span className="text-sm">Apple Pay</span></div>
          </div>
          <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-pill border border-dashed hairline py-3 text-xs font-semibold text-muted-foreground">
            <Plus size={14}/> {t.addPayment}
          </button>
        </div>

        <div className="card-surface p-5">
          <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">History</p>
          <div className="divide-y hairline">
            {txns.length === 0 && <p className="py-4 text-sm text-muted-foreground">No transactions yet</p>}
            {txns.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{tx.description}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <p className={`shrink-0 font-display text-lg ${tx.type === "credit" ? "text-emerald-400" : "text-destructive"}`}>
                  {tx.type === "credit" ? "+" : "-"}{Number(tx.amount).toFixed(2)} <span className="text-xs text-muted-foreground">JOD</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
