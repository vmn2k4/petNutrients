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
| activity low / normal / high | energy multiplier | normal |

Life stage: **cat** growth under 12 months, adult after. **Dog** growth under 12 months, or under **18 months** for size V and VI (large, giant) [chosen; sources say 18 to 24]. Age is whole months completed (days ÷ 30.44), not a calendar-month difference.

## 2. Calories a day

**Resting energy (RER)** [standard, NRC / AAHA]: `RER = 70 × kg^0.75`

**Ideal weight** [standard, 9-point BCS, same rule for dogs and cats]: if BCS > 5, `ideal = kg ÷ (1 + 0.10 × (BCS − 5))`. Otherwise ideal = current weight.

**Daily calories = RER × multiplier.** The RER uses the ideal weight for adults, and the current weight for growing pets. Source for the ranges: AAHA 2021 Nutrition and Weight Management Guidelines, Box 1 (checked against the PDF).

| Situation | Dog | Cat | AAHA 2021 range (dog / cat) | Status |
|---|---|---|---|---|
| Adult, neutered | 1.5 | 1.3 | 1.4–1.6 / 1.2–1.4 | midpoint |
| Adult, not neutered | 1.7 | 1.5 | 1.6–1.8 / 1.4–1.6 | midpoint |
| Adult, activity low (inactive / obese-prone) | 1.1 | 1.0 | 1.0–1.2 / 1.0 | midpoint |
| Adult, activity high | 1.8 | 1.6 | light work 1.6–2.0 (dog) / none (cat) | **chosen** |
| Growing, under 4 months | 3.0 | n/a | 3.0 | AAHA |
| Growing, 4 months until adult | 2.0 | n/a | 2.0 | AAHA |
| Growing kitten | n/a | 2.5 | 2.5 | AAHA |
| Weight loss (RER at ideal weight) | **1.0** | **0.8** | 1.0 / 0.8 | AAHA |

Activity overrides the neutered/intact choice (it is one or the other, never multiplied together).

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
- Gain: `maintenance + surplus`, where `surplus = (target kg − current kg) × 7,700 ÷ days` [rough rule of thumb from human research, so an estimate only].
- Pace check, weekly change as % of body weight: loss safe **1 to 2% for dogs** (AAHA 2014, seen in a summary table), **0.5 to 2% for cats** (reviewer's figure, not re-checked in the source), slower is "gentle", over 2% fast, over 3% too fast. Gain safe up to 1.5%, quick to 2.5%, too fast above [chosen].
- Safe-days suggestion: `max(14, |target − current| ÷ current ÷ 0.015 × 7)` days.
- Goal sense: BCS ≥ 6 and gain = "not advised"; BCS ≤ 4 and lose = "not advised"; target below 95% of ideal = caution.

## 4. Growing pets

- Percentile: the pet's weight is placed between the 2nd, 25th, 50th, 75th and 98th percentile weights for its age (interpolated by fractional month). Below the 2nd or above the 98th shows as an edge.
- Curves: Salt et al. 2017 covers ages 12 weeks to 2 years and breeds up to about 40 kg in five size groups (checked in the paper's abstract and records, not the full text). Our dog rows under 3 months were not from Salt and had impossible values (a 29.5 kg newborn), so the app now drops them. Salt covers sizes I to V only, and says a model for dogs over 40 kg was not possible, so the giant group (VI) is **not from Salt** (our estimate). Dogs under 12 weeks are flagged "too young for the chart". The cat curve is a separate source. All are estimates and labelled so.
- Target on the chart: calories = growth maintenance × scale [chosen]. With `ratio = asked gain ÷ typical gain`: scale is `0.85 + 0.15 × ratio` up to a typical gain, then `1 + 0.25 × min(1, (ratio − 1) ÷ 2)`, so it reaches 1.25 only at 3 × typical. The picker and the saved goal use the same number. Typical gain is the gain of the same percentile over the same days.
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

## 8. Review log

Reviewed against AAHA 2021 (Box 1 and text, read from the PDF), AAHA 2014 summary, and the Salt 2017 record. Changes made: dog weight-loss 1.0 (cat 0.8); dog low activity 1.1; neutered/intact at AAHA midpoints (dog 1.5/1.7, cat 1.3/1.5); one growth-target calorie number in picker and saved goal; dog and cat weight-loss pace bands; completed-month age; large-breed maturity 18 months; dog growth rows under 3 months removed; calcium to phosphorus ratio check.

Still open: NRC gives young puppies about 30% more calories than AAHA and older kittens about 35% less (from the reviewer, not re-checked), so a smooth NRC-style curve would remove the step at 4 months and the jump at 12 months for cats. Dogs under 12 weeks have no Salt curve and currently use the 12-week values. High activity factors (dog 1.8, cat 1.6) are our choice. The 10%-every-2-weeks adjustment was not confirmed in any source I could read, so the app says only "small steps". The 7,700 kcal-per-kg rule is a rough human-derived estimate. The cat weight-loss pace band (0.5 to 2%) was not re-checked. Pregnancy, nursing and illness are not modelled. BCS defaults to 5 when unanswered.
