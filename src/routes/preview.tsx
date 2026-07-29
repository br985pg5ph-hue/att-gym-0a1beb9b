import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Internal, unbranded preview of the member app.
 * Points at the reserved "preview" workspace so it isn't tied to any real gym.
 */
export const Route = createFileRoute("/preview")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/gym/preview/home" as any });
  },
  component: () => null,
});
