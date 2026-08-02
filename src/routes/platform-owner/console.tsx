import { createFileRoute, redirect } from "@tanstack/react-router";

/** The console is reached through the shared sign-in; access is checked server-side. */
export const Route = createFileRoute("/platform-owner/console")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/signin" });
  },
  component: () => null,
});
