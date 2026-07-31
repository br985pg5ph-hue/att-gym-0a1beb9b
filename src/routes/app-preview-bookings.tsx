import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Internal unbranded member-app preview: bookings.
 * Redirects into the reserved "preview" workspace so it isn't tied to a real gym.
 */
export const Route = createFileRoute("/app-preview-bookings")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/gym/preview/profile/bookings" as any });
  },
  component: () => null,
});
