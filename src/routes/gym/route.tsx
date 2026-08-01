import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/gym")({
  component: () => <Outlet />,
});
