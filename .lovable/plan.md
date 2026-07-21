## Add Yoga and Gymnastics to booking

Both are adult-only group classes covered by the existing Group Membership (same "active until" date). They appear as two distinct filters/tags alongside Mixed and Women Only.

### Database
- Extend the `class_type` enum with two new values: `yoga` and `gymnastics`.
- Update the two eligibility triggers (`consume_class_credit`, `enforce_kids_class_child`) so `yoga` and `gymnastics` are treated exactly like `mixed` / `women_only`: require an active adult Group Membership, no child bookings, no PT credit consumed.
- No new columns, no new balance field, no changes to `transactions` or refunds.

### Admin (staff)
- `admin.tsx` "Create class" form: add Yoga and Gymnastics options to the type dropdown.
- `admin.members.$id.tsx` "Book on behalf" modal: no logic change needed (it already blocks kids-typed classes from adult bookings); new types will just work.

### Member booking page (`_app/book.tsx`)
- Add `yoga` and `gymnastics` to the `TYPES` filter list so they appear as filter chips.
- Extend the per-slot eligibility function so both types check `groupActiveMember` (same rule as mixed / women_only).
- Keep kids-only hiding rules unchanged.

### Copy / i18n (`src/lib/i18n.ts`)
- Add English + Arabic labels for `yoga` and `gymnastics` used by the filter chips and any type badges.

### Out of scope
- No changes to PT sessions, referral logic, transaction history, or the Group Membership card on Home — a member with an active subscription automatically gets access to the new classes.

### Technical notes
- Postgres does not allow `ALTER TYPE ... ADD VALUE` inside a transaction that also uses the new value. The migration will add the enum values in one statement; the trigger updates (which reference the new labels via `IN (...)`) go in the same migration but after a `COMMIT`-safe boundary using separate statements — standard pattern, handled inside a single migration call.
