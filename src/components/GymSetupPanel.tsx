import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CountrySelect } from "@/components/CountrySelect";
import { COUNTRIES } from "@/lib/countries";
import { getGymSetupContext, updateGymSetup } from "@/lib/platform.functions";
import { MapPin, Instagram, Image as ImageIcon, Clock, Plus, Trash2, FileText, Copy } from "lucide-react";

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
  hours?: { day: string; open: string; close: string; closed?: boolean }[];
  waiver_text?: string;

  logo_url?: string;
  theme?: Record<string, any>;
};

/** Gym setup wizard: basics, location & hours, branding and social links. */
export function GymSetupPanel() {
  const qc = useQueryClient();
  const getContext = useServerFn(getGymSetupContext);
  const save = useServerFn(updateGymSetup);

  const { data, isLoading, error } = useQuery({
    queryKey: ["gym-setup-context"],
    queryFn: () => getContext(),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: SetupPayload) => save({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gym-setup-context"] });
      qc.invalidateQueries({ queryKey: ["gym"] });
      toast.success("Saved");
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to save"),
  });

  if (isLoading) return <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>;

  if (error || !data?.gym) {
    return (
      <div className="card-surface p-6 text-center">
        <h2 className="font-display text-xl">Setup unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">Only a gym admin or owner can edit gym setup.</p>
      </div>
    );
  }

  const gym = data.gym;

  return (
    <div className="space-y-4">
      <Section icon={MapPin} title="Gym basics">
        <SetupField label="Gym name" defaultValue={gym.name} onSave={(name) => saveMutation.mutate({ name })} />
        <SetupField label="Address" defaultValue={gym.address} onSave={(address) => saveMutation.mutate({ address })} />
        <SetupPhone label="Phone" defaultValue={gym.phone} onSave={(phone) => saveMutation.mutate({ phone })} />
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
        <BrandColors
          primary={gym.primary_color ?? ""}
          secondary={gym.secondary_color ?? ""}
          theme={(gym.theme as any) ?? {}}
          onSave={(payload) => saveMutation.mutate(payload)}
        />
        <LogoUploader gymId={gym.id} currentUrl={gym.logo_url} onUploaded={(logo_url) => saveMutation.mutate({ logo_url })} />
      </Section>

      <Section icon={FileText} title="Membership waiver">
        <p className="text-xs text-muted-foreground">
          New members read and sign this during onboarding. Leave empty to use Nuvo's standard waiver.
        </p>
        <SetupTextArea
          label="Waiver text"
          defaultValue={(gym as any).waiver_text ?? ""}
          onSave={(waiver_text) => saveMutation.mutate({ waiver_text })}
        />
      </Section>

      <Section icon={Instagram} title="Social links">
        <SetupField label="Instagram URL" defaultValue={gym.instagram_url ?? ""} onSave={(instagram_url) => saveMutation.mutate({ instagram_url })} />
        <SetupPhone label="WhatsApp number" defaultValue={gym.whatsapp_number ?? ""} onSave={(whatsapp_number) => saveMutation.mutate({ whatsapp_number })} />
      </Section>

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

function SetupTextArea({ label, defaultValue, onSave }: { label: string; defaultValue: string; onSave: (value: string) => void }) {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => setValue(defaultValue), [defaultValue]);
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <textarea
        value={value}
        rows={8}
        onChange={(e) => setValue(e.target.value.slice(0, 20000))}
        placeholder="Leave empty to use Nuvo's standard waiver"
        className="w-full rounded-xl border hairline bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <div className="mt-2 flex justify-end">
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

const DEFAULT_DIAL = "+962";

function splitPhone(raw: string): { dial: string; rest: string } {
  const v = (raw || "").replace(/[\s()-]/g, "");
  if (v.startsWith("+")) {
    const match = COUNTRIES
      .map((c) => c.code)
      .filter((code) => v.startsWith(code))
      .sort((a, b) => b.length - a.length)[0];
    if (match) return { dial: match, rest: v.slice(match.length) };
  }
  return { dial: DEFAULT_DIAL, rest: v.replace(/^\+/, "") };
}

function SetupPhone({ label, defaultValue, onSave }: { label: string; defaultValue: string; onSave: (value: string) => void }) {
  const initial = splitPhone(defaultValue);
  const [dial, setDial] = useState(initial.dial);
  const [number, setNumber] = useState(initial.rest);

  useEffect(() => {
    const next = splitPhone(defaultValue);
    setDial(next.dial);
    setNumber(next.rest);
  }, [defaultValue]);

  const handleSave = () => {
    const digits = number.replace(/[\s()-]/g, "").replace(/^0+/, "");
    onSave(digits ? `${dial}${digits}` : "");
  };

  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <CountrySelect value={dial} onChange={setDial} />
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          inputMode="tel"
          placeholder="79 123 4567"
          className="min-w-0 flex-1 rounded-xl border hairline bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={handleSave}
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

type DayHours = { open: string; close: string; closed: boolean };

function to12(value: string) {
  if (!value) return { hour: "", minute: "00", meridiem: "AM" };
  const [h, m = "00"] = value.split(":");
  const hn = Number(h);
  const meridiem = hn >= 12 ? "PM" : "AM";
  const hour12 = hn % 12 === 0 ? 12 : hn % 12;
  return { hour: String(hour12), minute: m, meridiem };
}

function to24(hour: string, minute: string, meridiem: string) {
  if (!hour) return "";
  let hn = Number(hour) % 12;
  if (meridiem === "PM") hn += 12;
  return `${String(hn).padStart(2, "0")}:${(minute || "00").padStart(2, "0")}`;
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { hour, minute, meridiem } = to12(value);
  const cls = "rounded-lg border hairline bg-background px-2 py-1 text-xs outline-none focus:border-primary";
  return (
    <div className="flex flex-1 items-center gap-1">
      <select className={cls} value={hour} onChange={(e) => onChange(to24(e.target.value, minute, meridiem))}>
        <option value="">--</option>
        {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-muted-foreground">:</span>
      <select className={cls} value={minute} onChange={(e) => onChange(to24(hour, e.target.value, meridiem))}>
        {["00", "15", "30", "45"].map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select className={cls} value={meridiem} onChange={(e) => onChange(to24(hour, minute, e.target.value))}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

function timeToMinutes(value: string) {
  const [h, m = "0"] = value.split(":").map(Number);
  if (isNaN(h) || isNaN(Number(m))) return 0;
  return h * 60 + Number(m);
}

function HoursEditor({ hours, onSave }: { hours: any[]; onSave: (hours: any[]) => void }) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const buildState = (list: any[]) => {
    const map: Record<string, DayHours> = {};
    for (const h of list ?? []) {
      if (h.day) map[h.day] = { open: h.open ?? "", close: h.close ?? "", closed: !!h.closed };
    }
    return map;
  };
  const [state, setState] = useState<Record<string, DayHours>>(() => buildState(hours));

  useEffect(() => {
    setState(buildState(hours));
  }, [JSON.stringify(hours)]);

  const update = (day: string, patch: Partial<DayHours>) => {
    setState((prev) => ({
      ...prev,
      [day]: { ...{ open: "", close: "", closed: false }, ...prev[day], ...patch },
    }));
  };

  const copyToAll = (day: string) => {
    const src = state[day] ?? { open: "", close: "", closed: false };
    setState(() => {
      const next: Record<string, DayHours> = {};
      for (const d of days) next[d] = { ...src };
      return next;
    });
  };

  const durationPercent = (open: string, close: string) => {
    const o = timeToMinutes(open);
    const c = timeToMinutes(close);
    if (!o || !c || c <= o) return 0;
    return Math.min(100, Math.max(4, ((c - o) / (24 * 60)) * 100));
  };

  return (
    <div className="rounded-2xl border hairline bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-base">Opening hours</h3>
          <p className="text-xs text-muted-foreground">Manage the weekly operating schedule</p>
        </div>
        <button
          type="button"
          onClick={() => copyToAll("Monday")}
          className="inline-flex items-center gap-1.5 rounded-full border hairline bg-background px-3 py-1.5 text-[11px] font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <Copy size={12} />
          Copy Monday to all
        </button>
      </div>

      <div className="space-y-2">
        {days.map((day) => {
          const row = state[day];
          const closed = !!row?.closed;
          const barWidth = durationPercent(row?.open ?? "", row?.close ?? "");
          return (
            <div
              key={day}
              className={`flex items-center gap-4 rounded-xl border px-3 py-2.5 transition-all ${
                closed
                  ? "border-transparent bg-muted/40 opacity-60"
                  : "hairline bg-background hover:border-primary/30"
              }`}
            >
              <span className={`w-20 shrink-0 text-sm font-medium ${closed ? "text-muted-foreground" : "text-foreground"}`}>
                {day}
              </span>

              <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={!closed}
                  onChange={(e) => update(day, { closed: !e.target.checked })}
                />
                <div className="h-5 w-9 rounded-full bg-muted-foreground/30 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-muted-foreground/20 after:bg-card after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus-visible:ring-2 peer-focus-visible:ring-ring" />
                <span className={`ms-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${closed ? "text-muted-foreground" : "text-foreground"}`}>
                  {closed ? "Closed" : "Open"}
                </span>
              </label>

              <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
                {closed ? (
                  <span className="text-xs font-medium text-muted-foreground italic">Closed</span>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <TimeSelect value={row?.open ?? ""} onChange={(v) => update(day, { open: v })} />
                      <span className="text-muted-foreground">–</span>
                      <TimeSelect value={row?.close ?? ""} onChange={(v) => update(day, { close: v })} />
                    </div>
                    <div className="hidden sm:block w-16 lg:w-24">
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-end border-t hairline pt-4">
        <button
          onClick={() => {
            const payload = days
              .filter((d) => state[d]?.closed || state[d]?.open || state[d]?.close)
              .map((d) => ({
                day: d,
                open: state[d]?.closed ? "" : (state[d]?.open ?? ""),
                close: state[d]?.closed ? "" : (state[d]?.close ?? ""),
                closed: !!state[d]?.closed,
              }));
            onSave(payload);
          }}
          className="rounded-pill bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Save schedule
        </button>
      </div>
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

type ExtraColor = { key: string; label: string; value: string };

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHex(v: string): string {
  const s = (v || "").trim();
  if (!s) return "";
  return s.startsWith("#") ? s : `#${s}`;
}

function ColorRow({
  label,
  value,
  onChange,
  onRemove,
  onLabelChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onRemove?: () => void;
  onLabelChange?: (v: string) => void;
}) {
  const valid = HEX_RE.test(value);
  return (
    <div className="flex items-center gap-2 rounded-xl border hairline bg-background p-2">
      <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border hairline">
        <span className="block h-full w-full" style={{ background: valid ? value : "transparent" }} />
        <input
          type="color"
          value={valid ? (value.length === 4 ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}` : value) : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={`${label} color wheel`}
        />
      </label>
      <div className="min-w-0 flex-1">
        {onLabelChange ? (
          <input
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Color name"
            className="w-full bg-transparent text-[10px] uppercase tracking-wider text-muted-foreground outline-none"
          />
        ) : (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        )}
        <input
          value={value}
          onChange={(e) => onChange(normalizeHex(e.target.value))}
          placeholder="#c8102e"
          spellCheck={false}
          className={`w-full bg-transparent font-mono text-sm outline-none ${value && !valid ? "text-destructive" : ""}`}
        />
      </div>
      {onRemove && (
        <button onClick={onRemove} className="rounded-pill p-2 text-muted-foreground hover:text-foreground" aria-label="Remove color">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function BrandColors({
  primary,
  secondary,
  theme,
  onSave,
}: {
  primary: string;
  secondary: string;
  theme: Record<string, any>;
  onSave: (payload: { primary_color: string; secondary_color: string; theme: Record<string, any> }) => void;
}) {
  const [p, setP] = useState(primary || "#c8102e");
  const [s, setS] = useState(secondary || "#b8bcc2");
  const [extras, setExtras] = useState<ExtraColor[]>(() => (Array.isArray(theme?.colors) ? theme.colors : []));

  useEffect(() => {
    setP(primary || "#c8102e");
    setS(secondary || "#b8bcc2");
    setExtras(Array.isArray(theme?.colors) ? theme.colors : []);
  }, [primary, secondary, theme]);

  const updateExtra = (i: number, patch: Partial<ExtraColor>) =>
    setExtras((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const handleSave = () => {
    const all = [{ v: p }, { v: s }, ...extras.map((c) => ({ v: c.value }))];
    if (all.some((c) => !HEX_RE.test(c.v))) {
      toast.error("Enter valid hex colors, e.g. #c8102e");
      return;
    }
    if (extras.some((c) => !c.label.trim())) {
      toast.error("Give every custom color a name");
      return;
    }
    onSave({
      primary_color: p,
      secondary_color: s,
      theme: {
        ...theme,
        colors: extras.map((c, i) => ({
          key: c.key || `custom_${i + 1}`,
          label: c.label.trim(),
          value: c.value,
        })),
      },
    });
  };

  return (
    <div>
      <label className="mb-2 block text-[10px] uppercase tracking-wider text-muted-foreground">Brand colors</label>
      <div className="space-y-2">
        <ColorRow label="Primary color" value={p} onChange={setP} />
        <ColorRow label="Secondary color" value={s} onChange={setS} />
        {extras.map((c, i) => (
          <ColorRow
            key={c.key || i}
            label={c.label}
            value={c.value}
            onLabelChange={(label) => updateExtra(i, { label })}
            onChange={(value) => updateExtra(i, { value })}
            onRemove={() => setExtras((prev) => prev.filter((_, idx) => idx !== i))}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() =>
            setExtras((prev) => [
              ...prev,
              { key: `custom_${Date.now()}`, label: `Accent ${prev.length + 1}`, value: "#3b82f6" },
            ])
          }
          className="flex items-center gap-1 rounded-pill border hairline px-3 py-2 text-xs font-semibold"
        >
          <Plus size={13} /> Add color
        </button>
        <button onClick={handleSave} className="rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          Save colors
        </button>
      </div>
    </div>
  );
}
