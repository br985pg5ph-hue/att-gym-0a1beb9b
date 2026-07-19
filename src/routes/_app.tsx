import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    if (location.pathname !== "/onboarding") {
      const { data: p } = await supabase.from("profiles").select("onboarded").eq("id", data.user.id).maybeSingle();
      if (p && !p.onboarded) throw redirect({ to: "/onboarding" });
    }
  },
  component: () => (
    <AppShell><Outlet /></AppShell>
  ),
});

