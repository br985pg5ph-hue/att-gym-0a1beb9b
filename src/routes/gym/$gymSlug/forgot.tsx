import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/gym/$gymSlug/forgot")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/app/forgot" as any });
  },
  component: () => null,
});
