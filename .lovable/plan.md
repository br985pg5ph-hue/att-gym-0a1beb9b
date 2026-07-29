## Problem

The button in the setup wizard already links to `/g/$gymSlug/admin`, so the navigation itself fires — but the admin page renders nothing.

In `src/routes/g/$gymSlug/admin.tsx` the layout decides whether it is showing a child route with:

```
const isChild = pathname !== "/admin" && pathname !== "/admin/";
if (isChild) return <Outlet />;
```

Since multi-tenancy moved the URL to `/g/att-academy/admin`, that comparison is always true, so the dashboard body is skipped and an empty `<Outlet />` is rendered.

## Fix

1. In `admin.tsx`, replace the hardcoded pathname comparison with a tenant-aware check — compare against the current gym's admin base path (`/g/{gymSlug}/admin`, with or without trailing slash) using the route's `gymSlug` param, so child routes like `/g/{slug}/admin/members/{id}` still render via `<Outlet />` while the base path renders the dashboard.
2. Keep the setup wizard button as-is (it points at the right route) and verify the flow: from `/platform/setup`, clicking "Go to Admin Dashboard" loads the gym admin dashboard, and the member-detail child route still works.

## Note

Access is still gated by the existing `beforeLoad` guard (staff/admin/owner role and matching gym), so an owner whose profile belongs to that gym will land on the dashboard; anyone else is redirected as before.
