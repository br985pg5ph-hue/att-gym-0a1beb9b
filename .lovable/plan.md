# Multi-tenant foundation for ATT Gym Hub

Structural migration only. No feature changes, no removals. ATT Academy must behave identically when finished.

## Decisions locked in

- Member codes restart per gym (each gym starts at 1001).
- Class types are per-gym rows; `key` unique within a gym.
- New signups go through a server function that stamps `gym_id` from the deployment's resolved gym.
- `is_platform_admin` bypasses gym RLS immediately (no UI).

## Step 1 — `gyms` table and data move

Migration 1:
- Create `public.gyms`: `id`, `slug` (unique), `name`, `status` default `'active'`, `logo_url`, `primary_color`, `secondary_color`, `theme jsonb`, plus every `gym_info` field (`address`, `lat`, `lng`, `phone`, `hours`, `instagram_url`, `whatsapp_number`, `maps_url`), `created_at`.
- Grants: `SELECT` to `authenticated`; `ALL` to `service_role`. Update restricted to staff of that gym.
- Insert the ATT Academy row (`slug = 'att-academy'`) copying the existing `gym_info` row inside the migration.
- `gym_info` stays in place until step 6.

## Step 2 — `gym_id` everywhere + platform admin flag

Migration 2:
- Add nullable `gym_id uuid references public.gyms(id)` to `profiles`, `children`, `classes`, `class_type_defs`, `bookings`, `coaches`, `announcements`, `transactions`.
- Backfill all rows with the ATT Academy id, then set `NOT NULL` on all 8.
- Add index on `gym_id` for each table (and composite indexes where queries filter by gym + time, e.g. `classes(gym_id, starts_at)`).
- Add `is_platform_admin boolean not null default false` to `profiles`.

## Step 3 — Per-gym keys and sequences

Migration 3:
- `class_type_defs`: primary key becomes `(gym_id, key)`. Every trigger that joins `class_type_defs d ON d.key = c.type` must also match `d.gym_id = c.gym_id` — this touches `consume_class_credit`, `enforce_kids_class_child`, and `refund_class_credit`.
- `member_code`: replace the single global sequence with a per-gym counter. `assign_member_code` computes the next code as `max(member_code) + 1` within the new row's gym (starting at 1001) under a row lock on the gyms row, so two gyms can both hold 1001. `member_code` uniqueness becomes `(gym_id, member_code)`.
- `referral_code` and the referral lookup in `handle_new_user` become gym-scoped (a code only resolves within the same gym).
- The partial unique index on bookings and other constraints get `gym_id` added where they must not collide across gyms.

## Step 4 — Tenant-aware functions and RLS

Migration 4:
- New `public.current_gym_id()` — `SECURITY DEFINER`, `STABLE`, `SET search_path = public` — returns the signed-in user's `profiles.gym_id`.
- New `public.is_platform_admin()` — same pattern.
- New `public.same_gym(_gym_id uuid)` returning `is_platform_admin() OR _gym_id = current_gym_id()`.
- `has_role` extended so a staff role only counts within the caller's own gym.
- Rewrite every policy on the 8 tables to AND in `same_gym(gym_id)` alongside the existing role/ownership check. Insert/update `WITH CHECK` clauses also force `gym_id = current_gym_id()` so a user cannot write a row into another gym.
- `gyms` policies: a user reads only their own gym (platform admins read all); staff of that gym update it.
- Triggers that write rows (`consume_class_credit`, `refund_class_credit`, `grant_referral_reward`, `sync_classes_remaining`) propagate `gym_id` onto the transactions they create.

## Step 5 — App-side tenant resolution

- `VITE_GYM_SLUG` (client) / `GYM_SLUG` (server), defaulting to `att-academy`.
- `src/lib/gym.ts`: exports the resolved slug plus a `useGym()` hook backed by a cached React Query fetch of the `gyms` row (id, name, branding, address, hours, socials).
- Server side: a small helper used by `dashboard.functions.ts` and other server functions to resolve the gym id once per request.
- Branding: `Logo`, theme colors and app title read from the resolved gym record, falling back to today's ATT values so nothing shifts visually.

## Step 6 — Repoint every query, then drop `gym_info`

- Replace all three `gym_info ... .eq("id", 1)` reads (`admin.tsx` GymInfoAdmin, `_app/home.tsx`, `_app/location.tsx`, `_app/profile.index.tsx`) and the GymInfoAdmin update with `gyms` scoped by the resolved gym id.
- Add `.eq("gym_id", gymId)` to every read and `gym_id` to every insert across: `src/routes/admin.tsx` (announcements, classes, bookings, coaches, members, class types), `src/routes/admin.members.$id.tsx` (profile, bookings, transactions, booking-on-behalf), `src/lib/dashboard.functions.ts` (all 14 admin queries), `src/lib/classTypes.ts`, and every route under `src/routes/_app/` (home, book, news, coaches, location, profile.*), plus `src/lib/providers.tsx` and `src/lib/account.functions.ts`.
- Signup moves to a server function that creates the auth user and stamps `gym_id` from the server-resolved slug; the client form keeps its current fields and behaviour.
- Guards: `_app.tsx` and `admin.tsx` `beforeLoad`, plus staff login, reject a signed-in user whose `gym_id` doesn't match the deployment's gym (signed out with a clear message).
- Drop `gym_info` in the final migration and regenerate types.

## Step 7 — Verification

- Walk the whole ATT flow in a headless browser: member login, book, cancel, pause/resume, PT credits, children/parent mode, referrals, announcements, coaches, admin dashboard, member detail, class type management.
- Seed a second gym (`demo-gym`) and run the app with `VITE_GYM_SLUG=demo-gym` to confirm an empty, isolated dataset.
- Prove isolation at the database level, not just in queries: query gym A's tables using a gym B user's token and confirm zero rows come back.
- Run the security linter after the RLS migration.

## Ambiguities I'm flagging rather than guessing

1. **`classes.type` has no foreign key** to `class_type_defs` today. I'll keep it that way (adding a composite FK could reject existing rows); the gym match is enforced in the triggers instead. Say the word if you want a real FK.
2. **The `avatars` storage bucket is shared** across gyms. Files stay in one bucket keyed by user id; per-gym path prefixes and storage policies aren't in this pass.
3. **Auth users are shared across gyms.** One email = one account platform-wide, belonging to exactly one gym. A person joining two gyms would need two emails. Changing that means a `gym_members` join table — a much larger redesign, out of scope here.
4. **Existing member codes are preserved as-is**; the per-gym counter continues from ATT's current maximum rather than renumbering anyone.
5. **`handle_new_user` can't see the deployment env var**, which is exactly why signup moves to a server function. Social/OAuth signups follow the same path; a user created outside it would land without a gym and be blocked by the guards — I'll add a safe fallback to the deployment's gym for that case.