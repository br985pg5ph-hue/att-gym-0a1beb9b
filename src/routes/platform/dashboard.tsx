import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { getPlatformAdminContext, listGymsForPlatform, updateGymStatus } from "@/lib/platform.functions";
import { LogOut, CheckCircle, XCircle, PauseCircle, PlayCircle, Users, Building2, Clock } from "lucide-react";

export const Route = createFileRoute("/platform/dashboard")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/platform/console" });
  },
  component: PlatformDashboard,
});

type GymStatus = "pending" | "active" | "suspended" | "trial" | "all";

function PlatformDashboard() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<GymStatus>("all");
  const checkAdmin = useServerFn(getPlatformAdminContext);
  const listGyms = useServerFn(listGymsForPlatform);
  const updateStatus = useServerFn(updateGymStatus);

  const adminQuery = useQuery({
    queryKey: ["platform-admin-context"],
    queryFn: () => checkAdmin(),
  });

  const gymsQuery = useQuery({
    queryKey: ["platform-gyms", filter],
    queryFn: () => listGyms({ data: { status: filter } }),
    enabled: adminQuery.data?.isPlatformAdmin ?? false,
  });

  const statusMutation = useMutation({
    mutationFn: ({ gymId, status }: { gymId: string; status: string }) =>
      updateStatus({ data: { gymId, status: status as any } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-gyms"] });
      toast.success("Gym status updated");
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to update status"),
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    window.location.href = "/platform";
  };

  if (adminQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!adminQuery.data?.isPlatformAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-2xl">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">This account is not a platform admin.</p>
        <Link to="/platform" className="mt-6 text-sm text-primary">Go back</Link>
      </div>
    );
  }

  const gyms = gymsQuery.data ?? [];
  const counts = {
    all: gyms.length,
    pending: gyms.filter((g) => g.status === "pending").length,
    active: gyms.filter((g) => g.status === "active").length,
    suspended: gyms.filter((g) => g.status === "suspended").length,
    trial: gyms.filter((g) => g.status === "trial").length,
  };

  const filters: { key: GymStatus; label: string }[] = [
    { key: "all", label: `All (${counts.all})` },
    { key: "pending", label: `Pending (${counts.pending})` },
    { key: "active", label: `Active (${counts.active})` },
    { key: "suspended", label: `Suspended (${counts.suspended})` },
    { key: "trial", label: `Trial (${counts.trial})` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-3 border-b hairline px-5 py-4 pt-[max(env(safe-area-inset-top),16px)]">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Platform</p>
            <h1 className="font-display text-2xl leading-none">Gym Management</h1>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 rounded-pill border hairline px-3 py-1.5 text-xs font-semibold text-destructive"
        >
          <LogOut size={14} /> Sign out
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6 pb-24">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Building2} label="Pending" value={counts.pending} />
          <StatCard icon={Users} label="Active" value={counts.active} />
          <StatCard icon={PlayCircle} label="Trial" value={counts.trial} />
          <StatCard icon={PauseCircle} label="Suspended" value={counts.suspended} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-pill px-3 py-1.5 text-xs font-semibold transition ${
                filter === f.key ? "bg-primary text-primary-foreground" : "border hairline text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {gymsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading gyms…</p>}
          {!gymsQuery.isLoading && gyms.length === 0 && (
            <p className="text-sm text-muted-foreground">No gyms found.</p>
          )}
          {gyms.map((gym: any) => (
            <div
              key={gym.id}
              className="rounded-2xl border hairline bg-card p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl">{gym.name}</h2>
                    <StatusBadge status={gym.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">/{gym.slug}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {gym.owner?.name && <span>{gym.owner.name}</span>}
                    {gym.owner?.phone && <span>{gym.owner.phone}</span>}
                    {gym.phone && <span>{gym.phone}</span>}
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Applied {new Date(gym.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {gym.status === "pending" && (
                    <button
                      onClick={() => statusMutation.mutate({ gymId: gym.id, status: "active" })}
                      disabled={statusMutation.isPending}
                      className="flex items-center gap-1 rounded-pill bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      <CheckCircle size={12} /> Approve
                    </button>
                  )}
                  {gym.status === "active" && (
                    <button
                      onClick={() => statusMutation.mutate({ gymId: gym.id, status: "suspended" })}
                      disabled={statusMutation.isPending}
                      className="flex items-center gap-1 rounded-pill border hairline px-3 py-1.5 text-xs font-semibold text-destructive"
                    >
                      <XCircle size={12} /> Suspend
                    </button>
                  )}
                  {gym.status === "suspended" && (
                    <button
                      onClick={() => statusMutation.mutate({ gymId: gym.id, status: "active" })}
                      disabled={statusMutation.isPending}
                      className="flex items-center gap-1 rounded-pill border hairline px-3 py-1.5 text-xs font-semibold text-primary"
                    >
                      <PlayCircle size={12} /> Activate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-2xl border hairline bg-card p-4">
      <Icon size={18} className="text-muted-foreground" />
      <p className="mt-2 font-display text-2xl">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-500",
    active: "bg-emerald-500/10 text-emerald-500",
    suspended: "bg-red-500/10 text-red-500",
    trial: "bg-blue-500/10 text-blue-500",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[status] ?? "text-muted-foreground"}`}>
      {status}
    </span>
  );
}
