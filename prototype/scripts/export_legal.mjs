// Writes the legal text the mobile app shows from the website's source (js/screens/legal.js), so the two can never differ.
// Run: node scripts/export_legal.mjs         Check only (CI / build): node scripts/export_legal.mjs --check
import { readFileSync, writeFileSync } from 'fs';
import { disclaimer, terms, privacy, deleteAccount, DOCS } from '../js/screens/legal.js';

for (const f of [disclaimer, terms, privacy, deleteAccount]) f();
const out = JSON.stringify(DOCS, null, 1) + '\n';
const target = new URL('../../apps/mobile/assets/content/legal.json', import.meta.url);
if (process.argv.includes('--check')) {
  let cur = '';
  try { cur = readFileSync(target, 'utf8'); } catch { /* missing */ }
  if (cur !== out) { console.error('apps/mobile/assets/content/legal.json differs from js/screens/legal.js. Run: node scripts/export_legal.mjs'); process.exit(1); }
  console.log('legal text: website and app match.');
} else { writeFileSync(target, out); console.log('Wrote apps/mobile/assets/content/legal.json (' + Object.keys(DOCS).join(', ') + ')'); }
