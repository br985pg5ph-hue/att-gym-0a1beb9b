import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { resolveMemberEntry } from "@/lib/memberRouting";

export const Route = createFileRoute("/app/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/app/auth" as any });
    throw redirect({ to: (await resolveMemberEntry(data.user.id)) as any });
  },
  component: () => null,
});
