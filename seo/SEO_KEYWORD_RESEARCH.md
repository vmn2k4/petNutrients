# SEO Keyword Research: Free Pet Diet & Weight Tracker (dogs + cats)
*Prepared 21 Oct 2026 (PT) for Murugappan, Vancouver. This extends `../market_validation_brief.md` (17 Oct), which covered brand trust, "best X canada", food formats, and the incumbents. This document adds tool/calculator intent, multiple markets (CA/US/UK/AU), page mapping, and on-page copy.*

**Data rules.** I had no logins for Keyword Planner, Ahrefs, or Semrush, so **this document contains no absolute search volumes.** The signals used are:
- **AC**: Google Autocomplete, `suggestqueries` endpoint, gl=ca/us/gb/au, pulled 21 Oct 2026. It covers 76 seeds × 4 markets, plus alphabet-soup expansion (a–z) on 6 seeds in CA and US. That is 628 requests and 6,134 suggestions. Raw output: `raw/autocomplete_multi.json`. **What it shows:** the query exists and is popular enough to be suggested. **What it doesn't show:** volume.
- **TR**: Google Trends via pytrends, using the 12-month mean from Oct 2025 to Sep 2026. Each batch has 5 terms and includes "dog food calculator" as a shared anchor. Raw output: `raw/trends_tools.txt`. **Only compare terms within the same batch and the same geo.** Every index is relative (0–100).
- **SERP proxy**: WebSearch results, which are *not* real Google SERPs. I used them to see which sites appear and how their titles are written.
- **Difficulty**: my qualitative estimate (Low / Medium / High), based on who appears in the SERP proxy. It is **not** a KD score.

## 1. Executive summary
1. **Tool intent has the most to gain and fits the product exactly.** "can dogs eat" / "can cats eat" are by far the largest tool queries in Trends: indices 58–80 in every market. In the same batches, "dog food calculator" is ≤7 and "toxic foods for dogs" is ≈0. Alphabet soup returned **≈250 distinct "can dogs eat X" and ≈250 "can cats eat X" suggestions in Canada alone.** That supports a programmatic page per food per species, backed by a single checker tool.
2. **Feeding calculators are the second pillar.** Calculator queries show high modifier diversity: by breed, by weight and age, wet and dry, homemade, for weight loss, grams, kg/lb. Within its batch, "cat food calculator" runs at roughly 66% of "dog food calculator" in the US (11.6 vs 17.5) and at about parity in CA (5.1 vs 5.8). Cats are close to dogs here, which is unusual. **"Wet and dry" (mixed feeding) is the #1 or #2 modifier for both species in all 4 markets**, and most calculators handle it poorly. That is a clear differentiator.
3. **The UK is calculator-heavy.** "dog food calculator" scored 55 in the UK versus 5.8 in CA in the same batch. That probably reflects how UK owners phrase the query ("feeding guide calculator in grams") as well as real demand. The UK should be the second market for the calculator page; for everything else, US comes second.
4. **The scanner and "finder/quiz" niches are small but uncontested on the web.** The scanner SERP is all apps (PetScans, Pawpoy, PetEats, PawLens, Open Pet Food Facts). A **no-install web scanner** and a **cross-brand "dog food finder based on allergies"** are real gaps. "dog food finder" autocompletes include "quiz", "by ingredient", and "based on allergies", which maps directly onto the wizard.
5. **Competition in Canada for cost per day is new and direct.** LeashFree.ca already has a "Dog Food Comparison Tool Canada" and a "Dog Food Cost Per Day Canada" page, built on cost per 1,000 kcal. PricePer.ca runs a dry-dog-food cost index. Neither covers **cats**, wet food, or personalization by pet profile. Those gaps are the wedge.
6. **Pages that should not lead:** head "best dog food for X" listicles (Dog Food Advisor, AKC, Forbes, Reddit) and YMYL condition pages such as kidney and urinary. Approach them through **filtered results pages** ("foods matching: senior + sensitive stomach, available in Canada") rather than editorial "best" lists.

## 2. Top 30 priority keywords
Scoring weighs fit with a tool the site already has, breadth of evidence, the realistic difficulty for a new domain, and fit with the Canada-first plan. Volume is unknown throughout.

| # | Keyword | Sp | Intent | Evidence | Diff. | Target page |
|---|---|---|---|---|---|---|
|1|can dogs eat [food] (programmatic, ~250 CA variants)|dog|tool|AC all 4 mkts; TR 58–71 (largest tool term)|High head / Med-Low long tail|/tools/can-my-pet-eat/dogs/{food}|
|2|can cats eat [food] (~250 variants)|cat|tool|AC; TR 65–80|High head / Med long tail|/tools/can-my-pet-eat/cats/{food}|
|3|dog food calculator|dog|tool|AC; TR US 17.5, UK 55, AU 21|Med-High|/tools/calorie-calculator|
|4|cat food calculator|cat|tool|AC; TR US 11.6, CA 5.1|Med|/tools/calorie-calculator?species=cat|
|5|cat food calculator wet and dry|cat|tool|AC #2 suggestion, all mkts|Low-Med|calculator (mixed-feeding mode)|
|6|dog food calculator wet and dry|dog|tool|AC #1–3 all mkts|Low-Med|calculator|
|7|how much to feed my dog (calculator / per day)|dog|tool|AC all mkts|Med|calculator|
|8|how much wet food to feed a cat (with dry food / in grams)|cat|tool|AC all mkts|Low-Med|calculator + learn|
|9|dog food calculator by breed / by weight and age|dog|tool|AC all mkts|Low-Med|calculator (breed preset)|
|10|how much to feed a kitten (2/3/4/5/6 months)|cat|tool|AC; TR US 1.3|Low-Med|/learn/kitten-feeding-chart|
|11|how much to feed a puppy (chart / by weight kg/lb calculator)|dog|tool|AC all mkts|Med|/learn/puppy-feeding-chart|
|12|puppy weight calculator (by breed / mixed breed)|dog|tool|AC|Med-High (PuppyCalcs, Waltham)|/tools/growth-chart|
|13|kitten weight chart (by age / kg / by month)|cat|tool|AC; TR kitten growth chart US 0.3|Low-Med|/tools/growth-chart?species=cat|
|14|how big will my puppy get (calculator)|dog|tool|AC|Med|/tools/growth-chart|
|15|dog food finder based on allergies / by ingredient|dog|tool|AC|Low-Med|/wizard|
|16|cat food calculator for weight loss / dog calorie calculator for weight loss|both|tool|AC|Low-Med|calculator (goal = lose)|
|17|pet food scanner app free / dog food ingredient checker free|both|tool|AC; TR scanner US 1.2|Med (apps)|/tools/label-scanner|
|18|toxic foods for dogs and cats (printable / pdf / chart)|both|info|AC all mkts|Med-High|/tools/can-my-pet-eat hub + PDF|
|19|dog food cost per day (canada / calculator)|dog|commercial|AC + LeashFree SERP|Med|/foods sorted by cost/day|
|20|dog food comparison tool / canada|dog|tool|AC; TR 2.3–3.6|Med|/foods compare|
|21|how to read cat food labels (calories)|cat|info|AC|Med|/learn/how-to-read-pet-food-labels|
|22|aafco cat food nutrient profiles / aafco dog food brands list|both|info|AC; TR aafco US 5.4, CA 3.0|Med|/learn/aafco-nutrient-profiles|
|23|dog/cat body condition score chart (1–9)|both|tool|AC|Med|wizard BCS step + learn|
|24|best kitten food canada|cat|commercial|AC CA|Med|/foods?species=cat&life=kitten&country=CA|
|25|best wet cat food canada|cat|commercial|AC; TR wet cat food rising|Med|filtered results|
|26|hypoallergenic dog/cat food canada|both|commercial|AC CA|Med|filtered results (allergy)|
|27|is [brand] canadian (acana/open farm/royal canin)|both|info|AC CA (prior brief)|Low-Med|/foods/{brand} FAQ block|
|28|dog food recalls canada 2026|both|info|AC CA|Med (CFIA, news)|/learn/recalls-canada|
|29|rer calculator dog / cat|both|tool|AC|Low|calculator (advanced view)|
|30|wet vs dry cat food (cost / which is better)|cat|info|AC; TR wet cat food CA 46.9→68.7|Med|/learn/wet-vs-dry-cat-food|

## 3. Topic clusters → site pages
| Cluster | Page | Main keywords | Supporting/long tail |
|---|---|---|---|
|Matcher|**Home** `/`|free pet food matcher, dog food finder, cat food finder quiz, best dog food quiz|"what dog food is best for my dog", "dog food finder based on allergies"|
|Matcher|**Wizard** `/wizard`|dog food finder quiz, dog food finder by ingredient, pet food quiz|BCS chart, allergy filters|
|Results|**Foods results** `/foods`|best [x] food for [condition] [country], dog food comparison tool, cost per day|programmatic filter URLs: species × life stage × goal × country|
|Product|**Food detail** `/foods/{slug}`|[brand recipe] review, is [brand] canadian, [brand] calories per cup, [brand] aafco|"[brand] vs [brand]"|
|Toxic|**Toxic-food tool** `/tools/can-my-pet-eat`|can dogs eat, can cats eat, toxic foods for dogs and cats|~500 food × species pages|
|Scanner|**Label scanner** `/tools/label-scanner`|pet food scanner app free, dog food ingredient checker, dog food dry matter calculator|how to read labels|
|Growth|**Growth chart** `/tools/growth-chart`|puppy weight calculator, kitten weight chart, how big will my puppy get|breed pages (golden, lab, GSD, frenchie, maine coon, ragdoll)|
|Calories|**Calorie calculator** `/tools/calorie-calculator`|dog/cat food calculator, how much to feed my dog/cat, calorie calculator, RER|wet+dry, weight loss, grams, puppy/kitten|
|Learn|`/learn/*`|labels, AAFCO, feeding charts, wet vs dry, cost, recalls, made in Canada|condition explainers (allergy, sensitive stomach)|

## 4. Recommended title / meta / H1 per existing page
Titles are kept to roughly 60 characters or fewer, and metas to roughly 155. Canadian spelling is the default (the en-CA build). See §8 for the variants in other markets.

| Page | Title tag | Meta description | H1 |
|---|---|---|---|
|Home|Free Dog & Cat Food Matcher – Find the Right Food for Your Pet|Build your dog or cat's profile and get foods that fit their age, weight, allergies and goals, sold in your country. AAFCO checks and cost per day. Free.|Find the right food for your dog or cat|
|Wizard|Dog & Cat Food Finder Quiz – Match by Breed, Age & Allergies|Answer 6 quick questions about your pet: species, breed, age, weight, body condition and allergies. Get matched foods available where you live. Free, no sign-up.|Tell us about your pet|
|Foods results|{Goal} {Species} Food in {Country} – Compared by Cost per Day|{N} {species} foods for {goal}, available in {country}, ranked by fit, AAFCO adequacy and cost per day. Filter by allergy, format (dry, wet, raw) and budget.|{Species} foods for {goal} in {Country}|
|Food detail|{Brand} {Recipe} Review: Calories, AAFCO & Cost per Day|{Brand} {Recipe}: {kcal}/cup, AAFCO {life stage} statement, top ingredients, allergens and cost per day in {country}. See if it suits your {species}.|{Brand} {Recipe}|
|Toxic-food tool hub|Can My Dog or Cat Eat This? Toxic Food Checker (Free)|Type any food to see whether it's safe, risky or toxic for dogs and cats, with symptoms, amounts and what to do. Covers 500+ foods.|Can my pet eat this?|
|Toxic-food item (template)|Can Dogs Eat {Food}? Safe, Risky or Toxic – Vet-Sourced|Can dogs eat {food}? Short answer: {Safe/Caution/Toxic}. How much is OK, which parts to avoid, symptoms and when to call a vet. Check any food for cats too.|Can dogs eat {food}?|
|Scanner|Free Pet Food Label Scanner – Check Ingredients & AAFCO|Snap or paste a dog or cat food label. We flag your pet's allergens, check the AAFCO statement and convert to dry-matter. Works in your browser, no app needed.|Scan a pet food label|
|Growth chart|Puppy & Kitten Growth Chart + Adult Weight Calculator|Track your puppy's or kitten's weight by week and see if they're on curve. Estimates adult size for purebred and mixed-breed puppies. Free and printable.|Puppy & kitten growth chart|
|Calorie calculator|Dog & Cat Food Calculator – How Much to Feed (Cups/Grams)|How much should your dog or cat eat? Get daily calories and cups, grams or cans for your exact food, including mixed wet + dry feeding and weight loss.|How much should I feed my pet?|
|Learn hub|Dog & Cat Nutrition Guides – Labels, AAFCO, Feeding Charts|Plain-English guides to reading pet food labels, AAFCO profiles, feeding puppies and kittens, wet vs dry, and the cost of feeding in Canada.|Pet nutrition, explained|

## 5. First 20 content pages to write, in order
1. `/tools/can-my-pet-eat/dogs/grapes` along with the first batch of 30 dog foods: watermelon, cherries, blueberries, peaches, strawberries, tomatoes, bananas, pineapple, cucumber, corn, apples, avocado, chocolate, onions, garlic, cheese, eggs, peanut butter, popcorn, and others. Start from the top-10 suggestion list in each market.
2. The same set for cats: watermelon, blueberries, strawberries, corn, bananas, cheese, eggs, chocolate, peanut butter, dog food, canned tuna, raw chicken.
3. How much wet food to feed a cat (with dry food, in grams, chart)
4. How much to feed a kitten: month-by-month chart (2–12 months)
5. Puppy feeding chart by weight and age (kg + lb, with a Canada version)
6. How many calories does a dog need? (RER/MER explained, with an embedded calculator)
7. How many calories does a cat need? (including weight gain and weight loss)
8. How to read cat food labels (calories, guaranteed analysis, AAFCO statement)
9. How to read dog food labels: what to look for, plus a dry-matter worked example
10. AAFCO nutrient profiles explained (and how CA, UK/FEDIAF, and AU/AS 5812 differ)
11. Dog food cost per day in Canada: kibble vs wet vs fresh vs raw. Differentiate from LeashFree by covering cats and personalization.
12. Cat food cost per month in Canada: wet vs dry. This gap is uncontested.
13. Wet vs dry cat food: which is better, and the cost difference
14. Toxic foods for dogs and cats: printable chart (PDF). Good for links.
15. Kitten weight chart by age (kg and lb)
16. Dog body condition score chart (1–9), linked to the wizard
17. Cat body condition score chart, including long-haired cats
18. Dog/cat food made in Canada: brands list (carried over from the prior brief, now backed by the database)
19. Pet food recalls in Canada 2026, based on the CFIA feed. Recurring content.
20. How to transition your dog or cat to a new food: a schedule. This is the after-match step. *Not autocomplete-verified; it's a logical product need.*

## 6. Quick-win long-tail opportunities (lower competition, verified as suggestions)
- **Canada-only toxic queries** (CA alphabet soup): "can dogs eat haskap berries", "can dogs/cats eat kraft dinner", "can cats eat ketchup chips". The SERPs are probably thin (not verified with a live SERP).
- **AU-only:** "can dogs eat capsicum / mandarin", "best dog food for cavoodles", "best cat food for fussy cats", "toxic foods for dogs australia", "dog feeding guide calculator kg australia".
- **Kitten age variants:** "how much to feed a kitten 3/4/5/6 months", "how much should my cat weigh at 4/5/7/9 months". One chart page covers them all with anchor sections.
- **Calculator modifiers:** "cat food calculator grams", "dog food calculator homemade", "homemade dog food calculator free", "dog food dry matter calculator", "dog treat calorie calculator", "rer calculator kitten".
- **Finder modifiers:** "dog food finder based on allergies", "dog food finder by ingredient free", "cat food finder quiz".
- **Mixed feeding:** "how much wet food to feed a cat with dry food", "dog food calculator wet and dry australia".

## 7. Competitor gap analysis
| Competitor | Ranks for (SERP proxy) | Title pattern | Gap we exploit |
|---|---|---|---|
|Royal Canin feeding calculator|dog/cat food calculator|"Feeding Portion Calculator for Dogs and Cats \| Royal Canin"|Only works for its own brand. Ours is cross-brand, by exact food.|
|APOP / WPOA, Purina Institute, UK Pet Food, Ask A Vet|cat/dog calorie calculator|"Cat Feeding Calculator \| Daily Calorie Needs for Cats"|Institutional and clinical in tone. No food matching, no cost.|
|feedingcalc.com, calculatepilot|dog food calculator|"Dog Food Calculator: How Much to Feed Your Dog (Cups & Grams)"|Calculator only. No profile, allergies, or regional availability.|
|PuppyCalcs, WeightMyDog, Waltham|puppy weight calculator, growth chart|"Puppy Weight Calculator: Predict Adult Weight"|Dog only. **Kittens are underserved.** Not tied to feeding.|
|PetScans, Pawpoy, PetEats, PawLens, Open Pet Food Facts|pet food scanner app|"Know if a food is safe for your pet in 10 seconds"|All app-first. A web scanner on the canonical URL is the gap. Most are paywalled.|
|Petzly, VetVerified, AKC, ASPCA, VCA|can dogs eat X|"Pet Food Safety Checker – Can Dogs & Cats Eat This?"|Incumbents are strong. Win on species side-by-side answers, CA/AU foods, and links into the matcher.|
|LeashFree.ca, PricePer.ca|dog food comparison/cost per day canada|"Dog Food Comparison Tool Canada"|Dry dog food only, around 40 products. **No cats, no wet food, no pet-specific daily cost.**|
|Dog Food Advisor, Cats.com, AllAboutCats|best X food, reviews|"N Best Dog Foods for Allergies (2026)"|Generic lists that are not regional. Ours: "foods for {goal}, sold in {country}". Avoid head-to-head listicles.|
|Tufts Petfoodology, BalanceIT|labels, homemade|blog/clinical|Authoritative. Cite and link to them rather than competing.|
*Not fetched and verified individually: catfooddb, petfoodreviews.ca, Chewy/PetSmart guides (see §9).*

## 8. Per-market notes
- **CA (launch):** Use Canadian spelling: fibre, colour, flavour, favourite. Show both kg and lb (puppy autocompletes include both "kg" and "lb"). Use C$, and name Canadian retailers (Pet Valu, PetSmart.ca, Costco CA, Homes Alive, Global Pet Foods). Regulators: CFIA for recalls, and AAFCO statements apply in practice. Canada-only food items: haskap, Kraft Dinner. Demand for local raw feeding in Vancouver came up in the prior brief.
- **US:** Use US spelling (fiber, color) and lb/cups first. Retailers: Chewy, Petco, Tractor Supply, Walmart (these all appear in US suggestions). Regulators: AAFCO and FDA for recalls. Fresh food is growing (prior brief).
- **UK:** Use British spelling, with **grams and kg first**. "Dog feeding guide calculator in grams" is the UK phrasing. Say "fussy eaters", not "picky", and "vet". Retailers: Pets at Home, Zooplus. Nutrient standard: **FEDIAF, not AAFCO.** Label the nutrient check "AAFCO/FEDIAF". Calculator interest stands out in the UK (TR 55).
- **AU:** British/AU spelling, kg first. Terms: "capsicum", "mandarin", "fussy", "cavoodle". Retailers: Petbarn, Woolworths, Coles, Bunnings, Aldi (all from AU suggestions). Standard: AS 5812 / PFIAA. "Australia" is frequently appended to queries, so use country-scoped titles.
- **Implementation:** hreflang with en-CA, en-US, en-GB, en-AU; separate templates for country-specific results pages; and a `<title>` variant per market (for example, "Fussy" in UK/AU and "Picky" in CA/US).

## 9. What couldn't be verified
- **Absolute search volumes and KD scores.** The Ahrefs free keyword generator renders its data client-side, so WebFetch returned only marketing copy. I did not access Ubersuggest or Keyword Planner. No numbers were invented.
- **Real Google SERPs and People Also Ask.** Neither was fetched. The competitor lists come from WebSearch proxy results. The PAA-style questions here come from autocomplete question modifiers, not actual PAA boxes.
- **Trends artifacts:**
  - The CA "dog food calculator" anchor reads 0.1–5.8 depending on the batch. At low volumes, pytrends sampling is noisy, so treat CA tool-term values below about 5 as "too small to rank against the anchor".
  - "how much to feed my dog", "puppy weight calculator", and "dog calorie calculator" read ≈0 only because they sat in the same batch as "can dogs eat". They are not zero in reality.
  - The UK "dog food calculator" reading of 55 may reflect a regional quirk.
  - The 2026 jump in the earlier `trends.txt` is a known artifact.
  - The first request hit a 429 rate limit and was retried successfully.
- **Market-specific autocomplete.** Many seeds returned identical lists across all 4 gl values. That suggests the endpoint weights gl lightly, so country differences are only meaningful where the lists actually differ: AU capsicum/cavoodle/Petbarn, UK grams/Pets at Home, US Tractor Supply.
- **Reddit.** I only saw thread titles through search ("How much should I actually feed my dog? Package vs. calorie calculation doesn't match", r/Dogowners). The mismatch between bag charts and calorie calculations is a confirmed pain point. I did not do a systematic r/dogs, r/cats, r/AskVet, or r/canada scrape (subreddit API blocked in the prior session).
- **Competitors not individually checked:** catfooddb, petfoodreviews.ca, Chewy/PetSmart guides, AllAboutCats calculators, BalanceIT page rankings.
- **Difficulty** is my judgement from SERP composition, not measured backlink data.
