import { createFileRoute } from "@tanstack/react-router";
import { GymSetupPanel } from "@/components/GymSetupPanel";

export const Route = createFileRoute("/test-hours")({
  component: () => (
    <div className="min-h-screen bg-background p-8">
      <GymSetupPanel />
    </div>
  ),
});
