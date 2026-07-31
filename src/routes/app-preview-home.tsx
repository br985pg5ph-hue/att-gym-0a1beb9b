import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Internal unbranded member-app preview: home.
 * Redirects into the reserved "preview" workspace so it isn't tied to a real gym.
 */
export const Route = createFileRoute("/app-preview-home")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/gym/preview/home" as any });
  },
  component: () => null,
});
