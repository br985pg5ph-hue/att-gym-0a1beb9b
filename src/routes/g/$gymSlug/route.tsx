import { createFileRoute, Outlet, notFound, Link } from "@tanstack/react-router";
import { fetchGym, gymQueryKey, GymSlugProvider, gp } from "@/lib/gym";

export const Route = createFileRoute("/g/$gymSlug")({
  ssr: false,
  loader: async ({ context, params }) => {
    const gym = await context.queryClient.ensureQueryData({
      queryKey: gymQueryKey(params.gymSlug),
      queryFn: () => fetchGym(params.gymSlug),
    });
    if (!gym) throw notFound();
    return { gym };
  },
  component: TenantLayout,
  notFoundComponent: UnknownGym,
  errorComponent: UnknownGym,
});

function UnknownGym() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="font-display text-3xl">Gym not found</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        This gym link isn't valid, or the gym is no longer on the platform.
      </p>
      <Link to="/" className="mt-6 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        Go to ATT Gym Hub
      </Link>
    </div>
  );
}

function TenantLayout() {
  const { gym } = Route.useLoaderData();
  const { gymSlug } = Route.useParams();

  if (gym.status === "suspended") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="font-display text-3xl">{gym.name}</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          This gym's account is currently inactive. Please contact your gym for more information.
        </p>
      </div>
    );
  }

  const brand: Record<string, string> = {};
  if (gym.primary_color) brand["--primary"] = gym.primary_color;
  if (gym.secondary_color) brand["--accent"] = gym.secondary_color;

  return (
    <GymSlugProvider slug={gymSlug}>
      <div style={brand as React.CSSProperties} className="contents">
        <Outlet />
      </div>
    </GymSlugProvider>
  );
}
