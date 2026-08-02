import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getGymSetupContext } from "@/lib/platform.functions";

export const Route = createFileRoute("/gym-owner/setup")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/signin" });
    const ctx = await getGymSetupContext();
    throw redirect({
      to: "/gym/$gymSlug/admin",
      params: { gymSlug: ctx.gym.slug },
      search: { tab: "settings" },
    });
  },
  component: () => null,
});
