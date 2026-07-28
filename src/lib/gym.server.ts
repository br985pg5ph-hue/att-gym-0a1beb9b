import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Server-side resolution of the deployment's gym (tenant). */
export function serverGymSlug(): string {
  return (
    process.env.GYM_SLUG?.trim() ||
    process.env.VITE_GYM_SLUG?.trim() ||
    "att-academy"
  );
}

let cachedSlug: string | null = null;
let cachedId: string | null = null;

export async function resolveGymId(): Promise<string> {
  const slug = serverGymSlug();
  if (cachedSlug === slug && cachedId) return cachedId;
  const { data, error } = await supabaseAdmin
    .from("gyms")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`No gym found for slug "${slug}"`);
  cachedSlug = slug;
  cachedId = data.id as string;
  return cachedId;
}
