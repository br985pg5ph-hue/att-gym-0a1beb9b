## Goal

One app, Nuvo. A member downloads/opens it, creates an account (no gym involved), searches the gym directory, joins their gym (instantly, or with a code when that gym requires one), and lands in that gym's branded UI. A member can join several gyms and switch between them; each gym's data, membership and credits stay separate.

## Current state (verified)

- The app already assumes a gym before the account exists: sign-in/sign-up live at `/gym/{slug}/auth` and `/gym/{slug}/signup`, and the account-creation trigger stamps a single gym onto the new profile.
- Every member's gym-specific state (membership expiry, PT sessions, member ID, track, streak, attendance) lives directly on the profile row, so one profile can only ever belong to one gym.
- The database holds 7 gyms and 2 accounts, with no members, bookings, children or transactions yet — so restructuring now costs nothing in data.

## What changes

### 1. Membership record per gym

Introduce a `gym_members` record that links one account to one gym and carries everything that is gym-specific: role at that gym (member/staff/admin), group membership dates and pause state, PT sessions, member ID, booking track, streak and attendance, join date. Children get the same treatment (a child belongs to a gym membership).

The profile becomes gym-agnostic identity only: name, phone, gender, date of birth, avatar, language/theme preferences, plus an "active gym" pointer used to decide what the app shows on open.

Access rules are rewritten so "same gym" means "the caller has a membership at that gym", and staff/admin powers are granted per gym rather than globally.

### 2. Account-first auth

- New top-level `/auth`, `/signup`, `/forgot`, `/reset-password` — Nuvo-branded, no gym in the URL. The existing gym-scoped auth pages redirect here.
- After sign-up the member goes to a short profile step (name, phone, gender, DOB), then straight to gym search.
- Signing in with no memberships → gym search. With one → that gym's home. With several → a gym picker (remembering the last used).

### 3. Gym directory and joining

- `/gyms` — searchable directory of active gyms: logo, name, city/address, with search by name. A gym can be hidden from the directory if it prefers code-only access.
- Tapping a gym shows a join screen with its branding. If the gym has "require join code" switched on, the member must enter the code; otherwise joining is instant.
- Joining creates the membership and drops the member into that gym's home with no active membership yet — staff activates payment in person, exactly as today.
- Gym admins get a "Join settings" area: toggle code requirement, view/regenerate the join code, toggle directory visibility.

### 4. Switching gyms

- A gym switcher in the member's profile/header lists their gyms plus "Join another gym". Switching changes the active gym and re-brands the app.
- Booking, membership, credits, referrals, children and history are always read through the active gym's membership, so nothing bleeds between gyms.

### 5. Staff, admin and owner

- Staff/admin accounts are memberships with an elevated role at that gym; one person can be staff at one gym and a member at another.
- Gym-owner and platform-owner portals are unchanged apart from reading roles from the new membership record.

## Rollout order

1. Database restructure: `gym_members`, move gym-specific fields off profiles, rewrite access rules and the account-creation trigger, add join code / directory fields to gyms. Re-seed the two existing accounts as memberships of their gyms.
2. Account-first auth routes and the post-signup profile step.
3. Gym directory, join screen, join-code enforcement.
4. Gym switcher and active-gym resolution replacing today's slug-only resolution.
5. Update member screens (home, booking, membership, profile, children, referral) to read from the membership record.
6. Update the gym admin area (member list, member detail, dashboard) and add join settings.

## Technical notes

- `gym_members` gets a unique constraint on (user, gym); `current_gym_id()` reads the profile's active gym but every policy validates against an actual membership row via a security-definer helper, so `same_gym()` no longer trusts the pointer alone.
- Routes stay at `/gym/$gymSlug/*` (unchanged deep links, still white-label ready); the new gym-agnostic routes sit above them, and `/member-app-preview` keeps pointing at the reserved `preview` gym.
- The directory read is public (anon-readable gym rows, name/logo/address only); join is a security-definer function that validates the code server-side so codes are never exposed to the client.
- Given zero member data, the migration recreates structure rather than doing a careful backfill — this is the cheapest moment to make this change.
