import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Optional deploy-time pin (single-gym / white-label builds). */
export function serverGymSlug(): string {
  return (
    process.env.GYM_SLUG?.trim() ||
    process.env.VITE_GYM_SLUG?.trim() ||
    "att-academy"
  );
}

const cache = new Map<string, string>();

/** Resolves a gym id from its slug (defaults to the deploy-time pin). */
export async function resolveGymId(slug?: string): Promise<string> {
  const s = slug?.trim() || serverGymSlug();
  const hit = cache.get(s);
  if (hit) return hit;
  const { data, error } = await supabaseAdmin
    .from("gyms")
    .select("id")
    .eq("slug", s)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`No gym found for slug "${s}"`);
  cache.set(s, data.id as string);
  return data.id as string;
}
