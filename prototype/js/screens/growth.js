import { button, pageBand, notice, card, icon, expNote } from '../ui.js';
import { crumbsHtml, breadcrumbLd } from '../seo.js';

export function render() {
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Growth chart', path: '/growth' }];
  const ld = breadcrumbLd(crumbs);
  return {
    title: 'Puppy & Kitten Growth Chart + Adult Weight Calculator',
    description: "Track your puppy's or kitten's weight by week and see if they're on curve. Estimates adult size for purebred and mixed-breed puppies. Free.",
    html: `${pageBand('Puppy & kitten growth chart')}
      <div class="page page--narrow">${expNote()}
        ${crumbsHtml(crumbs)}
        <script type="application/ld+json">${JSON.stringify(ld)}</script>
        <div class="stack-lg">
          <p class="lede">Wondering <strong>how big your puppy will get</strong>, or whether they are growing at a healthy pace? A <strong>puppy growth chart</strong> (and a matching <strong>kitten weight chart</strong>) plots weight against age using percentile bands from veterinary data. Most healthy pets sit between the 2nd and 98th percentile. What matters most is a steady track along one band, not a single weigh-in.</p>
          <p class="lede">Our free <strong>puppy weight calculator</strong> goes one step further. After you add your pet, open the growth chart, tap a future point or pick a time frame from 1 week to 3 months, set a target weight, and we suggest daily calories and whether that weekly pace is safe. For growing pets, the best goal is usually to keep following their own percentile line. We do not recommend weight-loss plans for puppies or kittens without your vet.</p>
          ${card(`<h2 style="margin-top:0">How it works</h2><ol class="help"><li>Add your dog or cat (age, weight, breed or size group).</li><li>See their percentile on a size-group growth curve.</li><li>Pick a goal date and target weight on the chart.</li><li>Get kcal per day and a safe-pace check.</li></ol>
            <p class="muted small" style="margin:var(--space-4) 0 0">Dog curves use Salt et al. 2017 (PLoS ONE, CC BY 4.0, Banfield data), grouped by adult size. Kitten curves use a veterinary kitten-weight dataset. Breed results are estimates based on size group. General guidance, not veterinary advice.</p>`)}
          <div class="row" style="gap:var(--space-3);flex-wrap:wrap">${button({ label: 'Add your pet', href: '/new', variant: 'dark', iconName: 'arrow' })}${button({ label: 'Read the full guide', href: '/guides/puppy-growth-chart', variant: 'ghost', iconName: 'book' })}</div>
          ${notice('Already have a profile? Open <a href="/pet/growth">your pet\'s growth chart</a> to set a goal.', '')}
        </div>
      </div>`,
  };
}
