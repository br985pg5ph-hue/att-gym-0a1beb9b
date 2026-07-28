import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Building2, Users, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ATT Gym Hub — Gym Management Software" },
      { name: "description", content: "Booking, memberships and member management for Muay Thai and MMA gyms. One platform, branded for your gym." },
      { property: "og:title", content: "ATT Gym Hub — Gym Management Software" },
      { property: "og:description", content: "Booking, memberships and member management for Muay Thai and MMA gyms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlatformHome,
});

const features = [
  { icon: Users, title: "Member app", body: "Your members book classes, manage memberships and add their kids." },
  { icon: Building2, title: "Gym dashboard", body: "Timetables, coaches, announcements and member credits in one place." },
  { icon: ShieldCheck, title: "Your branding", body: "Your logo and colours, your own gym URL, fully isolated data." },
];

function PlatformHome() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex flex-col items-center text-center">
          <Logo size={96} />
          <h1 className="font-display mt-6 text-5xl leading-none">ATT Gym Hub</h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Gym management software for Muay Thai and MMA academies — bookings, memberships,
            coaches and members, branded for your gym.
          </p>
          <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
            <Link
              to="/platform/signup"
              className="flex w-full items-center justify-center rounded-pill bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
            >
              Sign up your gym
            </Link>
            <Link
              to="/platform"
              className="flex w-full items-center justify-center rounded-pill border hairline bg-card py-3.5 text-sm font-semibold"
            >
              Platform portal
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card-surface p-5">
              <f.icon size={20} className="text-primary" />
              <h2 className="font-display mt-3 text-xl">{f.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-16 text-center text-xs text-muted-foreground">
          Already a member of a gym? Open the link your gym gave you, or{" "}
          <Link to="/g/$gymSlug" params={{ gymSlug: "att-academy" }} className="font-semibold text-primary">
            go to ATT Academy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
