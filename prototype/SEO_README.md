# SEO and deploy guide — Pet Nutrition Matcher

## What this build does
- **Path routing** (History API): `/foods`, `/guides/<slug>`, `/can-dogs-eat/<slug>`, `/growth`, etc. Old `#/foods` bookmarks are redirected once to `/foods`.
- **Prerender**: `npm run build` visits every public route with Playwright and writes `dist/<route>/index.html` with full HTML, title, meta, canonical, OG and JSON-LD already in the document.
- **Sitemap / robots / 404 / hosting**: `sitemap.xml`, `robots.txt` (Disallow: `/pet`), `404.html`, `vercel.json`, Netlify `_redirects`.

## Set your domain (required before launch)
1. Edit **`js/seo.js`** → `export const SITE = 'https://YOUR-DOMAIN.com'`.
2. Replace `https://example.com` in `robots.txt`, `sitemap.xml`, and `index.html` (or rebuild after setting `SITE_URL`).
3. Build with: `SITE_URL=https://YOUR-DOMAIN.com npm run build`

## Local preview
```bash
python3 scripts/serve_spa.py   # http://127.0.0.1:8767  (SPA fallback)
# or after build:
npx serve dist
```

## Build static site
```bash
npm install
npx playwright install chromium   # if needed
SITE_URL=https://YOUR-DOMAIN.com npm run build
# Output: dist/  (deploy this folder)
```

## Hosting
- **Vercel**: set root or output to `dist`. `vercel.json` enables clean URLs and SPA fallback for client-only routes.
- **Netlify**: publish `dist`, `_redirects` included. Prefer prerendered HTML when present.
- Ensure `/pet/*` stays noindex (set in `js/seo.js` NOINDEX + robots Disallow).

## Google Search Console (do this early)
1. Verify ownership (DNS TXT or HTML file).
2. Submit `https://YOUR-DOMAIN.com/sitemap.xml`.
3. Use URL Inspection → Request indexing on home, `/foods`, `/growth`, `/toxic`, top guides, and a few `/can-dogs-eat/*` pages.
4. Fix Coverage / Experience issues as they appear.
5. Optional: Bing Webmaster Tools → import from GSC or submit the same sitemap.

## Public routes (crawlable)
Home, `/new`, `/foods`, `/food/<id>`, `/scan`, `/tools`, `/recipe`, `/toxic`, `/can-dogs-eat/<slug>`, `/can-cats-eat/<slug>`, `/growth`, `/guides`, `/guides/<slug>`.

## Private (noindex)
`/pet`, `/pet/growth`, `/pet/profile` — owner-specific.

## Honesty
No buy/affiliate links. Sample product data is labelled. Toxicity pages cite ASPCA. Growth cites Salt et al. 2017 and AAHA 2014. Always: general guidance, not veterinary advice.

## Build notes (performance)
- `npm run build` now blanks `js/config.js` itself while rendering and always restores it (dist gets the real file). No manual step needed.
- Prerendered pages inline all CSS in one `<style>`, mark `#app` with `data-prerendered`, and the app attaches behaviour without re-rendering on first load (unless a pet is saved).
- Fonts are self-hosted (`assets/fonts`, `css/fonts.css`, font-display: swap). Icons are a Phosphor subset (`css/icons-*.css`, `assets/vendor/phosphor`). If you use a new icon name, re-run the subset step or temporarily link the full Phosphor CSS.
- Images: use `*-480.webp` variants; the home hero uses srcset (480w / 836w).

## Legal pages
Template — have a lawyer licensed in BC review before launch. See LEGAL_README.md. /privacy, /terms and /disclaimer are prerendered, indexable and in sitemap.xml.
