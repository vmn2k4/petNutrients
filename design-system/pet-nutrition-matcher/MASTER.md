# Design System: Pet Diet & Weight Tracker

Source of truth in code: `prototype/css/tokens.css` (later `packages/tokens/tokens.json`). This file explains the decisions.
Generated starting point: ui-ux-pro-max `--design-system` (dials: variance 3, motion 3, density 2 = calm, spacious). Where the tool's picks did not fit, we overrode them (below).

## Decisions
| Area | Choice | Why |
|---|---|---|
| Mood | Playful pet-shop energy with calm, spacious layout (v3, from the Foxic-style reference the owner shared) | Warm and friendly, but numbers and warnings stay clear |
| Neutrals | Cool near-white `#F7F9F9`, ink `#0E2A30` | Ink is the primary button color, so the page stays calm |
| Brand | Yellow `#FFD21F` (hero, primary button, footer), green `#1F9D4B` (bands, blobs), orange `#F59A1F` (blob) | Decorative surfaces. Ink text sits on yellow and orange; white on green |
| Text-safe primary | Green `#15803D` | Links, chart, focus ring. Passes 4.5:1 with white |
| Status | Good green, caution amber, bad red, each with icon + label | Never color alone (accessibility) |
| Fonts | Fredoka (display headings), Geist (UI and body), Noto Sans fallback for other scripts | Rounded display type matches the playful reference; Geist keeps data legible |
| Style | Yellow hero with wavy edges, cut-out pets (white-background photos blended with multiply), blob badges, doodle icons, round category photos, product cards, promo tiles | Tool's "Exaggerated Minimalism" (oversized type) rejected: wrong for a data-heavy health tool |
| Landing pattern | Yellow hero, three blob badges, foods of the week, category circles, green wave band, featured foods, two promo tiles, owner reviews, yellow wavy footer | Tool's "Real-time / Operations" pattern rejected: not an ops product |
| Icons | Phosphor icon font only | One family, no hand-drawn SVG |
| Photography | FLUX-generated pet photos in `prototype/assets` | Real imagery, not fake UI screenshots |
| Dark mode | Supported via tokens (`prefers-color-scheme`) | |
| Motion | Scroll reveal and hover lift (160 to 700 ms), respects reduced motion | Reveals show hierarchy as content enters |

## Layout
- Mobile first. Bottom tab bar (5 items) under 900 px, top nav above.
- Content width 76rem; narrow pages (scan, tools) 46rem; wizard is a photo plus form split.
- Touch targets at least 44 px. Body 16 px, line height 1.6.
- Spacing scale `--space-1..9`; page gutter `clamp(1.25rem, 5vw, 3rem)`.

## Components (all in `prototype/js/ui.js` + `css/components.css`)
button, card, badge, verdict banner and badge, stat, field and select, choice tiles (radio/checkbox), stepper, meter (value vs min/max), stars and rating input, notice, disclosure, growth chart (`js/charts.js`), table, dropzone, icon bubble.
Each becomes one widget with the same name and variants in Flutter.

## Shape rule
Buttons are pills. Cards use `--radius-lg`. Inputs use `--radius-md`. Do not mix.

## Rules
- No hard-coded colors, fonts, spacing or radii outside `tokens.css`.
- Phosphor icons only (no emoji, no hand-drawn SVG). Visible labels on every input. Errors next to the field.
- Status is icon + text + color. Charts have an `aria-label` and a table alternative.
- Ratings are shown apart from nutrition fit.
- Estimates are labelled as estimates; missing values say "not reported".

## Home page notes
- Pet cut-outs are real transparent WebP files (`prototype/assets/cut-*.webp`): generate the pet on a plain white background with FLUX, then lift the subject with `prototype/scripts/cutout.swift` (Apple Vision, macOS 14+, no downloads): `swiftc -O cutout.swift -o cutout && ./cutout in.png out.png`, then save as WebP. Always look at the result on a coloured background; a bowl or blanket can be lifted with the pet.
- Primary button is yellow with ink text; use `btn--dark` on yellow surfaces and `btn--white` on green.

## Every screen shares the theme
Interior screens start with the shared yellow page band (`pageBand` in `js/ui.js`): Fredoka title, optional lead and chips, doodles, wavy bottom edge. Selected states, charts, focus rings and links are green; the active nav item is yellow; the footer is yellow with a wavy top. New screens must use `pageBand` and the shared components.

## UI audit (ui-ux-pro-max checklist)
Run `eval(await (await fetch('/scripts/audit.js')).text()); await window.__audit()` in the prototype's browser console on each page. It checks text contrast (4.5:1, 3:1 for large text), tap targets (44 px), labels, image alt text, heading order and sideways overflow.
Last run: 9 pages x (375 px light, 375 px dark, 1100 px light) = no issues. Not yet tested: largest system text size, landscape phones, a real screen reader, reduced-motion toggled on.
Fixed on that pass: white-on-green text (green deepened to `#15803D`), badge contrast, 44 px targets for logo and footer links, heading order (h1 then h2), badges inside the yellow band in dark mode, scan upload buttons on phones, nav button cut off on phones, doodles overlapping titles on phones, min/max filter inputs stacking.

## Interaction patterns (v4, after engagement research)
- **Progressive profile:** 3 setup steps, then a plan-accuracy ring and chips on the dashboard. Defaults (ideal body shape, neutered, normal activity) are stated, not hidden.
- **Bottom sheet** (`js/sheet.js`): dialog role, focus trap, Escape, focus return. Used for profile questions. Foods filters are a bottom sheet on phones and a sticky sidebar on desktop.
- **Weigh-in rhythm:** due date, on-schedule streak, "Skip this one" keeps the streak, opt-in weekly reminder switch.
- **Raised center Scan tab** on phones. **Toast** for confirmations.
- **Motion with a reason:** count-up on the calorie result, line draw-in on the growth chart, page cross-fade via the View Transitions API where supported. All off under reduced motion.

## Transparent pets across the app
- **Page band:** `pageBand(title, lead, extra, art)`; pass an asset name (`cut-beagle`, `cut-cat`, `cut-puppy`, `cut-kitten`, `cut-pair`) and the pet peeks from behind the wavy edge. Pick the pet that matches the page (the user's pet on the dashboard, species of the food on food pages).
- **Empty states:** `emptyState({ img, title, text, action })` in `js/ui.js`. Use it instead of a plain card whenever a list is empty.
- **Wizard:** yellow side panel with the dog or kitten standing in it (desktop only).
- **Scan:** a small pet above the photo prompt.
- Never use a pet photo with a background where a cutout is expected; regenerate on white and run `cutout.swift`.

## Compact headers and goal search (v5, after usability feedback)
- **Task screens use a compact page band** (title plus one short line, about 140 px on desktop, 100 px on phones, small pet on tablet and up). The large hero lives on the home page only. Content should start within the first screen.
- **Search by goal, not by jargon.** On Foods the first thing is "What is the goal for {pet}?": lose, keep steady, gain (adults) or grow (young pets). Weight goals take a target weight and a number of days; we show weekly change, a plain-words pace verdict (safe, slow, fast, too fast), daily calories, and rank foods with plain reasons ("a bigger portion for the same calories"). "Suggest a safe number of days" picks a 1.5% a week pace.
- The goal card collapses to one line once chosen so foods are visible; "Change goal" reopens it.
- **Quick picks** (dry, wet, high protein, lean, fibre-rich, under $2 a day) replace nutrient numbers as the main filters, with a "What do these mean?" explainer. Numeric nutrient ranges stay under More filters, each with a one-line plain description.
- Weight-change maths uses 7700 kcal per kg of body weight (a rule of thumb, shown as an estimate) and a calorie floor of 60% of resting energy at the target weight.

## Levels instead of numbers (v5.1)
- Nutrient filters are a segmented control: **Any / Lower / Medium / Higher** (Lighter/Medium/Richer for calories, Cheaper/Mid-range/Pricier for cost). No units for the user to understand and no free-typed numbers, so nothing unreasonable can be entered.
- Cut points are the thirds of the foods actually on offer for that pet, so every level is possible. A small caption shows what the chosen level means in real numbers ("76 g protein per 1000 kcal or more") for anyone who wants it.
- Switching dog/cat resets the levels, because the cut points change.
- Rule: never ask users to type a quantity they cannot sanity-check. Use levels, presets or bounded choices.

## Priorities, not "more is better" (v5.2)
Observed problem: with Any/Lower/Medium/Higher on every nutrient, people tick Higher everywhere, which is meaningless (and for calcium and phosphorus can be unsafe for large-breed puppies).
- **Safety and requirements are automatic.** Every food is checked against the pet's needs (AAFCO minimums and maximums, toxins, allergies). Users never choose calcium or phosphorus.
- **Priorities rank, they do not hide.** "What matters most? Pick up to two": lower cost, high protein, lean, fibre-rich, lighter food, small portions. Two at most forces a trade-off; foods are sorted by how well they match, with a plain reason on each card.
- **Hard filters only for real constraints:** dry or wet, a budget cap, and allergens from the profile.
- **Nutrient levels live under "Expert filters (optional)"**, collapsed by default, with a note that more is not always better.
- Rule: a control where one option is always the best one is not a control. Offer trade-offs.

## Set your own numbers (v5.3)
For owners following a vet's numbers or a diet plan, under Foods > "Set your own numbers (optional)":
- **Daily calories** with a slider and number box, our suggestion shown, and "Use our suggestion" to undo. Limited to 60% of resting energy up to 2.5x (3x while growing). Portions and cost update from it.
- **A target for each nutrient** (protein, fat, fibre, moisture, calcium, phosphorus, calories in the food): a switch to aim for it, a slider plus number box, in either "% on the label" (as printed on the bag) or "per 1000 kcal" (fair comparison). In the per-1000-kcal view we show what the pet needs at least.
- **Always bounded.** Limits come from what is actually on offer (a little wider), and typed numbers are clamped on commit with a short message, so nothing impossible can be entered.
- **Closest foods first.** Foods are ranked by how close they are to every number set; each card lists "Protein: 27.0 % (you want 30.0)". Foods that do not report a nutrient are labelled "not reported" and can be hidden with the switch in More filters.
- Safety checks still apply: a food that does not meet the pet's needs stays flagged, however close it is to the numbers.

## Suggestion presets (v5.4)
Under "Set your own numbers", one tap fills sensible targets for a situation. Each number has a rule: About, At least or At most. A preset also switches the view to "per 1000 kcal" (the fair comparison) and shows why the numbers were chosen, in plain words, including when there is no official standard.
- **Weight loss.** Calories at most 3,100 kcal per kg (3,250 for cats): AAFCO's limit for "light" dry food. Protein at least 75 and fat at most 30 g per 1000 kcal for dogs: from a research review of weight-loss dog diets (over about 25% protein, under 10% fat, dry matter). Cats: protein at least 85, because higher protein helps keep muscle while losing fat. No official standard exists for protein and fat, and the screen says so.
- **Keep steady.** Protein about 20% above the AAFCO adult minimum, fat at least the minimum.
- **Growing.** At least the AAFCO growth minimums. Calcium and phosphorus stay automatic safety checks.
- **Weight gain, Very active, Senior or less active.** No standard exists. Values are relative to the foods on offer (richer or leaner than the middle), and the screen says so.
- The preset that matches the pet's goal and activity is marked "(suggested)", and the goal card has "Use suggested numbers for ...".
- Rule: never present a made-up number as science. Cite the reference, or say it is relative and unofficial.
Sources: AAFCO "light" calorie limits via state adoptions of Model Regulation PF9 (petfoodindustry.com, 2014 calorie statement rules); weight-loss dog diet thresholds from a research summary at petfoodindustry.com ("Ideal protein, fat, fiber, carb contents for weight-loss dog foods"); cat protein from feline weight-loss studies summarised in veterinary reviews.

## What breed does and does not change (v5.5)
- **Breed sets:** the growth curve (size group), the large-breed puppy calcium cap, the usual adult weight range (used to sanity-check a weight goal), a typical exercise hint when asking about activity, and a short list of conditions that are more common in the breed where food or weight can matter.
- **Breed does not set daily calories.** Calories come from weight, age, neutering and activity. Published research does not give reliable breed-by-breed energy multipliers, so we do not invent them. The breed card says this in plain words.
- Mixed breed: the chosen adult size group is used, and the breed card says so.
- Data: usual adult weight from `growth/breed_growth_index.csv`; typical exercise from the Kaggle dog breeds dataset (CC0, unverified); conditions from the figshare canine diet datasets (CC BY 4.0), filtered to feeding-relevant ones (diabetes, atopy, urinary stones, joint conditions and similar). The list is not a risk score and a missing condition does not mean low risk. Credits are in the footer.
- Cats: no breed data yet. The kitten growth curve covers all breeds.

## Information architecture (v6)
| Page | Route | Purpose |
|---|---|---|
| Home | `#/` | Explain, start |
| Build a profile | `#/new` | Three-step setup for a new pet |
| My pet, Overview | `#/pet` | Plan accuracy, daily energy, goal, growth snapshot, nutrient targets |
| My pet, Growth | `#/pet/growth` | Growth chart and percentile, weight history, weigh-in log, streak, reminders |
| My pet, Profile | `#/pet/profile` | Edit every detail (name, breed, birth date, activity, body shape, allergies), breed facts, remove pet |
| Foods | `#/foods` | Search by goal, priorities, own numbers, presets |
| Food detail | `#/food/:id` | Fit, nutrients, reviews |
| Scan | `#/scan` | Label or barcode |
| Learn (Guides) | `#/guides`, `#/guides/:slug` | Plain-language articles, content in `js/guides-data.js` |
| Tools | `#/tools`, `#/recipe`, `#/toxic` | Recipe checker, "Can my pet eat this?" |
- Phone tab bar: Home, Foods, Scan (raised), My pet, More (Tools and guides). Desktop top nav: Home, Foods, Scan, My pet, Learn, Tools. Between 900 and 1099 px the nav button and link icons are hidden so six links fit.
- "My pet" sections use `petTabs()` (Overview, Growth, Profile). Keep each tab focused; do not let one page grow into a long dashboard again.
- Guides rules: plain language, no medical claims beyond the cited sources, always the line "General information, not veterinary advice", and a button that takes the reader into the matching tool. Add new guides by adding an object to `GUIDES`.
- The wizard moved from `#/profile` to `#/new` so "profile" always means the editable pet profile.

## Goals must make sense for the pet (v6.1)
Found by testing: the planner checked only the pace, so an overweight dog could pick "gain" and be told "a steady pace for healthy gain".
- **Growing pets** are offered only "Grow healthy" (stay on the growth curve). No "keep steady", "lose" or "gain": a puppy should gain.
- **Goals are checked against body shape as well as pace** (`goalSense` in `js/domain.js`):
  - Gain: not advised when body shape is 6 or more (says what to do instead); caution at 4 and 5; vet first when underweight.
  - Lose: not advised when body shape is 4 or less; caution at 5 (already healthy); caution if the target is below the estimated ideal weight.
- The worse of the pace verdict and the body-shape verdict is shown. When a goal is "not advised" we show calories to keep weight steady, not a calorie plan.
- A saved goal that no longer applies (for example after a profile change) is replaced by the default for that pet.
- Rule: a safe pace is not the same as a sensible goal. Check both.

## Targets on the chart (v6.2)
- On the Growth tab an owner picks where they want the pet to be in 1 week, 2 weeks, 1 month, 2 months or 3 months: tap the chart, or use the chips and the weight slider. The marker (a ring on a dashed line from today's weight) and a plain verdict update live. "Save as my goal" stores it as the pet's goal; "Clear target" removes it.
- **Growing pets:** the slider covers the typical range for that age (2nd to 98th percentile, never below today's weight). The verdict says which percentile the target is, flags moves of more than 30 percentile points, and says a growing pet should keep gaining. Calories stay at the growth level; a target is for tracking, not a reason to feed more.
- **Adults:** the slider covers 25% below to 25% above today's weight and uses the same goal checks as the Foods goal planner (pace and body shape).
- Curve values are interpolated between months so one or two weeks ahead still moves.
- Young pets get a zoomed-in chart by default (next ~9 months) with "Show full curve".
- Chart layering rule: the hover readout is drawn under the weigh-in dots and the target marker, and moves to the other side when a dot would be under it.

- Chart labels (v6.3): the pet's current weight is a plain orange text label with a halo, not a dark pill. It sits up-left of the dot when there is room, otherwise below-right, so it stays clear of the target line, the earlier weigh-ins and the band edge. Big filled labels over a chart hide data; use text with a halo.

## Chart inside the goal card (v6.4)
- On Foods, the goal card (collapsed or open) holds a collapsible "Show it on the growth chart" (weight chart for fully grown pets). Tapping the chart sets the target weight and date; the goal line, the foods ranking and the Growth tab marker all update from the same saved goal and target.
- Growing pets: a tap becomes a "grow" goal with their own target. Adults: the goal type follows the tap (lose, gain or keep steady), and we say when it switches.
- One source of truth: `pet.goal` and `pet.target`. Chart options for a pet come from `js/petcharts.js`, shared by the Growth tab and the goal card. Do not build chart data in a screen.

## One target picker (v6.5)
`js/targetpicker.js` is the single "where do you want the pet to be?" component: chart, zoom, legend, a compact control strip under the chart (when chips, weight slider and number, one-line result) and optional Save/Clear. The Growth tab (with save actions) and the Foods goal card (live, no save button) both mount it, so they cannot drift apart. On Foods the mounted picker node is kept across goal redraws so a slider drag is never interrupted.
