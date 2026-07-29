import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  Building2,
  ShieldCheck,
  CalendarCheck,
  CreditCard,
  BarChart3,
  Smartphone,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nuvo — Gym Management Software for Combat Sports" },
      {
        name: "description",
        content:
          "Nuvo gives Muay Thai, MMA and functional training gyms a branded member app, class booking, memberships and a full admin dashboard.",
      },
      { property: "og:title", content: "Nuvo — Gym Management Software" },
      {
        property: "og:description",
        content: "A branded member app, class booking, memberships and an admin dashboard for your gym.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NuvoHome,
});

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display tracking-tight ${className}`}>
      Nuvo<span className="text-primary">.</span>
    </span>
  );
}

const features = [
  { icon: Smartphone, title: "Branded member app", body: "Your logo, your colours, your own gym URL — members book and manage everything from their phone." },
  { icon: CalendarCheck, title: "Class booking", body: "Capacity-aware timetables, recurring classes, tracks and cancellation rules handled for you." },
  { icon: CreditCard, title: "Memberships & credits", body: "Group subscriptions, PT session credits, pauses and renewals — managed by your front desk." },
  { icon: Users, title: "Members & kids", body: "Full member profiles, parent mode for children, referrals and member IDs out of the box." },
  { icon: BarChart3, title: "Owner dashboard", body: "Daily snapshots, revenue, occupancy, signups and expiring memberships at a glance." },
  { icon: ShieldCheck, title: "Isolated & secure", body: "Every gym's data is fully separated, with staff and member access enforced at the database." },
];

const steps = [
  { n: "01", title: "Sign up your gym", body: "Tell us about your academy and apply for a workspace." },
  { n: "02", title: "Brand it", body: "Add your logo, colours, hours, location and social links in the setup wizard." },
  { n: "03", title: "Invite your members", body: "Share your gym link — members sign up, book classes and manage memberships." },
];

const included = [
  "Unlimited members",
  "Unlimited classes & coaches",
  "Branded member app",
  "Admin dashboard & reporting",
  "Kids & parent accounts",
  "Referral programme",
];

function NuvoHome() {
  return (
    <div className="nuvo-site min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b hairline bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Wordmark className="text-2xl" />
          <div className="flex items-center gap-2">
            <Link
              to="/gym-owner/login"
              className="rounded-pill border hairline bg-card px-4 py-2 text-xs font-semibold"
            >
              Portal login
            </Link>
            <Link
              to="/gym-owner/signup"
              className="hidden rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground sm:block"
            >
              Sign up your gym
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
          <span className="inline-flex items-center rounded-pill border hairline bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Gym management platform
          </span>
          <h1 className="font-display mx-auto mt-6 max-w-3xl text-5xl leading-[0.95] sm:text-7xl">
            Run your gym. <span className="text-primary">Nuvo</span> runs everything else.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm text-muted-foreground sm:text-base">
            Nuvo is the all-in-one platform for Muay Thai, MMA and functional training academies —
            a branded app for your members and a powerful dashboard for your team.
          </p>
          <div className="mx-auto mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/gym-owner/signup"
              className="flex items-center justify-center rounded-pill bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground"
            >
              Sign up your gym
            </Link>
            <Link
              to="/gym-owner/login"
              className="flex items-center justify-center rounded-pill border hairline bg-card px-7 py-3.5 text-sm font-semibold"
            >
              Portal login
            </Link>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-3xl sm:text-4xl">Everything a modern academy needs</h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            One platform for bookings, memberships, coaches, members and insights.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card-surface p-6">
                <f.icon size={20} className="text-primary" />
                <h3 className="font-display mt-4 text-xl">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-3xl sm:text-4xl">Live in three steps</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="card-surface p-6">
                <span className="font-display text-3xl text-primary">{s.n}</span>
                <h3 className="font-display mt-3 text-xl">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing / included */}
        <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
          <div className="card-surface grid gap-8 p-8 sm:p-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl">One plan, everything included</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                No per-feature upsells. Every gym on Nuvo gets the full platform, branded as their own.
              </p>
              <Link
                to="/gym-owner/signup"
                className="mt-7 inline-flex items-center justify-center rounded-pill bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground"
              >
                Sign up your gym
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:content-center">
              {included.map((i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check size={16} className="shrink-0 text-primary" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-6 py-16 text-center">
          <Building2 size={22} className="mx-auto text-primary" />
          <h2 className="font-display mt-4 text-4xl sm:text-5xl">Ready to move your gym to Nuvo?</h2>
          <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/gym-owner/signup"
              className="flex items-center justify-center rounded-pill bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground"
            >
              Sign up your gym
            </Link>
            <Link
              to="/gym-owner/login"
              className="flex items-center justify-center rounded-pill border hairline bg-card px-7 py-3.5 text-sm font-semibold"
            >
              Access portal
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t hairline">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <Wordmark className="text-xl text-foreground" />
        </div>
      </footer>
    </div>
  );
}
