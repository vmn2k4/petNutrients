// After the prerender: write Vercel's Build Output (static files + routing) so unknown paths such as /pet fall back to the app,
// the same routing that worked for the earlier command-line deploys.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'fs';
const out = new URL('../.vercel/output/', import.meta.url).pathname;
rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}static`, { recursive: true });
cpSync(new URL('../dist/', import.meta.url).pathname, `${out}static`, { recursive: true });
writeFileSync(`${out}config.json`, JSON.stringify({
  version: 3, cleanUrls: true, trailingSlash: false,
  routes: [
    { src: '/assets/(.*)', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
    { src: '/css/(.*)', headers: { 'Cache-Control': 'public, max-age=86400' }, continue: true },
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/' },
  ],
}, null, 2));
console.log('Build Output written to .vercel/output');
