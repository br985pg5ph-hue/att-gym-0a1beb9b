import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Internal unbranded member-app preview: onboarding.
 * Redirects into the reserved "preview" workspace so it isn't tied to a real gym.
 */
export const Route = createFileRoute("/app-preview-onboarding")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/gym/preview/onboarding" as any });
  },
  component: () => null,
});
