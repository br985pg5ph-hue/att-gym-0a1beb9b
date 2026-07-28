import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { gymPath } from "@/lib/gym";

export const Route = createFileRoute("/g/$gymSlug/")({
  ssr: false,
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: gymPath(params.gymSlug, "/auth") as any });
    throw redirect({ to: gymPath(params.gymSlug, "/home") as any });
  },
  component: () => null,
});
