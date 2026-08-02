import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Building2 } from "lucide-react";
import { AuthBrand } from "@/components/AuthBrand";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create your Nuvo account" },
      {
        name: "description",
        content: "Join Nuvo as a gym member to book classes, or as a gym owner to run your academy.",
      },
      { property: "og:title", content: "Create your Nuvo account" },
      {
        property: "og:description",
        content: "Join Nuvo as a gym member to book classes, or as a gym owner to run your academy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignUpChoice,
});

function SignUpChoice() {
  return (
    <div className="nuvo-site min-h-screen w-full bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-10">
        <AuthBrand subtitle="Create your account" />

        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/app/signup" className="card-surface flex flex-col p-6 transition hover:border-primary">
            <Users size={22} className="text-primary" />
            <h2 className="font-display mt-4 text-2xl">I'm a gym member</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Join your gym on Nuvo, book classes, track your membership and manage your family's
              accounts.
            </p>
            <span className="mt-5 inline-flex w-fit rounded-pill bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground">
              Continue as member
            </span>
          </Link>

          <Link to="/gym-owner/signup" className="card-surface flex flex-col p-6 transition hover:border-primary">
            <Building2 size={22} className="text-primary" />
            <h2 className="font-display mt-4 text-2xl">I own a gym</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Register your academy, brand your own member app and manage classes, coaches and
              memberships.
            </p>
            <span className="mt-5 inline-flex w-fit rounded-pill border hairline bg-card px-5 py-2.5 text-xs font-semibold">
              Continue as gym owner
            </span>
          </Link>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Already have an account?{" "}
          <Link to="/signin" className="font-semibold text-primary">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
