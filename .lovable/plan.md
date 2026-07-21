## Problem
The admin recurring-class feature uses the device's local timezone when parsing `datetime-local` inputs and generating recurring dates. Because the rest of the app (calendar, booking eligibility, cancellation windows) is anchored to **Asia/Amman**, classes created on a device outside Jordan end up stored at the wrong UTC time. This makes the schedule look unreliable — classes appear on the wrong day or at the wrong hour.

## Plan

1. **Create a shared Amman-time utility** (`src/lib/time.ts`)
   - `ammanNow()`: current wall-clock time in Amman.
   - `toAmmanDateInput(d)`: format a Date as `YYYY-MM-DDTHH:MM` in Amman time for `<input type="datetime-local">`.
   - `fromAmmanDateInput(iso)`: parse a `datetime-local` string as Amman wall-clock time and return a true UTC `Date`.
   - `addAmmanDays(d, n)`: add days while staying in Amman wall-clock time (handles DST safely).
   - `formatAmmanDateTime(d)`: display helper for lists.

2. **Update `src/routes/admin.tsx` class creation form**
   - Initialize `startsAt` with `toAmmanDateInput(ammanNow())`.
   - Parse the submitted `startsAt` with `fromAmmanDateInput` before generating or inserting rows.
   - Use the same helper for the edit modal's `datetime-local` field and display.

3. **Fix recurring date generation**
   - Build the recurrence in Amman local time: start at the Amman wall-clock date/time from the input, then add `stepDays` (1 or 7) using `addAmmanDays` until the end date.
   - Convert each generated occurrence to ISO before inserting.
   - Cap occurrences at a sensible maximum (e.g., 90 days out or 200 classes, whichever is smaller) and show a clear error if exceeded.

4. **Add validation and guardrails**
   - End date must be on or after the start date.
   - Frequency + end date required when "Recurring" is checked.
   - Prevent accidental duplicate recurring series by warning if the date range is empty.

5. **Update class list display**
   - Show `starts_at` formatted in Amman local time so staff see the same time members see on the booking page.

6. **Verify**
   - Create a small weekly recurring series in the admin panel and confirm the stored `starts_at` values match the selected Amman time in the database.

## Out of scope (for this plan)
- No third-party booking connector — the custom system is being fixed.
- No changes to the member booking flow, credits, or RLS (those are working).

## Expected result
Staff can create daily or weekly recurring classes from the admin panel and the generated classes will appear at the correct Amman date/time for members, regardless of the staff member's device timezone.