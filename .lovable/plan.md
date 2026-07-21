## Plan: Update payment method label in admin panel

The admin renewal/adjustment modal currently shows two payment-method options: **Cash** and **Card**. The gym only accepts **Cash** and **Cliq**, so we need to rename the second option.

### Change
In `src/routes/admin.tsx`:
1. Update the `method` state type from `"cash" | "card"` to `"cash" | "cliq"`.
2. Update the `onChange` cast to `"cash" | "cliq"`.
3. Change the `<option value="card">Card</option>` label text to **Cliq** (keep the value as `card` to avoid a wider migration, or migrate the value to `cliq` for consistency).

### Scope
- Only the admin payment-method dropdown is affected.
- No database migration is required if we keep the stored value as `card`; if we change the value to `cliq`, existing transaction rows with `payment_method = 'card'` would need updating.
- Recommendation: keep the underlying value as `card` and only change the visible label to **Cliq**, minimizing risk and preserving historical transaction data.

### Verification
- Open the admin panel, trigger a Group or PT renewal/adjustment, and confirm the dropdown now reads **Cash | Cliq**.
- Ensure selecting Cliq still records the transaction correctly.