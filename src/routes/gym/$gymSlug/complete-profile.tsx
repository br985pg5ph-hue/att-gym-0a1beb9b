import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthBrand } from "@/components/AuthBrand";
import { CountrySelect } from "@/components/CountrySelect";
import { toast } from "sonner";
import { gymPath, useGymSlug } from "@/lib/gym";

export const Route = createFileRoute("/gym/$gymSlug/complete-profile")({
  ssr: false,
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: gymPath(params.gymSlug, "/auth") as any });
  },
  component: CompleteProfilePage,
});

/** True when the signed-in profile is missing the details we require of every member. */
export function profileNeedsDetails(p: { name?: string | null; phone?: string | null; gender?: string | null } | null) {
  if (!p) return true;
  return !p.name?.trim() || !p.phone?.trim() || !p.gender?.trim();
}

function CompleteProfilePage() {
  const nav = useNavigate();
  const routeSlug = useGymSlug();

  const [name, setName] = useState("");
  const [cc, setCc] = useState("+962");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("name, phone, gender")
        .eq("id", u.user.id)
        .maybeSingle();
      if (cancelled) return;
      const meta = (u.user.user_metadata ?? {}) as Record<string, string>;
      const guessName = p?.name?.trim() || meta.name || meta.full_name || "";
      // Auto-created profiles can fall back to the email handle — don't treat that as a real name.
      setName(guessName === u.user.email ? "" : guessName);
      if (p?.phone) {
        const m = /^(\+\d{1,4})(.*)$/.exec(p.phone);
        if (m) { setCc(m[1]); setPhone(m[2]); } else setPhone(p.phone);
      }
      if (p?.gender === "male" || p?.gender === "female") setGender(p.gender);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const complete = name.trim().length > 1 && phone.trim().length >= 6 && !!gender;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your name");
    if (phone.trim().length < 6) return toast.error("Please enter your phone number");
    if (!gender) return toast.error("Please select your gender");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim(), phone: `${cc}${phone.trim()}`, gender })
      .eq("id", u.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    nav({ to: gymPath(routeSlug, "/onboarding") as any });
  };

  return (
    <div className="nuvo-site min-h-screen w-full bg-background">
      <div className="mx-auto w-full max-w-md px-6 py-10">
        <AuthBrand subtitle="Complete your details" size={56} />
        <p className="-mt-6 mb-8 text-center text-sm text-muted-foreground">
          We need a few details before you can join your gym
        </p>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              required
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <CountrySelect value={cc} onChange={setCc} />
              <input
                required
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <div className="grid grid-cols-2 gap-2">
                {(["male", "female"] as const).map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => setGender(g)}
                    className={`rounded-pill border px-4 py-3 text-sm font-medium capitalize transition ${
                      gender === g ? "border-primary bg-primary text-primary-foreground" : "hairline bg-card"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {!gender && <p className="mt-1 text-xs text-muted-foreground">Please select your gender</p>}
            </div>
            <button
              disabled={saving || !complete}
              className="w-full rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? "…" : "Continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
