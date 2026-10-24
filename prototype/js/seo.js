// SITE CONFIG: one place to set the public domain for canonical, OG, sitemap and JSON-LD.
export const SITE = 'https://munaruna.com';

export const DEFAULT_DESC = "Free pet diet tracker for dogs and cats: daily calorie and nutrient targets, food nutrition per 1000 kcal vs AAFCO, growth chart and weight tracking, cost per day.";
export const DEFAULT_TITLE = 'Pet Diet Tracker: Dog & Cat Food Nutrition, Calories & Weight';
export const OG_IMAGE = '/assets/og-home.jpg';
export const OG_IMAGE_ALT = 'A golden retriever and a ginger cat sitting beside their food bowls';

/** Share image per route (path under /assets, alt text, size when known). A screen can override with view.image = { src, alt }. */
const IMG = (src, alt, w, h) => ({ src, alt, w, h });
export const IMAGE_BY_PATH = [
  [/^\/new\/?$/, IMG('/assets/cut-puppy.webp', 'A cartoon-style puppy cut-out')],
  [/^\/foods\/?$/, IMG('/assets/og-foods.jpg', 'A golden retriever eating dry food and a tabby cat eating wet food', 1200, 630)],
  [/^\/toxic\/?$/, IMG('/assets/cut-puppy.webp', 'A puppy sitting')],
  [/^\/can-dogs-eat\//, IMG('/assets/cut-puppy.webp', 'A puppy sitting')],
  [/^\/can-cats-eat\//, IMG('/assets/cut-kitten.webp', 'A kitten sitting')],
  [/^\/recipe\/?$/, IMG('/assets/og-recipe.jpg', 'Chopped carrots, chicken and rice for a homemade dog meal while a beagle watches', 1200, 630)],
  [/^\/growth\/?$/, IMG('/assets/og-growth.jpg', 'A puppy and a kitten standing on a pet scale', 1200, 630)],
  [/^\/tools\/?$/, IMG('/assets/og-recipe.jpg', 'Chopped carrots, chicken and rice for a homemade dog meal while a beagle watches', 1200, 630)],
  [/^\/guides\/?$/, IMG('/assets/store-aisle.jpg', 'A pet food aisle in a store')],
];
export const imageFor = (path, view) => {
  if (view?.image) return view.image;
  const hit = IMAGE_BY_PATH.find(([re]) => re.test(path));
  return hit ? hit[1] : IMG(OG_IMAGE, OG_IMAGE_ALT, 1200, 630);
};

/** Paths that must not be indexed (owner-specific / private). */
export const NOINDEX = [/^\/pet(\/|$)/, /^\/account(\/|$)/];

export const SEO_BY_PATH = [
  [/^\/new\/?$/, { title: 'Dog & Cat Food Finder – Match by Breed, Age & Weight', desc: 'Answer 3 quick questions about your dog or cat and get food matches for their age, size, weight and needs. Free to try.' }],
  [/^\/foods\/?$/, { title: 'Dog & Cat Food Nutrition Comparison – Protein, Fat, Cost/Day', desc: 'Compare dog and cat food nutrition per 1000 kcal: protein, fat, calcium, phosphorus vs AAFCO, plus cost per day. Filter by goal, allergies, format and extras.' }],
  [/^\/food\//, { robots: 'noindex, follow', title: null, desc: 'See what is in this pet food per 1000 kcal, how it compares with AAFCO targets, daily portions, and what other owners say.' }],
  [/^\/scan\/?$/, { robots: 'noindex, follow', title: 'Label scanner: coming soon', desc: 'The pet food label scanner is not ready yet. Use the food finder to compare foods.' }],
  [/^\/toxic\/?$/, { title: 'Can My Dog or Cat Eat This? Toxic Food Checker (Free)', desc: 'Type a food to see if it is safe, risky or toxic for dogs and cats before you share a snack. Can dogs eat grapes? Check here. Not vet advice.' }],
  [/^\/can-dogs-eat\//, { title: null, desc: null }],
  [/^\/can-cats-eat\//, { title: null, desc: null }],
  [/^\/recipe\/?$/, { title: 'Homemade Pet Food Mix Builder – Calories & AAFCO Gaps', desc: 'Cooking for your dog or cat? Mix real ingredients (USDA data) by percent or grams, see calories per 100 g, and check protein, fat, calcium and phosphorus against AAFCO targets.' }],
  [/^\/guides\/puppy-growth-chart\/?$/, { title: 'Puppy Growth Chart: How Big Will My Puppy Get?', desc: "Use a puppy growth chart to see your dog's weight percentile, estimate how big your puppy will get, and find daily calories for a safe goal. Kittens too." }],
  [/^\/guides\/?$/, { title: 'Dog & Cat Nutrition Guides – Labels, AAFCO, Feeding', desc: 'Plain-English guides to reading pet food labels, AAFCO profiles, puppy and kitten growth, healthy weight and home-cooked food.' }],
  [/^\/tools\/?$/, { title: 'Free Pet Nutrition Tools – Calorie Calculator, Growth Chart, Recipe Checker', desc: 'Free pet nutrition tools for dogs and cats: daily calorie calculator, growth chart and weight tracker, homemade recipe checker and toxic food checker.' }],
  [/^\/growth\/?$/, { title: 'Puppy & Kitten Weight Tracker – Growth Chart & Calorie Goal', desc: "Pet weight tracker: log your puppy's or kitten's weight, see the growth percentile, estimate adult size and get a daily calorie goal. Dogs and cats. Free." }],
  [/^\/privacy\/?$/, { title: 'Privacy Policy – Pet Diet & Weight Tracker', desc: 'What Pet Diet & Weight Tracker collects (pet profiles, weigh-ins, reviews), why, who processes it, your rights under PIPEDA, GDPR and CCPA, and how to delete your data.' }],
  [/^\/terms\/?$/, { title: 'Terms and Conditions – Pet Diet & Weight Tracker', desc: 'Terms for using Pet Diet & Weight Tracker: general information only, not veterinary advice, user reviews, no warranties, liability limits and BC governing law.' }],
  [/^\/disclaimer\/?$/, { title: 'Medical & Data Disclaimer – Pet Diet & Weight Tracker', desc: 'Our nutrition data, growth charts, calorie suggestions and food matches are experimental estimates, not veterinary advice. Check with your vet before acting.' }],
  [/^\/pet(\/|$)/, { title: null, desc: "Your pet's growth chart, daily calories and nutrient targets.", robots: 'noindex, nofollow' }],
];

export function pathOf() {
  return location.pathname.replace(/\/$/, '') || '/';
}

export function absUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${SITE}${p === '/' ? '/' : p}`;
}

function ensureMeta(attr, key) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  return el;
}
function setMeta(attr, key, val) { ensureMeta(attr, key).setAttribute('content', val); }

export function applySeo(path, view) {
  const hit = SEO_BY_PATH.find(([re]) => re.test(path));
  const conf = hit ? hit[1] : {};
  const title = conf.title || (view?.title?.length > 40 ? view.title : view?.title ? `${view.title} · Pet Diet & Weight Tracker` : DEFAULT_TITLE);
  const desc = conf.desc || view?.description || DEFAULT_DESC;
  const robots = conf.robots || view?.robots || (NOINDEX.some((re) => re.test(path)) ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  const img = imageFor(path, view);
  document.title = title;
  setMeta('name', 'description', desc);
  setMeta('name', 'robots', robots);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:url', absUrl(path));
  setMeta('property', 'og:type', path.startsWith('/guides/') ? 'article' : 'website');
  setMeta('property', 'og:image', absUrl(img.src));
  setMeta('property', 'og:image:alt', img.alt);
  for (const [k, v] of [['og:image:width', img.w], ['og:image:height', img.h]]) {
    const el = document.head.querySelector(`meta[property="${k}"]`);
    if (v) setMeta('property', k, String(v)); else el?.remove();
  }
  setMeta('name', 'twitter:image:alt', img.alt);
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', desc);
  setMeta('name', 'twitter:image', absUrl(img.src));
  let c = document.head.querySelector('link[rel="canonical"]');
  if (!c) { c = document.createElement('link'); c.rel = 'canonical'; document.head.appendChild(c); }
  c.href = absUrl(path);
  return { title, desc, robots, url: absUrl(path), image: absUrl(img.src) };
}

export function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: absUrl(it.path),
    })),
  };
}

export function crumbsHtml(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map((it, i) => {
    const last = i === items.length - 1;
    return `<li>${last ? `<span aria-current="page">${it.name}</span>` : `<a href="${it.path}">${it.name}</a>`}</li>`;
  }).join('<li aria-hidden="true">/</li>')}</ol></nav>`;
}
