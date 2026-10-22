#!/usr/bin/env python3 -I
"""Adds new products from data/canada_catalog to the CLOUD catalogue without touching rows that are already there.
Reads products.jsonl, offers.csv, feeding_guides.csv; asks the cloud which product ids exist; merges duplicates; inserts only new rows
(on conflict do nothing). Needs SUPABASE_URL and SUPABASE_ACCESS_TOKEN in .env.local (never printed). Dry run by default.

  python3 -I supabase/scripts/load_catalog_update.py            # report only
  python3 -I supabase/scripts/load_catalog_update.py --apply    # write

Duplicates: the same product sold in Canada (retailer page) and the US (brand site) shows up twice. Rows of the same brand, species,
type and format are one product when their names match once accents, punctuation, size words and filler words are removed, or (one a
manufacturer row, one a retailer row) when at least 75% of their name words are shared. The kept row is the one already in the cloud,
else the manufacturer row. Blank fields are filled from the other row, markets, retailers and species are joined, and offers move over.
Foods load visible (retired = false). Treats and supplements load with retired = true, so a food query that does not filter by
product_type never lists them; the app asks for them by type.
"""
import csv, json, re, sys, unicodedata, urllib.request, urllib.error, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]; D = ROOT / 'data' / 'canada_catalog'
APPLY = '--apply' in sys.argv
ENV = dict(l.strip().split('=', 1) for l in open(ROOT / '.env.local') if '=' in l and not l.startswith('#'))
REF = re.search(r'https://([a-z0-9]+)\.supabase\.co', ENV['SUPABASE_URL']).group(1)

def q(sql):
    req = urllib.request.Request(f'https://api.supabase.com/v1/projects/{REF}/database/query', data=json.dumps({'query': sql}).encode(), method='POST',
        headers={'Authorization': 'Bearer ' + ENV['SUPABASE_ACCESS_TOKEN'], 'Content-Type': 'application/json', 'User-Agent': 'pnm-catalog/1.0'})
    try: return json.loads(urllib.request.urlopen(req, timeout=180).read() or b'null')
    except urllib.error.HTTPError as e: sys.exit(f'HTTP {e.code}: {e.read()[:600]}')

NOTNULL = {}  # (table, column) of columns that cannot be null: an empty array goes in as '{}' there, and stays null everywhere else
def coltypes(table):
    rows = q(f"select column_name, data_type, udt_name, is_nullable from information_schema.columns where table_schema='catalog' and table_name='{table}'")
    for r in rows:
        if r['is_nullable'] == 'NO': NOTNULL[(table, r['column_name'])] = True
    return {r['column_name']: (r['data_type'], r['udt_name']) for r in rows}

def lit(v, t, notnull=False):
    dt, udt = t
    if v is None or v == '' or v == []:
        if notnull: return 'default'           # a column that cannot be null falls back to its own default (empty array, {} or false)
        return "'{}'::" + udt[1:] + '[]' if (dt == 'ARRAY' and v == []) else 'null'
    if dt == 'ARRAY':
        v = v if isinstance(v, list) else [v]
        return 'ARRAY[' + ','.join("'" + str(x).replace("'", "''") + "'" for x in v) + ']::' + udt[1:] + '[]'
    if dt in ('jsonb', 'json'): return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    if dt == 'boolean': return 'true' if v in (True, 'true', 'True', '1', 1) else 'false'
    if dt in ('numeric', 'double precision', 'real'): return str(float(v))
    if dt in ('integer', 'bigint'): return str(int(float(v)))
    return "'" + str(v).replace("'", "''") + "'"

STOP = set('cat cats food foods recipe recipes for in with and the formula natural premium all life stages stage dog dogs treat treats by of a an to chewable grain free grainfree flavor entree wet dry canned'.split())
PACKAGING = set('can cans pouch pouches tin tins tub tray trays case box bag bags jar'.split())
# a word that names what the food is made of, or who it is for: if two names differ by one of these they are different products, never duplicates
PROTEINS = set('chicken beef salmon tuna duck turkey lamb pork rabbit venison fish ocean shrimp prawns sardine sardines mackerel mackarel herring liver heart egg eggs goat quail bison cod whitefish trout anchovies anchovy hoki kangaroo boar elk buffalo bacon sausage cheese pumpkin sweet potato pea lentil kitten adult puppy senior indoor outdoor large small mini giant light lite weight sensitive'.split())  # also life stage and size: a kitten food is not the adult one
def toks(n, brand=''):
    f = lambda x: re.sub(r'[^a-z0-9 ]', ' ', re.sub(r"['`]", '', unicodedata.normalize('NFKD', x).encode('ascii', 'ignore').decode().lower()))
    drop = set(f(brand).split())
    return frozenset(t for t in f(n).split() if t not in STOP and t not in PACKAGING and t not in drop and not re.fullmatch(r'\d+(oz|lb|lbs|kg|g)?', t))
def pack(n):
    return frozenset(t for t in re.sub(r'[^a-z0-9 ]', ' ', n.lower()).split() if t in PACKAGING)
brandkey = lambda r: re.sub(r'[^a-z0-9]', '', r['brand'].lower())
is_mfr = lambda r: str(r.get('source', '')).startswith('mfr')

def main():
    rows = [json.loads(l) for l in open(D / 'products.jsonl', encoding='utf-8')]
    ptypes = coltypes('products'); otypes = coltypes('offers'); gtypes = coltypes('feeding_guides')
    cloud = {r['id']: r for r in q('select id, markets, buy_url_ca, buy_url_ca_type, buy_retailer_ca, buy_url_us, buy_url_us_type, buy_retailer_us, availability_retailers, image_url, price_cad_min, price_cad_max, price_per_kg_cad_min, species_all from catalog.products')}
    byid = {r['id']: r for r in rows}; new = [r for r in rows if r['id'] not in cloud]

    # ---- duplicate groups (only groups that contain at least one new row) ----
    # 1) rows whose name words are identical are one product; 2) otherwise a manufacturer row and a retailer row pair up one to one when
    # their names differ by at most one word on each side (and neither differing word names an ingredient, so "Salmon Recipe" never pairs with "Salmon & Chicken Recipe"). No chaining: a row joins at most one other row, so different flavours can never be merged together.
    groups = collections.defaultdict(list)
    for r in rows: groups[(brandkey(r), r['species'], r.get('product_type', 'food'), r.get('format'))].append(r)
    pairs = []  # (score, a, b)
    exact = []  # lists of 2+ rows with identical name words
    for lst in groups.values():
        T = [(r, toks(r['name'], r['brand'])) for r in lst]
        same = collections.defaultdict(list)
        for r, t in T:
            if t: same[(t, pack(r['name']) - {'can', 'cans', 'tin', 'tins'} if pack(r['name']) <= {'can', 'cans', 'tin', 'tins'} and r.get('format') == 'wet' and False else pack(r['name']))].append(r)
        for rs in same.values():
            if len(rs) > 1 and not all(x['id'] in cloud for x in rs): exact.append(rs)
        for i in range(len(T)):
            for j in range(i + 1, len(T)):
                (a, ta), (b, tb) = T[i], T[j]
                pa, pb = pack(a['name']), pack(b['name'])
                if (a['id'] in cloud and b['id'] in cloud) or ta == tb or is_mfr(a) == is_mfr(b) or (pa and pb and pa != pb): continue   # a can and a pouch are different products
                diff = ta ^ tb
                if len(ta | tb) >= 4 and len(ta - tb) <= 1 and len(tb - ta) <= 1 and not (diff & PROTEINS) and len(ta & tb) / len(ta | tb) >= 0.6: pairs.append((len(ta & tb) / len(ta | tb), a, b))
    used = set(); merges = []
    def keeper_order(grp):
        return sorted(grp, key=lambda r: (r['id'] not in cloud, not is_mfr(r), -sum(1 for v in r.values() if v not in (None, '', [], {}))))
    for rs in exact:
        rs = [r for r in rs if r['id'] not in used]
        if len(rs) > 1:
            g = keeper_order(rs); merges.append((g[0], g[1:])); used |= {r['id'] for r in rs}
    for score, a, b in sorted(pairs, key=lambda t: -t[0]):
        if a['id'] in used or b['id'] in used: continue
        g = keeper_order([a, b]); merges.append((g[0], g[1:])); used |= {a['id'], b['id']}
    dropped = {d['id']: k['id'] for k, ds in merges for d in ds}
    FILL_SKIP = {'id', 'source', 'region', 'name', 'brand', 'species', 'fetched_at', 'qa_flags', 'source_url', 'attribution', 'label_country'}
    LISTS = {'markets', 'availability_retailers', 'species_all'}
    updates = {}  # existing keeper id -> {col: value}
    for k, ds in merges:
        base = dict(k) if k['id'] not in cloud else {}
        for d in ds:
            for col, v in d.items():
                if col in FILL_SKIP or col not in ptypes: continue
                if col in LISTS:
                    cur = (k.get(col) or []) + [x for x in (d.get(col) or []) if x not in (k.get(col) or [])]
                    if k['id'] in cloud:
                        have = cloud[k['id']].get(col) or []; cur = list(have) + [x for x in (d.get(col) or []) if x not in have]
                        if cur != have: updates.setdefault(k['id'], {})[col] = cur
                    else: k[col] = cur
                elif v not in (None, '', [], {}):
                    if k['id'] in cloud:
                        if cloud[k['id']].get(col) in (None, '', [], {}) and col in cloud[k['id']]: updates.setdefault(k['id'], {})[col] = v
                    elif k.get(col) in (None, '', [], {}): k[col] = v
    insert = [r for r in new if r['id'] not in dropped]

    # ---- offers and feeding guides ----
    offers = list(csv.DictReader(open(D / 'offers.csv', encoding='utf-8'))); guides = list(csv.DictReader(open(D / 'feeding_guides.csv', encoding='utf-8')))
    # Offers: every offer in the file whose product is (or is about to be) in the cloud and that the cloud does not have yet, keyed on
    # (product, retailer, url). Offers of a merged-away row move to the kept row. This also repairs a run that stopped half way.
    ins_all = {r['id'] for r in insert}; have_off = collections.defaultdict(set)
    for o in q('select product_id, retailer, url from catalog.offers'): have_off[o['product_id']].add((o['retailer'], o['url']))
    off_rows = []; seen = set()
    for o in offers:
        pid = dropped.get(o['product_id'], o['product_id'])
        if pid not in cloud and pid not in ins_all: continue
        key = (pid, o['retailer'], o['url'])
        if key in seen or (o['retailer'], o['url']) in have_off.get(pid, set()): continue
        seen.add(key); off_rows.append({**o, 'product_id': pid})
    ins_ids = {r['id'] for r in insert}
    g_rows = [g for g in guides if dropped.get(g['product_id'], g['product_id']) in ins_ids]
    for g in g_rows: g['product_id'] = dropped.get(g['product_id'], g['product_id'])

    # ---- report ----
    print('file rows', len(rows), '| in cloud', len(cloud), '| new', len(new), '| duplicate rows merged away', len(dropped), '| rows to insert', len(insert))
    print('insert by species/type:', dict(collections.Counter((r['species'], r.get('product_type', 'food')) for r in insert)))
    print('existing rows that gain merged fields:', len(updates), '| offers to add', len(off_rows), '| feeding-guide rows to add', len(g_rows))
    for k, ds in merges[:80]:
        tk = toks(k['name'], k['brand']); print('  keep', ('(cloud) ' if k['id'] in cloud else '') + k['id'][:62], '<-', ', '.join(d['id'][:62] for d in ds), '| words differing:', sorted(set().union(*[tk ^ toks(d['name'], d['brand']) for d in ds])))
    if not APPLY: print('dry run: nothing written (use --apply)'); return

    cols = [c for c in ptypes if c != 'retired']
    for i in range(0, len(insert), 25):
        vals = []
        for r in insert[i:i + 25]:
            retired = 'false' if r.get('product_type', 'food') == 'food' else 'true'
            vals.append('(' + ', '.join(lit(r.get(c), ptypes[c], ('products', c) in NOTNULL) for c in cols) + f', {retired})')
        q(f"insert into catalog.products ({', '.join(cols)}, retired) values\n" + ',\n'.join(vals) + '\non conflict (id) do nothing')
    for pid, ch in updates.items():
        q('update catalog.products set ' + ', '.join(f'{c} = {lit(v, ptypes[c])}' for c, v in ch.items()) + f" where id = '{pid}'")
    oc = ['product_id', 'retailer', 'url', 'country', 'price', 'currency', 'price_cad', 'size', 'size_kg', 'price_per_kg_cad', 'fetched_at', 'match_method', 'match_score', 'link_type']
    for i in range(0, len(off_rows), 100):
        q(f"insert into catalog.offers ({', '.join(oc)}) values\n" + ',\n'.join('(' + ', '.join(lit(o.get(c) or None, otypes[c]) for c in oc) + ')' for o in off_rows[i:i + 100]))
    gc = ['product_id', 'weight_label', 'weight_kg_min', 'weight_kg_max', 'amount_min', 'amount_max', 'unit', 'grams_per_day_min', 'grams_per_day_max', 'grams_basis', 'kcal_per_day_mid', 'qa_flag', 'raw_text', 'source_url']
    for i in range(0, len(g_rows), 100):
        q(f"insert into catalog.feeding_guides ({', '.join(gc)}) values\n" + ',\n'.join('(' + ', '.join(lit(g.get(c) or None, gtypes[c]) for c in gc) + ')' for g in g_rows[i:i + 100]))
    print('applied.')

main()
