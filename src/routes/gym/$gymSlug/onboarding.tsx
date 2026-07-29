import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { gp, useGym } from "@/lib/gym";

export const Route = createFileRoute("/gym/$gymSlug/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: gp("/auth") });
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_parent")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.is_parent) {
      await supabase.from("profiles").update({ onboarded: true }).eq("id", data.user.id);
      throw redirect({ to: gp("/profile/children"), search: { new: 1, welcome: 1 } as any });
    }
  },
  component: OnboardingPage,
});

const EXPERIENCE = [
  { id: "none", label: "Complete beginner", desc: "Never trained a fighting sport" },
  { id: "some", label: "Some experience", desc: "A few months of training" },
  { id: "intermediate", label: "Intermediate", desc: "1–3 years of consistent training" },
  { id: "advanced", label: "Advanced", desc: "3+ years, competed or coached" },
];

const DISCIPLINES = [
  "Muay Thai", "Boxing", "MMA", "BJJ / Grappling", "Kickboxing",
  "Wrestling", "Karate", "Judo", "Taekwondo", "Functional Training", "None yet",
];

const GOALS = [
  "Get fit & lose weight", "Build strength", "Learn self-defense",
  "Compete in fights", "Stress relief", "Community & fun", "Improve technique",
];

const FREQUENCY = ["1× / week", "2–3× / week", "4–5× / week", "Daily"];

function OnboardingPage() {
  const nav = useNavigate();
  const { gym } = useGym();
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<string>("");
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<string>("");
  const [injuries, setInjuries] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const totalSteps = 5;
  const canNext =
    (step === 0 && !!experience) ||
    (step === 1 && disciplines.length > 0) ||
    (step === 2 && goals.length > 0) ||
    (step === 3 && !!frequency) ||
    step === 4;

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
    nav({ to: gp("/home") });
  };

  const skip = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("profiles").update({ onboarded: true }).eq("id", u.user.id);
    try { sessionStorage.setItem("att.startTour", "1"); } catch {}
    nav({ to: gp("/home") });
  };

  return (
    <div className="mx-auto w-full max-w-md px-6 py-8 pb-32">
      <div className="mb-6 flex flex-col items-center">
        <Logo size={56} />
        <h1 className="font-display mt-3 text-2xl">Tell us about you</h1>
        <p className="text-xs text-muted-foreground">Helps us tailor your training</p>
      </div>

      {/* progress */}
      <div className="mb-6 flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>

      {step === 0 && (
        <Section title="What's your experience with fighting sports?">
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

      {step === 1 && (
        <Section title="Which disciplines have you tried?" hint="Select all that apply">
          <Chips options={DISCIPLINES} selected={disciplines} onToggle={(v) => toggle(disciplines, setDisciplines, v)} />
        </Section>
      )}

      {step === 2 && (
        <Section title="What are your goals?" hint="Select all that apply">
          <Chips options={GOALS} selected={goals} onToggle={(v) => toggle(goals, setGoals, v)} />
        </Section>
      )}

      {step === 3 && (
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

      {step === 4 && (
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

      <div className="fixed inset-x-0 bottom-0 border-t hairline bg-background/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {step > 0 ? (
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
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-xl">{title}</h2>
      {hint && <p className="mb-4 text-xs text-muted-foreground">{hint}</p>}
      {!hint && <div className="mb-4" />}
      {children}
    </div>
  );
}

function Chips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={`rounded-pill border px-4 py-2 text-xs font-medium transition ${
              on ? "border-primary bg-primary text-primary-foreground" : "hairline bg-card"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
