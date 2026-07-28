import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AppTour } from "@/components/AppTour";

export const Route = createFileRoute("/g/$gymSlug/_app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: gp("/auth") });
    const { data: p } = await supabase.from("profiles").select("onboarded, is_parent, role").eq("id", data.user.id).maybeSingle();
    if (p?.role === "staff") throw redirect({ to: gp("/admin") });
    if (location.pathname !== "/onboarding") {
      if (p && !p.onboarded && !p.is_parent) throw redirect({ to: gp("/onboarding") });
    }

  },
  component: () => (
    <AppShell><Outlet /><AppTour /></AppShell>
  ),
});


