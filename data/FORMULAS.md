# Formulas the app uses (for verification)

Source of truth: `prototype/js/domain.js` (energy, goals, matching) and the AAFCO table in the cloud `ref.nutrient_profiles`.
Status tags: **[standard]** = published method, **[chosen]** = our own number, no published source, please check.
All results are estimates for a healthy pet. They are not veterinary advice.

## 1. Inputs and life stage

| Input | Used for | If missing |
|---|---|---|
| species, birth date | life stage, growth percentile | required |
| weight (kg) | resting energy, percentile | required |
| size group (I to VI) or breed | growth curve, large-breed rules | size IV (medium) |
| body condition score (BCS, 1 to 9) | ideal weight, weight-loss flag | 5 (ideal) |
| neutered yes/no | energy multiplier | wizard sets **yes** |
| minutes of walking or active play a day (`exercise_min`) | energy multiplier (bands below) | typical (the neutered / intact factor); old low / normal / high answers still work |

Life stage: **cat** growth under 12 months, adult after. **Dog** growth under 12 months, or under **18 months** for size V and VI (large, giant) [chosen; sources say 18 to 24]. Age is whole months completed (days ÷ 30.44), not a calendar-month difference.

## 2. Calories a day

**Resting energy (RER)** [standard, NRC / AAHA]: `RER = 70 × kg^0.75`

**Ideal weight** [standard, 9-point BCS, same rule for dogs and cats]: if BCS > 5, `ideal = kg ÷ (1 + 0.10 × (BCS − 5))`. Otherwise ideal = current weight.

**Daily calories = RER × multiplier.** The RER uses the ideal weight for adults, and the current weight for growing pets. Source for the ranges: AAHA 2021 Nutrition and Weight Management Guidelines, Box 1 (checked against the PDF).

| Situation | Dog | Cat | AAHA 2021 range (dog / cat) | Status |
|---|---|---|---|---|
| Adult, neutered | 1.5 | 1.3 | 1.4–1.6 / 1.2–1.4 | midpoint |
| Adult, not neutered | 1.7 | 1.5 | 1.6–1.8 / 1.4–1.6 | midpoint |
| Adult, under 30 min a day (cat: under 15) | 1.1 | 1.0 | 1.0–1.2 / 1.0 | midpoint |
| Adult, 30 to 60 min (cat: 15 to 30) | neutered / intact row above | same | | typical pet |
| Adult, 1 to 2 hours (cat: 30 min or more) | 1.8 | 1.6 | light work 1.6–2.0 (dog) / none (cat) | **chosen** |
| Adult dog, 2 hours or more | 2.0 | n/a | top of light work 1.6–2.0 | **chosen**; above 2.0 is working or sport, needs a vet |
| Growing, under 4 months | 3.0 | n/a | 3.0 | AAHA |
| Growing, 4 months until adult | 2.0 | n/a | 2.0 | AAHA |
| Growing kitten | n/a | 2.5 | 2.5 | AAHA |
| Weight loss (RER at ideal weight) | **1.0** | **0.8** | 1.0 / 0.8 | AAHA |

Activity bands live in `ref.activity_bands`, the factors in `ref.energy_factors`, and the calculation runs in the `calc` edge function (`supabase/functions/calc/domain.js`).

Activity above the typical band overrides the neutered/intact choice (it is one or the other, never multiplied together).

Weight-loss floor: `0.6 × RER(ideal)`. AAHA 2021 also reports observed mean intake for weight loss of about 63 kcal/kg^0.75 in dogs (0.9 × RER) and 52 kcal/kg^0.711 in cats. BCS 3 or lower, or a growing pet that needs to lose weight, shows a "talk to your vet" card.

### Worked table (adult dog, healthy weight, BCS 5, normal activity)

| Weight | RER | Neutered ×1.5 | Intact ×1.7 | Low ×1.1 | High ×1.8 | FEDIAF (European pet food industry) 95 to 125 × kg^0.75 (inactive to active; figures from the reviewer, not re-checked), for comparison |
|---|---|---|---|---|---|---|
| 5 kg | 234 | 351 | 398 | 257 | 421 | 318 to 418 |
| 10 kg | 394 | 591 | 669 | 433 | 709 | 534 to 703 |
| 12.4 kg | 463 | **694** | 787 | 509 | 833 | 628 to 827 |
| 20 kg | 662 | 993 | 1,125 | 728 | 1,192 | 898 to 1,182 |
| 30 kg | 897 | 1,346 | 1,525 | 987 | 1,615 | 1,218 to 1,603 |
| 40 kg | 1,113 | 1,670 | 1,892 | 1,224 | 2,003 | 1,511 to 1,989 |

So a figure near 700 kcal is what a neutered, normally active, healthy dog of about 12.4 kg gets (737 would be about 13 kg). Another weight gives another number: calories are never one value per dog.

## 3. Weight goals (adults)

- Keep steady: `RER(ideal) × factor` (same number as section 2).
- Lose (time counts): `calories = clamp(maintenance − 7,700 × kg to lose ÷ days, AAHA start, maintenance)`. The AAHA start is `1.0 × RER(target or ideal weight)` for dogs, `0.8 ×` for cats. A longer time gives more food; a deadline too short for a safe amount of food is held at the AAHA start and the page shows how long it would really take at that amount (`days to goal = kg to lose × 7,700 ÷ (maintenance − AAHA start)`, a rough estimate). Example, 30 kg dog to 25 kg: 30 days 783 kcal (about 68 days really), 60 days 783, 90 days 918, 120 days 1,025, 180 days 1,132.
- Gain: `maintenance × 1.1` (a product choice, no published figure), whatever the date. The date is an estimate: `days = kg to gain × 7,700 ÷ (0.1 × maintenance)`, labelled rough. A gain goal for a pet at body score 5 shows a "check with your vet first" banner.
- Weigh-in adjustment (gain and loss goals, saved goals only): nothing changes before 14 days. Progress is judged against the REALISTIC line, not the owner's date: `days = max(owner's days, kg to change × 7,700 ÷ |starting kcal − steady kcal|)`. So a dog that gains as expected at +10% is "on track" even if the owner's date was out of reach. If the real weight is behind that line by more than the tolerance (`max(0.2 kg, min(2% of start weight, 10% of the planned change))`), the amount moves 5% (10% if behind by more than twice the tolerance): gain goes up, loss goes down (never below the floor, 0.6 × RER at target). A gain far ahead of plan goes down 5%. Guards on the real weekly change: loss above 2% of body weight a week shows a "check with your vet" note, above 3% also raises the amount 5%; gain above 2.5% a week lowers it 5%. The step is always measured from the starting amount, never compounded. Based on the APOP step-based planner (5 to 10% steps); the weekly guards are our choice (AAHA 2014 safe loss 1 to 2% a week).
- Server: the `calc` edge function (`supabase/functions/calc/domain.js`) is the only copy of these rules; the web and Flutter apps both call it.
- Pace check, weekly change as % of body weight: loss safe **1 to 2% for dogs** (AAHA 2014, seen in a summary table), **0.5 to 2% for cats** (reviewer's figure, not re-checked in the source), slower is "gentle", over 2% fast, over 3% too fast. Gain safe up to 1.5%, quick to 2.5%, too fast above [chosen].
- Safe-days suggestion: `max(14, |target − current| ÷ current ÷ 0.015 × 7)` days.
- Lose target limit (our choice): a target more than 10% under the estimated ideal weight is "not advised" (calories held at steady) and the picker stops at 90% of ideal; 5 to 10% under is a caution. A very slow pace (under 0.1% a week) is a caution, not "not above the current weight".
- Goal sense: BCS ≥ 6 and gain = "not advised"; BCS ≤ 4 and lose = "not advised"; target below 95% of ideal = caution.

## 4. Growing pets

- Percentile: the pet's weight is placed between the 2nd, 25th, 50th, 75th and 98th percentile weights for its age (interpolated by fractional month). Below the 2nd or above the 98th shows as an edge.
- Curves: Salt et al. 2017 covers ages 12 weeks to 2 years and breeds up to about 40 kg in five size groups (checked in the paper's abstract and records, not the full text). Our dog rows under 3 months were not from Salt and had impossible values (a 29.5 kg newborn), so the app now drops them. Salt covers sizes I to V only, and says a model for dogs over 40 kg was not possible, so the giant group (VI) is **not from Salt** (our estimate). Dogs under 12 weeks are flagged "too young for the chart". The cat curve is a separate source. All are estimates and labelled so.
- Large and giant breeds (size V, VI) never get more than the standard growth amount for a faster goal (scale at most 1.0); other puppies at most +10% [chosen]. Reason (vet sources, researched 2026-10-22): the rate of growth, which follows calorie intake, is a main risk factor for bone and joint disease in large breeds; they are fed to stay lean, and slower growth is preferred (Merck Veterinary Manual, VCA, Canadian Academy of Veterinary Nutrition).
- Target on the chart: calories = growth maintenance × scale [chosen]. With `ratio = asked gain ÷ typical gain`: scale is `0.85 + 0.15 × ratio` up to a typical gain, then `1 + 0.25 × min(1, (ratio − 1) ÷ 2)`, so it reaches 1.25 only at 3 × typical. The picker and the saved goal use the same number. Typical gain is the gain of the same percentile over the same days.
- Growth target limit (our choice, no published limit): beyond the pet's own typical gain over the same days, extra gain above 1% of body weight a week (0.7% for size V and VI) is a caution, and above 2% (1.4%) is not allowed: the picker stops there and the pace shows "too fast". Example: Tiger, size V, 9 months, 20 kg, 90 days: typical +0.6 kg, caution above +2.4 kg, picker stops at 24.1 kg, so 28.5 kg cannot be chosen. Not applied under 3 months (the curves are not valid there). The old rule allowed 3% of body weight a week on top of twice the typical gain, which let +8.5 kg through as "a typical track".
- Big-shift warning: gaining much more than a typical track, or moving more than 30 percentile points per month, shows a caution.
- Large-breed puppies: calcium maximum 4.5 g per 1,000 kcal (AAFCO).

## 5. Food calories, portions, cost

- Label to calories: `kcal per 100 g = kcal per kg ÷ 10`.
- Grams a day: `grams = kcal a day ÷ kcal per kg × 1,000`.
- Cost a day: `kcal a day ÷ kcal per kg × price per kg` (shown only if a price exists; the live catalogue has no prices yet).
- Cups are not calculated (no kcal per cup data). This is an estimate from calories, not the maker's feeding guide.

## 6. Nutrients

- Label percentage to per 1,000 kcal: `g per 1,000 kcal = % × 10,000 ÷ kcal per kg`.
- Daily bowl amount: `g = % ÷ 100 × grams a day`. Tick marks scale by `kcal a day ÷ 1,000`.
- AAFCO 2014 per 1,000 kcal (minimums unless stated):

| Nutrient | Dog growth | Dog adult | Cat growth | Cat adult |
|---|---|---|---|---|
| Protein (g) | 56.3 | 45 | 75 | 65 |
| Fat (g) | 21.3 | 13.8 | 22.5 | 22.5 |
| Calcium (g) | 3.0 (max 6.25; 4.5 large pup) | 1.25 (max 6.25) | 2.5 | 1.5 |
| Phosphorus (g) | 2.5 (max 4.0) | 1.0 (max 4.0) | 2.0 | 1.25 |

- Basis (corrected after review): AAFCO's profiles presume 4,000 kcal ME per kg of dry matter. Foods above that are corrected for energy (the per-1,000-kcal check). Foods below it "should not be corrected for energy" (AAFCO footnote, dog and cat), so they must ALSO meet the dry-matter minimums: dog adult protein 18%, fat 5.5%, calcium 0.5%, phosphorus 0.4%; dog growth 22.5, 8.5, 1.2, 1.0; cat adult 26, 9, 0.6, 0.5; cat growth 30, 9, 1.0, 0.8. Example: 15% protein in dry matter at 3,000 kcal/kg is 50 g per 1,000 kcal (passes 45) but fails 18%.
- Calcium to phosphorus ratio (dogs only; the AAFCO cat profile has no ratio): 1:1 to 2:1. When both are on the label, a ratio outside that range adds a caution.
- Fit verdict: protein, fat, calcium, phosphorus each checked against the minimum and maximum. Below a minimum or above a maximum = "not a fit". A missing value (often calcium) = "not verified", never a pass. Allergy and toxic ingredient matches, wrong life stage and missing life stage add warnings.

## 7. Goal match score (food ranking)

- Lose: `protein + 1.5 × fibre − kcal per kg ÷ 60` (per 1,000 kcal values). Gain: `kcal per kg ÷ 50 + fat`. These ranking weights are **chosen**, they only order foods.

## 7b. How vets set weight loss and gain (researched 2026-10-22)

- **Loss:** a fixed share of resting energy, then recheck. The APOP step-based planner uses 80% of RER (options 70 to 90%; below 70% needs a veterinary nutritionist), recalculated from the newly measured weight each step, rechecks every 2 to 4 weeks. Target loss is about 3 to 5% of body weight a month for dogs (0.7 to 1.2% a week) and 2 to 5% a month for cats. If loss is off target, check intake and treats first, then change calories by 5 to 10%. Treats stay at or under 10% of daily calories. AAHA 2021 (Box 1) uses 1.0 x RER (dog) and 0.8 x RER (cat) at ideal weight, which is what we use.
- **7,700 kcal per kg is not part of the vet method.** Vets do not predict a date from it; they feed a set share of RER and adjust from weigh-ins. We keep it only for the "about how long" estimate and label it as a rough estimate.
- **Gain:** no standard formula found. Sources say a vet sets the target weight, the surplus and the pace after checking for illness, and that food should rise gradually. Our gain number is an estimate only.
- **Our dog pace band (1 to 2% a week, AAHA 2014 summary) is faster than the APOP range (0.7 to 1.2% a week).** Not changed yet; see the decision in the review notes.
- **Units:** the unit is the kilocalorie (kcal). The "Calories" printed on pet food labels are kcal. The app now writes kcal beside every number.

## 7c. Homemade mix builder (added 2026-10-22)

- Ingredients: 75 curated foods from USDA FoodData Central (SR Legacy 2018 and Foundation Foods 2026-04, public domain), per 100 g of the food as USDA lists it (raw foods raw, cooked foods cooked), plus water (0 kcal) and calcium carbonate (40% calcium by mass, a chemical fact, not USDA). Built by `supabase/scripts/build_ingredients.py` (each entry names its exact USDA description) into `ref.ingredients` (cloud project loaded and checked) and `prototype/js/ingredients-data.js`.
- Mix kcal per 100 g = sum(grams × kcal per 100 g ÷ 100) ÷ total grams × 100. Percent mode turns each percent into grams of a batch (default 1,000 g); calories per 100 g do not depend on the batch size. If the percents do not add to 100, the numbers describe only what is listed and the screen says so.
- Checks: protein, fat, calcium and phosphorus per 1,000 kcal against the same AAFCO targets as foods; calcium or phosphorus that USDA does not report is "not verified", never zero; calcium to phosphorus 1:1 to 2:1 for dogs.
- Adding a mix to the diet saves its kcal per kg and its ingredient list with the diet item (`pet_diet_items.kcal_per_kg`, `recipe`), and the diet total counts it. A typed food can also carry an optional kcal per 100 g.
- It is a calculator, not a complete diet: vitamins, trace minerals, essential fatty acids (and taurine for cats) are not checked. Raw meat, fish and eggs show a food-safety note. Test cases: `node supabase/golden/run_mix.mjs`.

## 7d. Diet calories by measure (added 2026-10-22)

- A diet item's calories follow the measure the pet is fed in: `kcal a day = amount × times a day × kcal in one measure`. One measure is a gram (kcal per kg ÷ 1,000), a cup (label kcal per cup, else grams per cup × kcal per kg), a can (only when the label's unit is a can), a piece (kcal per treat), or the owner's own number.
- The owner's own number is kept on the item: kcal per 100 g for grams (`kcal_per_kg`), kcal in one measure for anything else (`kcal_per_unit`). The screen says "your number" or "from the label". A food with no calories in its measure is not counted and is never guessed from grams; the page names it and offers "Add calories".
- Supplements are listed, not counted. Changing the amount of a food carries its calories over; adding calories to a food already in the diet edits it in place (no history entry).

## 7e. Calories when the maker does not state them (added 2026-10-22)

- About 48% of catalogue foods (all retailer listings and many brand pages) have protein, fat and moisture but no calories. For those the app works out an estimate with the modified Atwater method pet food makers use when they do not test: kcal per kg = 10 × (3.5 × protein + 8.5 × fat + 3.5 × carbohydrate), carbohydrate = 100 − protein − fat − fibre − ash − moisture (all as fed). Missing fibre or ash is replaced by a typical value (dry: fibre 3, ash 7; semi-moist: ash 4.5; wet: fibre 0.5, ash 2) and the screen names what was assumed. A label that does not add up gets no estimate.
- Checked against the 1,208 foods that do state calories (981 where an estimate was possible): the raw formula ran low (guaranteed analyses are minimums), so it is scaled by food type (dry ×1.044, wet ×1.225, other ×1.06). After scaling the median error is about 0%; dry foods land within 10% for 97%, wet foods for only 58%, other for 72%. The stated margin (dry 8%, wet 25%, other 20%) contains the maker's number for 95% of foods overall.
- The estimate is always labelled as an estimate with its margin, appears only in the diet (rows and the add sheet) and on the food page, and never replaces a maker figure. It is not used for rankings or fit.

## 8. Review log

Reviewed against AAHA 2021 (Box 1 and text, read from the PDF), AAHA 2014 summary, and the Salt 2017 record. Changes made: dog weight-loss 1.0 (cat 0.8); dog low activity 1.1; neutered/intact at AAHA midpoints (dog 1.5/1.7, cat 1.3/1.5); one growth-target calorie number in picker and saved goal; dog and cat weight-loss pace bands; completed-month age; large-breed maturity 18 months; dog growth rows under 3 months removed; calcium to phosphorus ratio check.

Still open: NRC gives young puppies about 30% more calories than AAHA and older kittens about 35% less (from the reviewer, not re-checked), so a smooth NRC-style curve would remove the step at 4 months and the jump at 12 months for cats. Dogs under 12 weeks have no Salt curve and currently use the 12-week values. High activity factors (dog 1.8, cat 1.6) are our choice. The 10%-every-2-weeks adjustment was not confirmed in any source I could read, so the app says only "small steps". The 7,700 kcal-per-kg rule is a rough human-derived estimate. The cat weight-loss pace band (0.5 to 2%) was not re-checked. Pregnancy, nursing and illness are not modelled. BCS defaults to 5 when unanswered.
