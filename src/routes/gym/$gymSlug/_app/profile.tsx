import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/gym/$gymSlug/_app/profile")({
  component: () => <Outlet />,
});
