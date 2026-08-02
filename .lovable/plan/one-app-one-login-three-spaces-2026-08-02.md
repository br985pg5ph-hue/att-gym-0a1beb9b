# One app, one login, three spaces

Nuvo stops being a website + separate portals. There is one sign-in page for
everyone, and after sign-in the account is sent to the space it belongs to.

```text
/signin      one login for members, gym staff/owners, and you
/signup      choose: I'm a gym member  |  I own a gym
/spaces      picker, shown only when an account has more than one space
  -> Member app     /app/... then /gym/<slug>/home
  -> Gym admin      /gym/<slug>/admin
  -> Platform console /platform-owner/dashboard
```

The public Nuvo site at `/` keeps its marketing content but loses every sign-in
and sign-up button. In their place it points people to download the app.

## What changes

### 1. The website stops being a door
`/` becomes purely informational: what Nuvo is, and a "Get the app" section
(App Store / Google Play placeholders plus an "Open in browser" link to
`/signin`). No member sign-in, no gym-owner login or signup buttons anywhere on
the page.

### 2. One sign-in page
A single Nuvo-branded `/signin` with email/password, Google and Apple. It does
not ask who you are. After the session is created it looks at the account:

- platform admin flag on the profile -> Platform console
- staff/admin/owner role at any gym -> that gym's admin
- member role at any gym -> the member app for that gym
- no gym yet -> gym search / join
- missing name, phone or gender -> complete profile first

No account type is ever turned away. The rejection messages ("this portal is
for gyms", "this account manages a gym") are removed.

### 3. Sign-up asks who you are
`/signup` shows two cards: **Gym member** and **Gym owner**. Member goes to the
existing member sign-up form; gym owner goes to the existing gym registration
and onboarding wizard. Both end signed in and land through the same routing
rules above.

### 4. Space picker for multi-role accounts
When an account qualifies for more than one space (an owner who also trains, or
you as platform admin with a gym), `/spaces` lists the available spaces as
cards and remembers the last choice. Inside each space a small "Switch space"
entry in the menu returns to the picker. Accounts with a single space skip it
entirely.

### 5. Old doors keep working
`/app/auth`, `/gym-owner/login` and `/platform-owner/console` redirect to
`/signin`; `/gym-owner/signup` and `/app/signup` still work directly and are
also reachable from `/signup`. Existing bookmarks and email links do not break.

### 6. Desktop and mobile
The member app stays mobile-first, the gym admin and console stay
desktop-oriented; both are the same app and each already adapts. Nothing about
that changes here — the difference is only that they now share one entrance.

## Technical notes

- New `src/routes/signin.tsx` (Nuvo branded, `ssr: false`), new
  `src/routes/signup.tsx` (two-choice card page), new `src/routes/spaces.tsx`.
- New `resolveSpaces(userId)` in `src/lib/memberRouting.ts`: reads
  `profiles.is_platform_admin` plus the account's `gym_members` rows and
  returns the list of spaces with their destination paths. Single space ->
  navigate directly; several -> `/spaces`. Last choice stored in
  `localStorage`.
- `isStaffOnlyAccount` and its rejection path in `src/routes/app/auth.tsx` are
  removed; `getPortalContext()` in `src/routes/gym-owner/login.tsx` is no
  longer used as a gate — that file becomes a redirect to `/signin`.
- `src/routes/platform-owner/console.tsx` becomes a redirect; the admin check
  stays server-side in `getPlatformAdminContext` and still guards
  `/platform-owner/dashboard`.
- `src/routes/index.tsx`: remove the login/signup CTAs, add the download
  section.
- OAuth `redirect_uri` becomes `${window.location.origin}/signin` (public
  route, so session hydration still works).
- No database, RLS, or role changes. Space eligibility is derived from data
  that already exists.

## One thing to be aware of

With a shared front door the platform console is no longer hidden behind an
unlisted URL — it is reachable only by accounts with the platform admin flag,
which is the real protection, and the picker only shows the console card to
those accounts. Failed sign-ins keep generic error text.
