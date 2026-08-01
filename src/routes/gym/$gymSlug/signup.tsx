import { createFileRoute, redirect } from "@tanstack/react-router";

/** Sign-up is Nuvo-branded and gym-agnostic; the gym is chosen after signing in. */
export const Route = createFileRoute("/gym/$gymSlug/signup")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/app/signup" as any });
  },
  component: () => null,
});
