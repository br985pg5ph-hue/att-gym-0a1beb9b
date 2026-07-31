import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Internal unbranded member-app preview: coaches.
 * Redirects into the reserved "preview" workspace so it isn't tied to a real gym.
 */
export const Route = createFileRoute("/app-preview-coaches")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/gym/preview/coaches" as any });
  },
  component: () => null,
});
