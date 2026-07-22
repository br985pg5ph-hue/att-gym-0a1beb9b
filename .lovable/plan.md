
## Playback of the rules

- **Applies to:** Mixed, Women Only, Kids group classes.
- **Exempt:** PT, Yoga, Gymnastics — no track, no monthly cap (unchanged).
- **Packages:** 1 month or 3 months. Both cap at **12 classes per month**, counted on a **rolling 30-day window** anchored to the subscription's start date.
- **Day tracks:** Track A = Sat / Mon / Wed. Track B = Sun / Tue / Thu.
- **Track lock:** picked when the subscription is created/renewed and fixed for that subscription's lifetime. A new track can only be chosen on renewal (once the previous cycle ends, or if admin explicitly resets it).
- **Kids:** each child has their own track, independent of the parent.
- **Admin override:** staff can force-book any day for any member and bypass the cap.

## What changes

### 1. Database (one migration)
- Add `group_track` (`'sat_mon_wed' | 'sun_tue_thu' | null`) and `group_subscription_started_at timestamptz` to `profiles` and `children`.
- Update `sync_classes_remaining` (group branch) to also set `group_subscription_started_at = now()` on a fresh credit when there's no active cycle, and clear both `group_track` + `group_subscription_started_at` when the cycle lapses to null.
- Update `consume_class_credit` trigger for group class types (`mixed`, `women_only`, `kids`):
  - If booking `member_id` is the caller (self-booked, i.e. `created via a member RLS path` — detect via `has_role(auth.uid(), 'staff')`; staff bypass both checks), enforce:
    - **Track check:** class weekday (Amman TZ) must match the profile/child `group_track`. Reject with "This class isn't on your booking days" if not.
    - **Track missing:** if `group_track IS NULL` while a group subscription is active, reject with "Choose your booking days first."
    - **Cap check:** count `bookings` for that member/child with `status='upcoming'` OR (attended past) whose class `starts_at` falls in the current rolling 30-day window from `group_subscription_started_at` (i.e. floor((now - start)/30d) window). Reject at ≥ 12 with "You've reached 12 classes this month."
- Add `set_group_track(target_user uuid, target_child uuid, track text)` SECURITY DEFINER function so members can set their own track once per cycle (only when currently null), and staff can override any time.

### 2. Admin (`src/routes/admin.members.$id.tsx`)
- In the **Group Membership** card's "Renew or Add" flow, add a required Track selector (Track A / Track B) shown whenever the member has no active cycle. If they already have an active cycle with a locked track, show the current track read-only plus a small "Change track" button (staff-only override).
- Show current track + classes-used-this-window (e.g. "7 / 12 this month") on the card.
- Staff booking modal is unaffected — staff bookings bypass track/cap via the RLS check above.

### 3. Member UI
- **Membership page (`src/routes/_app/membership.tsx`)** and profile: display locked track and usage `used / 12` for the current window. If subscription is active but `group_track` is null, show a "Choose your booking days" prompt with a one-time picker (Track A / Track B) calling `set_group_track`.
- **Booking page (`src/routes/_app/book.tsx`)**:
  - When the active bookee (self or selected child) has an active group subscription with a locked track, grey out calendar days that don't match the track and hide/disable group slots on off-track days with the message "Not your booking day."
  - When at cap, disable remaining group slots in the current window with "12/12 this month."
  - Kids classes already restricted to child bookee — same rules apply per child track.
- Yoga / Gymnastics slots continue to ignore the track and cap.

### 4. Signup flow
- No change at signup — members don't have a subscription yet. Track is chosen at first renewal (admin does it during "Renew or Add") or via the member membership screen if a subscription is granted without a track.

## Notes / edge cases

- Existing active subscriptions will have `group_track = null`. They'll be prompted to pick a track on next booking attempt (or staff sets it in admin). Cap counting for legacy subs uses `now() - 30d` as fallback until they renew.
- Weekday is computed in Amman timezone (`Asia/Amman`) both in Postgres (`(starts_at AT TIME ZONE 'Asia/Amman')::date` → `extract(dow ...)`) and in the client (via existing `src/lib/time.ts`).
- Pause/resume unchanged — pause already blocks group bookings.

## Technical details (for engineers)

- Track enum stored as text with CHECK constraint to keep migration simple.
- Cap query in trigger: `SELECT count(*) FROM bookings b JOIN classes c ON c.id=b.class_id WHERE b.member_id=NEW.member_id AND (b.child_id IS NOT DISTINCT FROM NEW.child_id) AND c.type IN ('mixed','women_only','kids') AND b.status <> 'cancelled' AND c.starts_at >= window_start AND c.starts_at < window_start + interval '30 days'` where `window_start = start + floor(extract(epoch from now()-start)/(30*86400)) * interval '30 days'`.
- Staff bypass via `has_role(auth.uid(),'staff')` inside the trigger (SECURITY DEFINER preserves `auth.uid()`).
- RLS on `profiles`/`children` update policies extended to allow updating `group_track` only when the previous value is null (members) or always (staff).
