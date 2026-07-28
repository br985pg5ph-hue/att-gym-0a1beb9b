
# Three-Layer Platform Restructure

## Goal

Turn the current single-tenant-per-deployment app into **one deployment that serves all three layers**:

```text
Layer 1  Platform (you)        /  and  /platform/*
Layer 2  Gym admin (customer)  /g/<gym-slug>/admin
Layer 3  Gym member (end user) /g/<gym-slug>/...   -> later wrapped as a native app
```

Today the gym is fixed at build time by `VITE_GYM_SLUG` (it isn't even set — everything falls back to `att-academy`). Every new customer would need a separate deploy. That is the foundation we fix first; no new features in this pass.

## What changes

### 1. Tenant comes from the URL, not the build

- Replace the `GYM_SLUG` constant in `src/lib/gym.ts` with a **gym context** resolved from the route param `$gymSlug`.
- `useGym()` keeps the same shape (`{ gym, gymId, isLoading }`) so the ~12 files that consume it need minimal edits — they read the gym from context instead of a module constant.
- Server side: `resolveGymId()` takes a slug argument instead of reading `process.env.GYM_SLUG`. Server functions that need the tenant accept/derive the slug and verify the caller's `profiles.gym_id` matches it.
- `VITE_GYM_SLUG` stays supported as an optional override so a single-gym build (or the future white-label native builds) can pin one tenant and keep clean URLs.

### 2. Route tree reorganised into three trees

```text
src/routes/
  index.tsx                     -> platform marketing / landing (Layer 1)
  platform/                     -> provider portal (existing: signup, login, dashboard, setup)
  g/$gymSlug/
    route.tsx                   -> tenant resolver + branding provider + suspended-gym guard
    index.tsx                   -> gym landing / redirect to member app
    auth.tsx, signup.tsx,
    forgot.tsx, reset-password.tsx, onboarding.tsx
    staff-login.tsx
    _app/                       -> member app (home, book, membership, coaches, news, profile*)
    admin/                      -> gym admin (dashboard, classes, coaches, members, settings)
```

- Existing files move rather than get rewritten; the main edits are `createFileRoute` paths, `<Link to=...>` calls gaining `params={{ gymSlug }}`, and `redirect({ to: ... })` targets.
- Legacy top-level URLs (`/home`, `/auth`, `/admin`, …) get thin redirect routes that forward to the default gym slug, so existing links and the current preview keep working.

### 3. Guards, one per layer

- `/platform/*` — platform-admin guard (already exists via `getPlatformAdminContext`).
- `/g/$gymSlug/admin` — signed in, `role = 'staff'`, and `profiles.gym_id` matches the slug in the URL; otherwise sign out and send to that gym's staff login.
- `/g/$gymSlug/_app` — signed in, `profiles.gym_id` matches the slug; staff get bounced to the admin side.
- `route.tsx` for `/g/$gymSlug` throws not-found for an unknown slug and shows a "not available" screen for a `suspended` gym.

### 4. Branding per tenant, applied at runtime

- The tenant layout reads the gym row and applies `primary_color` / `secondary_color` / `logo_url` as CSS custom properties on a wrapper element, so a gym's branding is live immediately after they save it in setup — no rebuild.
- `Logo` already supports an override; it will read from gym context by default.

### 5. Signup and tenant assignment

- `signup.tsx` passes the slug from the URL into auth metadata. The existing `handle_new_user()` trigger already reads `gym_slug` and assigns `gym_id`, so no database change is needed.

## Database

**No schema migration is required for this pass.** `gyms`, `gym_id` on all tenant tables, `is_platform_admin`, and the gym-scoped RLS policies already exist and stay as they are. RLS keeps enforcing isolation regardless of URL, so a hand-typed slug can never leak another gym's data.

## Explicitly out of scope here

- Capacitor / store packaging (agreed: web now, native later). The white-label-per-gym native builds will reuse the `VITE_GYM_SLUG` pin from step 1, which is exactly why that override is kept.
- Billing/subscriptions for gyms.
- Custom domains per gym (subdomain routing can layer on top of `/g/<slug>` later without another restructure).
- New features on any of the three layers.

## Verification

1. `/` shows the platform landing; `/platform/dashboard` still lists and approves gyms.
2. `/g/att-academy/home`, `/book`, `/membership`, `/profile` all work signed in as an existing member — no regressions.
3. `/g/att-academy/admin` works for staff; a staff account from another gym is rejected on that URL.
4. Create a second gym through `/platform/signup`, approve it, set a distinct primary colour, and confirm `/g/<new-slug>` renders with its own branding and zero rows from ATT Academy.
5. Old URLs (`/home`, `/admin`) redirect correctly.

## Note on the size of this change

This touches most route files at once. It is mechanical but broad — I'd rather do it as one coherent pass than half-migrate the routing, but expect a round of fixes after the first build.
