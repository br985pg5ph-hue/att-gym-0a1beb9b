import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Building2, ShieldCheck, LogOut } from "lucide-react";
import { AuthBrand } from "@/components/AuthBrand";
import { resolveSpaces, spaceDestination, spaceKey, rememberSpace, type Space } from "@/lib/spaces";

export const Route = createFileRoute("/spaces")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose your space — Nuvo" },
      { name: "description", content: "Pick which part of Nuvo to open." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SpacesPage,
});

const ICONS = { member: Users, admin: Building2, console: ShieldCheck } as const;

function SpacesPage() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<Space[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        nav({ to: "/signin" });
        return;
      }
      try {
        const list = await resolveSpaces(data.user.id);
        if (cancelled) return;
        setUserId(data.user.id);
        setSpaces(list);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load your spaces");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  const open = async (space: Space) => {
    if (!userId) return;
    rememberSpace(spaceKey(space));
    nav({ to: (await spaceDestination(space, userId)) as any });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/signin", replace: true });
  };

  return (
    <div className="nuvo-site min-h-screen w-full bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-10">
        <AuthBrand subtitle="Choose your space" />

        {!spaces ? (
          <p className="text-center text-xs text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-3">
            {spaces.map((s) => {
              const Icon = ICONS[s.kind];
              return (
                <button
                  key={spaceKey(s)}
                  onClick={() => open(s)}
                  className="card-surface flex items-center gap-4 p-5 text-start transition hover:border-primary"
                >
                  <Icon size={20} className="shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="font-display block text-xl">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">{s.sublabel}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={signOut}
          className="mt-6 inline-flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground hover:text-foreground"
        >
          <LogOut size={12} /> Sign out
        </button>
      </div>
    </div>
  );
}
