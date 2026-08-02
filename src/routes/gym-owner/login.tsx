import { createFileRoute, redirect } from "@tanstack/react-router";

/** Gyms sign in through the shared Nuvo front door now. */
export const Route = createFileRoute("/gym-owner/login")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/signin" });
  },
  component: () => null,
});
