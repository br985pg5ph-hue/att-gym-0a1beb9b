import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AppTour } from "@/components/AppTour";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: p } = await supabase.from("profiles").select("onboarded, is_parent, role").eq("id", data.user.id).maybeSingle();
    if (p?.role === "staff") throw redirect({ to: "/admin" });
    if (location.pathname !== "/onboarding") {
      if (p && !p.onboarded && !p.is_parent) throw redirect({ to: "/onboarding" });
    }

  },
  component: () => (
    <AppShell><Outlet /><AppTour /></AppShell>
  ),
});


