import { TOXIC_ITEMS } from '../mock-data.js';
import { pageBand, notice, button, verdictBanner, card, esc, expNote } from '../ui.js';
import { crumbsHtml, breadcrumbLd, absUrl } from '../seo.js';

const LABEL = { good: 'Generally safe', caution: 'Use caution', bad: 'Dangerous — avoid' };
const KIND = { good: 'good', caution: 'caution', bad: 'bad' };

export function render({ species, slug }) {
  const item = TOXIC_ITEMS.find((i) => i.slug === slug);
  const petWord = species === 'dog' ? 'dogs' : 'cats';
  const Pet = species === 'dog' ? 'Dogs' : 'Cats';
  if (!item) {
    return { title: 'Food not in our list', html: `${pageBand('Not in our list yet', 'We only publish pages for foods we have checked against published sources.')}<div class="page page--narrow"><p><a href="/toxic">Back to the toxic food checker</a></p></div>` };
  }
  const verdict = item[species];
  const title = `Can ${Pet} Eat ${item.name}? Safe, Risky or Toxic`;
  const desc = `Can ${petWord} eat ${item.name.toLowerCase()}? Short answer: ${LABEL[verdict]}. ${item.note} General guidance, not veterinary advice.`;
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Can my pet eat this?', path: '/toxic' },
    { name: item.name, path: `/can-${petWord}-eat/${slug}` },
  ];
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [{
      '@type': 'Question', name: `Can ${petWord} eat ${item.name.toLowerCase()}?`,
      acceptedAnswer: { '@type': 'Answer', text: `${LABEL[verdict]}. ${item.note}` },
    }],
  };
  const others = TOXIC_ITEMS.filter((i) => i.slug !== slug).slice(0, 5);
  return {
    title, description: desc,
    html: `${pageBand(`Can ${petWord} eat ${item.name.toLowerCase()}?`, LABEL[verdict], '', species === 'dog' ? 'cut-puppy' : 'cut-kitten')}
      <div class="page page--narrow">${expNote()}
        ${crumbsHtml(crumbs)}
        <script type="application/ld+json">${JSON.stringify(breadcrumbLd(crumbs))}</script>
        <script type="application/ld+json">${JSON.stringify(faq)}</script>
        <div class="stack-lg">
          ${verdictBanner(KIND[verdict], LABEL[verdict], esc(item.note))}
          <p class="lede">This page answers a common question: <strong>can ${petWord} eat ${esc(item.name.toLowerCase())}?</strong> Treats and table scraps are not a complete diet. If your pet ate something you are unsure about, note how much and call your vet or a pet poison hotline.</p>
          ${card(`<h2 style="margin-top:0">Source</h2><p class="muted" style="margin:0">Guidance summarised from the <a href="${esc(item.source)}" rel="noopener noreferrer" target="_blank">ASPCA people foods to avoid</a> list. We do not invent safety ratings. Sample entries may expand as we add more of the BioVet (CC BY 4.0) dataset.</p>`)}
          ${notice('General guidance, not veterinary advice. In an emergency call your vet or ASPCA Animal Poison Control at (888) 426-4435 (US; fees may apply).', 'caution')}
          <h2>Related checks</h2>
          <ul>${others.map((i) => `<li><a href="/can-${petWord}-eat/${i.slug}">Can ${petWord} eat ${esc(i.name.toLowerCase())}?</a></li>`).join('')}</ul>
          <div class="row" style="gap:var(--space-3);flex-wrap:wrap">${button({ label: 'Check another food', href: '/toxic', variant: 'dark', iconName: 'search' })}${button({ label: 'Find food for your pet', href: '/new', variant: 'ghost' })}</div>
        </div>
      </div>`,
  };
}
