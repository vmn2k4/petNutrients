# appdata — free pet-nutrition datasets (downloaded 2026-10-20, PT)

Re-download anywhere: `python3 download_datasets.py --dest DIR [--branded]` (stdlib only; resume, skip-if-exists, progress). Tested on the box (download, skip, resume byte-identical).

| Folder | Source / URL | License | Size | Rows / content | Key fields |
|---|---|---|---|---|---|
| opff/ | Open Pet Food Facts CSV `static.openpetfoodfacts.org/data/en.openpetfoodfacts.org.products.csv.gz` | ODbL 1.0 (contents DbCL, images CC-BY-SA) | 3.2 MB gz / 37 MB TSV (`products.csv`) | 15,136 products, 210 cols | code, product_name, brands, categories_tags, countries_tags, ingredients_text, *_100g |
| opff/petfood.parquet | HF `openfoodfacts/product-database` → petfood.parquet (official link on openpetfoodfacts.org/data) | ODbL | 7.8 MB | simplified JSONL equivalent | use DuckDB |
| opff/openpetfoodfacts-mongodbdump.gz | official MongoDB dump (dated 2026-10-15) | ODbL | 22 MB | full records (needs `mongorestore`) | |
| (missing) opff JSONL | `openpetfoodfacts-products.jsonl.gz` | ODbL | **20 bytes = empty** on 2026-10-20 (upstream export broken). Use parquet/mongodump or retry later. | | |
| usda_fdc/ Foundation | `fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_csv_2026-04-30.zip` | Public domain (CC0) | 3.7 MB zip | 395 foundation foods, 170k food_nutrient rows, 477 nutrients | fdc_id, description, nutrient_id, amount |
| usda_fdc/ SR Legacy | `..._sr_legacy_food_csv_2018-04.zip` | CC0 | 5.8 MB zip | 7,793 foods, 644k nutrient rows | same |
| usda_fdc/ Branded (zip only, not extracted) | `..._branded_food_csv_2026-04-30.zip` | CC0 | 428 MB zip / 3.09 GB unzipped | human branded foods | gtin_upc, ingredients |
| cnf/cnf_2026/ | Canadian Nutrient File 2026, open.canada.ca dataset 1b6139bd-ed7e-4043-bc28-ff00e10f3109 | Open Government Licence – Canada | 26 MB zip / 51 MB | 5,993 foods, 173 nutrients, 565k amounts; EN+FR | Food_Code, Food_Description_EN/FR, Nutrient_Amount |
| figshare_canine/ | figshare article 30344017 "Canine diet datasets" (published 2025-12-17) | CC BY 4.0 | 3.1 MB, 7 CSVs | breed diseases 4,093; Hill's products 305; Product_and_nutrients 49; disorders 99; ingredients 126 (EN/RU); ingredient→USDA map 40; Vetclinic 9 (Russian) | breed, disease, protein/fat/fibre…, ingredients |
| biovet/repo | github.com/Bio-Vet/pet-food-safety (created 2026-08-14) | data CC BY 4.0 (code: LICENSE-CODE) | 424 KB | 101 items (43 food, 44 plant, 10 household, 4 medication) | id, names{en,ru}, verdicts{dog,cat,…}, toxin, notes |
| breeds/dog-breeds-details | kaggle warcoder/dog-breeds-details | CC0 | 7 KB | 97 breeds | min/max height & weight by sex, life expectancy |
| breeds/top-dog-breeds-around-the-world | kaggle prajwaldongre/... | CC0 | 15 KB | 159 breeds | size, exercise hrs, health risk, avg weight |
| breeds/cat-breeds-details | kaggle warcoder/cat-breeds-details | CC0 | 2 KB | 62 cat breeds | min/max weight, life expectancy, traits |
| breeds/dog-breeds | kaggle sujaykapadnis/dog-breeds (TidyTuesday, AKC data) | "Other" – data from American Kennel Club; treat as **not cleared for commercial use** | 177 KB | 195 breeds, 16 traits, AKC rank 2013-20 | traits 1-5 |
| aafco/2025_OP_Chapter_6_enc.pdf | aafco.org/wp-content/uploads/2026/01/2025_OP_Chapter_6_enc.pdf | **© AAFCO** – no copying/machine-readable conversion without permission. Reference only; do NOT parse/train. | 1 MB, 208 pp | ingredient definitions | |
| nutrient_profiles/aafco_nutrient_profiles_per1000kcal.csv | built from AAFCO 2014 revised profiles PDF (saved alongside) | facts from AAFCO public PDF; cite source | 88 rows | dog + cat, growth/adult min, max per 1000 kcal ME | |
| nutrient_profiles/energy_requirements_msd.csv | MSD Vet Manual RER/MER table | cite source | 11 rows | RER=70·BW^0.75, MER factors dog/cat | |

Kaggle files downloaded anonymously via `kaggle.com/api/v1/datasets/download/<owner>/<slug>` (worked without login on 2026-10-20).

## OPFF counts (CSV, 2026-10-20; heuristic on categories_tags/countries_tags)
total 15,136 · dog ≈2,032 · cat ≈2,369 · tagged Canada 254 (dog+Canada only 34) · tagged US 943 · any *_100g nutrition 598 · ingredients text 2,825 · both 393.
=> OPFF is thin for Canada and few products have nutrition; pet guaranteed analysis is often missing.

## How to use
- OPFF → seed `products` table (DuckDB on the parquet/TSV). Filter `categories_tags` like `%dog%` / `%cat%`.
- FDC/CNF → ingredient dictionary; map pet-label names via `figshare_canine/ingredient_standardization.csv` as a starter synonym table.
- AAFCO CSV → target table keyed (species, life_stage); compare products on per-1000 kcal basis.
- Energy CSV → portion calculator.
- Bio-Vet → toxicity flags (dog AND cat verdicts available) – attribute "BioVet clinic network, CC BY 4.0".
- Breed CSVs → default size/weight ranges for dog and cat profiles.
- Also: ../data/ (31 brands, 65 products with Canadian prices, 363 YouTube taste tests, recalls) for Canadian catalog + palatability signal.

## Not downloaded
- Korean AI Hub dataSetSn=71520 ("반려견, 반려묘 건강정보 데이터" – dog & cat health data): page says "※ 내국인만 데이터 신청이 가능합니다" (Korean nationals only).
- NRC 2006 full tables: book is paid (National Academies Press); only third-party reproductions found — not saved.
- AAFCO Online Database of Ingredients: paid.

## Added 2026-10-20 (PT)
| File | Rows | Source | Notes |
|---|---|---|---|
| aafco/README.md | – | – | Copyright note. **aafco_ch6_ingredients.csv not created:** the PDF's notice forbids conversion to machine-readable form without AAFCO's written consent |
| nrc/nrc_dog_requirements.csv | 1 | MSD Vet Manual "Nutritional Requirements of Small Animals" | MSD reprints only NRC protein (adult ~20 g; growth 45 g at 4–14 wk / 35 g after 14 wk, per 1000 kcal ME). There is no full NRC table on MSD |
| nrc/nrc_cat_requirements.csv | 1 | same | protein adult 40 g, kitten 45 g /1000 kcal ME |
| nrc/nap_dog_nutrition_pamphlet.pdf | – | nap.nationalacademies.org (free NRC dog pamphlet) | daily amounts for a 33-lb dog, not per 1000 kcal; not parsed |
| toxicity/aspca_toxins.csv | 29 | ASPCA "People Foods to Avoid" (19 items) + ASPCApro Top 10 Pet Toxins 2025 (10 categories) | columns item, species, severity_notes, list, source_url |
| toxicity/aspca_top10_toxins_2025.pdf, aspca_people_foods_to_avoid.html | – | sources kept | PDF is an image-only infographic; rows taken from the ASPCApro page text |
| nutrient_profiles/aafco_nutrient_profiles_per1000kcal.csv | 88 | re-verified 2026-10-20 against the 2014 PDF (pp. 6–7 dog, pp. 15–16 cat) | all values match; no changes needed |
