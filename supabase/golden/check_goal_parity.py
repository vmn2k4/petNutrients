#!/usr/bin/env python3
"""Compares psql output of parity.sql (stdin, n|json per line) with parity_expected.json. Usage: check_goal_parity.py parity_expected.json < out.txt"""
import json, sys
exp = json.load(open(sys.argv[1])); bad = 0; seen = 0
for line in sys.stdin:
    if '|' not in line: print(line.rstrip()); continue
    n, r = line.strip().split('|', 1); n = int(n); r = json.loads(r); e = exp[n]; seen += 1
    adj = r.get('adjustment'); adj = None if adj is None else float(adj)
    ok = abs(r['kcal'] - e['kcal']) <= 1 and (adj == e['adj'] or (adj is not None and e['adj'] is not None and abs(adj - e['adj']) < 1e-9)) and (r.get('est_days') == e['estDays'] or abs((r.get('est_days') or 0) - (e['estDays'] or 0)) <= 1) and bool(r.get('vet_warning')) == e['vet']
    if not ok: bad += 1; print('MISMATCH', n, 'sql', r.get('kcal'), adj, r.get('est_days'), r.get('vet_warning'), 'js', e)
print(f'{seen - bad}/{len(exp)} scenarios match between domain.js and goal_plan()'); sys.exit(1 if bad or seen != len(exp) else 0)
