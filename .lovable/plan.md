# Four front doors in the navigation

Group every screen under one of four entries, so the page list reads:

```text
Website           /                        public Nuvo site for gyms
Member App        /app                     members sign in, join a gym, use the app
Platform Admin    /gym-owner + /gym/<slug>  gyms sign in and manage their gym
Platform Console  /platform-owner          you: approve and manage every gym
```

Nothing about behaviour, URLs, auth or the database changes. This is purely a
file-organisation change so the sub-screens sit inside their product folder
instead of appearing as separate top-level pages.

## What changes

- The five flat member files (`app.auth`, `app.signup`, `app.forgot`,
  `app.join`, `app.complete-profile`, `app.index`) move into an `app/` folder
  with a single entry page and the rest nested inside it.
- The gym-side screens already live in `gym-owner/` and `gym/$gymSlug/`; they
  get one shared entry so both appear under Platform Admin rather than as two
  separate roots.
- `platform-owner/` keeps its console entry with the dashboard nested inside.
- The website stays at `/`.

Pages that need a login stay exactly as they are — they remain in the code and
keep working; they just no longer show as their own top-level nav item.

## Technical notes

- Move `src/routes/app.*.tsx` to `src/routes/app/*.tsx` (`app/index.tsx`,
  `app/auth.tsx`, `app/signup.tsx`, `app/forgot.tsx`, `app/join.tsx`,
  `app/complete-profile.tsx`) and add `src/routes/app/route.tsx` rendering
  `<Outlet />`. Update each `createFileRoute` string to match (paths are
  unchanged: `/app/auth`, etc.).
- Add `src/routes/gym/route.tsx` (`<Outlet />` only) so `/gym/$gymSlug` nests
  under one `gym` root; keep the existing `$gymSlug/route.tsx` tenant layout,
  branding and guards untouched.
- `src/routeTree.gen.ts` regenerates automatically.
- No changes to `src/lib/memberRouting.ts`, auth gates, RLS, or any component.
- Verify after the move: `/`, `/app/auth`, `/gym-owner/login`,
  `/platform-owner/console` all still load, and the tenant app under
  `/gym/<slug>/home` still resolves.

## Note

The page list is generated from the route files, so exact grouping depends on
how Lovable renders nested routes. The four folders are the closest structure
to what you asked for without changing any URL or breaking sign-in flows.
