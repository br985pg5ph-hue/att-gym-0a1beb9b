# Desktop layout for the gym admin side

Today the gym-side screens reuse the member app's phone proportions: a narrow centered column, a fixed bottom tab bar, and small tap-sized text. On a laptop this leaves large empty margins and a nav bar pinned to the bottom of a wide screen. This changes the gym-facing surfaces to a proper desktop layout, while the member app stays mobile-first and untouched.

## What changes

**1. Admin app shell (`/gym/{slug}/admin`)**
- Replace the fixed bottom tab bar with a persistent left sidebar on desktop: logo + gym name at the top, the tab list (Dashboard, Announcements, Classes, Members) as full-width rows with icon + label, and Settings / Coaches / theme toggle / sign out grouped at the bottom.
- Top bar becomes a slim header inside the content area: current section title on the left, gym status and account actions on the right.
- Content area gets a wide, consistent container (roughly 1400px max) with generous padding instead of the current mix of `max-w-3xl` / `max-w-7xl` per tab.
- Below the desktop breakpoint the current mobile behaviour is kept: sidebar collapses away and the bottom tab bar returns, so nothing regresses on a phone.

**2. Density and typography for desktop**
- Step up the base text sizes on gym screens (the current 10-12px labels are phone-scale) and use desktop-appropriate row heights for tables and lists.
- Dashboard KPI cards move from a stacked/2-up layout to a 4-across row, with the trend chart and "expiring soon" panels side by side rather than stacked.
- Members list, classes agenda, and announcements use multi-column layouts with aligned columns and hover states instead of stacked mobile cards.
- Modals get desktop widths instead of the current `max-w-md` phone sheets.

**3. Gym owner portal (`/gym-owner/*`: signup, login, onboarding wizard)**
- Signup and login become a centered card on a full-width branded background rather than a full-height phone column.
- The 5-step onboarding wizard becomes a two-column desktop layout: step list / progress on the left, the active step's fields on the right in a wide card with fields laid out 2-up where it makes sense (city + phone, colors side by side, hours as a compact weekly table).
- Same content and validation rules as today — only layout and sizing change.

## Out of scope
- No changes to the member app (`/gym/{slug}/_app/*`), its bottom nav, or the Nuvo marketing page.
- No changes to data, queries, RLS, or business rules — this is presentation only.

## Technical notes
- Work stays in `src/routes/gym/$gymSlug/admin.tsx`, `src/components/GymSetupPanel.tsx`, and `src/routes/gym-owner/*.tsx`.
- Desktop layout driven by Tailwind `lg:` variants so the existing mobile markup remains the fallback; no new dependencies.
- Continue using existing semantic tokens (`bg-card`, `hairline`, `text-muted-foreground`, `rounded-pill`) — no new hardcoded colors.
