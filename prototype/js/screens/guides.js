import { GUIDES, guideBySlug, GUIDE_DISCLAIMER } from '../guides-data.js';
import { card, pageBand, icon, esc, button, notice } from '../ui.js';
import { breadcrumbLd, crumbsHtml, absUrl, OG_IMAGE } from '../seo.js';

export const guideCard = (g, delay = 0) => `<a class="gcard reveal" style="--d:${delay}ms" href="/guides/${g.slug}"><span class="gcard__art" aria-hidden="true"><img src="/assets/${g.art}-480.webp" alt="" width="120" height="120" loading="lazy"></span><div><h3>${esc(g.title)}</h3><p class="muted small" style="margin:0 0 var(--space-2)">${esc(g.summary)}</p><span class="small muted">${g.minutes} min read</span></div></a>`;

export function list() {
  return {
    title: 'Dog & Cat Nutrition Guides – Labels, AAFCO, Feeding',
    html: `${pageBand('Pet nutrition, explained')}<div class="page"><h2 class="sr-only">All guides</h2><div class="grid grid--2">${GUIDES.map((g, i) => guideCard(g, i * 50)).join('')}</div><p class="small muted" style="margin-top:var(--space-6)">${GUIDE_DISCLAIMER}</p></div>`,
  };
}

const block = ([type, v]) => {
  if (type === 'h2') return `<h2>${esc(v)}</h2>`;
  if (type === 'h3') return `<h3>${esc(v)}</h3>`;
  if (type === 'src') return `<h2>Sources</h2><ul class="small">${v.map(([t, u]) => `<li><a href="${esc(u)}" rel="noopener" target="_blank">${esc(t)}</a></li>`).join('')}</ul>`;
  if (type === 'ul') return `<ul>${v.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  if (type === 'note') return notice(esc(v));
  return `<p>${esc(v)}</p>`;
};

export function article({ slug }) {
  const g = guideBySlug(slug);
  if (!g) return { title: 'Guide not found', robots: 'noindex, nofollow', html: `${pageBand('Guide not found', 'It may have moved.')}<div class="page page--narrow">${button({ label: 'All guides', href: '/guides', iconName: 'arrow' })}</div>` };
  const related = (g.related || []).map(guideBySlug).filter(Boolean);
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }, { name: esc(g.title), path: `/guides/${g.slug}` }];
  const articleLd = { '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.summary,
    mainEntityOfPage: absUrl(`/guides/${g.slug}`), image: absUrl(`/assets/${g.art}.webp`),
    datePublished: g.published || '2026-10-21', dateModified: g.reviewed || '2026-10-21',
    author: { '@type': 'Organization', name: 'Pet Nutrition Matcher', url: absUrl('/') }, publisher: { '@type': 'Organization', name: 'Pet Nutrition Matcher' } };
  let faqLd = '';
  if (g.faq) {
    const start = g.blocks.findIndex((b) => b[0] === 'h2' && /frequently asked/i.test(b[1]));
    const qa = [];
    for (let i = start + 1; i < g.blocks.length - 1; i++) if (g.blocks[i][0] === 'h3' && g.blocks[i + 1][0] === 'p') qa.push({ '@type': 'Question', name: g.blocks[i][1], acceptedAnswer: { '@type': 'Answer', text: g.blocks[i + 1][1] } });
    if (qa.length) faqLd = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa }).replace(/</g, '\\u003c')}</script>`;
  }
  return {
    title: g.title, description: g.summary, image: { src: `/assets/${g.art}.webp`, alt: g.title },
    html: `${pageBand(g.title, g.summary, '', g.art)}<div class="page page--narrow">${crumbsHtml(crumbs)}${faqLd}<script type="application/ld+json">${JSON.stringify(articleLd)}</script><script type="application/ld+json">${JSON.stringify(breadcrumbLd(crumbs))}</script><a class="btn btn--ghost" href="/guides" style="margin:0 0 var(--space-4) calc(var(--space-4) * -1)">${icon('back')}<span>All guides</span></a>
      <p class="small muted">${g.minutes} min read. Last reviewed 21 Oct 2026. ${GUIDE_DISCLAIMER}</p>
      <article class="prose">${g.blocks.map(block).join('')}</article>
      <div style="margin-top:var(--space-7)">${card(`<h2 style="margin-bottom:var(--space-2)">Try it for your pet</h2><p class="muted" style="margin-bottom:var(--space-4)">Two minutes, no account, and you get foods matched to them.</p>${button({ label: g.cta.label, href: g.cta.href, iconName: 'arrow' })}`, { flat: true })}</div>
      ${related.length ? `<h2 style="margin:var(--space-7) 0 var(--space-4)">Keep reading</h2><div class="stack">${related.map((r) => guideCard(r)).join('')}</div>` : ''}</div>`,
  };
}
