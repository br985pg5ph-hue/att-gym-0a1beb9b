import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * One deployed instance serves exactly one gym (tenant).
 * The gym is fixed at build/deploy time through VITE_GYM_SLUG.
 */
export const GYM_SLUG: string =
  ((import.meta as any).env?.VITE_GYM_SLUG as string | undefined)?.trim() || "att-academy";

export type Gym = {
  id: string;
  slug: string;
  name: string;
  status: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  theme: Record<string, unknown> | null;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  hours: Array<{ day: string; open: string; close: string }>;
  instagram_url: string | null;
  whatsapp_number: string | null;
  maps_url: string | null;
};

export const gymQueryKey = ["gym", GYM_SLUG] as const;

export async function fetchGym(): Promise<Gym | null> {
  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("slug", GYM_SLUG)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Gym) ?? null;
}

/** Resolves the deployment's gym once and exposes its id everywhere. */
export function useGym() {
  const q = useQuery({
    queryKey: gymQueryKey,
    queryFn: fetchGym,
    staleTime: 5 * 60 * 1000,
  });
  return {
    gym: q.data ?? null,
    gymId: (q.data?.id ?? null) as string | null,
    isLoading: q.isLoading,
  };
}

/** Convenience for call sites that must pass a gym id to an insert. */
export function requireGymId(gymId: string | null | undefined): string {
  if (!gymId) throw new Error("Gym not resolved yet");
  return gymId;
}
