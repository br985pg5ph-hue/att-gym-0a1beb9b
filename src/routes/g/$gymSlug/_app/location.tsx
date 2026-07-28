import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useLang } from "@/lib/providers";
import { useGym } from "@/lib/gym";
import { Phone, Navigation } from "lucide-react";

export const Route = createFileRoute("/_app/location")({
  component: LocationPage,
});

function LocationPage() {
  const { t } = useLang();
  const { gym } = useGym();

  if (!gym) return <PageHeader title={t.ourLocation} />;

  const mapsUrl = gym.maps_url || `https://www.google.com/maps/dir/?api=1&destination=${gym.lat},${gym.lng}`;

  return (
    <div>
      <PageHeader title={t.ourLocation} subtitle={gym.name} />
      <div className="space-y-4 px-5">
        <div className="card-surface overflow-hidden">
          <iframe
            title="Gym location map"
            src={`https://www.google.com/maps?q=${gym.lat},${gym.lng}&z=17&output=embed`}
            className="h-64 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />

          <div className="p-5">
            <p className="text-sm">{gym.address}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-pill bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground">
                <Navigation size={14} /> {t.getDirections}
              </a>
              <a href={`tel:${gym.phone}`} className="flex items-center justify-center gap-2 rounded-pill border hairline bg-card px-4 py-3 text-xs font-semibold">
                <Phone size={14} /> {t.callGym}
              </a>
            </div>
          </div>
        </div>

        <div className="card-surface p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.hours}</p>
          <ul className="mt-3 divide-y hairline">
            {(gym.hours as Array<{day:string;open:string;close:string}>).map((h) => (
              <li key={h.day} className="flex justify-between py-2 text-sm">
                <span>{h.day}</span><span className="text-muted-foreground">{h.open} – {h.close}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
