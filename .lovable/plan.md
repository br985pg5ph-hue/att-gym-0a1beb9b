## Plan: Enhance Admin Dashboard

Add three new data-rich widgets to the existing admin dashboard in `src/routes/admin.tsx`:

### 1. Revenue Snapshot
- Aggregate transactions by payment method (cash / Cliq) for today and this week.
- Source: `transactions` table, filtered by `created_at` and `payment_method`.
- Display as a compact KPI card or mini bar with two values: **Today** and **This Week**.
- Only count `credit` transactions (payments received), ignore debits/refunds.

### 2. Signup Trend Chart
- Count new `profiles` created per day over the last 7 and last 30 days.
- Return an array of `{ date, count }` from the server function.
- Render a simple CSS-only bar chart (no new charting library) showing daily signups.
- Add a small toggle or tabs to switch between 7-day and 30-day views.

### 3. Membership Status Breakdown
- Categorize all members into:
  - **Active** — has group subscription in future OR PT sessions > 0
  - **Paused** — `membership_paused_at` is set
  - **Expired** — group subscription in past and no PT credits
  - **Never subscribed** — no subscription date and no PT credits
- Source: `profiles` table.
- Display as a horizontal stacked bar or segmented progress bar with counts.

### Technical Approach
- Extend `getAdminDashboardStats` in `src/lib/dashboard.functions.ts` to return the new aggregates.
- Keep all queries inside the existing staff-auth guard and use `supabaseAdmin` for full visibility.
- Update `DashboardAdmin` in `src/routes/admin.tsx` to render the new widgets.
- Place the new widgets logically:
  - Revenue snapshot and membership breakdown in the right-hand side column (under or above "Expiring Soon").
  - Signup trend chart as a full-width card below the KPI grid or above recent transactions.
- No schema changes required; all data is already available in existing tables.
- No new npm dependencies; build the chart with divs and CSS.

### Files to Modify
- `src/lib/dashboard.functions.ts` — add revenue, signup trend, and membership breakdown queries.
- `src/routes/admin.tsx` — render the three new dashboard widgets.
- `src/lib/i18n.ts` — add any new translation keys needed (en/ar).

### Acceptance Criteria
- Dashboard loads without errors and displays the three new sections.
- Revenue numbers reflect actual `credit` transactions for today/this week.
- Signup trend shows per-day counts for the selected range.
- Membership breakdown sums to the total number of profiles and updates when statuses change.