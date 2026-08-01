import { createFileRoute, redirect } from "@tanstack/react-router";

/** Profile details are collected once at the Nuvo level, not per gym. */
export const Route = createFileRoute("/gym/$gymSlug/complete-profile")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/app/complete-profile" as any });
  },
  component: () => null,
});
