import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/platform")({
  component: PlatformLayout,
});

function PlatformLayout() {
  return (
    <div className="nuvo-site min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}
