import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/platform/")({
  ssr: false,
  component: PlatformLanding,
});

function PlatformLanding() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10">
      <div className="mb-10 flex flex-col items-center text-center">
        <Logo size={100} />
        <h1 className="font-display mt-5 text-4xl">ATT Gym Hub</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          The multi-tenant platform for Muay Thai & MMA gyms.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <Link
          to="/platform/signup"
          className="flex w-full items-center justify-center rounded-pill bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
        >
          Sign up your gym
        </Link>
        <Link
          to="/platform/login"
          className="flex w-full items-center justify-center rounded-pill border hairline bg-card py-3.5 text-sm font-semibold"
        >
          Platform admin login
        </Link>
        <div className="pt-4 text-center">
          <Link to="/auth" className="text-xs text-muted-foreground hover:text-foreground">
            Member or staff login →
          </Link>
        </div>
      </div>
    </div>
  );
}
