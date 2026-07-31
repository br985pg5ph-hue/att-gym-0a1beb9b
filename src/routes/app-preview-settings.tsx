import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Internal unbranded member-app preview: settings.
 * Redirects into the reserved "preview" workspace so it isn't tied to a real gym.
 */
export const Route = createFileRoute("/app-preview-settings")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/gym/preview/profile/settings" as any });
  },
  component: () => null,
});
