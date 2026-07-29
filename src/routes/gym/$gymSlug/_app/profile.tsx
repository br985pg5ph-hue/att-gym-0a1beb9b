import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/g/$gymSlug/_app/profile")({
  component: () => <Outlet />,
});
