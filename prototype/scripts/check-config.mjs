// Stops a build that would ship the local-only Supabase address (see write_config.py --local).
import { readFileSync } from 'fs';
const c = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
if (/127\.0\.0\.1|localhost/.test(c)) { console.error('js/config.js points at a local Supabase. Run: python3 scripts/write_config.py'); process.exit(1); }
console.log('config.js OK (cloud).');
