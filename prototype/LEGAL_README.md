# Legal pages — README

**Template — have a lawyer licensed in BC review before launch.**

Pages (indexable, prerendered, in sitemap, linked in the footer on every page):
- `/privacy` – Privacy Policy
- `/terms` – Terms and Conditions
- `/disclaimer` – Medical & Data Disclaimer

Source: `js/screens/legal.js`. Each page starts with the HTML comment
`<!-- Template — have a lawyer licensed in BC review before launch. -->`.

## Fill before launch (search for `TODO` in legal.js)
- `LEGAL.operator` (legal name / company) and `LEGAL.email` (contact email); `LEGAL.updated` date.
- Hosting provider name; Supabase project region (international transfers).
- Retention period for inactive profiles.
- Confirm weigh-ins and saved foods are deleted with the pet profile (store.js `clearPet` deletes the `pets` row only; check DB cascade). Consider an in-app "delete all my data" that also deletes reviews and the anonymous auth user.
- If you add email sign-in (magic link), analytics, photo upload/OCR, or affiliate links, update the Privacy Policy / Terms (affiliate disclosure placeholder in Terms §7).

## What the privacy policy describes (checked against the code, 21 Oct 2026)
- localStorage keys `pnm.v1` (pet profile, saved foods, reviews cache), `pnm.auth` (Supabase anonymous session), `pnm.ack` (wizard acknowledgement).
- Supabase anonymous auth; tables `pets`, `weight_logs`, `saved_foods`, `reviews` (published reviews readable by all; moderation via `status`).
- No analytics, no ad cookies, label photos not uploaded (scanner uses a sample).

## UI disclaimers
- `expNote()` in `js/ui.js`: short line shown on growth, pet dashboard (calories/growth), foods/food matches, recipe, toxic checker, can-pets-eat pages and scanner.
- Wizard last step: one-time checkbox "I understand these results are experimental…" (remembered in `pnm.ack`).
