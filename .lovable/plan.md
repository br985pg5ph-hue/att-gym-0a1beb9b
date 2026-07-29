## Add a country code picker to the phone fields in gym setup

Right now "Phone" (and "WhatsApp number") in the gym setup page are plain text boxes, so the gym owner has to type the full international number by hand.

### What changes

- Add a new phone field variant on the setup page that pairs the existing flag + dial-code dropdown (the same one members already use at signup) with the number box.
- Default the dial code to **+962 (Jordan)**, matching the rest of the app.
- Use it for both **Phone** and **WhatsApp number** in the Location & Contact section.

### Behaviour

- When the page loads, an existing saved number like `+962791234567` is split: `+962` selects the flag, `791234567` fills the input.
- If a saved number has no recognised dial code, it stays in the number box and the picker shows the default.
- Saving joins them back into one string (`+962791234567`), so the stored format and everything reading gym phone/WhatsApp is unchanged.
- Typing a leading `0` or spaces is cleaned up before saving.

### Technical details

- New `SetupPhone` component inside `src/routes/gym-portal/setup.tsx`, modelled on the existing `SetupField` (local state, `Save` button, same styling), rendering `<CountrySelect />` from `src/components/CountrySelect.tsx` to the left of the input.
- Splitting logic matches against `COUNTRIES` dial codes from `src/lib/countries.ts`, longest-prefix first.
- No schema or server changes — `gyms.phone` / `gyms.whatsapp_number` stay single text columns.
