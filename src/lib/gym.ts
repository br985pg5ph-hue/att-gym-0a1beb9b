import { createContext, createElement, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Multi-tenant: one deployment serves every gym.
 * The tenant is resolved from the `/g/$gymSlug` route segment.
 * VITE_GYM_SLUG remains supported as a pin for single-gym / white-label builds.
 */
export const DEFAULT_GYM_SLUG: string =
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

const GymSlugCtx = createContext<string>(DEFAULT_GYM_SLUG);

export function GymSlugProvider({ slug, children }: { slug: string; children: ReactNode }) {
  return createElement(GymSlugCtx.Provider, { value: slug }, children);
}

/** Current tenant slug (from the URL). */
export function useGymSlug(): string {
  return useContext(GymSlugCtx);
}

/**
 * Builds an absolute in-app path for the current tenant.
 * `gp("/home")` -> "/g/att-academy/home"
 */
export function useGymPath() {
  const slug = useGymSlug();
  return (path: string) => (`/g/${slug}${path === "/" ? "" : path}` as any);
}

export function gymPath(slug: string, path: string): string {
  return `/g/${slug}${path === "/" ? "" : path}`;
}

export const gymQueryKey = (slug: string) => ["gym", slug] as const;

export async function fetchGym(slug: string): Promise<Gym | null> {
  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Gym) ?? null;
}

/** Resolves the current tenant's gym row and exposes its id everywhere. */
export function useGym() {
  const slug = useGymSlug();
  const q = useQuery({
    queryKey: gymQueryKey(slug),
    queryFn: () => fetchGym(slug),
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
