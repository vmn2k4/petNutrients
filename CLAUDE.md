# Pet Nutrition Matcher: project rules

Global (not Canada-only) dog and cat nutrition app. Web first (Next.js + Supabase + Vercel), Flutter mobile later. Read `data/DATA_GUIDE.md` and `data/USER_FLOW.md` for data and screens. Anything marked "Proposal" there is a product decision, not a fact.

## Product scope (in order)
1. Pet profile (dog first, cat second) and growth chart with percentile.
2. Nutrient and calorie targets from the profile.
3. Label scan / barcode lookup: show nutrients, fit for this pet, comparable foods.
4. Food browser with nutrient filters (only nutrients that exist on labels; mark others "not reported").
5. Ratings: palatability, what improved, rebuy, subscribe (and why not).
6. DIY recipe checker first, recipe generator later (needs vet-nutritionist review).
7. Pages: Home, My pet (Overview, Growth, Profile), Foods, Scan, Guides, Tools. See MASTER.md information architecture.

## Engagement principles (from research, see design-system MASTER.md)
Habit-forming means helpful and easy to return to, not manipulative.
- Show value first, ask for an account to keep it (decided 2026-10-21, replaces "no account needed to start"):
  - Logged-out visitors can use Home, Guides, the Foods page (with a quick details panel whose answers stay in the tab and are never saved) and Scan.
  - A profile (pet, weigh-ins, saved foods, reviews, reminders) needs a free account: email + password (min 8 characters, decided 2026-10-22, replaces email-only codes), with a confirmation email on sign up and a "forgot password" reset link. There are no guest accounts.
  - Ask for the account where it protects something the person made (saving, reviews, weight history), say what they get in plain words, and never hide the answer itself. Quick details typed before signing up pre-fill the profile wizard.
  - Safety information is never behind login. Everything else is asked later on the dashboard ("Make the plan more accurate").
- One clear next step on the dashboard, not a menu.
- Rhythm, not pressure: weigh-in streaks are on a schedule (2 weeks growing, monthly adult), can be skipped without losing the streak, and reminders are opt-in and at most weekly. Never shame, never highlight a broken streak.
- Specific, goal-based reminder copy. No fake urgency, no countdowns.
- Motion only where it carries meaning (numbers count up to a result, the pet's line draws in); always honor reduced motion.
- Phone first: questions and filters open as bottom sheets. Scan (the in-store action, raised center tab) is hidden from navigation until label reading and barcode lookup really work (decided 2026-10-22); `/scan` shows a coming-soon page.
- Evidence is thin: most engagement claims online are vendor blogs. Measure our own retention before adding more mechanics.

## Architecture (hard rules)
```
apps/web          Next.js screens only
apps/mobile       Flutter, later
packages/tokens   tokens.json (single source) + generated CSS/Tailwind and Dart
packages/ui       shared React components, no data calls
packages/data     the ONLY code that talks to Supabase
packages/domain   pure business logic: no database, no React, no network
supabase/         migrations, edge functions, seeds
data/             raw datasets
```
- Dependencies: `domain` imports nothing. `data` imports only Supabase and types. `ui` imports only `tokens`. `apps` use the others and never call the database or hard-code business rules.
- Enforce with lint (eslint boundaries or dependency-cruiser), not just this document.
- Create folders early but keep them small. Add an abstraction only when a second use appears.

## Reuse for Flutter
- React code is not reusable in Flutter. What is shared: DB schema and migrations, server functions, tokens, test vectors, component specs.
- Important logic (calories, percentile lookup, nutrient matching, scoring) lives server-side as Postgres functions or Supabase Edge Functions so web and Flutter get identical results. `domain` holds only pure helpers for instant UI preview.
- The DB plus its functions is the shared API. Generate types from the schema.
- Components: same names, props and variants in React and Flutter.
- Golden tests: shared JSON cases (e.g. the Labrador example in DATA_GUIDE section 4.3) must pass for `domain` and the server functions.

## Theming and UI
- No hard-coded colors, fonts, spacing, radii or shadows anywhere. Everything comes from `packages/tokens`.
- Every reusable UI piece lives in `packages/ui`. If a second screen needs it, move it there.
- All user-facing text goes in translation files. Units (kg/lb) convert in one module.
- Nutrition standards (AAFCO now, FEDIAF later) are data tables, never hard-coded numbers.

## Design
- Design decisions: `design-system/pet-nutrition-matcher/MASTER.md`. Page-specific overrides go in `design-system/pet-nutrition-matcher/pages/<page>.md`.
- Clickable reference prototype: `prototype/` (static; run via the `prototype` launch config, `prototype/scripts/serve.py`). It follows the same layers: `css/tokens.css`, `js/ui.js` (components), `js/domain.js` (pure logic), `js/store.js` (data layer), `js/screens/`. `js/reference-data.js` is generated by `scripts/build_reference_data.py` from `/data`.
- Before calling UI work done, run the audit in `prototype/scripts/audit.js` on every page at 375 px (light and dark) and desktop width.
- Prototype product names and nutrient numbers in `js/mock-data.js` are invented samples; never present them as real products.

## Data rules
- Open Pet Food Facts is ODbL: keep its rows in a separate schema/table group from our own ratings, scoring and catalogue. Always show credit.
- Do not parse the AAFCO Chapter 6 PDF. The AKC dog-breeds table is internal only (not cleared for commercial use).
- BioVet data needs the attribution "Data: BioVet veterinary clinic network, bio.vet". Salt 2017, figshare, CNF and USDA need credits per DATA_GUIDE section 6.
- Never present estimates as facts: label growth curves "estimate", and show "not verified" when a nutrient (e.g. calcium) is missing.
- Safety: body condition 1-3, health conditions, a growing large-breed puppy needing weight loss, or pregnancy/nursing get a "talk to your vet" card. Calories and portions are still shown, labelled approximate (decided 2026-10-22, replaces hiding them for an overweight growing pet): the card asks the owner to confirm with their vet and never offers a weight-loss plan for a growing pet.

## Working style
- Develop locally first (Supabase CLI + Docker); the cloud project comes later from the same migrations.
- The user wants to iterate on designs often; keep layers clean so changes stay cheap.
- Ask before big structural changes to these rules; update this file when the user changes them.
