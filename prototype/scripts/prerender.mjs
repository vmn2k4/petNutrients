/**
 * Build-time prerender: serves the SPA, visits every public route with Playwright,
 * and writes dist/<path>/index.html with the rendered DOM + baked title/meta.
 *
 * Usage: node scripts/prerender.mjs
 * Requires: playwright, a local static server with SPA fallback.
 */
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SITE = process.env.SITE_URL || 'https://example.com'; // TODO: set SITE_URL at build time
const PORT = 8799;

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.txt':'text/plain','.xml':'application/xml','.woff2':'font/woff2' };

function send(res, code, body, type='text/plain') {
  res.writeHead(code, { 'Content-Type': type }); res.end(body);
}

function spaServer() {
  return createServer((req, res) => {
    let path = decodeURIComponent(req.url.split('?')[0]);
    if (path === '/') path = '/index.html';
    const file = join(ROOT, path);
    if (existsSync(file) && statSync(file).isFile()) {
      return send(res, 200, readFileSync(file), MIME[extname(file)] || 'application/octet-stream');
    }
    // SPA fallback
    send(res, 200, readFileSync(join(ROOT, 'index.html')), 'text/html');
  });
}

// Discover routes from local data
function loadFoodIds() {
  const s = readFileSync(join(ROOT, 'js/mock-data.js'), 'utf8');
  return [...s.matchAll(/id: '(f\d+)'/g)].map((m) => m[1]);
}
function loadGuideSlugs() {
  const s = readFileSync(join(ROOT, 'js/guides-data.js'), 'utf8');
  return [...s.matchAll(/slug: '([\w-]+)'/g), ...s.matchAll(/"slug": "([\w-]+)"/g)].map((m) => m[1]);
}
function loadToxic() {
  const s = readFileSync(join(ROOT, 'js/mock-data.js'), 'utf8');
  return [...s.matchAll(/slug: '([\w-]+)'/g), ...s.matchAll(/"slug": "([\w-]+)"/g)].map((m) => m[1]);
}

const PUBLIC = [
  '/', '/new', '/foods', '/privacy', '/terms', '/disclaimer', '/tools', '/recipe', '/toxic', '/growth', '/guides',
  ...loadFoodIds().map((id) => `/food/${id}`),
  ...loadGuideSlugs().map((s) => `/guides/${s}`),
  ...loadToxic().flatMap((s) => [`/can-dogs-eat/${s}`, `/can-cats-eat/${s}`]),
];

const PRIVATE = ['/pet', '/pet/growth', '/pet/profile']; // prerender with noindex for shell only

// Inline all local stylesheets into one <style> so the first paint needs no extra CSS requests.
const minCss = (c) => c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').trim();
let CSS_BUNDLE = null;
function inlineCss(html) {
  const hrefs = [...html.matchAll(/<link rel="stylesheet" href="(\/css\/[^"]+)">/g)].map((m) => m[1]);
  if (!hrefs.length) return html;
  if (CSS_BUNDLE === null) CSS_BUNDLE = hrefs.map((h) => minCss(readFileSync(join(ROOT, h)).toString())).join('');
  let out = html.replace(/\s*<link rel="stylesheet" href="\/css\/[^"]+">/g, '');
  return out.replace('</head>', `<style>${CSS_BUNDLE}</style></head>`);
}

// Supabase calls never settle in a headless build, so serve a blank config while rendering
// and always put the real file back (dist gets the real copy).
const CONFIG = join(ROOT, 'js', 'config.js');
let CONFIG_REAL = null;
function blankConfig() { CONFIG_REAL = readFileSync(CONFIG); writeFileSync(CONFIG, readFileSync(CONFIG).toString().replace(/(export const \w+\s*=\s*)(['"`])[^'"`]*\2/g, "$1''")); }
function restoreConfig() { if (CONFIG_REAL) { writeFileSync(CONFIG, CONFIG_REAL); writeFileSync(join(DIST, 'js', 'config.js'), CONFIG_REAL); CONFIG_REAL = null; } }
process.on('exit', restoreConfig);
process.on('SIGINT', () => { restoreConfig(); process.exit(130); });

async function main() {
  mkdirSync(DIST, { recursive: true });
  // copy static assets
  for (const dir of ['css', 'js', 'assets']) cpSync(join(ROOT, dir), join(DIST, dir), { recursive: true });
  for (const f of ['robots.txt', 'sitemap.xml', 'vercel.json', '_redirects', '404.html']) {
    if (existsSync(join(ROOT, f))) cpSync(join(ROOT, f), join(DIST, f));
  }
  // The source sitemap and robots.txt carry the example.com placeholder: point them at the real site when SITE_URL is set.
  if (SITE !== 'https://example.com') for (const f of ['robots.txt', 'sitemap.xml']) { const fp = join(DIST, f); if (existsSync(fp)) writeFileSync(fp, readFileSync(fp, 'utf8').replaceAll('https://example.com', SITE)); }

  blankConfig();
  const server = spaServer().listen(PORT);
  // Locally: CHROME or /usr/bin/google-chrome. On Vercel's build machine there is no Chrome, so use the small Chromium from @sparticuz/chromium.
  let launch = { executablePath: process.env.CHROME || '/usr/bin/google-chrome' };
  if (process.env.VERCEL && !process.env.CHROME) { process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs22.x'; /* makes @sparticuz/chromium unpack the system libraries (libnss3 ...) Vercel's build image lacks */ const sp = (await import('@sparticuz/chromium')).default; launch = { executablePath: await sp.executablePath(), args: sp.args.filter((a) => a !== '--single-process'), headless: true }; }
  const browser = await chromium.launch(launch);
  const routes = [...PUBLIC];
  const metaIndex = [];

  for (const route of routes) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.error('PAGEERROR', route, e.message));
    await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#app h1, #app .page, #app .home', { timeout: 15000 }).catch(()=>{});
    await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')));
    // Rewrite absolute SITE placeholder if env set
    if (SITE !== 'https://example.com') {
      await page.evaluate((site) => {
        document.querySelectorAll('link[rel=canonical], meta[property="og:url"], meta[property="og:image"], meta[name="twitter:image"]').forEach((el) => {
          const attr = el.tagName === 'LINK' ? 'href' : 'content';
          const v = el.getAttribute(attr) || '';
          el.setAttribute(attr, v.replace('https://example.com', site));
        });
        document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
          el.textContent = el.textContent.replaceAll('https://example.com', site);
        });
      }, SITE);
    }
    await page.evaluate((r) => {
      const app = document.getElementById('app'); if (app) app.dataset.prerendered = r;
      if (r !== '/') document.querySelector('link[data-home-only]')?.remove();
    }, route);
    const html = inlineCss(await page.content());
    const title = await page.title();
    const desc = await page.locator('meta[name=description]').getAttribute('content');
    const outDir = route === '/' ? DIST : join(DIST, route.replace(/^\//, ''));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html);
    metaIndex.push({ route, title, desc });
    console.log('OK', route, title.slice(0, 60));
    await ctx.close();
  }

  // 404 shell
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/this-page-does-not-exist-404`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  writeFileSync(join(DIST, '404.html'), inlineCss(await page.content()));
  await ctx.close();

  writeFileSync(join(DIST, '_prerender.json'), JSON.stringify({ site: SITE, routes: metaIndex, builtAt: new Date().toISOString() }, null, 2));
  await browser.close();
  server.close();
  restoreConfig();
  console.log(`\nPrerendered ${metaIndex.length} routes → ${DIST}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
