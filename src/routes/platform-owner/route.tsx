import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/platform-owner")({
  component: OwnerLayout,
});

function OwnerLayout() {
  return (
    <div className="nuvo-site min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}
