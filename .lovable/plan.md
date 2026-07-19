
# ATT Academy — Build Plan

Mobile-first PWA-style web app for Antaki Top Team with Supabase auth + Postgres, dark/light theme, EN/AR (RTL), member and staff roles.

## Assumptions (flag anything to change)
- **Social login**: Lovable Cloud supports Google + Apple natively — I'll wire both. (Email/password is default.)
- **Payments**: UI + transactions ledger now; real Stripe wired in a later phase when you say go.
- **Push notifications**: In-app banner previews only for now (real web push is a later phase).
- **Gym info**: I'll seed a placeholder address/lat-lng/hours you can edit later in the Admin section (or I can add a gym_info admin editor — say the word).
- **First staff account**: I'll seed one admin email you provide, OR create a one-time SQL migration promoting the first signup — please tell me your admin email. Default: I'll add a `role` column defaulting to `member`, and you promote via SQL/admin.
- **Logo assets**: use both uploaded logos (dark version for light theme, light/silver version for dark theme).
- **Map**: static placeholder + "Open in Maps" deep link (no Mapbox/Leaflet unless requested).
- **i18n**: lightweight in-house dictionary (no i18next dep) — nav + headers + key CTAs translated; long-form content (announcement bodies, coach bios) stays in whatever language it's authored in.

## Phase 1 — Foundation (this turn)
1. Enable Lovable Cloud (Supabase).
2. Design system in `src/styles.css`: dark/light tokens (#0a0a0a/#efece5, #c8102e accent, silver, hairlines), Bebas Neue via `<link>` in `__root.tsx`, Inter, pill radius utilities.
3. Theme provider (dark/light, persisted) + Language provider (EN/AR, RTL via `dir` on `<html>`).
4. App shell: fixed blurred bottom tab bar (Home/Book/Coaches/News/Profile + Admin for staff), safe-area padding.
5. Upload logos as Lovable Assets; `<Logo />` component that swaps by theme.
6. Update `__root.tsx` head (title, description, OG).

## Phase 2 — Data model & auth
Migrations:
- `app_role` enum: `member`, `staff`
- `profiles` (id → auth.users, name, phone, role, membership_status, wallet_balance numeric, referral_code unique, streak, classes_attended, avatar_url, interests text[])
- `coaches` (id, name, specialty, bio, photo_url)
- `classes` (id, type, coach_id, starts_at timestamptz, duration_min, capacity)
- `bookings` (id, member_id, class_id, status, created_at) + unique(member,class)
- `announcements` (id, tag, title, body, created_at, author_id)
- `transactions` (id, member_id, amount, type: credit/debit, description, created_at)
- `gym_info` (single row: address, lat, lng, hours jsonb, phone)
- Auto-create profile on signup trigger, auto-generate referral_code.
- `has_role(uid, role)` SECURITY DEFINER function.
- GRANTs + RLS: members read/write own bookings/transactions, read public tables; staff writes to classes/coaches/announcements/other bookings.
- Seed: 4 coaches, ~14 days of classes across PT/Women Only/Mixed/Kids, 3 announcements, gym_info row.

Auth pages (`/auth`, `/auth/signup`, `/auth/forgot`, `/reset-password`):
- Email/password + Google + Apple (via `lovable.auth.signInWithOAuth`).
- Signup collects name, phone (with country-code picker), interests chips.
- `_authenticated` layout gates the app (integration-managed).

## Phase 3 — Member screens
Routes under `_authenticated/`:
- `/` Home — greeting, next class card, "time to gym" ETA (geolocation + haversine @ 30km/h), location teaser, stats.
- `/location` — address, Directions/Call buttons, hours, map placeholder.
- `/book` — month calendar with booked-day dots, filter chips, day slot list (capacity-aware, disables full/booked), sticky Confirm.
- `/coaches` — coach cards.
- `/news` — announcements feed with tag pill + relative time.
- `/profile` — avatar, membership badge, wallet card, menu rows.
- `/profile/bookings` — Upcoming (Cancel) / Past.
- `/profile/referral` — code + Copy (✓ Copied 1.8s), share, how it works, stats.
- `/profile/payments` — wallet hero, top-up chips (writes a transaction), plan, saved methods (UI), color-coded history.
- `/profile/settings` — theme, language, notification toggles, legal, Delete Account.
- In-app banner component for leave-by + new-announcement previews.

Server functions for: booking create/cancel (capacity check in a transaction), wallet top-up (insert transaction + update balance atomically), referral code generation.

## Phase 4 — Staff Admin
`/admin` visible only when `role = staff`:
- Announcements CRUD.
- Classes CRUD + roster view per class + remove attendee.
- Coaches CRUD (photo upload to Supabase Storage).
- Members list (read-only): name, membership, wallet.

## Phase 5 — Polish
Sitemap/robots, SEO on public `/auth`, empty states, loading skeletons, verify build.

---

## Technical notes
- TanStack Start + TanStack Query loaders (`ensureQueryData` + `useSuspenseQuery`).
- Booking create uses a Postgres function with row lock for capacity safety.
- Wallet balance derived-or-cached: keep `profiles.wallet_balance` updated by a trigger on `transactions` insert (single source of truth = transactions table).
- Theme + language stored in `localStorage`, applied on hydration via `useEffect` to avoid SSR mismatch; server renders default (dark, EN).
- RTL via `dir="rtl"` on `<html>` — Tailwind's logical properties (`ms-`, `me-`, `ps-`, `pe-`) used where directionality matters.

## What I need from you before starting
1. **Admin email** to seed as the first staff account (or say "I'll do it via SQL later").
2. **Gym address + phone** (or use placeholder — Beirut, Lebanon by default?).
3. Confirm assumptions above (payments UI-only for now, no real push, i18n scope).

Reply "go" (with any tweaks) and I'll start with Phase 1.
