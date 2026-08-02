import { createFileRoute, redirect } from "@tanstack/react-router";

/** Members now sign in through the Nuvo app front door, then pick their gym. */
export const Route = createFileRoute("/gym/$gymSlug/auth")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/signin" });
  },
  component: () => null,
});
