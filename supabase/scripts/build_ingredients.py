#!/usr/bin/env python3 -I
"""Builds the curated pet-diet ingredient table from USDA FoodData Central (SR Legacy 2018 and Foundation Foods 2026-04).
Writes prototype/js/ingredients-data.js and supabase/migrations/20261022200000_ingredients.sql. Run: python3 -I supabase/scripts/build_ingredients.py
Values are per 100 g of the food as USDA lists it (raw foods raw, cooked foods cooked). USDA FDC is public domain (CC0); credit USDA anyway.
Each entry names the exact USDA description, so the choice is reviewable. 'F' = Foundation (preferred, newer lab values), 'S' = SR Legacy."""
import csv, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FDC = ROOT / 'data' / 'usda_fdc'
SR = FDC / 'FoodData_Central_sr_legacy_food_csv_2018-04'
FF = FDC / 'FoodData_Central_foundation_food_csv_2026-04-30'

# (id, group, state, label, source, exact USDA description)
SPEC = [
  ('chicken-breast-raw', 'Poultry', 'raw', 'Chicken breast, skinless', 'F', 'Chicken, breast, boneless, skinless, raw'),
  ('chicken-breast-cooked', 'Poultry', 'cooked', 'Chicken breast, skinless', 'S', 'Chicken, broilers or fryers, breast, meat only, cooked, roasted'),
  ('chicken-thigh-raw', 'Poultry', 'raw', 'Chicken thigh, skinless', 'F', 'Chicken, thigh, boneless, skinless, raw'),
  ('chicken-thigh-cooked', 'Poultry', 'cooked', 'Chicken thigh, skinless', 'S', 'Chicken, broilers or fryers, thigh, meat only, cooked, roasted'),
  ('chicken-liver-raw', 'Organ meat', 'raw', 'Chicken liver', 'S', 'Chicken, liver, all classes, raw'),
  ('chicken-liver-cooked', 'Organ meat', 'cooked', 'Chicken liver', 'S', 'Chicken, liver, all classes, cooked, simmered'),
  ('chicken-heart-raw', 'Organ meat', 'raw', 'Chicken heart', 'S', 'Chicken, heart, all classes, raw'),
  ('chicken-gizzard-raw', 'Organ meat', 'raw', 'Chicken gizzard', 'S', 'Chicken, gizzard, all classes, raw'),
  ('turkey-ground-raw', 'Poultry', 'raw', 'Turkey, ground, 93% lean', 'F', 'Turkey, ground, 93% lean/ 7% fat, raw'),
  ('turkey-ground-cooked', 'Poultry', 'cooked', 'Turkey, ground, 93% lean', 'S', 'Turkey, ground, 93% lean, 7% fat, pan-broiled crumbles'),
  ('duck-raw', 'Poultry', 'raw', 'Duck meat, no skin', 'S', 'Duck, domesticated, meat only, raw'),
  ('beef-ground-85-raw', 'Red meat', 'raw', 'Beef, ground, 85% lean', 'S', "Beef, ground, 85% lean meat / 15% fat, raw (Includes foods for USDA's Food Distribution Program)"),
  ('beef-ground-85-cooked', 'Red meat', 'cooked', 'Beef, ground, 85% lean', 'S', 'Beef, ground, 85% lean meat / 15% fat, crumbles, cooked, pan-browned'),
  ('beef-ground-90-raw', 'Red meat', 'raw', 'Beef, ground, 90% lean', 'S', 'Beef, ground, 90% lean meat / 10% fat, raw'),
  ('beef-liver-raw', 'Organ meat', 'raw', 'Beef liver', 'S', 'Beef, variety meats and by-products, liver, raw'),
  ('beef-liver-cooked', 'Organ meat', 'cooked', 'Beef liver', 'S', 'Beef, variety meats and by-products, liver, cooked, braised'),
  ('beef-heart-raw', 'Organ meat', 'raw', 'Beef heart', 'S', 'Beef, variety meats and by-products, heart, raw'),
  ('beef-kidney-raw', 'Organ meat', 'raw', 'Beef kidney', 'S', 'Beef, variety meats and by-products, kidneys, raw'),
  ('beef-tripe-raw', 'Organ meat', 'raw', 'Beef tripe', 'S', 'Beef, variety meats and by-products, tripe, raw'),
  ('lamb-ground-raw', 'Red meat', 'raw', 'Lamb, ground', 'F', 'Lamb, ground, raw'),
  ('lamb-ground-cooked', 'Red meat', 'cooked', 'Lamb, ground', 'S', 'Lamb, ground, cooked, broiled'),
  ('pork-ground-raw', 'Red meat', 'raw', 'Pork, ground', 'S', 'Pork, fresh, ground, raw'),
  ('pork-ground-cooked', 'Red meat', 'cooked', 'Pork, ground', 'S', 'Pork, fresh, ground, cooked'),
  ('venison-ground-raw', 'Red meat', 'raw', 'Venison (deer), ground', 'S', 'Game meat, deer, ground, raw'),
  ('rabbit-raw', 'Red meat', 'raw', 'Rabbit, domesticated', 'S', 'Game meat, rabbit, domesticated, composite of cuts, raw'),
  ('salmon-raw', 'Fish', 'raw', 'Salmon, Atlantic, farmed', 'F', 'Fish, salmon, Atlantic, farm raised, raw'),
  ('salmon-cooked', 'Fish', 'cooked', 'Salmon, Atlantic, farmed', 'S', 'Fish, salmon, Atlantic, farmed, cooked, dry heat'),
  ('cod-raw', 'Fish', 'raw', 'Cod, Atlantic', 'F', 'Fish, cod, Atlantic, wild caught, raw'),
  ('whitefish-raw', 'Fish', 'raw', 'Whitefish', 'S', 'Fish, whitefish, mixed species, raw'),
  ('herring-raw', 'Fish', 'raw', 'Herring, Atlantic', 'S', 'Fish, herring, Atlantic, raw'),
  ('mackerel-raw', 'Fish', 'raw', 'Mackerel, Atlantic', 'S', 'Fish, mackerel, Atlantic, raw'),
  ('sardine-canned', 'Fish', 'canned', 'Sardines in oil, with bones', 'S', 'Fish, sardine, Atlantic, canned in oil, drained solids with bone'),
  ('tuna-canned', 'Fish', 'canned', 'Tuna, light, in water', 'F', 'Fish, tuna, light, canned in water, drained solids'),
  ('egg-raw', 'Eggs and dairy', 'raw', 'Egg, whole', 'S', 'Egg, whole, raw, fresh'),
  ('egg-boiled', 'Eggs and dairy', 'cooked', 'Egg, whole, hard-boiled', 'S', 'Egg, whole, cooked, hard-boiled'),
  ('yogurt-plain', 'Eggs and dairy', 'raw', 'Yogurt, plain, whole milk', 'S', 'Yogurt, plain, whole milk'),
  ('cottage-cheese', 'Eggs and dairy', 'raw', 'Cottage cheese, 1% fat', 'S', 'Cheese, cottage, lowfat, 1% milkfat'),
  ('pumpkin-canned', 'Vegetables', 'canned', 'Pumpkin, canned, plain', 'S', 'Pumpkin, canned, without salt'),
  ('pumpkin-raw', 'Vegetables', 'raw', 'Pumpkin, raw', 'S', 'Pumpkin, raw'),
  ('sweet-potato-baked', 'Vegetables', 'cooked', 'Sweet potato, baked', 'S', 'Sweet potato, cooked, baked in skin, flesh, without salt'),
  ('sweet-potato-boiled', 'Vegetables', 'cooked', 'Sweet potato, boiled', 'S', 'Sweet potato, cooked, boiled, without skin'),
  ('carrot-raw', 'Vegetables', 'raw', 'Carrot', 'F', 'Carrots, mature, raw'),
  ('carrot-cooked', 'Vegetables', 'cooked', 'Carrot, boiled', 'S', 'Carrots, cooked, boiled, drained, without salt'),
  ('green-beans-raw', 'Vegetables', 'raw', 'Green beans', 'F', 'Beans, snap, green, raw'),
  ('green-beans-cooked', 'Vegetables', 'cooked', 'Green beans, boiled', 'S', 'Beans, snap, green, cooked, boiled, drained, without salt'),
  ('peas-cooked', 'Vegetables', 'cooked', 'Green peas, boiled', 'S', 'Peas, green, frozen, cooked, boiled, drained, without salt'),
  ('spinach-raw', 'Vegetables', 'raw', 'Spinach', 'F', 'Spinach, mature'),
  ('spinach-cooked', 'Vegetables', 'cooked', 'Spinach, boiled', 'S', 'Spinach, cooked, boiled, drained, without salt'),
  ('broccoli-raw', 'Vegetables', 'raw', 'Broccoli', 'F', 'Broccoli, raw'),
  ('zucchini-raw', 'Vegetables', 'raw', 'Zucchini', 'F', 'Squash, summer, green, zucchini, includes skin, raw'),
  ('butternut-raw', 'Vegetables', 'raw', 'Butternut squash', 'F', 'Squash, winter, butternut, raw'),
  ('kale-raw', 'Vegetables', 'raw', 'Kale', 'F', 'Kale, raw'),
  ('cauliflower-raw', 'Vegetables', 'raw', 'Cauliflower', 'F', 'Cauliflower, raw'),
  ('cucumber-raw', 'Vegetables', 'raw', 'Cucumber, with peel', 'F', 'Cucumber, with peel, raw'),
  ('apple-raw', 'Fruit', 'raw', 'Apple, with skin', 'F', 'Apples, fuji, with skin, raw'),
  ('blueberries-raw', 'Fruit', 'raw', 'Blueberries', 'F', 'Blueberries, raw'),
  ('banana-raw', 'Fruit', 'raw', 'Banana', 'F', 'Bananas, ripe and slightly ripe, raw'),
  ('rice-white-cooked', 'Grains and starch', 'cooked', 'White rice, cooked', 'S', 'Rice, white, long-grain, regular, enriched, cooked'),
  ('rice-brown-cooked', 'Grains and starch', 'cooked', 'Brown rice, cooked', 'S', "Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program)"),
  ('oats-cooked', 'Grains and starch', 'cooked', 'Oatmeal, cooked with water', 'S', 'Cereals, oats, regular and quick, unenriched, cooked with water (includes boiling and microwaving), without salt'),
  ('barley-cooked', 'Grains and starch', 'cooked', 'Barley, pearled, cooked', 'S', 'Barley, pearled, cooked'),
  ('quinoa-cooked', 'Grains and starch', 'cooked', 'Quinoa, cooked', 'S', 'Quinoa, cooked'),
  ('pasta-cooked', 'Grains and starch', 'cooked', 'Pasta, cooked', 'S', 'Pasta, cooked, enriched, without added salt'),
  ('potato-boiled', 'Grains and starch', 'cooked', 'Potato, boiled, no skin', 'S', 'Potatoes, boiled, cooked without skin, flesh, without salt'),
  ('lentils-cooked', 'Legumes', 'cooked', 'Lentils, boiled', 'S', 'Lentils, mature seeds, cooked, boiled, without salt'),
  ('chickpeas-cooked', 'Legumes', 'cooked', 'Chickpeas, boiled', 'S', 'Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt'),
  ('fish-oil-salmon', 'Oils and fats', 'oil', 'Salmon oil', 'S', 'Fish oil, salmon'),
  ('coconut-oil', 'Oils and fats', 'oil', 'Coconut oil', 'F', 'Oil, coconut'),
  ('olive-oil', 'Oils and fats', 'oil', 'Olive oil', 'S', 'Oil, olive, salad or cooking'),
  ('sunflower-oil', 'Oils and fats', 'oil', 'Sunflower oil', 'S', 'Oil, sunflower, linoleic (less than 60%)'),
  ('flaxseed-oil', 'Oils and fats', 'oil', 'Flaxseed oil', 'S', 'Oil, flaxseed, cold pressed'),
  ('chicken-fat', 'Oils and fats', 'oil', 'Chicken fat', 'S', 'Fat, chicken'),
  ('beef-tallow', 'Oils and fats', 'oil', 'Beef tallow', 'S', 'Fat, beef tallow'),
]
# Not from USDA: water, and a plain calcium source (calcium carbonate is 40% calcium by mass, a chemical fact).
EXTRA = [
  dict(id='water', group='Other', state='water', name='Water', source='none', fdc_id=None, kcal=0, protein_g=0, fat_g=0, calcium_mg=0, phosphorus_mg=0, water_g=100, fiber_g=0),
  dict(id='calcium-carbonate', group='Supplements', state='supplement', name='Calcium carbonate powder', source='chemistry (40% calcium by mass)', fdc_id=None, kcal=0, protein_g=0, fat_g=0, calcium_mg=400000, phosphorus_mg=0, water_g=0, fiber_g=0),
]
N = {'kcal': ('1008', '2047', '2048'), 'protein_g': ('1003',), 'fat_g': ('1004',), 'calcium_mg': ('1087',), 'phosphorus_mg': ('1091',), 'water_g': ('1051',), 'fiber_g': ('1079',)}

def load(folder, only_foundation=False):
    keep = None
    if only_foundation:
        keep = {r['fdc_id'] for r in csv.DictReader(open(folder / 'foundation_food.csv', encoding='utf-8'))}
    foods = {}
    for r in csv.DictReader(open(folder / 'food.csv', encoding='utf-8')):
        if keep is None or r['fdc_id'] in keep: foods.setdefault(r['description'], r['fdc_id'])
    return foods

def nutrients(folder, ids):
    want = {n for v in N.values() for n in v}; out = {i: {} for i in ids}
    for r in csv.DictReader(open(folder / 'food_nutrient.csv', encoding='utf-8')):
        if r['fdc_id'] in out and r['nutrient_id'] in want and r['amount'] != '': out[r['fdc_id']][r['nutrient_id']] = float(r['amount'])
    return out

def main():
    foods = {'S': load(SR), 'F': load(FF, True)}; picked = {}; missing = []
    for row in SPEC:
        fid = foods[row[4]].get(row[5])
        if fid is None: missing.append(row)
        else: picked[row[0]] = fid
    if missing:
        for m in missing: print('NOT FOUND', m[4], m[5], file=sys.stderr)
        sys.exit(1)
    nut = {'S': nutrients(SR, {picked[r[0]] for r in SPEC if r[4] == 'S'}), 'F': nutrients(FF, {picked[r[0]] for r in SPEC if r[4] == 'F'})}
    rows = []
    for id_, group, state, name, src, desc in SPEC:
        fid = picked[id_]; vals = nut[src][fid]; rec = dict(id=id_, group=group, state=state, name=name, source='USDA Foundation Foods 2026-04' if src == 'F' else 'USDA SR Legacy 2018', fdc_id=int(fid), usda_description=desc)
        for k, ids in N.items():
            v = next((vals[i] for i in ids if i in vals), None); rec[k] = None if v is None else round(v, 2)
        if rec['kcal'] is None or rec['protein_g'] is None or rec['fat_g'] is None:
            # energy missing: Atwater general factors from protein, fat and carbohydrate are not stored here, so refuse to guess
            print('MISSING energy/protein/fat', id_, rec, file=sys.stderr); sys.exit(1)
        for k in ('calcium_mg', 'phosphorus_mg'):
            if rec[k] is None: rec[k] = None  # stays null: shown as "not reported", never as zero
        rows.append(rec)
    rows += EXTRA
    for r in rows: r.setdefault('usda_description', None)
    (ROOT / 'prototype' / 'js' / 'ingredients-data.js').write_text(
        '// GENERATED by supabase/scripts/build_ingredients.py from USDA FoodData Central (public domain). Per 100 g. Do not edit by hand.\n'
        'export const INGREDIENTS = ' + json.dumps(rows, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')
    q = lambda v: 'null' if v is None else (str(v) if isinstance(v, (int, float)) else "'" + str(v).replace("'", "''") + "'")
    cols = ['id', 'name', 'group_name', 'state', 'source', 'fdc_id', 'usda_description', 'kcal', 'protein_g', 'fat_g', 'calcium_mg', 'phosphorus_mg', 'water_g', 'fiber_g']
    vals = ',\n'.join('  (' + ', '.join(q(r.get(c if c != 'group_name' else 'group')) for c in cols) + ')' for r in rows)
    (ROOT / 'supabase' / 'migrations' / '20261022200000_ingredients.sql').write_text(
        "-- Curated pet-diet ingredients for the mix builder. Per 100 g. Source: USDA FoodData Central (SR Legacy 2018, Foundation Foods 2026-04), public domain.\n"
        "-- GENERATED by supabase/scripts/build_ingredients.py; rerun it instead of editing. Calcium or phosphorus left null means USDA does not report it.\n"
        "create table if not exists ref.ingredients (\n  id text primary key,\n  name text not null,\n  group_name text not null,\n  state text not null check (state in ('raw','cooked','canned','oil','water','supplement')),\n"
        "  source text not null,\n  fdc_id bigint,\n  usda_description text,\n  kcal numeric not null,\n  protein_g numeric not null,\n  fat_g numeric not null,\n  calcium_mg numeric,\n  phosphorus_mg numeric,\n  water_g numeric,\n  fiber_g numeric\n);\n"
        "alter table ref.ingredients enable row level security;\ndo $$ begin create policy \"public read\" on ref.ingredients for select to anon, authenticated using (true); exception when duplicate_object then null; end $$;\n"
        "grant usage on schema ref to anon, authenticated;\ngrant select on ref.ingredients to anon, authenticated;\n"
        "insert into ref.ingredients (" + ', '.join(cols) + ") values\n" + vals + "\non conflict (id) do update set name = excluded.name, kcal = excluded.kcal, protein_g = excluded.protein_g, fat_g = excluded.fat_g, calcium_mg = excluded.calcium_mg, phosphorus_mg = excluded.phosphorus_mg, water_g = excluded.water_g, fiber_g = excluded.fiber_g;\n", encoding='utf-8')
    print(f'{len(rows)} ingredients written')

main()
