import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Internal unbranded member-app preview: signup.
 * Redirects into the reserved "preview" workspace so it isn't tied to a real gym.
 */
export const Route = createFileRoute("/app-preview-signup")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/gym/preview/signup" as any });
  },
  component: () => null,
});
