# Opening hours redesign: toggle-centric editor

Implement the selected "Modern toggle-centric editor" design for the opening hours block inside `src/components/GymSetupPanel.tsx`.

## What changes

**HoursEditor component redesign**
- Wrap the editor in a clean card-like surface within the existing "Location & hours" section.
- Move the "Copy Monday to all" action to the top-right of the hours block.
- Replace the per-day checkbox with a custom toggle switch that shows "Open" / "Closed".
- For open days: show open/close time selects and a visual duration bar proportional to the daily open window.
- For closed days: dim the row, hide time inputs, and show a "Closed" label.
- Keep Monday first in the list and the "Copy Monday to all" behaviour.
- Move the "Save hours" action to a footer bar inside the hours block.

**Functional preservation**
- Keep the same 12-hour AM/PM time selection and `to24`/`to12` conversion logic.
- Keep the same save payload shape and `onSave` contract.
- Preserve the existing light/dark theme support by using semantic tokens (`bg-card`, `hairline`, `text-muted-foreground`, `primary`, etc.) instead of hardcoded zinc/indigo values.

**Out of scope**
- No changes to other Gym setup sections (basics, branding, waiver, social links).
- No changes to data model, RLS, or server functions.

## Files to change
- `src/components/GymSetupPanel.tsx` — restyle the `HoursEditor` sub-component.
