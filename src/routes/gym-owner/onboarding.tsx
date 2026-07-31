import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Building2, Clock, Dumbbell, Palette, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NuvoLogo } from "@/components/NuvoLogo";
import { getGymSetupContext, updateGymSetup } from "@/lib/platform.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/gym-owner/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/gym-owner/login" });
    const ctx = await getGymSetupContext();
    return { gym: ctx.gym as any };
  },
  loader: ({ context }) => ({ gym: (context as any).gym }),
  component: GymOwnerOnboarding,
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DISCIPLINES = [
  "Muay Thai",
  "MMA",
  "Boxing",
  "BJJ",
  "Wrestling",
  "CrossFit",
  "Weight training",
  "Yoga",
  "Gymnastics",
  "Kids classes",
  "Personal training",
  "Group classes",
];

const STEPS = [
  { key: "basics", label: "Gym", icon: Building2 },
  { key: "offering", label: "Training", icon: Dumbbell },
  { key: "hours", label: "Hours", icon: Clock },
  { key: "brand", label: "Brand", icon: Palette },
  { key: "social", label: "Contact", icon: Share2 },
] as const;

function GymOwnerOnboarding() {
  const { gym } = Route.useLoaderData() as { gym: any };
  const nav = useNavigate();
  const save = useServerFn(updateGymSetup);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState<string>(gym?.name ?? "");
  const [city, setCity] = useState<string>(gym?.city ?? "");
  const [address, setAddress] = useState<string>(gym?.address ?? "");
  const [phone, setPhone] = useState<string>(gym?.phone ?? "");
  const [disciplines, setDisciplines] = useState<string[]>(
    Array.isArray(gym?.theme?.disciplines) ? gym.theme.disciplines : [],
  );
  const [size, setSize] = useState<string>(gym?.theme?.member_range ?? "");
  const [coaches, setCoaches] = useState<string>(gym?.theme?.coach_count ?? "");
  const [hours, setHours] = useState(() =>
    DAYS.map((day) => {
      const found = (gym?.hours ?? []).find((h: any) => h.day === day);
      return {
        day,
        open: found?.open ?? "09:00",
        close: found?.close ?? "22:00",
        closed: Boolean(found?.closed),
      };
    }),
  );
  const [primary, setPrimary] = useState<string>(gym?.primary_color ?? "#1d4ed8");
  const [secondary, setSecondary] = useState<string>(gym?.secondary_color ?? "#b8bcc2");
  const [logoUrl, setLogoUrl] = useState<string>(gym?.logo_url ?? "");
  const [instagram, setInstagram] = useState<string>(gym?.instagram_url ?? "");
  const [whatsapp, setWhatsapp] = useState<string>(gym?.whatsapp_number ?? "");
  const [mapsUrl, setMapsUrl] = useState<string>(gym?.maps_url ?? "");

  const canContinue = useMemo(() => {
    if (step === 0) return name.trim().length >= 2 && city.trim().length >= 2 && address.trim().length >= 4 && phone.trim().length >= 5;
    if (step === 1) return disciplines.length > 0 && size.length > 0;
    if (step === 2) return hours.some((h) => !h.closed);
    return true;
  }, [step, name, city, address, phone, disciplines, size, hours]);

  const toggle = (value: string) =>
    setDisciplines((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const persist = async (finish = false) => {
    setSaving(true);
    try {
      await save({
        data: {
          name: name.trim(),
          city: city.trim(),
          address: address.trim(),
          phone: phone.trim(),
          hours,
          primary_color: primary,
          secondary_color: secondary,
          logo_url: logoUrl.trim(),
          instagram_url: instagram.trim(),
          whatsapp_number: whatsapp.trim(),
          maps_url: mapsUrl.trim(),
          theme: {
            ...(gym?.theme ?? {}),
            disciplines,
            member_range: size,
            coach_count: coaches,
            onboarding_completed: finish ? new Date().toISOString() : gym?.theme?.onboarding_completed ?? null,
          },
        },
      });
      if (finish) {
        toast.success("Gym profile saved");
        nav({ to: "/gym/$gymSlug/admin", params: { gymSlug: gym.slug }, search: { tab: "settings" } });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    if (!canContinue) return;
    if (step === STEPS.length - 1) {
      await persist(true).catch(() => {});
      return;
    }
    try {
      await persist(false);
      setStep((s) => s + 1);
    } catch {
      /* toast shown */
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8 lg:max-w-3xl lg:justify-center lg:px-10 lg:py-14">
      <div className="mb-6 flex flex-col items-center text-center">
        <NuvoLogo size={56} />
        <h1 className="font-display mt-3 text-2xl">Set up {gym?.name ?? "your gym"}</h1>
        <p className="mt-1 text-xs text-muted-foreground">Tell us about your gym so members see the right thing</p>
      </div>

      <div className="mb-6 flex items-center gap-1">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            disabled={i > step}
            onClick={() => i <= step && setStep(i)}
            className={`flex-1 rounded-pill py-1.5 text-[10px] font-semibold transition ${
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground opacity-60"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 lg:flex-none lg:rounded-2xl lg:border lg:hairline lg:bg-card lg:p-8">
        {step === 0 && (
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Gym name" value={name} onChange={setName} placeholder="e.g. Antaki Top Team" />
            <Field label="City" value={city} onChange={setCity} placeholder="e.g. Amman" />
            <Field label="Address" value={address} onChange={setAddress} placeholder="Street, building, floor" />
            <Field label="Gym phone" value={phone} onChange={setPhone} placeholder="+962 7…" />
          </div>
        )}


        {step === 1 && (
          <>
            <p className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">What do you offer?</p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {DISCIPLINES.map((d) => {
                const on = disciplines.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggle(d)}
                    className={`rounded-xl border px-3 py-3 text-left text-xs transition active:scale-[0.98] ${
                      on ? "border-primary bg-primary/10 font-semibold text-primary" : "hairline bg-card"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <Select
              label="How many members do you have?"
              value={size}
              onChange={setSize}
              options={["Under 50", "50–150", "150–400", "400+"]}
            />
            <Select
              label="How many coaches?"
              value={coaches}
              onChange={setCoaches}
              options={["1–2", "3–5", "6–10", "10+"]}
            />
          </>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <p className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">Opening hours</p>
            {hours.map((h, i) => (
              <div key={h.day} className="flex items-center gap-2 rounded-xl border hairline bg-card px-3 py-2">
                <span className="w-20 text-xs">{h.day.slice(0, 3)}</span>
                {h.closed ? (
                  <span className="flex-1 text-xs text-muted-foreground">Closed</span>
                ) : (
                  <>
                    <input
                      type="time"
                      value={h.open}
                      onChange={(e) =>
                        setHours((prev) => prev.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))
                      }
                      className="flex-1 rounded-lg border hairline bg-background px-2 py-1 text-xs"
                    />
                    <input
                      type="time"
                      value={h.close}
                      onChange={(e) =>
                        setHours((prev) => prev.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))
                      }
                      className="flex-1 rounded-lg border hairline bg-background px-2 py-1 text-xs"
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setHours((prev) => prev.map((x, j) => (j === i ? { ...x, closed: !x.closed } : x)))}
                  className="rounded-pill border hairline px-2 py-1 text-[10px]"
                >
                  {h.closed ? "Open" : "Close"}
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setHours((prev) => prev.map((x) => ({ ...x, open: prev[0].open, close: prev[0].close, closed: prev[0].closed })))
              }
              className="w-full rounded-pill border hairline py-2 text-xs"
            >
              Copy Monday to all days
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border hairline bg-card p-3">

              <label className="mb-2 block text-[10px] uppercase tracking-wider text-muted-foreground">Primary color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-9 w-12 rounded-lg" />
                <input
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  className="flex-1 rounded-lg border hairline bg-background px-3 py-2 text-xs"
                />
              </div>
            </div>
            <div className="rounded-xl border hairline bg-card p-3">
              <label className="mb-2 block text-[10px] uppercase tracking-wider text-muted-foreground">Secondary color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="h-9 w-12 rounded-lg" />
                <input
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value)}
                  className="flex-1 rounded-lg border hairline bg-background px-3 py-2 text-xs"
                />
              </div>
            </div>
            <Field label="Logo URL (optional)" value={logoUrl} onChange={setLogoUrl} placeholder="https://…" />
          </div>

        )}

        {step === 4 && (
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Instagram (optional)" value={instagram} onChange={setInstagram} placeholder="https://instagram.com/…" />
            <Field label="WhatsApp number (optional)" value={whatsapp} onChange={setWhatsapp} placeholder="+962 7…" />
            <Field label="Google Maps link (optional)" value={mapsUrl} onChange={setMapsUrl} placeholder="https://maps.google.com/…" />
          </div>
        )}

      </div>

      <div className="mt-6 flex items-center gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border hairline"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <button
          type="button"
          disabled={!canContinue || saving}
          onClick={next}
          className="flex-1 rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "…" : step === STEPS.length - 1 ? "Finish setup" : "Continue"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block px-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1 block px-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-pill border px-3 py-2 text-xs transition ${
              value === o ? "border-primary bg-primary/10 font-semibold text-primary" : "hairline bg-card"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
