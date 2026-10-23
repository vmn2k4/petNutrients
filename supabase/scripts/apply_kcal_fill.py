#!/usr/bin/env python3 -I
"""Applies the calorie fill (data/canada_catalog/kcal_fill_merge.py output) to the CLOUD catalogue.
Only fills blanks: every column is set with coalesce(existing, new), so no label value already in the cloud is ever overwritten.
Backs up the current cloud values of every touched row first. Needs SUPABASE_URL and SUPABASE_ACCESS_TOKEN in .env.local (never printed).
Dry run by default.

  python3 -I supabase/scripts/apply_kcal_fill.py            # report only
  python3 -I supabase/scripts/apply_kcal_fill.py --apply    # run the two pending migrations, back up, then update
"""
import json, sys, time, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]; D = ROOT / 'data' / 'canada_catalog'
APPLY = '--apply' in sys.argv
ENV = dict(l.strip().split('=', 1) for l in open(ROOT / '.env.local') if '=' in l and not l.startswith('#'))
REF = ENV['SUPABASE_URL'].split('//')[1].split('.')[0]
MIGRATIONS = ['20261022270000_profile_region.sql', '20261022280000_kcal_fill.sql']
COLS = ['kcal_per_kg', 'kcal_per_100g', 'kcal_per_100g_dm', 'kcal_per_kg_source', 'kcal_per_unit', 'kcal_unit', 'kcal_per_cup', 'kcal_per_cup_source',
        'grams_per_cup', 'grams_per_cup_source', 'unit_grams', 'unit_grams_source', 'kcal_fill']

def q(sql):
    req = urllib.request.Request(f'https://api.supabase.com/v1/projects/{REF}/database/query', data=json.dumps({'query': sql}).encode(), method='POST',
        headers={'Authorization': 'Bearer ' + ENV['SUPABASE_ACCESS_TOKEN'], 'Content-Type': 'application/json', 'User-Agent': 'pnm-catalog/1.0'})
    try: return json.loads(urllib.request.urlopen(req, timeout=180).read() or b'null')
    except urllib.error.HTTPError as e: sys.exit(f'HTTP {e.code}: {e.read()[:600]}')

def lit(v, numeric):
    if v is None or v == '': return 'null'
    if isinstance(v, (list, dict)): return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    if numeric: return str(float(v))
    return "'" + str(v).replace("'", "''") + "'"

pre = {r['id']: r for r in map(json.loads, open(D / 'products.pre_kcal_fill.jsonl'))}
post = {r['id']: r for r in map(json.loads, open(D / 'products.jsonl'))}
changes = {}
for i, r in post.items():
    p = pre.get(i)
    if p is None: continue
    d = {c: r.get(c) for c in COLS if r.get(c) is not None and p.get(c) != r.get(c)}
    if d: changes[i] = d
print('products with new calorie data in the file:', len(changes))

types = {r['column_name']: r['data_type'] for r in q("select column_name, data_type from information_schema.columns where table_schema='catalog' and table_name='products'")}
has_region = bool(q("select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='region'"))
has_fill = 'kcal_fill' in types
print('migrations needed: region', not has_region, '| kcal_fill columns', not has_fill)

ids = ','.join("'" + i.replace("'", "''") + "'" for i in changes)
cloud = {r['id']: r for r in q(f"select id, {', '.join(c for c in COLS if c in types)} from catalog.products where id in ({ids})")} if has_fill else \
        {r['id']: r for r in q(f"select id, {', '.join(c for c in COLS if c in types)} from catalog.products where id in ({ids})")}
print('rows found in the cloud:', len(cloud), '| missing in the cloud:', len(changes) - len(cloud))
would = sum(1 for i, d in changes.items() if i in cloud for c in d if c in types and cloud[i].get(c) is None)
print('values that would be filled (blank in the cloud):', would)
if not APPLY: print('dry run: nothing written (use --apply)'); sys.exit()

ts = time.strftime('%Y%m%d-%H%M%S'); bk = D / f'kcal_fill_cloud_backup_{ts}.json'
bk.write_text(json.dumps(cloud, ensure_ascii=False, indent=1)); print('backup written:', bk.name)
for m in MIGRATIONS:
    if m.startswith('20261022270000') and has_region: continue
    if m.startswith('20261022280000') and has_fill: continue
    q((ROOT / 'supabase' / 'migrations' / m).read_text()); print('applied', m)
types = {r['column_name']: r['data_type'] for r in q("select column_name, data_type from information_schema.columns where table_schema='catalog' and table_name='products'")}
done = 0
for i, d in changes.items():
    if i not in cloud: continue
    sets = [f"{c} = coalesce({c}, {lit(v, types[c] in ('numeric', 'double precision', 'real', 'integer'))})" for c, v in d.items() if c in types]
    if sets: q(f"update catalog.products set {', '.join(sets)} where id = '{i}'"); done += 1
print('rows updated:', done)
