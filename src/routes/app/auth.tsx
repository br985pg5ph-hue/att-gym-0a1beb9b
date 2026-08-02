import { createFileRoute, redirect } from "@tanstack/react-router";

/** Nuvo has one shared front door now. */
export const Route = createFileRoute("/app/auth")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/signin" });
  },
  component: () => null,
});
