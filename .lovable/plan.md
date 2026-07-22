## Gender-Based Class Access

Add `gender` to accounts and children, then filter class visibility and enforce eligibility on the server.

### Schema
Migration:
- `ALTER TABLE profiles ADD COLUMN gender text CHECK (gender IN ('male','female'))`
- `ALTER TABLE children ADD COLUMN gender text CHECK (gender IN ('male','female'))` (already exists as `gender` — verify; if present, reuse and constrain values)
- Update `consume_class_credit` trigger to reject bookings when class type doesn't match caller's gender/account context (staff bypass preserved via `has_role`):
  - `women_only`, `yoga`, `gymnastics` → require `profiles.gender = 'female'` (adult booking, `child_id IS NULL`)
  - `mixed` → adults only (already enforced by kids/adult split)
  - `kids` → child booking only (already enforced)

### Signup
`src/routes/signup.tsx`: add required Male/Female selector, pass into `auth.signUp` metadata as `gender`. Update `handle_new_user` trigger to persist `raw_user_meta_data->>'gender'` into `profiles.gender`.

### Existing users (soft prompt)
- `src/routes/_app/profile.edit.tsx`: add Gender field (male/female radio).
- `src/routes/_app/book.tsx`: when adult profile has `gender IS NULL`, show an inline banner with a link to Profile → Edit; disable booking of any group class (mixed/women_only/yoga/gymnastics) until set. PT and Kids booking unaffected.

### Children
`src/routes/_app/profile.children.tsx` (add-child form): capture gender (male/female) at add time. Records only — no filtering impact today.

### Class visibility (booking UI)
`src/routes/_app/book.tsx`: filter available class types by active context:
- Parent Mode with child selected → only `kids` (unchanged).
- Adult (self) with `gender = 'male'` → `mixed`, `pt`.
- Adult (self) with `gender = 'female'` → `mixed`, `women_only`, `yoga`, `gymnastics`, `pt`.
- Adult with `gender = NULL` → `mixed` shown but disabled with prompt (soft-block until they set gender). PT still bookable.

Also hide type chips that resolve to zero visible classes for the current context.

### Admin
Staff continues to bypass gender/track/cap rules in the trigger. No admin UI changes required, but member detail (`admin.members.$id.tsx`) will display gender in the Contact section for reference.

### Technical notes
- Use existing `has_role(auth.uid(), 'staff')` guard in the trigger for bypass.
- Keep client-side filtering purely presentational; the trigger is the source of truth.
- No changes to RLS policies needed.

### Out of scope
- Changing which classes count toward the 12/month cap.
- Migrating existing accounts' gender in bulk (they self-set via Profile).
