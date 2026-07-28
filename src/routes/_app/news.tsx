import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/lib/gym";
import { PageHeader } from "@/components/AppShell";
import { useLang } from "@/lib/providers";

export const Route = createFileRoute("/_app/news")({
  component: NewsPage,
});

function relTime(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
function dayLabel(d: string) {
  const date = new Date(d);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}
function timeLabel(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const TAG_COLORS: Record<string,string> = {
  Event: "bg-primary/15 text-primary",
  News: "bg-silver/20 text-silver",
  Update: "bg-emerald-500/15 text-emerald-400",
};

function NewsPage() {
  const { t } = useLang();
  const { data = [] } = useQuery({
    queryKey: ["announcements", gymId],
    enabled: !!gymId,
    queryFn: async () => (await supabase.from("announcements").select("*").eq("gym_id", gymId!).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div>
      <PageHeader title={t.news} />
      <div className="space-y-3 px-5">
        {data.map((a: any) => (
          <article key={a.id} className="card-surface p-5">
            <div className="flex items-center justify-between">
              <span className={`rounded-pill px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${TAG_COLORS[a.tag] ?? "bg-muted text-muted-foreground"}`}>{a.tag}</span>
              <span className="text-[10px] text-muted-foreground">{relTime(a.created_at)}</span>
            </div>
            <h2 className="font-display mt-3 text-2xl leading-tight">{a.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
            <div className="mt-3 flex items-center gap-2 border-t border-hairline pt-3 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{dayLabel(a.created_at)}</span>
              <span>·</span>
              <span>{timeLabel(a.created_at)}</span>
              <span className="ml-auto">{new Date(a.created_at).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}</span>
            </div>
          </article>

        ))}
      </div>
    </div>
  );
}
