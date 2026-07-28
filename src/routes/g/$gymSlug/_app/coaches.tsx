import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/lib/gym";
import { PageHeader } from "@/components/AppShell";
import { useLang } from "@/lib/providers";
import { User } from "lucide-react";

export const Route = createFileRoute("/g/$gymSlug/_app/coaches")({
  component: CoachesPage,
});

function CoachesPage() {
  const { t } = useLang();
  const { gymId } = useGym();
  const { data: coaches = [] } = useQuery({
    queryKey: ["coaches"],
    queryFn: async () => (await supabase.from("coaches").select("*").eq("gym_id", gymId!).order("sort_order")).data ?? [],
  });
  return (
    <div>
      <PageHeader title={t.coaches} />
      <div className="space-y-3 px-5">
        {coaches.map((c: any) => (
          <div key={c.id} className="card-surface flex gap-4 p-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted text-muted-foreground">
              {c.photo_url ? <img src={c.photo_url} alt={c.name} className="h-full w-full object-cover" /> : <User size={28} />}
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-xl leading-none">{c.name}</h3>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-primary">{c.specialty}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.bio}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
