import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NuvoLogo } from "@/components/NuvoLogo";
import { applyForGym } from "@/lib/platform.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/gym-owner/signup")({
  ssr: false,
  component: PlatformSignup,
});

function PlatformSignup() {
  const nav = useNavigate();
  const apply = useServerFn(applyForGym);
  const [loading, setLoading] = useState(false);
  const [gymName, setGymName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const normalizeSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const cleanSlug = normalizeSlug(slug);
  const isComplete =
    gymName.trim().length >= 2 &&
    cleanSlug.length >= 2 &&
    ownerName.trim().length >= 2 &&
    email.trim().length > 0 &&
    phone.trim().length >= 5 &&
    password.length >= 8 &&
    confirm.length >= 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) return toast.error("Please fill in all required fields");
    if (password !== confirm) return toast.error("Passwords do not match");
    if (cleanSlug.length < 2) return toast.error("Please enter a valid gym URL slug");

    setLoading(true);
    try {
      await apply({ data: { gymName, slug: cleanSlug, ownerName, ownerEmail: email, ownerPhone: phone, password } });
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        toast.success("Application submitted! Please sign in to continue setup.");
        nav({ to: "/gym-owner/login" });
        return;
      }
      toast.success("Application submitted!");
      nav({ to: "/gym-owner/onboarding" });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <NuvoLogo size={80} />
        <h1 className="font-display mt-4 text-3xl">Sign up your gym</h1>
        <p className="mt-2 text-xs text-muted-foreground">Apply to join the Nuvo platform</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          required
          placeholder="Gym name"
          value={gymName}
          onChange={(e) => setGymName(e.target.value)}
          maxLength={120}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <div>
          <input
            required
            placeholder="Gym URL slug (e.g. att-academy)"
            value={slug}
            onChange={(e) => setSlug(normalizeSlug(e.target.value))}
            maxLength={50}
            className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <p className="mt-1 px-1 text-[10px] text-muted-foreground">
            Your gym will be reachable at {slug ? `https://${normalizeSlug(slug)}.lovable.app` : "https://<slug>.lovable.app"}
          </p>
        </div>
        <input
          required
          placeholder="Owner full name"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          maxLength={120}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <input
          required
          type="email"
          placeholder="Owner email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={255}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <input
          required
          type="tel"
          placeholder="Owner phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={30}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <input
          required
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          maxLength={128}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <input
          required
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          maxLength={128}
          className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button
          disabled={loading || !isComplete}
          className="w-full rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? "…" : "Apply"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Already have an account? <Link to="/gym-owner/login" className="font-semibold text-primary">portal login</Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">← Back</Link>
      </p>
    </div>
  );
}
