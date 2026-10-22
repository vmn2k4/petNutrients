#!/usr/bin/env python3
"""Loads foods: Hill's UK label data -> catalog.products, Open Pet Food Facts dog/cat rows -> opff.products. Idempotent.

Usage:  python3 supabase/scripts/load_foods.py [--db-url URL] [--emit-sql DIR]
Needs: pip install psycopg2-binary
"""
import argparse, ast, csv, os, pathlib, re, sys
import psycopg2
from psycopg2.extras import execute_values

ROOT = pathlib.Path(__file__).resolve().parents[2]
D = ROOT / "data"
LOCAL_URL = "postgresql://postgres:postgres@127.0.0.1:55322/postgres"
csv.field_size_limit(10**9)
num = lambda v: (float(v) if v not in (None, "", "-") else None)


def safe(v):
    try: return num(v)
    except ValueError: return None


def kcal_per_kg(s):
    s = (s or "").strip()
    m = re.search(r"([\d.,]+)\s*kcal\s*/\s*kg", s)
    if m: return float(m.group(1).replace(",", ""))
    m = re.search(r"([\d.]+)\s*kcal\s*\(\s*([\d.]+)\s*g\s*\)", s)
    if m: return round(float(m.group(1)) / float(m.group(2)) * 1000, 1)
    m = re.search(r"([\d.]+)\s*kcal\s*/\s*100\s*g", s)
    if m: return float(m.group(1)) * 10
    return None


def hills():
    out, seen = [], set()
    with open(D / "figshare_canine/dog_food_Hills_Pet_Nutrition.csv", newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            url = r["url"]; slug = url.rstrip("/").split("/")[-1]
            if slug in seen: continue   # the same page appears more than once in the source
            seen.add(slug)
            title = r["product title"].strip()
            rx = "/pd-" in url
            stage_raw = (r["life_stage"] or "").lower(); t = title.lower()
            if "puppy" in stage_raw or "puppy" in t: stage = "growth"
            elif any(x in stage_raw for x in ("adult", "senior", "mature")) or any(x in t for x in ("adult", "mature", "senior")): stage = "adult"
            else: stage = "unknown"
            form = "dry" if "dry" in r["food_form"] else "wet" if "wet" in r["food_form"] else "other"
            ing = [i.replace("_", " ") for i in ast.literal_eval(r["ingredients"] or "[]")]
            zero_none = lambda v: (None if v in (None, 0) else v)
            out.append(("hills-" + slug, "hills_uk", "Hill's", title[:1].upper() + title[1:], "dog", form, stage, rx,
                        kcal_per_kg(r["nutrition and caloric content"]), safe(r["protein"]), safe(r["fat"]), safe(r["crude fibre"]),
                        safe(r["moisture"]), zero_none(safe(r["calcium"])), zero_none(safe(r["phospohorus"])), ing, True, "GB", url,
                        "Hill's UK label data, figshare canine diet datasets (CC BY 4.0)"))
    return out


def opff():
    out = []
    with open(D / "opff/products.csv", newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            tags = ((r.get("categories_tags") or "") + "," + (r.get("categories") or "")).lower()
            dog, cat = "dog" in tags, "cat" in tags
            if not (dog or cat) or not r.get("product_name") or not r.get("code"): continue
            k, p, fa = safe(r.get("energy-kcal_100g")), safe(r.get("proteins_100g")), safe(r.get("fat_100g"))
            # pet-food ranges (wet ~60-150 kcal/100g, dry ~300-450) and energy consistent with protein and fat; junk entries are per serving or mistyped
            ok = None not in (k, p, fa) and k >= 60 and p >= 3 and fa >= 1 and k >= 0.8 * (4 * p + 9 * fa) and k <= (4 * p + 9 * fa) + 4 * 70 + 30
            out.append((r["code"], r["product_name"].strip(), (r.get("brands") or "").split(",")[0].strip() or None,
                        "both" if dog and cat else "dog" if dog else "cat", (r.get("categories") or None), (r.get("ingredients_text") or "").strip() or None,
                        k, p, fa, safe(r.get("fiber_100g")), safe(r.get("moisture_100g")), safe(r.get("calcium_100g")),
                        safe(r.get("phosphorus_100g")), bool(ok), r.get("image_url") or None, r.get("countries_tags") or None))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db-url", default=os.environ.get("DATABASE_URL", LOCAL_URL))
    ap.add_argument("--emit-sql", metavar="DIR")
    a = ap.parse_args()
    plan = [
        ("opff.products", "code,name,brand,species,categories,ingredients_text,kcal_100g,protein_100g,fat_100g,fibre_100g,moisture_100g,calcium_100g,phosphorus_100g,nutrients_plausible,image_url,countries", opff()),
        ("catalog.products", "id,source,brand,name,species,format,life_stage,prescription,kcal_per_kg,protein,fat,fibre,moisture,calcium,phosphorus,ingredients,ingredients_partial,label_country,source_url,attribution", hills()),
    ]
    conn = psycopg2.connect(a.db_url)
    if a.emit_sql:
        out = pathlib.Path(a.emit_sql); out.mkdir(parents=True, exist_ok=True)
        with conn.cursor() as cur:
            for n, (table, cols, data) in enumerate(plan):
                for i in range(0, len(data), 500):   # chunks keep each statement small for the management API
                    body = b",\n".join(cur.mogrify("(" + ",".join(["%s"] * len(r)) + ")", r) for r in data[i:i + 500]).decode()
                    (out / f"{n}_{table.split('.')[1]}_{i // 500:02d}.sql").write_text(f"insert into {table} ({cols}) values\n{body};\n")
        conn.close(); print("wrote files to", out); return
    try:
        with conn, conn.cursor() as cur:
            cur.execute("truncate " + ", ".join(t for t, _, _ in plan) + " restart identity")
            for table, cols, data in plan:
                execute_values(cur, f"insert into {table} ({cols}) values %s", data)
                print(f"{table:20} {len(data):6} rows")
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
