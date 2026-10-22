# Copy and SEO changes (21 Oct 2026)

Text-only pass, plus SEO meta. Backup of the previous version: `../prototype_backup_copy_20261021-030603/`.
No logic, layout, data or Supabase changes. The one code addition is `setMeta()` in `js/app.js`, which sets the description, canonical, OG and Twitter tags for each route.
Honesty rules kept: no invented stats, testimonials or vet endorsements. The meaning of "General guidance, not veterinary advice" and "community ratings never change safety checks" is unchanged.

## Key strings, before → after
| Where | Before | After |
|---|---|---|
| Home h1 | We care about what they eat. | The right food for your dog or cat, in 2 minutes. |
| Home subline | Build a profile, track growth by percentile, and find foods that fit, in store or online. | Tell us about your pet. We match foods to their age, size and needs, and show you why. Free to use. |
| Primary CTA (hero, top bar) | Build a profile | Find their food (when a pet exists: Open {name}'s plan / {name}'s plan) |
| Feature blobs | Scan any label in seconds / Growth by percentile / Targets from AAFCO profiles | Scan a label, know in seconds / See how they are growing / Checked against AAFCO targets |
| Home sections | Start with your pet / Featured foods / From the guides / What owners say | Who are we feeding? / Popular with owners / Little lessons, happier pets / From owners like you |
| Green band | Tasty and healthy, checked. See if a food meets your pet's needs before it goes in the cart. | Will they love it? Is it good for them? Scan any food label and see if it fits your pet, before you buy. |
| Promo tiles | Free growth chart: see where your puppy or kitten sits among thousands of others. / Cook at home? | Growing up fast? Plot your puppy or kitten on a free growth chart and see if they are on track. / Cooking for them? |
| Home card badges | Good fit / Check / Not a fit | Great fit / Worth a look / Not a fit |
| Sample review note | Sample reviews for the prototype. | Sample reviews shown while we gather real ones. |
| Wizard titles | Who is your pet? / Age and size / Current weight | Who are we feeding? / How old and how big? / One last thing: weight |
| Wizard leads | Dog or cat, and a name. / So we pick the right growth curve. / The last one. Then you get a plan. | Three quick questions, then their food matches. / Puppies, kittens and seniors need different things. / This sets their daily portions. Almost there! |
| Wizard breed hint | Leave empty for a mixed breed or if you are not sure. | Mixed breed or not sure? Leave it blank, that is fine. |
| Wizard cat notice | Cat growth curves cover all breeds together. | Good news: one growth curve fits all cat breeds, so no breed needed. |
| Wizard final button | See the plan | See their matches |
| Wizard errors | Please give your pet a name. / Please enter an age. / That looks too heavy. Is the unit right? | What do you call them? Add a name to continue. / Add their age, even a rough guess helps. / That seems heavy. Did you mean lb? |
| Food verdicts | A good fit / Not a good fit for {name} | A great match / Not the best match for {name} |
| Food good-fit body | Meets the nutrient targets we can check for this life stage. | It meets every nutrient target we can check for their life stage. Nice pick. |
| Nutrients card | Nutrients per 1000 kcal | What is in each bowl, plus the hint "Shown per 1000 calories, so wet and dry foods compare fairly. Ticks mark the AAFCO minimum and maximum for their life stage." |
| Label caveat | Label values are minimums or maximums, not exact contents. Calcium and phosphorus are often missing… | Labels list minimums and maximums, not exact amounts. Calcium and phosphorus help build bones, but many labels skip them, so you may see "not reported". |
| Community note | Community ratings are shown separately from nutrition fit and never change the safety checks. | Owner ratings are shown on their own. They never change our nutrition or safety checks. |
| Review form | Rate this food | Tried it? Help other owners |
| Food not found | We could not find that food | We sniffed everywhere, no luck |
| Foods header | Find food: "For {name}." / "Create a profile to rank by fit." | "Hand-picked for {name}, ranked by fit." / "Add your pet and we rank every food by how well it fits." |
| Foods empty state | No foods match these filters | No foods match, yet (plus a clearer hint) |
| Pet empty state | No pet yet: Three quick questions give you a first plan. | Who are we feeding today? Answer three quick questions and get foods matched to your pet. No account needed. |
| Pet "why" helpers | Neutered pets need fewer calories. / Adjusts the daily calories. | Spayed and neutered pets usually need fewer calories. / Busy pets burn more, so we adjust their portions. |
| Scan header | Scan a food label: Photograph the guaranteed analysis, or enter the barcode. | Is this food right for them? Snap the nutrition panel or type the barcode. We do the maths. |
| Scan review step | Check what we read | Did we read it right? |
| Toxic tool | Search a food. Answers are for snacks, not complete foods. / In an emergency call your vet. | Type a food to check before sharing. For treats and snacks, not full meals. / If your pet ate something dangerous, call your vet or a pet poison line now. |
| Toxic labels | Generally safe / Use caution / Dangerous | Generally safe / Go easy / Dangerous, avoid |
| Recipe tool | We compare it with AAFCO targets, per 1000 kcal. | See if your homemade meal covers the basics, using AAFCO targets. |
| Footer | (links: Foods, Scan, Guides…) General guidance, not veterinary advice. | Links named with keywords (Dog and cat food finder, Nutrition guides…); added "Made with love for dogs, cats and the people who feed them. Free to use, for pet owners everywhere."; disclaimer extended with "Always ask your vet about health concerns." |

## SEO
- `index.html`: unique title (59 chars), meta description (135), robots, theme-color, canonical, Open Graph (type, site_name, title, description, url, image `assets/hero-dog-cat.jpg` plus alt), Twitter `summary_large_image`, and JSON-LD `@graph` with Organization, WebSite and WebApplication (free Offer price 0, no ratings). FAQPage and Product schema were left out on purpose: there is no real FAQ content, and the product data is still sample data. Add Product schema once real products exist, and never with invented ratings or prices. `lang="en"`, charset and viewport were already there.
- **TODO:** replace `https://example.com` in `index.html`, `robots.txt`, `sitemap.xml` and `js/app.js` (`SITE`).
- Route titles, 45–60 chars with " · Pet Nutrition Matcher": Dog and Cat Food Matched to Your Pet; Build your pet profile; Dog and cat food matches; {food name}; Scan a pet food label; Can my dog or cat eat this? Toxic foods; Free pet nutrition tools; Dog and cat nutrition guides; Home-cooked pet food recipe checker.
- Per-route descriptions (111–137 chars) come from `SEO` in `js/app.js`. Keywords are drawn from autocomplete research: best dog food for allergies / sensitive stomach / puppies / seniors, best cat food for kittens / indoor / picky eaters, cost per day, AAFCO, toxic foods.
- Each route has exactly one h1 (verified at 1440 and 390 px). Decorative images keep `alt=""`; the hero image keeps a descriptive alt.
- Added `robots.txt` and `sitemap.xml`.
- **Indexing caveat:** routes are hash-based (`#/foods`), and search engines ignore fragments. Only the home page is indexable today. For full indexing, move to path routes (`/foods`) and prerender or SSR each route so title, meta and content are in the initial HTML.

---
# Round 2 (21 Oct 2026, 03:18–03:40 PT): keyword titles, growth-goal copy, blog guide
Backup: `../prototype_backup_copy_20261021-031822/`. Text, meta and data only. No logic or layout changes.
One small exception: `js/app.js` now uses titles longer than 40 characters as-is and adds " · Pet Nutrition Matcher" only to shorter ones, so keyword titles stay around 60 characters.

## Titles and H1s from SEO_KEYWORD_RESEARCH.md §4
Unverifiable claims were left out: "500+ foods", "Vet-Sourced", "printable", "no app needed", "6 questions", "sold in your country" (no region feature yet), and "ingredients/allergens" for the scanner (it reads the guaranteed analysis only).
| Route | Title | H1 |
|---|---|---|
| Home | Free Dog & Cat Food Matcher – Find the Right Food for Your Pet | kept "The right food for your dog or cat, in 2 minutes." (stronger, same keywords) |
| Wizard | Dog & Cat Food Finder – Match by Breed, Age & Weight | kept per-step titles |
| Foods | Dog & Cat Food Compared by Fit and Cost per Day | Find food → Find their food |
| Food detail | {Brand} {Name} Review: Calories, AAFCO & Cost per Day | {Name} (unchanged) |
| Toxic | Can My Dog or Cat Eat This? Toxic Food Checker (Free) | Can my pet eat this? (unchanged) |
| Scanner | Free Pet Food Label Scanner – Check Nutrients & AAFCO | Is this food right for them? → Scan a pet food label |
| Growth | Puppy & Kitten Growth Chart – {name}'s Goal Planner | {pet name} (unchanged) |
| Learn | Dog & Cat Nutrition Guides – Labels, AAFCO, Feeding | Guides → Pet nutrition, explained |
| Calorie/feeding | no dedicated route exists; calories live on the pet overview and food pages | n/a |
New meta descriptions are in `js/app.js` (SEO): foods, scan, toxic, guides, **/pet/growth** ("Puppy growth chart and kitten weight chart by size group. See their percentile, how big your puppy may get, and daily calories for a goal.") and **/guides/puppy-growth-chart**. The default and index.html description now follows the research: "Build your dog or cat's profile and get foods that fit their age, weight, allergies and goals, with AAFCO checks and cost per day. Free."
Added `/pet/growth` and `/guides/puppy-growth-chart` to `sitemap.xml`. The WebApplication JSON-LD now mentions the growth chart and goal planner.

## Growth-goal copy
| Where | Before | After |
|---|---|---|
| Growth card h2 | Growth | Growth chart |
| Growth intro (new) | none | See where {name} sits among similar pets, then set where you would like them to be. Pick a time frame and a target weight, and we suggest daily calories and a safe weekly pace to get there. |
| Picker intro | Tap the chart, or pick a date and weight below. | Tap the chart where you want them to be, or pick a time frame and weight below. |
| Range hint | Typical range for that date: X to Y kg. | Most similar pets weigh X to Y kg by then. |
| Footnote | Breed-specific curves are estimates: they use your dog's size group. … look at the trend, not one point. | Breed curves are estimates based on your dog's size group. … watch the trend, not one weigh-in. This is a guide, not a vet diagnosis. |
| Pace texts (domain.js) | A slow pace. Fine, but it will take longer. / Faster than advised. Consider more days. / Already at a healthy weight. Lose weight only if your vet advises it. | A gentle pace. Safe, just slower. / Faster than advised. Try a longer time frame. / Already at a healthy weight. Only aim to lose if your vet suggests it. |
| Maintain note | This is the calorie level that keeps weight steady. | The daily calories that keep their weight steady. |
| Overview button | See the growth chart | See their growth chart |
| Home promo | Growing up fast? Plot your puppy or kitten on a free growth chart… | How big will they get? See your puppy or kitten on a growth chart, pick a goal, and get daily calories to reach it. |
| Tools hub (new card) | none | Growth chart and goal planner: Puppy or kitten? See their percentile, set a goal weight, get daily calories. → #/pet/growth |
| Percentile guide (new section) | none | "Setting a growth goal" paragraph explaining the 1 week to 3 month picker, safe pace, following their own percentile line, and asking the vet before slowing growth. |

## New guide: Puppy growth chart (slug `puppy-growth-chart`)
Added as data in `js/guides-data.js` (h3 shown as h2 because the guide renderer has no h3). Full article with FAQPage and Article JSON-LD: `../content/blog/puppy-growth-chart.md` and `.html`.

## Flag for the developer (logic not changed)
The user's screenshot shows a 12-month dog at the 57th percentile, already "In the typical range", with a default 3-month target of 8.1 kg, which is weight loss. Suggestions:
1. Default the target to the pet's own percentile curve at the chosen horizon (the `grow` branch in `goalPlan` already interpolates this).
2. For pets still growing (`lifeStage === 'growth'`), block or strongly discourage any target below the current weight unless the owner confirms vet advice. Show the "ask your vet" message as a bad state, not caution.

## Task 4 – SEO-ready site (21 Oct 2026)
- History API routing (old #/ links auto-migrate), js/seo.js (per-page title/meta/canonical/OG/robots; SITE constant TODO), noindex on /pet*.
- New pages: /growth landing, /can-dogs-eat/<item>, /can-cats-eat/<item> (ASPCA-sourced, FAQPage+BreadcrumbList JSON-LD).
- Guides: Article + BreadcrumbList JSON-LD (author TODO), breadcrumbs, "Last reviewed 21 Oct 2026".
- scripts/prerender.mjs → dist/ (37 routes), sitemap.xml, robots.txt, 404.html, vercel.json, _redirects, SEO_README.md.
- Fixes: broken `//assets/` banner image URL in pageBand; mobile tab "More" → "Tools"; notice link contrast.
- Fact fixes: grapes/raisins for cats bad→caution; AAHA weight-loss rates (dogs 1–2%/wk, cats 0.5–2%/wk); onion note (cats more susceptible); xylitol note (liver damage).

## Task 5 – citations, FAQ schema, performance (21 Oct 2026)
- Guides gained verified facts with a linked "Sources" section (AAFCO Reading Labels, FDA "Complete and Balanced", WSAVA guidelines/toolkit, AAHA 2021 guidelines + screening evaluation, Salt et al. 2017, ASPCA).
- Fixes: "A 5 is ideal" → AAHA 2021: 4–5 ideal; removed unverified "since 2014" claim for the AAFCO calorie statement.
- Puppy growth chart guide: FAQ questions are now H3 and emit FAQPage JSON-LD (7 Q&As).
- Performance: lazy-loaded screens, no re-render of prerendered pages, inlined CSS, self-hosted fonts, subset icon font, resized webp images.
- Legal: /privacy, /terms, /disclaimer (js/screens/legal.js, template, TODO operator/email), footer links on every page, expNote disclaimer line near estimates, one-time acknowledgement checkbox in the wizard. See LEGAL_README.md.
