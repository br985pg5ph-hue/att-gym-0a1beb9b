
# Parent Mode

Let a parent manage one or more kids from a single account. No separate login for kids. Same 5-tab shell — a child-switcher pill in the header scopes Home, Booking, and My Bookings to the selected child. Parent keeps one wallet; each child has their own classes-left counter and streak.

## Data model

New table `children` (sub-profiles under a parent):
- `parent_id` → `profiles.id`
- `name`, `date_of_birth`, `gender`
- `experience_level`, `injuries_notes` (same fields as the onboarding questionnaire, but per child)
- `emergency_contact_name`, `emergency_contact_phone`
- `classes_remaining` (per child)
- `streak`, `classes_attended` (per child)
- `avatar_url`

Changes to existing tables:
- `profiles.is_parent` (bool) — flips the UI into Parent Mode.
- `bookings.child_id` (nullable FK → `children.id`) — when set, the booking is for that child instead of the parent. `member_id` stays as the parent (owner of the booking / who pays).

RLS:
- Parents can read/write only their own `children` rows and any `bookings` where `member_id = auth.uid()`.
- Staff (admin) can read all children and see child names in the class roster.
- Capacity trigger unchanged (it counts bookings per class regardless of who they're for).

## Signup + onboarding

- Signup page adds a toggle: **"I'm training"** vs **"I'm signing up my kid(s)"**.
- Choosing kids flow:
  1. Parent basic info (name, phone, email, password) — no interest chips.
  2. "Add a child" step: name, DOB, gender, experience, injuries, emergency contact. Add another / finish.
  3. Sets `profiles.is_parent = true`.
- Same flow reachable later from **Profile → Settings → Parent Mode** (toggle on + "Add child") so any existing member can switch.

## UI — Parent Mode on

Header child-switcher (shown on Home, Booking, My Bookings, Profile):
- Small pill with the active child's avatar + first name; tap to open a sheet listing all children + "Add child" + "Me" (parent viewing their own stuff, e.g. for wallet).
- Selection persists in local state (per session) and defaults to the first child.

Screens, scoped to the selected child:
- **Home** — greeting says "Hi [Parent name]" with subtitle "Viewing [Child]". Next Session card reads that child's next booking. Classes Left + streak + attendance come from the child row. Location widget unchanged.
- **Booking** — class list filters to `type = 'kids'` automatically when a child is selected. Confirm writes a booking with `member_id = parent`, `child_id = selected child`. Capacity check unchanged.
- **My Bookings** (Profile → My Bookings) — grouped by child, each row shows which child it's for. 12-hour cancel rule unchanged.
- **Profile** — parent's own name, avatar, contact info; a new **"My Children"** section lists each child with edit (name/DOB/experience/injuries/emergency contact/avatar/remove). Wallet + payments + referrals + socials stay parent-scoped.
- **News, Coaches, Location** — unchanged (shared content).

Staff Admin additions:
- Class roster row shows child name + "(child of [Parent])" when `child_id` is set.
- Member list gets a "Children" count column; tap a parent to see their kids and each kid's classes-left.

## Copy / small polish

- Empty child switcher (parent with 0 kids): pill says "Add child" and opens the add-child sheet directly.
- "Classes Left" card on Home is per-child in Parent Mode; admins can top up per child from the member detail.
- The onboarding questionnaire is skipped for the parent themselves in kids-flow — they answer it per child instead.

## Out of scope for this pass

- Kids logging in with their own accounts (upgrade path can come later).
- Per-child wallets. Wallet stays parent-level; classes-left is the per-child counter.
- Payments integration (still UI-only until Stripe step).

## Technical notes

- New `children` table + migration with GRANTs + RLS scoped to `parent_id = auth.uid()`, plus admin-read policy via `has_role`.
- `bookings.child_id` nullable so existing member bookings keep working.
- Add a `ChildContext` provider (selected child id) mounted inside the `_app` layout; hooks like `useSelectedChild()` power the switcher and scoped queries.
- Query keys include child id: `["bookings", parentId, childId]`, `["stats", childId]` so switching children refetches cleanly.
- Booking cancel/12h rule and capacity trigger untouched.
- Update `handle_new_user` only if we want to write `is_parent` from signup metadata; otherwise set it via a client-side update right after signup completes.
