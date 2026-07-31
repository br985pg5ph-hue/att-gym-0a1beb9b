import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthBrand } from "@/components/AuthBrand";
import { toast } from "sonner";
import { gymPath, useGymSlug } from "@/lib/gym";
import {
  fetchMembershipBySlug,
  joinGymByCode,
  searchGyms,
  signWaiver,
  type GymSearchResult,
} from "@/lib/membership";
import {
  Search, MapPin, ShieldCheck, Check,
  Dumbbell, Footprints, Activity, Flame, Users, Flower2, Move, Waves,
  Trophy, Swords, Bike, CircleDashed,
  TrendingDown, Zap, HeartPulse, StretchHorizontal, Brain, PartyPopper, Heart,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { profileNeedsDetails } from "./complete-profile";


export const Route = createFileRoute("/gym/$gymSlug/onboarding")({
  ssr: false,
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: gymPath(params.gymSlug, "/auth") as any });
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_parent, name, phone, gender")
      .eq("id", data.user.id)
      .maybeSingle();
    // Social sign-ups arrive without a phone/gender — collect them first.
    if (profileNeedsDetails(profile) && !profile?.is_parent) {
      throw redirect({ to: gymPath(params.gymSlug, "/complete-profile") as any });
    }
    if (profile?.is_parent) {
      await supabase.from("profiles").update({ onboarded: true }).eq("id", data.user.id);
      throw redirect({
        to: gymPath(params.gymSlug, "/profile/children") as any,
        search: { new: 1, welcome: 1 } as any,
      });
    }
  },

  component: OnboardingPage,
});

const EXPERIENCE = [
  { id: "none", label: "Complete beginner", desc: "New to training or coming back after a long break" },
  { id: "some", label: "Some experience", desc: "A few months of regular training" },
  { id: "intermediate", label: "Intermediate", desc: "1–3 years of consistent training" },
  { id: "advanced", label: "Advanced", desc: "3+ years, very comfortable in the gym" },
];

type Option = { value: string; icon: LucideIcon };

const DISCIPLINES: Option[] = [
  { value: "Weight training", icon: Dumbbell },
  { value: "Cardio / Running", icon: Footprints },
  { value: "Functional training", icon: Activity },
  { value: "CrossFit style", icon: Flame },
  { value: "Group classes", icon: Users },
  { value: "Yoga", icon: Flower2 },
  { value: "Pilates", icon: Move },
  { value: "Swimming", icon: Waves },
  { value: "Team sports", icon: Trophy },
  { value: "Martial arts", icon: Swords },
  { value: "Cycling", icon: Bike },
  { value: "None yet", icon: CircleDashed },
];

const GOALS: Option[] = [
  { value: "Lose weight", icon: TrendingDown },
  { value: "Build muscle", icon: Dumbbell },
  { value: "Get stronger", icon: Zap },
  { value: "Improve endurance", icon: HeartPulse },
  { value: "Flexibility & mobility", icon: StretchHorizontal },
  { value: "Stress relief", icon: Brain },
  { value: "Community & fun", icon: PartyPopper },
  { value: "General health", icon: Heart },
];


const FREQUENCY = ["1× / week", "2–3× / week", "4–5× / week", "Daily"];

const DEFAULT_WAIVER = `I confirm that I am participating in training, classes and use of the facilities at my own risk.

I understand that physical training carries a risk of injury. I declare that I am medically fit to train and that I have disclosed any injury, illness or condition that may affect my participation.

I agree to follow the gym's rules, the instructions of its coaches and staff, and to treat other members and the facilities with respect.

I release the gym, its owners, coaches and staff from liability for any injury, loss or damage arising from my participation, except where caused by their proven negligence.`;

type JoinedGym = { id: string; slug: string; name: string; waiver_text: string };

function OnboardingPage() {
  const nav = useNavigate();
  const routeSlug = useGymSlug();

  const [step, setStep] = useState(0);
  const [gym, setGym] = useState<JoinedGym | null>(null);
  const [waiverSigned, setWaiverSigned] = useState(false);
  const [checking, setChecking] = useState(true);

  const [experience, setExperience] = useState<string>("");
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<string>("");
  const [injuries, setInjuries] = useState("");
  const [saving, setSaving] = useState(false);

  // Already a member here (e.g. signed up on this gym's page)? Skip the search step.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return;
        const m = await fetchMembershipBySlug(u.user.id, routeSlug);
        if (cancelled || !m?.gyms) return;
        setGym({
          id: m.gyms.id,
          slug: m.gyms.slug,
          name: m.gyms.name,
          waiver_text: m.gyms.waiver_text || "",
        });
        setWaiverSigned(!!m.waiver_signed_at);
        setStep(m.waiver_signed_at ? 2 : 1);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [routeSlug]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const totalSteps = 7;

  const stepDone = (i: number) => {
    switch (i) {
      case 0: return !!gym;
      case 1: return waiverSigned;
      case 2: return !!experience;
      case 3: return disciplines.length > 0;
      case 4: return goals.length > 0;
      case 5: return !!frequency;
      default: return true;
    }
  };

  // Lowest step still reachable: can go back to gym search until the waiver is signed.
  const minStep = waiverSigned ? 2 : 0;

  // A tab is reachable when every earlier step is complete.
  const canGoTo = (i: number) => {
    if (i < minStep) return false;
    if (i <= step) return true;
    for (let j = minStep; j < i; j++) if (!stepDone(j)) return false;
    return true;
  };

  const canNext = stepDone(step);

  const finish = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").update({
      experience_level: experience,
      disciplines,
      goals,
      training_frequency: frequency,
      injuries: injuries.trim() || null,
      interests: disciplines,
      onboarded: true,
    }).eq("id", u.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Welcome to ${gym?.name ?? "the gym"}!`);
    try { sessionStorage.setItem("att.startTour", "1"); } catch {}
    nav({ to: gymPath(gym?.slug ?? routeSlug, "/home") as any });
  };

  const skip = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("profiles").update({ onboarded: true }).eq("id", u.user.id);
    try { sessionStorage.setItem("att.startTour", "1"); } catch {}
    nav({ to: gymPath(gym?.slug ?? routeSlug, "/home") as any });
  };

  return (
    <div className="nuvo-site min-h-screen w-full bg-background">
      <div className="mx-auto w-full max-w-md px-6 py-10 pb-36">
        <AuthBrand subtitle={step === 0 ? "Find your gym" : step === 1 ? "Membership waiver" : "Tell us about you"} />
        <p className="-mt-6 mb-8 text-center text-sm text-muted-foreground">
          {step === 0
            ? "Search the gyms on Nuvo and join yours"
            : step === 1
              ? `Please read and sign before training at ${gym?.name ?? "your gym"}`
              : `Helps ${gym?.name ?? "your gym"} tailor your training`}
        </p>

        {/* progress — tappable steps */}
        <div className="mb-6 flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const enabled = canGoTo(i) && i !== step;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Step ${i + 1} of ${totalSteps}`}
                aria-current={i === step ? "step" : undefined}
                disabled={!enabled}
                onClick={() => enabled && setStep(i)}
                className={`group flex-1 py-2 ${enabled ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`block h-1 rounded-full transition ${
                    i <= step ? "bg-primary" : "bg-border"
                  } ${enabled ? "group-hover:opacity-70" : ""}`}
                />
              </button>
            );
          })}
        </div>

        {step === 0 && !checking && (
          <GymFinder
            onJoined={(g) => {
              setGym(g);
              setStep(1);
            }}
          />
        )}

        {step === 1 && gym && (
          <WaiverStep
            gym={gym}
            onSigned={() => { setWaiverSigned(true); setStep(2); }}
          />
        )}

        {step === 2 && (
          <Section title="What's your training experience?">
            <div className="space-y-2">
              {EXPERIENCE.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setExperience(e.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    experience === e.id ? "border-primary bg-primary/10" : "hairline bg-card"
                  }`}
                >
                  <div className="text-sm font-semibold">{e.label}</div>
                  <div className="text-xs text-muted-foreground">{e.desc}</div>
                </button>
              ))}
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section
            title="What types of training have you tried?"
            counter={<SelectionCounter count={disciplines.length} onClear={() => setDisciplines([])} />}
          >
            <OptionGrid
              options={DISCIPLINES}
              selected={disciplines}
              onToggle={(v) => toggle(disciplines, setDisciplines, v)}
            />
          </Section>
        )}

        {step === 4 && (
          <Section
            title="What are your goals?"
            counter={<SelectionCounter count={goals.length} onClear={() => setGoals([])} />}
          >
            <OptionGrid options={GOALS} selected={goals} onToggle={(v) => toggle(goals, setGoals, v)} />
          </Section>
        )}


        {step === 5 && (
          <Section title="How often do you plan to train?">
            <div className="space-y-2">
              {FREQUENCY.map((f) => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`w-full rounded-2xl border p-4 text-left text-sm font-medium transition ${
                    frequency === f ? "border-primary bg-primary/10" : "hairline bg-card"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </Section>
        )}

        {step === 6 && (
          <Section title="Any injuries or conditions we should know about?" hint="Optional — helps coaches keep you safe">
            <textarea
              value={injuries}
              onChange={(e) => setInjuries(e.target.value.slice(0, 500))}
              placeholder="e.g. old knee injury, asthma…"
              rows={5}
              className="w-full rounded-2xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{injuries.length}/500</p>
          </Section>
        )}

        {step >= 2 && (
          <div className="fixed inset-x-0 bottom-0 border-t hairline bg-background/90 px-6 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-md items-center gap-3">
              {step > 2 ? (
                <button onClick={() => setStep(step - 1)} className="rounded-pill border hairline px-5 py-3 text-sm font-medium">
                  Back
                </button>
              ) : (
                <button onClick={skip} className="rounded-pill px-5 py-3 text-sm font-medium text-muted-foreground">
                  Skip
                </button>
              )}
              {step < totalSteps - 1 ? (
                <button
                  disabled={!canNext}
                  onClick={() => setStep(step + 1)}
                  className="flex-1 rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                >
                  Continue
                </button>
              ) : (
                <button
                  disabled={saving}
                  onClick={finish}
                  className="flex-1 rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saving ? "…" : "Finish"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Step 1 — search the gym directory, or join with a code the gym provided. */
function GymFinder({ onJoined }: { onJoined: (gym: JoinedGym) => void }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [joining, setJoining] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [pendingCodeFor, setPendingCodeFor] = useState<GymSearchResult | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  const { data: gyms = [], isLoading } = useQuery({
    queryKey: ["gym-search", debounced],
    queryFn: () => searchGyms(debounced),
  });

  const loadGym = async (slug: string): Promise<JoinedGym | null> => {
    const { data } = await supabase
      .from("gyms")
      .select("id, slug, name, waiver_text")
      .eq("slug", slug)
      .maybeSingle();
    return (data as unknown as JoinedGym) ?? null;
  };

  const join = async (g: GymSearchResult, joinCode?: string) => {
    setJoining(g.id);
    const { error } = await supabase.rpc("join_gym", {
      _slug: g.slug,
      _code: joinCode?.trim() || undefined,
    });
    setJoining(null);
    if (error) {
      if (/join code/i.test(error.message)) {
        setPendingCodeFor(g);
        return;
      }
      return toast.error(error.message);
    }
    setPendingCodeFor(null);
    onJoined({ id: g.id, slug: g.slug, name: g.name, waiver_text: g.waiver_text || "" });
  };

  const joinWithCode = async () => {
    if (pendingCodeFor) return join(pendingCodeFor, code);
    setJoining("code");
    try {
      const slug = await joinGymByCode(code);
      const g = await loadGym(slug);
      if (!g) throw new Error("Gym not found");
      onJoined(g);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join that gym");
    } finally {
      setJoining(null);
    }
  };

  return (
    <div>
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 80))}
          placeholder="Search by gym name or city"
          className="w-full rounded-pill border hairline bg-card py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="mt-4 space-y-2">
        {isLoading && <p className="py-6 text-center text-xs text-muted-foreground">Searching…</p>}
        {!isLoading && gyms.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No gyms matched “{debounced}”. Ask your gym for their join code below.
          </p>
        )}
        {gyms.map((g) => (
          <div key={g.id} className="rounded-2xl border hairline bg-card p-4">
            <div className="flex items-center gap-3">
              {g.logo_url ? (
                <img src={g.logo_url} alt={`${g.name} logo`} className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                  {g.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{g.name}</div>
                <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin size={11} /> {g.city || g.address || "—"}
                </div>
              </div>
              <button
                disabled={joining === g.id}
                onClick={() => join(g)}
                className="rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                {joining === g.id ? "…" : "Join"}
              </button>
            </div>

            {pendingCodeFor?.id === g.id && (
              <div className="mt-3 flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.slice(0, 32))}
                  placeholder="Join code from the gym"
                  className="flex-1 rounded-xl border hairline bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={joinWithCode}
                  className="rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  Confirm
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border hairline bg-card p-4">
        {!showCode ? (
          <button onClick={() => setShowCode(true)} className="text-xs font-semibold text-primary">
            Can't find your gym? Enter a gym code
          </button>
        ) : (
          <>
            <label className="mb-2 block text-[10px] uppercase tracking-wider text-muted-foreground">Gym code</label>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.slice(0, 32))}
                placeholder="e.g. 4F2A9C"
                className="flex-1 rounded-xl border hairline bg-background px-3 py-2 text-sm uppercase outline-none focus:border-primary"
              />
              <button
                disabled={joining === "code" || !code.trim()}
                onClick={() => { setPendingCodeFor(null); joinWithCode(); }}
                className="rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                {joining === "code" ? "…" : "Join"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Step 2 — read and sign this gym's waiver. */
function WaiverStep({ gym, onSigned }: { gym: JoinedGym; onSigned: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const [signing, setSigning] = useState(false);
  const text = useMemo(() => (gym.waiver_text?.trim() ? gym.waiver_text : DEFAULT_WAIVER), [gym.waiver_text]);

  const sign = async () => {
    if (!agreed) return toast.error("Please tick the box to agree");
    if (name.trim().length < 2) return toast.error("Type your full name to sign");
    setSigning(true);
    try {
      await signWaiver(gym.id, name);
      toast.success("Waiver signed");
      onSigned();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your signature");
    } finally {
      setSigning(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck size={16} className="text-primary" /> {gym.name} — liability waiver
      </div>
      <div className="max-h-72 overflow-y-auto whitespace-pre-line rounded-2xl border hairline bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        {text}
      </div>

      <label className="mt-4 flex items-start gap-3 rounded-2xl border hairline bg-card p-4">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
        />
        <span className="text-xs">I have read and agree to the waiver above.</span>
      </label>

      <label className="mt-3 mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
        Type your full name to sign
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 120))}
        placeholder="Full name"
        className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
      />

      <button
        disabled={signing}
        onClick={sign}
        className="mt-4 w-full rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {signing ? "…" : "Sign & continue"}
      </button>
    </div>
  );
}

function Section({
  title,
  hint,
  counter,
  children,
}: {
  title: string;
  hint?: string;
  counter?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display text-xl">{title}</h2>
      {counter ? (
        <div className="mb-4 mt-1">{counter}</div>
      ) : hint ? (
        <p className="mb-4 text-xs text-muted-foreground">{hint}</p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
    </div>
  );
}

/** "3 selected" + a Clear action, shown under a multi-select question. */
function SelectionCounter({ count, onClear }: { count: number; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        {count === 0 ? "Select all that apply" : `${count} selected`}
      </p>
      {count > 0 && (
        <button onClick={onClear} className="text-xs font-semibold text-primary">
          Clear
        </button>
      )}
    </div>
  );
}

function OptionGrid({
  options,
  selected,
  onToggle,
}: {
  options: Option[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {options.map(({ value, icon: Icon }) => {
        const on = selected.includes(value);
        return (
          <button
            key={value}
            onClick={() => onToggle(value)}
            aria-pressed={on}
            className={`relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition active:scale-[0.97] ${
              on ? "border-primary bg-primary/10" : "hairline bg-card"
            }`}
          >
            <Icon size={22} className={on ? "text-primary" : "text-muted-foreground"} />
            <span className="text-xs font-medium leading-tight">{value}</span>
            {on && (
              <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

