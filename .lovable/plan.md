# Platform Owner Console — Next Features

## Goal
Evolve the platform-owner console from a simple gym approval list into a full gym-lifecycle, operational-support, and revenue-tracking hub.

## Proposed Features

### 1. Gym Detail View
A dedicated panel or route for each gym that shows:
- Full gym profile (name, slug, city, address, phone, coordinates, map link)
- Branding preview (logo, primary/secondary colours)
- Owner / admin contact card
- Onboarding completion checklist (basics, training offering, hours, brand, social links)
- Direct action buttons: Activate, Suspend, Approve, Delete gym

### 2. Onboarding Health Checklist
Track and surface which newly applied gyms have finished setup:
- Logo uploaded
- Opening hours set
- Social links added
- At least one coach added
- Waiver text configured
- First class created
Gyms missing critical steps get a "needs attention" badge and can be filtered.

### 3. "Open as Admin" Impersonation
Let the platform owner enter a gym's admin dashboard without knowing the owner's password. This is a support/operations tool for troubleshooting settings, classes, or member issues.

### 4. Activity / Audit Feed
A chronological feed of platform events:
- Gym status changes (who, when, from → to)
- New gym applications
- Owner onboarding completions
- Suspicious actions (mass booking cancellations, membership pauses by staff)

### 5. Platform-Wide Announcements
Create announcements that can be broadcast:
- To all gyms / all members
- To a specific gym's members only
- Shown in the member app home/news section and/or as a banner in the gym admin portal

### 6. Billing & Subscription Tracking
Add subscription state to each gym:
- Plan tier (trial / starter / growth / enterprise)
- Trial expiry date
- Monthly recurring revenue (MRR) estimate
- Billing status (active, past-due, cancelled)
- Payment method on file (Cliq / cash tracking for now)
- Invoices / credit notes list

### 7. Cross-Gym Analytics Dashboard
High-level KPI cards and charts:
- Total active members across all gyms
- Total classes booked this week / month
- New signups trend (line chart)
- Revenue by gym (bar chart)
- Top gyms by member count or booking volume
- Gyms expiring soon / churn risk

### 8. Enhanced Search & Filters
- Search by gym name, slug, owner name, owner email, or phone
- Filter by status, onboarding completeness, subscription tier, trial expiry range
- Sort by application date, last activity, member count, revenue

### 9. Support Actions
- Reset gym owner password
- Resend onboarding/welcome link
- Transfer gym ownership to another user
- Permanently delete a gym and its data (with confirmation)

### 10. Export
- Export filtered gym list to CSV (gym name, status, owner, city, member count, subscription status, applied date)

## Suggested Implementation Order

```text
Phase 1 — Visibility & Operations
├── Gym detail view
├── Onboarding checklist
├── "Open as admin" impersonation
└── Activity / audit feed

Phase 2 — Communications
├── Platform-wide announcements
└── Per-gym announcement targeting

Phase 3 — Billing & Analytics
├── Subscription status fields and UI
├── Billing status tracking
├── Cross-gym KPI dashboard
└── Gym list export

Phase 4 — Scale
├── Advanced search, filters, sorting
└── Support actions (password reset, ownership transfer, delete)
```

## Technical Notes
- New tables required: `platform_audit_log`, `platform_announcements`, `gym_subscriptions` (or extend `gyms` with billing columns).
- All platform-owner actions must verify `is_platform_admin` via `requireSupabaseAuth` + `isPlatformAdmin()`.
- Use `supabaseAdmin` only inside handlers after the admin check.
- Keep the existing dashboard layout; add a left sidebar or tab bar for the new sections.

## Out of Scope (for now)
- Automatic payment collection (Stripe/Paddle integration)
- Email/SMS automation
- Custom pricing plans per gym
