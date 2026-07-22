# New Member App Tour

A guided, spotlight-style tour that auto-starts the first time a new member lands in the app after completing onboarding. It walks them through Home, Booking, Membership, and Profile with a dimmed backdrop, a highlighted target, and a tooltip card with Prev / Next / Skip. Replayable from Settings.

## User experience

1. Member finishes signup + onboarding questionnaire → lands on Home.
2. A small welcome card appears: "Take a tour of ATT Academy?" with **Start tour** and **Skip**.
3. If they start, the app dims and a spotlight ring highlights the first feature. A tooltip card sits next to it with:
  - Step title + one-sentence description
  - `1 / 12` counter, Prev, Next, Skip tour
  - Next auto-navigates to the right tab when the next step lives on another screen
4. Final step shows "You're all set" with a Finish button.
5. Skipping or finishing marks the tour done — it never auto-starts again.
6. **Settings → Replay app tour** re-runs it any time.

## Tour steps (12)

Home

- Greeting + member ID
- Next Session card
- PT Sessions card
- Group Membership card (mentions Paused state)
- News & Coaches widgets

Booking tab

- Calendar with red/grey dots
- Class-type filter chips
- Time slots + capacity

Membership tab

- Credits + expiry
- Pause / resume membership

Profile tab

- Edit profile + children (only if parent)
- Referral link + Settings (includes Replay tour)

Kids-only steps are shown conditionally when `is_parent = true`.

## How it works (technical)

**Library.** Use `driver.js` (~5KB, no deps, mobile-friendly, RTL-compatible, works with fixed bottom nav). Themed to match dark/light tokens.

**Persistence.** Add a `tour_completed_at timestamptz` column to `profiles` (nullable). Set it when the user finishes or skips. Reading/writing goes through the existing profile RLS (owner-only). No new policy needed beyond confirming the existing owner-update policy covers the column.

**Trigger points.**

- Onboarding completion handler (`src/routes/onboarding.tsx`) sets a `sessionStorage` flag `att.startTour = 1` before navigating to `/home`.
- A new `<AppTour />` component mounted in `src/routes/_app/route.tsx` (the authenticated layout) checks on mount: if `profile.tour_completed_at` is null AND (`sessionStorage` flag OR user clicked "Replay" which sets `att.startTour = 1`), it shows the welcome card, then drives the tour.
- On finish/skip → clear flag, update profile.

**Cross-route navigation.** driver.js supports `onNextClick` hooks. When a step targets an element on another tab, the hook calls `navigate({ to: '/book' })`, waits for the target selector to mount (short polling with `MutationObserver`, 2s timeout), then calls `driver.moveNext()`.

**Element targeting.** Add stable `data-tour="next-session"`, `data-tour="pt-card"`, etc. attributes to the existing elements. No visual changes to those components.

**i18n + RTL.** Step copy lives in `src/lib/i18n.ts` under a new `tour` namespace (English + Arabic). driver.js `rtl: true` when `lang === 'ar'`.

**Theming.** Custom CSS on `.driver-popover` uses existing tokens (`--card`, `--foreground`, `--primary`, `--border`, `rounded-2xl`, pill buttons) so it matches the app.

**Settings entry.** Add a "Replay app tour" row in `src/routes/_app/profile.settings.tsx` that sets `sessionStorage.att.startTour = '1'`, nulls `tour_completed_at`, and navigates to `/home`.

## Files touched

New

- `src/components/AppTour.tsx` — welcome card + driver.js orchestration, step definitions, cross-route navigation
- `src/components/AppTour.css` — themed popover styles
- Migration: `alter table profiles add column tour_completed_at timestamptz`

Edited (attribute + minor additions only)

- `src/routes/_app/route.tsx` — mount `<AppTour />`
- `src/routes/onboarding.tsx` — set start flag on completion
- `src/routes/_app/home.tsx`, `book.tsx`, `membership.tsx`, `profile.index.tsx` — add `data-tour="…"` attributes to target elements
- `src/components/BottomNav.tsx` — `data-tour` on each tab
- `src/routes/_app/profile.settings.tsx` — "Replay app tour" row
- `src/lib/i18n.ts` — tour copy (EN + AR)
- `src/lib/providers.tsx` — add `tour_completed_at` to `Profile` type

Dependency: `bun add driver.js`

## Out of scope

- No changes to existing screens' logic or layout beyond `data-tour` hooks
- No analytics on tour completion (can add later)
- No per-step "learn more" deep links