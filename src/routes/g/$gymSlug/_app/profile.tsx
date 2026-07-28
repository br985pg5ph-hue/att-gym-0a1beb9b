import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/g/$gymSlug/g/$gymSlug/_app/profile")({
  component: () => <Outlet />,
});
