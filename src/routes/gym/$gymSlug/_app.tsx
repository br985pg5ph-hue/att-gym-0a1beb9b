import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AppTour } from "@/components/AppTour";
import { gp } from "@/lib/gym";
import { fetchMembershipBySlug, isStaffRole } from "@/lib/membership";

export const Route = createFileRoute("/gym/$gymSlug/_app")({
  ssr: false,
  beforeLoad: async ({ location, params }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: gp("/auth") });

    // Gym-specific role/state lives on the membership, identity on the profile.
    const membership = await fetchMembershipBySlug(data.user.id, params.gymSlug);
    if (!membership) throw redirect({ to: gp("/onboarding") });
    if (isStaffRole(membership.role)) throw redirect({ to: gp("/admin") });

    const { data: p } = await supabase
      .from("profiles")
      .select("onboarded, is_parent")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!location.pathname.endsWith("/onboarding")) {
      // Members must sign their gym's waiver before using the app.
      if (!membership.waiver_signed_at) throw redirect({ to: gp("/onboarding") });
      if (p && !p.onboarded && !p.is_parent) throw redirect({ to: gp("/onboarding") });
    }

  },
  component: () => (
    <AppShell><Outlet /><AppTour /></AppShell>
  ),
});



