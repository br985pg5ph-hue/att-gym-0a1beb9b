import { createServerFn } from "@tanstack/react-start";

/**
 * Server-resolved tenant context. The gym is fixed per deployment,
 * so clients never get to choose which gym they belong to.
 */
export const getGymContext = createServerFn({ method: "GET" }).handler(async () => {
  const { serverGymSlug, resolveGymId } = await import("@/lib/gym.server");
  return { slug: serverGymSlug(), gymId: await resolveGymId() };
});
