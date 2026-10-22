// SITE CONFIG: one place to set the public domain for canonical, OG, sitemap and JSON-LD.
// TODO: replace with the real production domain before launch.
export const SITE = 'https://example.com';

export const DEFAULT_DESC = "Build your dog or cat's profile and get foods that fit their age, weight, allergies and goals, with AAFCO checks and cost per day. Free.";
export const DEFAULT_TITLE = 'Free Dog & Cat Food Matcher – Find the Right Food for Your Pet';
export const OG_IMAGE = '/assets/hero-dog-cat.jpg';
export const OG_IMAGE_ALT = 'A labrador puppy and a ginger kitten sitting together';

/** Paths that must not be indexed (owner-specific / private). */
export const NOINDEX = [/^\/pet(\/|$)/, /^\/account(\/|$)/];

export const SEO_BY_PATH = [
  [/^\/new\/?$/, { title: 'Dog & Cat Food Finder – Match by Breed, Age & Weight', desc: 'Answer 3 quick questions about your dog or cat and get food matches for their age, size, weight and needs. Free, no account needed.' }],
  [/^\/foods\/?$/, { title: 'Dog & Cat Food Compared by Fit and Cost per Day', desc: 'Dog and cat foods ranked by fit for your pet, AAFCO nutrient checks and cost per day. Filter by goal, allergies, format and extras.' }],
  [/^\/food\//, { title: null, desc: 'See what is in this pet food per 1000 kcal, how it compares with AAFCO targets, daily portions, and what other owners say.' }],
  [/^\/scan\/?$/, { title: 'Free Pet Food Label Scanner – Check Nutrients & AAFCO', desc: 'Snap a dog or cat food label or enter the barcode. We check protein, fat, calcium and phosphorus against AAFCO targets for your pet. Free.' }],
  [/^\/toxic\/?$/, { title: 'Can My Dog or Cat Eat This? Toxic Food Checker (Free)', desc: 'Type a food to see if it is safe, risky or toxic for dogs and cats before you share a snack. Can dogs eat grapes? Check here. Not vet advice.' }],
  [/^\/can-dogs-eat\//, { title: null, desc: null }],
  [/^\/can-cats-eat\//, { title: null, desc: null }],
  [/^\/recipe\/?$/, { title: 'Homemade Pet Food Mix Builder – Calories & AAFCO Gaps', desc: 'Cooking for your dog or cat? Mix real ingredients (USDA data) by percent or grams, see calories per 100 g, and check protein, fat, calcium and phosphorus against AAFCO targets.' }],
  [/^\/guides\/puppy-growth-chart\/?$/, { title: 'Puppy Growth Chart: How Big Will My Puppy Get?', desc: "Use a puppy growth chart to see your dog's weight percentile, estimate how big your puppy will get, and find daily calories for a safe goal. Kittens too." }],
  [/^\/guides\/?$/, { title: 'Dog & Cat Nutrition Guides – Labels, AAFCO, Feeding', desc: 'Plain-English guides to reading pet food labels, AAFCO profiles, puppy and kitten growth, healthy weight and home-cooked food.' }],
  [/^\/tools\/?$/, { title: 'Free Pet Nutrition Tools – Scanner, Growth, Toxic Foods', desc: 'Free pet nutrition tools: food label scanner, homemade recipe checker, growth chart goal planner and toxic food checker for dogs and cats.' }],
  [/^\/growth\/?$/, { title: 'Puppy & Kitten Growth Chart + Adult Weight Calculator', desc: "Track your puppy's or kitten's weight by week and see if they're on curve. Estimates adult size for purebred and mixed-breed puppies. Free." }],
  [/^\/privacy\/?$/, { title: 'Privacy Policy – Pet Nutrition Matcher', desc: 'What Pet Nutrition Matcher collects (pet profiles, weigh-ins, reviews), why, who processes it, your rights under PIPEDA, GDPR and CCPA, and how to delete your data.' }],
  [/^\/terms\/?$/, { title: 'Terms and Conditions – Pet Nutrition Matcher', desc: 'Terms for using Pet Nutrition Matcher: general information only, not veterinary advice, user reviews, no warranties, liability limits and BC governing law.' }],
  [/^\/disclaimer\/?$/, { title: 'Medical & Data Disclaimer – Pet Nutrition Matcher', desc: 'Our nutrition data, growth charts, calorie suggestions and food matches are experimental estimates, not veterinary advice. Check with your vet before acting.' }],
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
  const title = conf.title || (view?.title?.length > 40 ? view.title : view?.title ? `${view.title} · Pet Nutrition Matcher` : DEFAULT_TITLE);
  const desc = conf.desc || view?.description || DEFAULT_DESC;
  const robots = conf.robots || (NOINDEX.some((re) => re.test(path)) ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  document.title = title;
  setMeta('name', 'description', desc);
  setMeta('name', 'robots', robots);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:url', absUrl(path));
  setMeta('property', 'og:type', path.startsWith('/guides/') ? 'article' : 'website');
  setMeta('property', 'og:image', absUrl(OG_IMAGE));
  setMeta('property', 'og:image:alt', OG_IMAGE_ALT);
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', desc);
  setMeta('name', 'twitter:image', absUrl(OG_IMAGE));
  let c = document.head.querySelector('link[rel="canonical"]');
  if (!c) { c = document.createElement('link'); c.rel = 'canonical'; document.head.appendChild(c); }
  c.href = absUrl(path);
  return { title, desc, robots, url: absUrl(path) };
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
