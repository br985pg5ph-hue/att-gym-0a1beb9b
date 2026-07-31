# Onboarding: icon card grid for multi-select steps

Replace the pill chips in the onboarding questionnaire with a 2-column grid of tappable icon cards, applied to every multi-select step.

## What changes

**Training types step** ("What types of training have you tried?")
- 2-column grid of cards. Each card shows a Lucide icon on top, the label below, and a filled checkmark badge in the top-right corner when selected.
- Selected state: primary border, tinted primary background, primary-coloured icon. Unselected: hairline border, card background, muted icon.
- Subtle press/scale transition on tap.

**Goals step** ("What are your goals?")
- Same card grid, its own icon set.

**Shared header for both steps**
- Under the question title: a live counter ("3 selected") replacing the plain "Select all that apply" hint, plus a small "Clear" action once anything is picked.

Single-choice steps (experience, frequency) keep their current full-width rows so choosing one vs. many stays visually distinct.

## Icon mapping

- Training types: Weight training (dumbbell), Cardio / Running (footprints), Functional training (activity), CrossFit style (flame), Group classes (users), Yoga (flower), Pilates (move), Swimming (waves), Team sports (trophy), Martial arts (swords), Cycling (bike), None yet (circle-dashed).
- Goals: Lose weight (trending-down), Build muscle (dumbbell), Get stronger (zap), Improve endurance (heart-pulse), Flexibility & mobility (stretch-horizontal), Stress relief (brain), Community & fun (party-popper), General health (heart).

## Technical notes

- File: `src/routes/gym/$gymSlug/onboarding.tsx`.
- Replace the `Chips` helper with an `OptionGrid` component taking `options: { value: string; icon: LucideIcon }[]`, `selected`, `onToggle`.
- Convert the existing `DISCIPLINES` and `GOALS` string arrays into arrays of `{ value, icon }`; the stored values sent to `profiles.disciplines` / `profiles.goals` stay identical, so no database or validation change.
- `Section` gains an optional `counter` node so the "N selected / Clear" row renders in the same place the hint does.
- Icons from `lucide-react`; all colours via existing semantic tokens (`primary`, `card`, `muted-foreground`, `hairline`).
