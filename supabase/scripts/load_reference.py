#!/usr/bin/env python3
"""Loads the reference tables (schema `ref`) from /data. Idempotent: truncates and reloads in one transaction.

Usage:  python3 supabase/scripts/load_reference.py [--db-url URL]
Default URL is the local Supabase stack. Needs: pip install psycopg2-binary
"""
import argparse, collections, csv, json, os, pathlib, re, sys
import psycopg2
from psycopg2.extras import execute_values

ROOT = pathlib.Path(__file__).resolve().parents[2]
D = ROOT / "data"
LOCAL_URL = "postgresql://postgres:postgres@127.0.0.1:55322/postgres"
BIOVET_ATTR = "Data: BioVet veterinary clinic network, bio.vet"

num = lambda s: float(s) if s not in (None, "") else None


def rows(path, **kw):
    with open(D / path, newline="", encoding=kw.pop("encoding", "utf-8-sig")) as f:
        yield from csv.DictReader(f)


def size_categories():
    # cut-offs from Salt et al. 2017 Table 1; the small/medium/large grouping is a product proposal
    data = [("I", None, 6.5, "small"), ("II", 6.5, 9, "small"), ("III", 9, 15, "medium"),
            ("IV", 15, 30, "medium"), ("V", 30, 40, "large"), ("VI", 40, None, "large")]
    return [(i, lo, hi, g, "Salt et al. 2017, Table 1 (CC BY 4.0)") for i, lo, hi, g in data]


def breeds():
    out, seen = [], set()
    ex = {}
    for r in rows("breeds/top-dog-breeds-around-the-world/Dog Breads Around The World.csv"):
        try: ex[r["Name"].lower()] = float(r["Exercise Requirements (hrs/day)"])
        except (ValueError, KeyError): pass
    for r in rows("growth/breed_growth_index.csv"):
        if not r["adult_weight_min_kg"]: continue
        out.append((r["breed_key"], "dog", r["breed"], r["size_category"], num(r["adult_weight_min_kg"]),
                    num(r["adult_weight_max_kg"]), None, None, ex.get(r["breed"].lower()),
                    "Salt 2017 + Kaggle breed tables (CC0), adult weights unverified"))
        seen.add(r["breed_key"])
    for r in rows("breeds/cat-breeds-details/cat_breeds.csv"):
        key = r["name"].strip().lower()
        if key in seen: continue
        out.append((key, "cat", r["name"].strip(), None, None, None, num(r["min_weight"]), num(r["max_weight"]), None,
                    "Kaggle cat breeds (CC0); weight unit not labelled"))
        seen.add(key)
    return out


RELEVANT = ["diabetes", "pancreatitis", "obes", "urolith", "stone", "hip dysplasia", "elbow dysplasia", "osteoarthritis",
            "cruciate", "gastric dilatation", "bloat", "food allergy", "atopy", "hypothyroid", "cystinuria", "copper",
            "inflammatory bowel", "protein-losing", "hyperlipid", "kidney", "renal", "periodontal"]


def aliases_and_conditions(names_to_key):
    """names_to_key: lower-case display name or breed_key -> breed_key"""
    breed_keys = names_to_key
    aliases, conds = {}, set()
    for r in rows("figshare_canine/dog_breed_diseases.csv"):
        names = {r["Breed"].strip().lower()}
        names |= {x.strip().lower() for x in (r["Alternative_breed_names"] or "").replace(";", ",").split(",") if x.strip()}
        owners = sorted({breed_keys[n] for n in names if n in breed_keys})
        if not owners: continue
        for n in names:
            if n not in breed_keys: aliases.setdefault(n, owners[0])
        dis = r["Disease"].strip().lower()
        if "increased incidence" in (r["Predisposition_to_disease"] or "") and any(w in dis for w in RELEVANT):
            for owner in owners: conds.add((owner, dis, "figshare canine diet datasets (CC BY 4.0)"))
    return [(a, b) for a, b in aliases.items()], sorted(conds)


def growth():
    out = []
    for r in rows("growth/salt2017_empirical_weight_by_sizecat_month.csv"):
        out.append(("dog", r["size_cat"], int(r["age_month"]), *[num(r[k]) for k in ("p02", "p09", "p25", "p50", "p75", "p91", "p98")],
                    int(r["n_visits"]), "Salt et al. 2017 (CC BY 4.0), empirical, Normal-BCS visits"))
    by_month = collections.defaultdict(list)
    for r in rows("growth/extra/salt_kitten_datacat1456/KGC1_dataset.csv"):
        try: by_month[round(float(r["Visit_Age_Yrs"]) * 12)].append(float(r["Weight_kg"]))
        except (ValueError, KeyError): pass
    def pct(v, p):
        v = sorted(v); i = (len(v) - 1) * p; lo = int(i); hi = min(lo + 1, len(v) - 1)
        return round(v[lo] + (v[hi] - v[lo]) * (i - lo), 2)
    for m in sorted(by_month):
        v = by_month[m]
        if len(v) >= 25 and m <= 36:
            out.append(("cat", "all", m, pct(v, .02), None, pct(v, .25), pct(v, .5), pct(v, .75), None, pct(v, .98), len(v),
                        "Salt et al. kitten growth (DataCat 1456), empirical"))
    return out


def bcs():
    out = []
    for r in rows("bcs/dog_bcs_1to9.csv"):
        pct = re.match(r"^\s*([+-]?\d+)", r["approx_pct_vs_ideal_weight"] or "")
        fat = re.match(r"^\s*(\d+)\s*-\s*(\d+)", r["approx_pct_body_fat"] or "")
        out.append(("dog", int(r["score"]), r["label"], r["description"], float(pct.group(1)) if pct else None,
                    float(fat.group(1)) if fat else None, float(fat.group(2)) if fat else None, num(r["five_point_equiv"]),
                    r["calorie_guidance"] or None, r["source_url"]))
    return out


def energy():
    out = []
    for r in rows("nutrient_profiles/energy_requirements_msd.csv"):
        f = r["formula_kcal_per_day"]
        m = re.match(r"^([\d.]+)\s*\*\s*RER", f)
        out.append((r["species"], r["life_stage_or_status"], float(m.group(1)) if m else None, f, r["source_url"]))
    return out


def parse_cell(s):
    """-> (number, ratio_text, nd, large_breed_puppy_number)"""
    s = (s or "").strip()
    if not s: return None, None, False, None
    if s.upper() == "ND": return None, None, True, None
    try: return float(s), None, False, None
    except ValueError: pass
    m = re.match(r"^([\d.]+)\s*\(([\d.]+) for large-breed puppies\)", s)
    if m: return float(m.group(1)), None, False, float(m.group(2))
    if re.match(r"^[\d.]+:[\d.]+$", s): return None, s, False, None
    raise ValueError(f"unparsed AAFCO cell: {s!r}")


def profiles():
    out = []
    for r in rows("nutrient_profiles/aafco_nutrient_profiles_per1000kcal.csv"):
        g, gr, gnd, _ = parse_cell(r["growth_reproduction_min"])
        a, ar, and_, _ = parse_cell(r["adult_maintenance_min"])
        mx, mr, mnd, lbp = parse_cell(r["maximum"])
        out.append(("AAFCO-2014", r["species"], r["nutrient"], r["unit_per_1000kcal_ME"], g, a, mx, lbp, gr, ar, mr,
                    gnd or and_ or mnd, r["source_url"]))
    return out


def slug(s): return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def toxins():
    tox, terms = [], []
    data = json.load(open(D / "biovet/repo/data/items.json"))
    for i in data["items"]:
        v = i.get("verdicts", {})
        tox.append((i["id"], "biovet", i["category"], i["names"]["en"], v.get("dog"), v.get("cat"), i.get("toxin"),
                    i.get("toxic_dose"), (i.get("notes") or {}).get("en"), i.get("evidence"), i.get("sources") or [],
                    BIOVET_ATTR))
        terms += [(i["id"], n.strip().lower()) for n in i["names"]["en"]]
    for r in rows("toxicity/aspca_toxins.csv"):
        tid = "aspca-" + slug(r["item"])
        people = r["list"].startswith("ASPCA people foods")
        sp = r["species"]
        tox.append((tid, "aspca", "food" if people else "exposure_category", [r["item"]],
                    "avoid" if people and "dog" in sp else None, "avoid" if people and "cat" in sp else None,
                    None, None, r["severity_notes"], None, [r["source_url"]] if r["source_url"] else [],
                    "ASPCA (short facts with link, no copied page text)"))
        if people: terms.append((tid, r["item"].strip().lower()))
    return tox, sorted(set(terms))


# from prototype/js/domain.js ALLERGY_TERMS; groups without an entry match their own name
ALLERGENS = {"fish": ["fish", "salmon", "tuna"], "dairy": ["milk", "cheese", "whey"], "pea": ["pea", "peas"],
             "egg": ["egg", "eggs"], "wheat": ["wheat"], "corn": ["corn"], "soy": ["soy", "soybean"],
             "chicken": ["chicken"], "beef": ["beef"], "lamb": ["lamb"]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db-url", default=os.environ.get("DATABASE_URL", LOCAL_URL))
    ap.add_argument("--emit-sql", metavar="DIR", help="write one .sql file per table instead of loading (for `supabase db query --linked -f`); quoting uses --db-url, nothing is written to it")
    args = ap.parse_args()

    br = breeds(); keys = {b[0] for b in br}
    al, co = aliases_and_conditions({**{b[0]: b[0] for b in br}, **{b[2].lower(): b[0] for b in br}})
    tox, terms = toxins()
    plan = [
        ("ref.size_categories", "id,adult_kg_min,adult_kg_max,size_group,source", size_categories()),
        ("ref.breeds", "breed_key,species,display_name,size_cat,adult_kg_min,adult_kg_max,raw_weight_min,raw_weight_max,exercise_hours,source", br),
        ("ref.breed_aliases", "alias,breed_key", al),
        ("ref.breed_conditions", "breed_key,condition,source", co),
        ("ref.growth_curves", "species,size_cat,month,p02,p09,p25,p50,p75,p91,p98,n_visits,source", growth()),
        ("ref.bcs_scores", "species,score,label,description,pct_vs_ideal,body_fat_min,body_fat_max,five_point_equiv,calorie_guidance,source", bcs()),
        ("ref.energy_factors", "species,status,multiplier,formula,source", energy()),
        ("ref.nutrient_profiles", "standard,species,nutrient,unit,growth_min,adult_min,max_value,max_large_breed_puppy,ratio_growth,ratio_adult,ratio_max,not_determined,source", profiles()),
        ("ref.toxins", "id,source,category,names_en,dog_verdict,cat_verdict,toxin,toxic_dose,notes_en,evidence,source_urls,attribution", tox),
        ("ref.toxin_terms", "toxin_id,term", terms),
        ("ref.allergen_groups", "key,label", [(k, k.capitalize()) for k in ALLERGENS]),
        ("ref.allergen_terms", "group_key,term", [(k, t) for k, ts in ALLERGENS.items() for t in ts]),
    ]
    conn = psycopg2.connect(args.db_url)
    if args.emit_sql:
        out = pathlib.Path(args.emit_sql); out.mkdir(parents=True, exist_ok=True)
        with conn.cursor() as cur:
            for n, (table, cols, data) in enumerate(plan):
                body = b",\n".join(cur.mogrify("(" + ",".join(["%s"] * len(r)) + ")", r) for r in data).decode()
                (out / f"{n:02d}_{table.split('.')[1]}.sql").write_text(f"insert into {table} ({cols}) values\n{body};\n")
        conn.close(); print("wrote", len(plan), "files to", out); return
    try:
        with conn, conn.cursor() as cur:
            cur.execute("truncate " + ", ".join(t for t, _, _ in reversed(plan)) + " restart identity cascade")
            for table, cols, data in plan:
                execute_values(cur, f"insert into {table} ({cols}) values %s", data)
                print(f"{table:28} {len(data):6} rows")
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
