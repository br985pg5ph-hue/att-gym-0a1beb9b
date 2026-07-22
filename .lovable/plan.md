# Admin Dashboard — Insights Proposal

## Current state
The admin portal already has operational tools: announcements, classes (with recurring creation), coaches, and a member list/detail flow. Under the hood you have rich data: profiles, children, classes, bookings, transactions, coaches, and announcements. A dashboard would surface high-level business health without replacing those tools.

## Recommended dashboard sections

### 1. Today snapshot
- Classes scheduled today / tomorrow
- Total bookings today vs capacity
- Check-in-style "attended so far" estimate

### 2. Membership & revenue health
- Active group members count (profiles + children with `group_subscription_until > now()`)
- PT sessions on the books (sum of `pt_sessions_remaining` across profiles + children)
- Recent credit movements (credits added/removed this week from `transactions`)
- Upcoming expirations (group subscriptions expiring in next 7 days)

### 3. Bookings & attendance
- Bookings this month vs last month
- Most-booked class types (Muay Thai, MMA, Kids Group, Yoga, Gymnastics)
- Classes at risk of low attendance (below a threshold)
- Cancellation rate

### 4. Member growth
- New signups this week / month
- Referral conversions (members who used a referral code and booked)
- Top referrers

### 5. Operational alerts
- Classes that are full or nearly full
- Members with expired group membership who still booked recently
- Kids classes without enough signups

## Suggested design
- Add a new "Dashboard" tab as the first/default tab in the admin bottom nav.
- Keep it mobile-first: stacked cards with numbers, sparklines optional, and a "View all" link into the relevant tool.
- Use the existing card + hairline + pill visual language.

## Implementation approach
- Create a new `/admin/dashboard` route or make Dashboard the default tab inside `/admin`.
- Build one or more `createServerFn` aggregators that query Supabase with `count`, `sum`, and date filters.
- Reuse existing admin auth gate; no new RLS needed if queries run through `requireSupabaseAuth` or the existing staff check.
- Optional: add a lightweight `dashboard_stats` materialized view if the app grows, but start with live queries.

## Phases
1. **MVP**: Today snapshot + membership totals + recent signups.
2. **Add trends**: Month-over-month booking chart and top class types.
3. **Add alerts**: Full classes, expiring memberships, low-attendance classes.

## Open questions
- Do you want charts/graphs, or just key-number cards with arrows?
- Should the dashboard default to "today" or "this week"?
- Any metric you care about most (e.g. revenue-like tracking even though payments happen in person)?

Approve this direction and I’ll build the first phase.