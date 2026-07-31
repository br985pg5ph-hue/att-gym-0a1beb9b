import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Internal unbranded member-app preview: membership.
 * Redirects into the reserved "preview" workspace so it isn't tied to a real gym.
 */
export const Route = createFileRoute("/app-preview-membership")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/gym/preview/membership" as any });
  },
  component: () => null,
});
