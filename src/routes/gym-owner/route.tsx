import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/gym-owner")({
  component: GymPortalLayout,
});

function GymPortalLayout() {
  return (
    <div className="nuvo-site min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}
