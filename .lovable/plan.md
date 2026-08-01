# Three entries in the page navigation

The page list is cluttered with 14 leftover preview stubs (`/app-preview-home`,
`/app-preview-book`, `/app-preview-signin`, … and `/member-app-preview`). None of them
render anything — each is a one-line redirect into a `preview` gym workspace that no
longer exists in the database, so opening any of them dead-ends. They are the reason the
navigation looks crowded.

## What changes

Remove those 14 stub pages so the navigation shows only the three real front doors:

```text
Platform console   /platform-owner/console   see, approve and manage every gym
Member app         /app                      members sign in, join a gym, use features
Gym admin portal   /gym-owner  +  /gym/<slug>/admin   gyms sign in and manage their gym
```

The Nuvo marketing page stays at `/` as the public entry that points gyms to their portal.

Nothing about behaviour changes: no live screen links to these stubs, and any old
bookmark still lands on the 404/redirect handler that already exists.

## Technical notes

- Delete `src/routes/app-preview-*.tsx` (13 files) and `src/routes/member-app-preview.tsx`.
- `src/routeTree.gen.ts` regenerates automatically; it is not edited by hand.
- No changes to `/app/*`, `/gym-owner/*`, `/gym/$gymSlug/*` or `/platform-owner/*` routes,
  and no database or auth changes.
