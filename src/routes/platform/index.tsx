import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/platform/")({
  ssr: false,
  beforeLoad: async () => {
    throw redirect({ to: "/" });
  },
});
