import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_GYM_SLUG } from "@/lib/gym";

/**
 * Legacy top-level URLs (/home, /auth, /admin, ...) used to be single-tenant.
 * Forward them into the default gym's tenant tree so old links keep working.
 */
const LEGACY = [
  "home", "book", "membership", "profile", "coaches", "news", "location",
  "reset-password", "onboarding", "staff-login", "admin",
];

/** Account entry points are Nuvo-branded and gym-agnostic now. */
const NUVO_ENTRY = ["auth", "signup", "forgot"];

export const Route = createFileRoute("/$")({
  ssr: false,
  beforeLoad: ({ params }) => {
    const splat = (params._splat ?? "").replace(/^\/+/, "");
    const head = splat.split("/")[0];
    if (head === "auth") {
      throw redirect({ to: "/signin", search: true as any });
    }
    if (NUVO_ENTRY.includes(head)) {
      throw redirect({ to: `/app/${head}` as any, search: true as any });
    }
    if (LEGACY.includes(head)) {
      throw redirect({ to: `/gym/${DEFAULT_GYM_SLUG}/${splat}` as any });
    }
  },
  component: NotFoundPage,
});


function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <div>
        <h1 className="font-display text-7xl text-primary">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Page not found</p>
        <a href="/" className="mt-6 inline-block rounded-pill bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Go home</a>
      </div>
    </div>
  );
}
