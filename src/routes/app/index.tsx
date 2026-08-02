import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { resolveEntry } from "@/lib/spaces";

export const Route = createFileRoute("/app/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/signin" });
    throw redirect({ to: (await resolveEntry(data.user.id)) as any });
  },
  component: () => null,
});
