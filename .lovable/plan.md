Make each user row in the admin dashboard "Expiring Soon" section clickable so it navigates to that member's detail page (`/admin/members/$id`).

## What we'll change

1. In `src/routes/admin.tsx`, inside `DashboardAdmin`, replace the static `<div>` rows in the "Expiring Soon" list with `<Link>` components from `@tanstack/react-router`.
2. Pass `to="/admin/members/$id"` and `params={{ id: m.id }}` so each row routes to the correct member.
3. Add hover/active styling (subtle background change + right chevron) so rows look tappable.
4. Keep the existing layout and expiry date display unchanged.

## Verification

- Open `/admin` in the preview.
- Tap a user in the "Expiring Soon" section.
- Confirm the app navigates to `/admin/members/<id>` for that user.