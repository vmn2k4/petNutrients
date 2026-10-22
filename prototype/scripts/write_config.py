#!/usr/bin/env python3
"""Writes prototype/js/config.js from .env.local, so the Supabase address and public key live in one place.

  python3 prototype/scripts/write_config.py          # cloud project (SUPABASE_URL / SUPABASE_ANON_KEY in .env.local)
  python3 prototype/scripts/write_config.py --local  # local Supabase stack (read from `supabase status`), for testing only

Run the cloud version before every deploy. The anon key is a public key, but keeping it here avoids editing config.js by hand.
"""
import json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "prototype/js/config.js"


def env_file():
    out = {}
    for line in (ROOT / ".env.local").read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1); out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def main():
    if "--local" in sys.argv:
        s = subprocess.run(["supabase", "status", "-o", "env"], cwd=ROOT, capture_output=True, text=True).stdout
        vals = dict(re.findall(r'^(\w+)="?([^"\n]*)"?$', s, flags=re.M))
        url, key, note = vals.get("API_URL"), vals.get("ANON_KEY"), "LOCAL test config. Run write_config.py (no flag) before deploying."
    else:
        e = env_file(); url, key, note = e.get("SUPABASE_URL"), e.get("SUPABASE_ANON_KEY"), "PUBLIC client config, generated from .env.local by scripts/write_config.py. The anon key is meant to ship to browsers; row-level security protects the data.\n// Set SUPABASE_URL to '' to run fully offline on the bundled reference-data.js snapshot."
    if not url or not key: sys.exit("Missing SUPABASE_URL / SUPABASE_ANON_KEY (is the local stack running for --local?).")
    OUT.write_text(f"// {note}\nexport const SUPABASE_URL = {json.dumps(url)};\nexport const SUPABASE_ANON_KEY = {json.dumps(key)};\n".replace('"', "'"))
    print("config.js written for", "LOCAL" if "--local" in sys.argv else "CLOUD", "->", url)


if __name__ == "__main__":
    main()
