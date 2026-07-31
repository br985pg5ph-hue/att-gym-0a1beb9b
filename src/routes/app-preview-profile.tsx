import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Internal unbranded member-app preview: profile.
 * Redirects into the reserved "preview" workspace so it isn't tied to a real gym.
 */
export const Route = createFileRoute("/app-preview-profile")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/gym/preview/profile" as any });
  },
  component: () => null,
});
