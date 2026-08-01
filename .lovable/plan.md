# Three separate front doors

Yes — understood. Nuvo is three distinct products sharing one backend:

```text
1. Member app        /app/*            gym members: sign in, join a gym, book
2. Gym portal        / and /gym-owner  gyms sign up / sign in, then /gym/<slug>/admin
3. Platform console  /platform-owner   you: see and manage every gym on Nuvo
```

Today these exist, but the boundaries leak: the Nuvo marketing site links members to
member sign-in, and each login page accepts any account type and then decides what
to do. That is what makes it feel like one shared door.

## What changes

### 1. The Nuvo website is for gyms only
Remove the member "Sign in" call to action from the landing page. The site speaks to gym
owners: sign up your gym, sign in to your portal. A small footer line points members to
the member app rather than putting a member login button in the hero.

### 2. Each login only accepts its own audience
- Gym portal login: if the account is not staff/admin/owner of any gym, sign them out
  with "This portal is for gyms. Members should use the Nuvo member app." (today it says
  staff-only but the message is generic).
- Member sign-in: if the account is a gym owner/staff with no member role anywhere, sign
  them out and point to the gym portal instead of routing them into a member flow.
- Platform console: unchanged — stays unlisted, generic errors, no links from anywhere.

### 3. Members reach the app only through the member front door
`/app/*` stays the single member entry (sign in, sign up, complete profile, join gym,
then the gym-branded app). No member login exists anywhere else. Legacy gym-scoped auth
URLs keep redirecting there, as they already do.

### 4. Cross-links, not cross-logins
- Member app: no link to the gym portal except a small "Own a gym? Add it to Nuvo" line.
- Gym portal: no link to member sign-in except a "Are you a gym member? Open the Nuvo app" line.
- Console: no outbound links.

## Technical notes

- Landing page (`src/routes/index.tsx`): drop the `/app/auth` primary action, keep
  `/gym-owner/signup` and `/gym-owner/login` as the two calls to action.
- `src/routes/gym-owner/login.tsx`: keep the existing `getPortalContext()` gate; only the
  rejection copy changes.
- `src/routes/app.auth.tsx`: after a successful password/OAuth sign-in, check the account's
  gym memberships; when every membership is a staff/admin/owner role (and there is no
  member role), sign out and show the gym-portal message instead of `resolveMemberEntry`.
  Staff who are also members of a gym keep working normally.
- No database or RLS changes: role checks already live in `gym_members` and
  `profiles.is_platform_admin`.

## Open question handled in build

If a gym owner is also a training member of their own gym, they keep both: they sign in at
the portal for admin work and at the member app to book classes. Same account, two doors.
