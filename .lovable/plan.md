# Platform Portal for Gym Onboarding & Management

## Current state

The app has member auth (`/auth`, `/signup`) and gym-staff auth (`/staff-login` → `/admin`). The multi-tenant foundation exists (`gyms` table, `gym_id` on all tenant tables, `is_platform_admin` flag and RLS helpers). There is **no surface for a gym owner to apply to the platform** and **no UI for a platform admin to review/approve gyms**.

## Goal

Create a separate `/platform` portal:
1. Gym owners can apply (`/platform/signup`).
2. You (platform admin) can review, approve, or suspend gyms from `/platform/dashboard`.
3. Approved gym owners complete a setup wizard (`/platform/setup`) to configure branding, location, hours, and social links.
4. While pending, gym owners see a "pending approval" banner and have limited access.

## Out of scope for this pass

- Payment/subscription plans for gyms.
- Automated email notifications to applicants (can be added later).
- Staff role tiers inside a gym.

## Ambiguities I'm flagging

1. **First platform admin creation**: No self-service "sign up as platform admin" will be built. The first platform admin must be seeded manually (migration or one-time SQL). I'll include the seed SQL in the plan.
2. **Deployment model**: The platform portal should run as its own deployment with `VITE_GYM_SLUG=platform` (or equivalent server env). Running it under a gym slug will still work for platform admins because `is_platform_admin()` bypasses RLS, but the public landing copy should be neutral.
3. **Gym owner access after approval**: Once approved, the owner is expected to use the gym's own deployment URL (`https://<gym-slug>.lovable.app` or the slug-configured preview). The setup wizard will show them a "Go to your gym admin" link after approval.

## Step 1 — Database: seed platform gym and platform admin policy

Migration:
- Insert a single platform gym row: `slug = 'platform'`, `name = 'ATT Gym Hub Platform'`, `status = 'active'`.
- This row is only used so platform-admin profiles can have a non-null `gym_id` without belonging to an operational gym.
- No table schema changes are required; `gyms.status` already supports text values and `profiles.is_platform_admin` already exists.

One-time seed (to be run manually after deployment):
- Create a platform admin auth user and set their `profiles.gym_id` to the platform gym id and `is_platform_admin = true`.
- I'll provide the SQL/script, but it will not be auto-run on every deploy.

## Step 2 — Platform portal routes

Create route files under `src/routes/platform/`:

- `src/routes/platform/index.tsx` — public landing page with CTAs:
  - "Sign up your gym" → `/platform/signup`
  - "Platform admin login" → `/platform/login`
  - "Member/staff login" → `/auth`

- `src/routes/platform/signup.tsx` — gym owner application form:
  - Gym name
  - Desired slug (validated: lowercase, hyphenated, unique)
  - Owner name, email, phone, password
  - Submit creates:
    - A `gyms` row with `status = 'pending'`, slug/name filled
    - An auth user
    - A `profiles` row with `role = 'staff'`, `gym_id = <new gym id>`
  - Redirects to `/platform/setup`.

- `src/routes/platform/login.tsx` — platform admin login:
  - Email + password only (same Supabase auth).
  - After login, checks `profiles.is_platform_admin = true` and `gym_id` matches platform gym; otherwise signs out with an error.
  - Redirects to `/platform/dashboard`.

- `src/routes/platform/dashboard.tsx` — platform admin dashboard (protected by platform-admin guard):
  - Lists all gyms with status, name, slug, created date.
  - Filter tabs: Pending, Active, Suspended, All.
  - Actions per gym: Approve (set `status = 'active'`), Suspend, Activate.
  - Shows owner contact info (looked up from `profiles` where `role = 'staff'` and `gym_id = gym.id`).
  - Basic stats: total gyms, pending count, active count.

- `src/routes/platform/setup.tsx` — gym setup wizard for the logged-in gym owner (protected by staff + pending/active gym guard):
  - Step 1: Gym basics (name, slug locked, phone, address).
  - Step 2: Location & hours (lat/lng, maps URL, hours JSON editor).
  - Step 3: Branding (primary/secondary colors, logo upload to a new `logos` storage bucket, theme JSON).
  - Step 4: Social links (instagram, whatsapp).
  - Persistent "Pending approval" notification bar if `gyms.status = 'pending'`.
  - Once status becomes `active`, show a "Go to Admin Dashboard" CTA linking to `/admin`.

- `src/routes/platform/_platform.tsx` — optional layout route for the protected platform-admin pages (`dashboard`) with a `beforeLoad` guard that calls `supabase.auth.getUser()` and verifies `is_platform_admin()` via a server function or direct profile read.

## Step 3 — Auth guards

- Platform admin guard (`/platform/dashboard`):
  - `beforeLoad` checks session, then profile `is_platform_admin = true` and `gym_id` matches the platform gym id.
  - Uses a server function `getPlatformAdminContext` that returns `{ isPlatformAdmin, platformGymId }` to avoid leaking logic into the client.

- Gym owner setup guard (`/platform/setup`):
  - `beforeLoad` checks session, profile `role = 'staff'`, and the user's `gym_id` exists.
  - If the gym is `suspended`, redirect to `/platform` with an error.

- Existing `/admin` guard stays unchanged: it continues to require `role = 'staff'` and matching deployment gym.

## Step 4 — Server functions

Create `src/lib/platform.functions.ts`:

- `applyForGym({ gymName, slug, ownerName, ownerEmail, ownerPhone, password })`
  - Server-side validation (unique slug, valid email, strong password).
  - Creates auth user with `supabaseAdmin`.
  - Creates pending gym row.
  - Creates staff profile linked to the new gym.
  - Returns `{ success, gymId }` or error.

- `getPlatformAdminContext()`
  - Returns whether the caller is a platform admin and the platform gym id.
  - Used by dashboard guard and dashboard data loader.

- `listGymsForPlatform({ status? })`
  - Returns all gyms (platform admin bypasses RLS).
  - Includes owner profile info via a join.

- `updateGymStatus({ gymId, status })`
  - Platform admin only: sets `gyms.status` to `active`, `suspended`, or `trial`.

- `getGymSetupContext()`
  - For the logged-in gym owner: returns their gym row and approval status.

- `updateGymSetup({ ...fields })`
  - For the logged-in gym owner: updates their own gym's branding/location/hours/socials.
  - Slug is immutable after creation.

## Step 5 — Storage

- Create a `logos` storage bucket (public or signed URLs).
- Add RLS/policy so a gym owner can upload only to their own gym's folder (e.g. `logos/<gym_id>/logo.png`).
- Update `Logo` component to read from `gym.logo_url` when available, falling back to the existing ATT assets.

## Step 6 — Client-side type updates

- Update `src/lib/providers.tsx` `Profile` type to include `is_platform_admin: boolean`.
- Update `src/lib/gym.ts` `Gym` type to include all platform-relevant fields (already present).
- No generated type edits; `supabase--migration` will regenerate `types.ts` if any schema changes are made (only the platform gym seed is data, not schema).

## Step 7 — Root route / landing decision

- Keep `/` redirecting to `/auth` for now so existing member/staff flows are unchanged.
- Add a small, unobtrusive footer link on `/auth` and `/staff-login`: "Are you a gym owner? Sign up your gym" → `/platform/signup`.
- The platform portal landing (`/platform`) will be the main entry point for gym owners and platform admins.

## Step 8 — Verification

- Seed the platform gym and one platform admin in the preview environment.
- Walk through:
  1. Gym owner applies at `/platform/signup`.
  2. Platform admin logs in at `/platform/login` and sees the pending gym.
  3. Platform admin approves the gym.
  4. Gym owner refreshes `/platform/setup`, sees approval banner removed, and can click through to `/admin`.
  5. Confirm the approved gym's data is isolated: no other gym's members/classes are visible.

## What I'll need from you

- Confirm the platform portal should live at `/platform` routes in the same codebase (deployed separately with `VITE_GYM_SLUG=platform`), rather than a wholly separate project.
- Confirm the first platform admin can be created via a one-time SQL seed (I'll provide the exact script).
- Any specific fields you want on the gym application form beyond gym name, slug, owner name, email, phone, and password.