import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthBrand } from "@/components/AuthBrand";
import { gymPath } from "@/lib/gym";
import { profileNeedsDetails } from "@/lib/memberRouting";
import { GymFinder } from "@/routes/gym/$gymSlug/onboarding";

export const Route = createFileRoute("/app/join")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Find your gym — Nuvo" },
      { name: "description", content: "Search for your gym on Nuvo or join with the code your gym gave you." },
      { property: "og:title", content: "Find your gym — Nuvo" },
      { property: "og:description", content: "Search for your gym on Nuvo or join with the code your gym gave you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/signin" });
    const { data: p } = await supabase
      .from("profiles")
      .select("name, phone, gender, is_parent")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileNeedsDetails(p) && !p?.is_parent) {
      throw redirect({ to: "/app/complete-profile" as any });
    }
  },
  component: AppJoinPage,
});

function AppJoinPage() {
  const nav = useNavigate();
  return (
    <div className="nuvo-site min-h-screen w-full bg-background">
      <div className="mx-auto w-full max-w-md px-6 py-10">
        <AuthBrand subtitle="Find your gym" size={56} />
        <p className="-mt-6 mb-8 text-center text-sm text-muted-foreground">
          Search for your gym, or enter the join code they gave you.
        </p>
        <GymFinder
          onJoined={(g) => {
            // Once joined, the member continues inside that gym's branded app.
            nav({ to: gymPath(g.slug, "/onboarding") as any });
          }}
        />
      </div>
    </div>
  );
}
