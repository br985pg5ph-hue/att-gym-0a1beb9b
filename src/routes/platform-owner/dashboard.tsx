import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NuvoLogo } from "@/components/NuvoLogo";
import {
  getPlatformAdminContext,
  listGymsForPlatform,
  updateGymStatus,
  getGymDetails,
  listPlatformAuditLog,
  impersonateGymAdmin,
  deleteGym,

} from "@/lib/platform.functions";
import {
  LogOut,
  CheckCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
  Users,
  Building2,
  Clock,
  ChevronRight,
  ExternalLink,
  X,
  MapPin,
  Phone,
  Instagram,
  MessageCircle,
  Map,
  AlertCircle,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/platform-owner/dashboard")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/platform-owner/console" });
  },
  component: PlatformDashboard,
});

type GymStatus = "pending" | "active" | "suspended" | "trial" | "all";

function PlatformDashboard() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<GymStatus>("all");
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const checkAdmin = useServerFn(getPlatformAdminContext);
  const listGyms = useServerFn(listGymsForPlatform);
  const updateStatus = useServerFn(updateGymStatus);
  const fetchGymDetails = useServerFn(getGymDetails);
  const fetchAuditLog = useServerFn(listPlatformAuditLog);
  const impersonate = useServerFn(impersonateGymAdmin);

  const adminQuery = useQuery({
    queryKey: ["platform-admin-context"],
    queryFn: () => checkAdmin(),
  });

  const gymsQuery = useQuery({
    queryKey: ["platform-gyms", filter],
    queryFn: () => listGyms({ data: { status: filter } }),
    enabled: adminQuery.data?.isPlatformAdmin ?? false,
  });

  const auditQuery = useQuery({
    queryKey: ["platform-audit-log"],
    queryFn: () => fetchAuditLog({ data: { limit: 50 } }),
    enabled: adminQuery.data?.isPlatformAdmin ?? false,
  });

  const gymDetailsQuery = useQuery({
    queryKey: ["platform-gym-details", selectedGymId],
    queryFn: () => fetchGymDetails({ data: { gymId: selectedGymId! } }),
    enabled: !!selectedGymId && (adminQuery.data?.isPlatformAdmin ?? false),
  });

  const statusMutation = useMutation({
    mutationFn: ({ gymId, status }: { gymId: string; status: string }) =>
      updateStatus({ data: { gymId, status: status as any } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-gyms"] });
      qc.invalidateQueries({ queryKey: ["platform-gym-details"] });
      qc.invalidateQueries({ queryKey: ["platform-audit-log"] });
      toast.success("Gym status updated");
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to update status"),
  });

  const impersonateMutation = useMutation({
    mutationFn: (gymId: string) => impersonate({ data: { gymId } }),
    onSuccess: (data) => {
      toast.success("Opening gym admin");
      window.location.href = `/gym/${data.slug}/admin`;
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to open gym admin"),
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    window.location.href = "/";
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
        <Link to="/" className="mt-6 text-sm text-primary">Go back</Link>
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

  const selectedGym = selectedGymId ? gyms.find((g) => g.id === selectedGymId) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-3 border-b hairline px-5 py-4 pt-[max(env(safe-area-inset-top),16px)]">
        <div className="flex items-center gap-3">
          <NuvoLogo size={36} />
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

      <main className="mx-auto max-w-6xl px-5 py-6 pb-24 lg:flex lg:gap-6">
        <div className="flex-1">
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
                onClick={() => setSelectedGymId(gym.id)}
                className="cursor-pointer rounded-2xl border hairline bg-card p-4 transition hover:border-primary/30"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-xl">{gym.name}</h2>
                      <StatusBadge status={gym.status} />
                      {gym.status === "pending" && <AttentionBadge />}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        impersonateMutation.mutate(gym.id);
                      }}
                      disabled={impersonateMutation.isPending}
                      className="flex items-center gap-1 rounded-pill border hairline px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/30"
                    >
                      <ExternalLink size={12} /> Open admin
                    </button>
                    {gym.status === "pending" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          statusMutation.mutate({ gymId: gym.id, status: "active" });
                        }}
                        disabled={statusMutation.isPending}
                        className="flex items-center gap-1 rounded-pill bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      >
                        <CheckCircle size={12} /> Approve
                      </button>
                    )}
                    {gym.status === "active" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          statusMutation.mutate({ gymId: gym.id, status: "suspended" });
                        }}
                        disabled={statusMutation.isPending}
                        className="flex items-center gap-1 rounded-pill border hairline px-3 py-1.5 text-xs font-semibold text-destructive"
                      >
                        <XCircle size={12} /> Suspend
                      </button>
                    )}
                    {gym.status === "suspended" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          statusMutation.mutate({ gymId: gym.id, status: "active" });
                        }}
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
        </div>

        <aside className="mt-8 lg:mt-0 lg:w-80">
          <div className="rounded-2xl border hairline bg-card p-4">
            <h3 className="font-display text-lg">Activity</h3>
            <div className="mt-3 space-y-3">
              {auditQuery.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
              {!auditQuery.isLoading && (auditQuery.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">No recent platform activity.</p>
              )}
              {(auditQuery.data ?? []).map((entry: any) => (
                <div key={entry.id} className="border-l-2 border-primary/30 pl-3">
                  <p className="text-xs font-medium">{auditActionLabel(entry.action)}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {entry.actor_name ?? "Platform admin"} · {new Date(entry.created_at).toLocaleString()}
                  </p>
                  {entry.details?.from && entry.details?.to && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {entry.details.from} → {entry.details.to}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {selectedGym && (
        <GymDetailDrawer
          gym={selectedGym}
          details={gymDetailsQuery.data}
          isLoading={gymDetailsQuery.isLoading}
          onClose={() => setSelectedGymId(null)}
          onStatusChange={(status) => statusMutation.mutate({ gymId: selectedGym.id, status })}
          onOpenAdmin={() => impersonateMutation.mutate(selectedGym.id)}
          statusPending={statusMutation.isPending}
        />
      )}
    </div>
  );
}

function GymDetailDrawer({
  gym,
  details,
  isLoading,
  onClose,
  onStatusChange,
  onOpenAdmin,
  statusPending,
}: {
  gym: any;
  details: any;
  isLoading: boolean;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onOpenAdmin: () => void;
  statusPending: boolean;
}) {
  const owner = details?.owner;
  const onboarding = details?.onboarding ?? {};
  const checklist = [
    { key: "basics", label: "Basics (name, city, address, phone)", done: onboarding.basics },
    { key: "offering", label: "Training offering", done: onboarding.offering },
    { key: "hours", label: "Opening hours", done: onboarding.hours },
    { key: "brand", label: "Logo & colours", done: onboarding.brand },
    { key: "social", label: "Social links", done: onboarding.social },
    { key: "waiver", label: "Waiver text", done: onboarding.waiver },
    { key: "coaches", label: "First coach added", done: onboarding.coaches },
    { key: "classes", label: "First class created", done: onboarding.classes },
    { key: "members", label: "First member joined", done: onboarding.members },
  ];
  const completed = checklist.filter((c) => c.done).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-0">
      <div className="h-full w-full max-w-md overflow-y-auto bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{gym.name}</h2>
          <button onClick={onClose} className="rounded-pill border hairline p-2">
            <X size={16} />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">/{gym.slug}</p>
        <StatusBadge status={gym.status} />

        <div className="mt-6 flex flex-wrap gap-2">
          {gym.status === "pending" && (
            <button
              onClick={() => onStatusChange("active")}
              disabled={statusPending}
              className="flex items-center gap-1 rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              <CheckCircle size={12} /> Approve
            </button>
          )}
          {gym.status === "active" && (
            <button
              onClick={() => onStatusChange("suspended")}
              disabled={statusPending}
              className="flex items-center gap-1 rounded-pill border hairline px-4 py-2 text-xs font-semibold text-destructive"
            >
              <XCircle size={12} /> Suspend
            </button>
          )}
          {gym.status === "suspended" && (
            <button
              onClick={() => onStatusChange("active")}
              disabled={statusPending}
              className="flex items-center gap-1 rounded-pill border hairline px-4 py-2 text-xs font-semibold text-primary"
            >
              <PlayCircle size={12} /> Activate
            </button>
          )}
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1 rounded-pill border hairline px-4 py-2 text-xs font-semibold text-muted-foreground"
          >
            <ExternalLink size={12} /> Open as admin
          </button>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading details…</p>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border hairline p-4">
              <h3 className="font-display text-lg">Owner / Admin</h3>
              {owner ? (
                <div className="mt-2 space-y-1 text-sm">
                  <p className="font-medium">{owner.name ?? "Unnamed"}</p>
                  {owner.email && <p className="text-xs text-muted-foreground">{owner.email}</p>}
                  {owner.phone && <p className="text-xs text-muted-foreground">{owner.phone}</p>}
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{owner.role}</p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No owner assigned.</p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border hairline p-4">
              <h3 className="font-display text-lg">Contact</h3>
              <div className="mt-2 space-y-2 text-sm">
                {gym.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin size={14} />
                    <span className="text-xs">{gym.address}</span>
                  </div>
                )}
                {gym.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone size={14} />
                    <span className="text-xs">{gym.phone}</span>
                  </div>
                )}
                {gym.instagram_url && (
                  <a href={gym.instagram_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary">
                    <Instagram size={14} />
                    <span className="text-xs">Instagram</span>
                  </a>
                )}
                {gym.whatsapp_number && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageCircle size={14} />
                    <span className="text-xs">{gym.whatsapp_number}</span>
                  </div>
                )}
                {gym.maps_url && (
                  <a href={gym.maps_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary">
                    <Map size={14} />
                    <span className="text-xs">Google Maps</span>
                  </a>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border hairline p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg">Onboarding</h3>
                <span className="text-xs font-semibold text-muted-foreground">
                  {completed}/{checklist.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {checklist.map((item) => (
                  <div key={item.key} className="flex items-center gap-2 text-sm">
                    {item.done ? (
                      <Check size={14} className="text-emerald-500" />
                    ) : (
                      <AlertCircle size={14} className="text-yellow-500" />
                    )}
                    <span className={item.done ? "text-muted-foreground" : ""}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
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

function AttentionBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-yellow-500">
      <AlertCircle size={10} /> Needs review
    </span>
  );
}

function auditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    gym_status_changed: "Gym status changed",
    impersonated_gym_admin: "Opened gym admin",
  };
  return labels[action] ?? action.replace(/_/g, " ");
}
