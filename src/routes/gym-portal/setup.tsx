import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NuvoLogo } from "@/components/NuvoLogo";
import { CountrySelect } from "@/components/CountrySelect";
import { COUNTRIES } from "@/lib/countries";
import { getGymSetupContext, updateGymSetup } from "@/lib/platform.functions";
import { CheckCircle, AlertCircle, MapPin, Phone, Instagram, MessageCircle, Image as ImageIcon, Clock } from "lucide-react";

export const Route = createFileRoute("/gym-portal/setup")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/gym-portal/login" });
  },
  component: GymSetupWizard,
});

function GymSetupWizard() {
  const qc = useQueryClient();
  const getContext = useServerFn(getGymSetupContext);
  const save = useServerFn(updateGymSetup);

  const { data, isLoading, error } = useQuery({
    queryKey: ["gym-setup-context"],
    queryFn: () => getContext(),
  });

  type SetupPayload = {
    name?: string;
    address?: string;
    phone?: string;
    lat?: number;
    lng?: number;
    maps_url?: string;
    instagram_url?: string;
    whatsapp_number?: string;
    primary_color?: string;
    secondary_color?: string;
    hours?: { day: string; open: string; close: string }[];
    logo_url?: string;
  };

  const saveMutation = useMutation({
    mutationFn: (payload: SetupPayload) => save({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gym-setup-context"] });
      toast.success("Saved");
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to save"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error || !data?.gym) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-2xl">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">You must be a gym owner to view this page.</p>
        <Link to="/" className="mt-6 text-sm text-primary">Go back</Link>
      </div>
    );
  }

  const gym = data.gym;
  const isPending = gym.status === "pending";
  const isActive = gym.status === "active" || gym.status === "trial";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b hairline px-5 py-4 pt-[max(env(safe-area-inset-top),16px)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <NuvoLogo size={36} />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Gym setup</p>
              <h1 className="font-display text-2xl leading-none">{gym.name}</h1>
            </div>
          </div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6 pb-24">
        {isPending && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
            <AlertCircle size={20} className="mt-0.5 text-yellow-500" />
            <div>
              <p className="text-sm font-semibold text-yellow-500">Approval pending</p>
              <p className="text-xs text-yellow-500/80">
                Your gym application is under review. You can configure your gym now, but members and staff features will be unlocked once approved.
              </p>
            </div>
          </div>
        )}

        {isActive && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <CheckCircle size={20} className="mt-0.5 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-emerald-500">Approved</p>
              <p className="text-xs text-emerald-500/80">
                Your gym is active. You can now open your admin dashboard.
              </p>
              <Link
                to="/gym/$gymSlug/admin"
                params={{ gymSlug: gym.slug }}
                className="mt-2 inline-block rounded-pill bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white"
              >
                Go to Admin Dashboard
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Section icon={MapPin} title="Gym basics">
            <SetupField label="Gym name" defaultValue={gym.name} onSave={(name) => saveMutation.mutate({ name })} />
            <SetupField label="Address" defaultValue={gym.address} onSave={(address) => saveMutation.mutate({ address })} />
            <SetupField label="Phone" defaultValue={gym.phone} onSave={(phone) => saveMutation.mutate({ phone })} />
          </Section>

          <Section icon={Clock} title="Location & hours">
            <div className="grid grid-cols-2 gap-3">
              <SetupNumber label="Latitude" defaultValue={gym.lat} onSave={(lat) => saveMutation.mutate({ lat })} />
              <SetupNumber label="Longitude" defaultValue={gym.lng} onSave={(lng) => saveMutation.mutate({ lng })} />
            </div>
            <SetupField label="Maps URL" defaultValue={gym.maps_url ?? ""} onSave={(maps_url) => saveMutation.mutate({ maps_url })} />
            <HoursEditor hours={(gym.hours as any) ?? []} onSave={(hours) => saveMutation.mutate({ hours })} />
          </Section>

          <Section icon={ImageIcon} title="Branding">
            <div className="grid grid-cols-2 gap-3">
              <SetupField label="Primary color" defaultValue={gym.primary_color ?? ""} onSave={(primary_color) => saveMutation.mutate({ primary_color })} />
              <SetupField label="Secondary color" defaultValue={gym.secondary_color ?? ""} onSave={(secondary_color) => saveMutation.mutate({ secondary_color })} />
            </div>
            <LogoUploader gymId={gym.id} currentUrl={gym.logo_url} onUploaded={(logo_url) => saveMutation.mutate({ logo_url })} />
          </Section>

          <Section icon={Instagram} title="Social links">
            <SetupField label="Instagram URL" defaultValue={gym.instagram_url ?? ""} onSave={(instagram_url) => saveMutation.mutate({ instagram_url })} />
            <SetupField label="WhatsApp number" defaultValue={gym.whatsapp_number ?? ""} onSave={(whatsapp_number) => saveMutation.mutate({ whatsapp_number })} />
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof MapPin; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border hairline bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={16} className="text-muted-foreground" />
        <h2 className="font-display text-lg">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SetupField({ label, defaultValue, onSave }: { label: string; defaultValue: string; onSave: (value: string) => void }) {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => setValue(defaultValue), [defaultValue]);
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 rounded-xl border hairline bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => onSave(value)}
          className="rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function SetupNumber({ label, defaultValue, onSave }: { label: string; defaultValue: number; onSave: (value: number) => void }) {
  const [value, setValue] = useState(defaultValue?.toString() ?? "");
  useEffect(() => setValue(defaultValue?.toString() ?? ""), [defaultValue]);
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 rounded-xl border hairline bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => onSave(parseFloat(value) || 0)}
          className="rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function HoursEditor({ hours, onSave }: { hours: any[]; onSave: (hours: any[]) => void }) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const [state, setState] = useState<Record<string, { open: string; close: string }>>(() => {
    const map: Record<string, { open: string; close: string }> = {};
    for (const h of hours) {
      if (h.day) map[h.day] = { open: h.open ?? "", close: h.close ?? "" };
    }
    return map;
  });

  const update = (day: string, key: "open" | "close", value: string) => {
    setState((prev) => ({ ...prev, [day]: { ...prev[day], [key]: value } }));
  };

  return (
    <div>
      <label className="mb-2 block text-[10px] uppercase tracking-wider text-muted-foreground">Opening hours</label>
      <div className="space-y-2">
        {days.map((day) => (
          <div key={day} className="flex items-center gap-2 text-sm">
            <span className="w-24 text-muted-foreground">{day}</span>
            <input
              type="time"
              value={state[day]?.open ?? ""}
              onChange={(e) => update(day, "open", e.target.value)}
              className="flex-1 rounded-lg border hairline bg-background px-2 py-1 text-xs"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="time"
              value={state[day]?.close ?? ""}
              onChange={(e) => update(day, "close", e.target.value)}
              className="flex-1 rounded-lg border hairline bg-background px-2 py-1 text-xs"
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => {
          const payload = days
            .filter((d) => state[d]?.open || state[d]?.close)
            .map((d) => ({ day: d, open: state[d]?.open ?? "", close: state[d]?.close ?? "" }));
          onSave(payload);
        }}
        className="mt-3 rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
      >
        Save hours
      </button>
    </div>
  );
}

function LogoUploader({ gymId, currentUrl, onUploaded }: { gymId: string; currentUrl: string | null; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${gymId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    // Private bucket: use a long-lived signed URL.
    const { data: signed, error: signedErr } = await supabase.storage.from("logos").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signedErr) {
      toast.error(signedErr.message);
      setUploading(false);
      return;
    }
    onUploaded(signed.signedUrl);
    setUploading(false);
  };

  return (
    <div>
      <label className="mb-2 block text-[10px] uppercase tracking-wider text-muted-foreground">Logo</label>
      <div className="flex items-center gap-3">
        {currentUrl ? (
          <img src={currentUrl} alt="Gym logo" className="h-14 w-14 rounded-xl object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border hairline bg-background">
            <ImageIcon size={20} className="text-muted-foreground" />
          </div>
        )}
        <label className="cursor-pointer rounded-pill border hairline px-4 py-2 text-xs font-semibold">
          {uploading ? "Uploading…" : currentUrl ? "Change logo" : "Upload logo"}
          <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={uploading} />
        </label>
      </div>
    </div>
  );
}
