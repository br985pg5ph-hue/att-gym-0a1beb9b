import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { useAuth, useLang } from "@/lib/providers";
import { MapPin, Flame, Trophy, Clock, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/home")({
  component: HomePage,
});

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function HomePage() {
  const { profile, user } = useAuth();
  const { t } = useLang();
  const [coords, setCoords] = useState<{lat:number; lng:number} | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {});
  }, []);

  const { data: gym } = useQuery({
    queryKey: ["gym"],
    queryFn: async () => (await supabase.from("gym_info").select("*").eq("id", 1).single()).data,
  });

  const { data: nextBooking } = useQuery({
    queryKey: ["next-booking", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("bookings")
        .select("id, status, classes(id, type, title, starts_at, coaches(name))")
        .eq("member_id", user!.id).eq("status", "upcoming")
        .order("created_at", { ascending: false });
      const upcoming = (data ?? []).filter((b: any) => new Date(b.classes.starts_at) > new Date())
        .sort((a: any, b: any) => new Date(a.classes.starts_at).getTime() - new Date(b.classes.starts_at).getTime());
      return upcoming[0] ?? null;
    },
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.goodMorning : hour < 18 ? t.goodAfternoon : t.goodEvening;

  const distanceKm = coords && gym ? haversine(coords.lat, coords.lng, Number(gym.lat), Number(gym.lng)) : null;
  const etaMin = distanceKm ? Math.max(3, Math.round((distanceKm / 30) * 60)) : null;

  return (
    <div>
      <PageHeader title={`${greeting},`} subtitle={profile?.name || ""} right={<Logo size={44} />} />

      <div className="space-y-4 px-5">
        {/* Next class */}
        <div className="card-surface p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.nextClass}</p>
          {nextBooking ? (
            <div className="mt-2">
              <h3 className="font-display text-2xl">{(nextBooking as any).classes.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date((nextBooking as any).classes.starts_at).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                {(nextBooking as any).classes.coaches?.name && ` • ${(nextBooking as any).classes.coaches.name}`}
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">{t.noUpcoming}</p>
              <Link to="/book" className="mt-3 inline-flex items-center gap-1 rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                {t.book} <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* Time to gym */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-primary/15 text-primary"><Clock size={20} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.timeToGym}</p>
              <p className="font-display text-2xl leading-none mt-1">
                {etaMin ? `${etaMin} min` : "—"}
              </p>
              {distanceKm && <p className="text-xs text-muted-foreground">{distanceKm.toFixed(1)} km away</p>}
            </div>
          </div>
        </div>

        {/* Location teaser */}
        <Link to="/location" className="card-surface flex items-center gap-3 p-5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-silver/15 text-silver"><MapPin size={20} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.ourLocation}</p>
            <p className="truncate text-sm font-medium">{gym?.address || "—"}</p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground flip-rtl" />
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 text-muted-foreground"><Trophy size={16} /><span className="text-[10px] uppercase tracking-widest">{t.classesAttended}</span></div>
            <p className="font-display mt-1 text-3xl">{profile?.classes_attended ?? 0}</p>
          </div>
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 text-muted-foreground"><Flame size={16} /><span className="text-[10px] uppercase tracking-widest">{t.currentStreak}</span></div>
            <p className="font-display mt-1 text-3xl">{profile?.streak ?? 0} <span className="text-sm text-muted-foreground">{t.days}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
