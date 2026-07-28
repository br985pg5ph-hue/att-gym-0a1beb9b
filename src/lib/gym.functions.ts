import { createServerFn } from "@tanstack/react-start";

/**
 * Resolves a tenant by slug. Slug comes from the URL; RLS still enforces
 * that the caller can only ever read their own gym's rows.
 */
export const getGymContext = createServerFn({ method: "GET" })
  .inputValidator((data: { slug?: string } | undefined) => ({ slug: data?.slug }))
  .handler(async ({ data }) => {
    const { serverGymSlug, resolveGymId } = await import("@/lib/gym.server");
    const slug = data.slug?.trim() || serverGymSlug();
    return { slug, gymId: await resolveGymId(slug) };
  });
