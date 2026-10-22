import { bindQuickWeight } from '../quickweight.js';
import { profileGate } from '../account.js';
import { chartKind } from '../petcharts.js';
import { dietHtml, mountDiet } from '../diet.js';
import { isSignedIn, getPet, addWeighIn, clearPet, updatePet, setGoal, clearGoal, getGoalHistory } from '../store.js';
import { weightCheck, energyPlan, nutrientTargets, growthBands, percentile, ageInMonths, sizeCategory, breedSize, round, kgToLb, completeness, remainingKeys, weighStatus, ALLERGENS, goalPlan, GOALS, SIZE_CATEGORIES, weightAtPercentile, targetBounds, targetCheck, lifeStage, ordinal, effectiveGoal, goalProgress, fmtDay, monthsExact, projectGrowth, projectTrend, addDaysStr, todayStr } from '../domain.js';
import { BCS_OPTIONS } from '../mock-data.js';
import { DOG_BREEDS, BREED_INFO } from '../reference.js';
import { openSheet, toast } from '../sheet.js';
import { card, stat, badge, button, notice, verdictBanner, field, choiceGroup, esc, disclosure, icon, pageBand, progressRing, emptyState, petTabs, selectField, comboField, mountCombos, sizeBlock, bindBreedSize, expNote } from '../ui.js';
import { targetPickerHtml, mountTargetPicker } from '../targetpicker.js';

export const needPet = () => (!isSignedIn() ? profileGate() : {
  title: 'My pet',
  html: `${pageBand('Your pet')}<div class="page page--narrow">${emptyState({ img: 'cut-pair', title: 'Who are we feeding today?', text: 'Answer three quick questions and get foods matched to your pet. No account needed.', action: button({ label: 'Add your pet', href: '/new', iconName: 'arrow' }) })}</div>`,
});


function percentileBlock(pet) {
  const months = ageInMonths(pet.birth);
  const limit = pet.species === 'cat' ? 21 : 35;
  const bands = growthBands(pet);
  if (months > limit) {
    return card(`<div class="row row--between"><h2 style="margin:0">Weight over time</h2>${badge('Fully grown', 'info', 'check')}</div>
      <p style="margin-top:var(--space-3)">${esc(pet.name)} is fully grown, so a growth curve no longer applies. Instead we track weight against the usual adult range and an estimated ideal weight.</p>
      ${targetPickerHtml(pet, { actions: true })}
      <p class="hint">${(pet.logs || []).length < 2 ? 'Add a weigh-in every month and this line fills in. ' : ''}Small ups and downs are normal; look at the direction over weeks.</p>`);
  }
  const p = percentile(pet.weightKg, monthsExact(pet.birth), bands);
  const label = p.young ? 'too young for the percentile chart, which starts at 12 weeks (this uses the 12-week curve as a rough guide)' : p.edge === 'below' ? 'below the 2nd percentile' : p.edge === 'above' ? 'above the 98th percentile' : `around the ${ordinal(p.value)} percentile`;
  const flag = p.edge || p.young ? 'caution' : 'good';
  const cat = sizeCategory(pet);
  return card(`
    <div class="row row--between"><h2 style="margin:0">Growth chart</h2>${badge(p.edge ? 'Outside typical range' : 'In the typical range', flag, p.edge ? 'alert' : 'check')}</div>
    <p class="growth-sum" style="margin-top:var(--space-3)">${esc(pet.name)} weighs <strong>${round(pet.weightKg, 1)} kg</strong> at ${months} months: <strong>${label}</strong> of ${pet.species === 'cat' ? 'kittens' : `dogs in size group ${cat}`}.</p>
    ${targetPickerHtml(pet, { actions: true })}
    <p class="hint">${pet.species === 'dog' ? (pet.breed ? 'Breed curves are estimates based on your dog\'s size group.' : 'Mixed breed: based on the size group you picked.') : 'Kitten curves combine all breeds.'} Percentiles shift a little as pets grow, so watch the trend, not one weigh-in. This is a guide, not a vet diagnosis.</p>
    ${disclosure('Show the curve as a table', `<div class="table-wrap"><table><thead><tr><th>Month</th><th>2nd</th><th>25th</th><th>50th</th><th>75th</th><th>98th</th></tr></thead><tbody>${bands.filter((r) => r.m % 3 === 0 && r.m <= limit + 1).map((r) => `<tr><td>${r.m}</td><td>${r.p02}</td><td>${r.p25}</td><td>${r.p50}</td><td>${r.p75}</td><td>${r.p98}</td></tr>`).join('')}</tbody></table></div>`)}
  `);
}


// ---- progressive profile: each question opens a bottom sheet -------------------------------
const ASK = {
  bcs: { chip: 'Body shape', title: 'How does the body look?', why: 'Helps us find their ideal weight and the right calories.' },
  neutered: { chip: 'Spayed or neutered', title: 'Spayed or neutered?', why: 'Spayed and neutered pets usually need fewer calories.' },
  activity: { chip: 'Activity', title: 'How active are they?', why: 'Busy pets burn more, so we adjust their portions.' },
  allergies: { chip: 'Allergies', title: 'Any ingredients to avoid?', why: 'We flag or hide foods that contain them.' },
};

function askBody(key, pet) {
  if (key === 'bcs') {
    return pet.species === 'dog'
      ? `<fieldset class="field"><legend class="legend">Feel the ribs, look from above</legend><div class="choices" style="grid-template-columns:1fr">${BCS_OPTIONS.map((o) => `<label class="choice choice--list"><input type="radio" name="bcs" value="${o.score}" ${pet.bcs === o.score ? 'checked' : ''}><span><strong>${o.score}. ${o.label}</strong><small class="muted">${esc(o.text)}</small></span></label>`).join('')}</div></fieldset>`
      : choiceGroup({ name: 'bcs', legend: 'How does your cat look?', value: pet.bcs, options: [{ value: 5, label: 'Healthy weight' }, { value: 6, label: 'A bit heavy' }, { value: 3, label: 'Thin' }] });
  }
  if (key === 'neutered') return choiceGroup({ name: 'neutered', legend: 'Spayed or neutered?', value: pet.neutered ? 'yes' : 'no', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unsure', label: 'Not sure' }] });
  if (key === 'activity') return choiceGroup({ name: 'activity', legend: 'Activity level', value: pet.activity, options: [{ value: 'low', label: 'Low', sub: 'mostly resting' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High', sub: 'very active' }] });
  return choiceGroup({ name: 'allergies', legend: 'Pick any that apply', type: 'checkbox', value: pet.allergies || [], options: ALLERGENS.map((a) => ({ value: a, label: a })) });
}

function openAsk(key, rerender) {
  const pet = getPet(); const a = ASK[key]; const eh = key === 'activity' ? exerciseHint(pet) : null;
  openSheet({
    title: a.title,
    body: `<p class="muted">${a.why}${eh ? ` ${esc(eh.text)}` : ''}</p><form id="ask" class="stack">${askBody(key, pet)}<div class="row row--between" style="margin-top:var(--space-5)">${button({ label: 'Not now', variant: 'ghost', attrs: 'data-close' })}${button({ label: 'Save', type: 'submit', iconName: 'check' })}</div></form>`,
    onMount: (body, close) => {
      body.querySelector('#ask').addEventListener('submit', (e) => {
        e.preventDefault(); const f = new FormData(e.target); const patch = {};
        if (key === 'bcs') patch.bcs = Math.round(Number(f.get('bcs') || pet.bcs));
        if (key === 'neutered') patch.neutered = f.get('neutered') !== 'no';
        if (key === 'activity') patch.activity = f.get('activity') || pet.activity;
        if (key === 'allergies') patch.allergies = f.getAll('allergies');
        updatePet({ ...patch, answered: { ...(pet.answered || {}), [key]: true } });
        close(); rerender(); toast('Plan updated');
      });
    },
  });
}

function planCard(pet) {
  const pct = completeness(pet); const left = remainingKeys(pet);
  if (!left.length) return card(`<div class="plancard plancard--slim">${progressRing(100, 'Plan accuracy')}<div><h2>${esc(pet.name)}'s plan is complete</h2><p class="muted">Every answer is in. Next, find foods that fit.</p></div></div>`, { cls: 'card--tight' });
  return card(`<div class="plancard plancard--slim">${progressRing(pct, 'Plan accuracy')}<div><h2>Make the plan more accurate</h2><p class="muted">${left.length === 1 ? 'One quick question left' : `${left.length} quick questions left`}. We use sensible defaults until you answer.</p></div><div class="chips">${left.map((k) => `<button type="button" class="chipbtn" data-ask="${k}">${icon('plus')}<span>${ASK[k].chip}</span></button>`).join('')}</div></div>`, { cls: 'card--tight' });
}

function weighCard(pet) {
  const w = weighStatus(pet);
  const due = w.dueInDays > 1 ? `Next in ${w.dueInDays} days` : w.dueInDays === 1 ? 'Next tomorrow' : w.dueInDays === 0 ? 'Due today' : 'Ready whenever you are';
  const streak = w.streak ? badge(`${w.streak} on schedule`, 'good', 'fire') : '';
  return card(`<form id="weigh" class="weighbar"><span class="weighbar__meta"><strong>Weigh-in</strong> · ${due}<span class="hide-sm"> · every ${w.interval === 14 ? '2 weeks' : 'month'}</span>${streak ? ` ${streak}` : ''}</span>
    <span class="weighbar__row"><input class="input num" id="kg" name="kg" type="number" step="0.1" min="0.1" inputmode="decimal" required aria-label="Weight in kg" value="${round(pet.weightKg, 1)}"><span class="unit">kg</span>${button({ label: 'Save', type: 'submit', iconName: 'plus' })}${button({ label: 'Skip', variant: 'ghost', attrs: 'id="skip" title="Skipping keeps your streak"' })}</span></form>`, { cls: 'card--tight' });
}


// ---- breed card: what breed changes and what it does not ------------------------------------
const exerciseHint = (pet) => {
  const hrs = BREED_INFO[pet.breed]?.ex; if (hrs == null) return null;
  const fit = hrs <= 1 ? 'Low' : hrs <= 2 ? 'Normal' : 'High';
  return { hrs, fit, text: `${pet.breed}s typically get about ${hrs} hour${hrs === 1 ? '' : 's'} of exercise a day, so "${fit}" often fits.` };
};

function breedCard(pet, plan) {
  if (pet.species !== 'dog') return '';
  const b = pet.breed && DOG_BREEDS.find((x) => x.name === pet.breed);
  if (!b) {
    return card(`<h2>Breed</h2><p class="muted" style="margin:0">Mixed breed or not sure: we use the adult size group you chose. Add a breed if you know it and we will use its growth curve and typical weight.</p>`, { flat: true });
  }
  const info = BREED_INFO[pet.breed] || {}; const kg = pet.weightKg; const adult = plan.stage === 'adult';
  const where = kg < b.min ? 'below' : kg > b.max ? 'above' : 'within';
  const status = adult ? `${esc(pet.name)} is ${round(kg, 1)} kg, ${where === 'within' ? 'within' : where} that range.` : `${esc(pet.name)} is still growing, so this is the weight to expect as an adult.`;
  const ex = exerciseHint(pet);
  return card(`<h2>About the ${esc(pet.breed)}</h2>
    <dl class="facts"><div><dt>Usual adult weight</dt><dd>${round(b.min, 1)} to ${round(b.max, 1)} kg</dd><dd class="muted small">${status}</dd></div>
    ${ex ? `<div><dt>Typical exercise</dt><dd>About ${ex.hrs} hour${ex.hrs === 1 ? '' : 's'} a day</dd></div>` : ''}
    ${info.dis?.length ? `<div><dt>More common in this breed</dt><dd class="chips" style="margin-top:var(--space-1)">${info.dis.map((d) => badge(d)).join('')}</dd><dd class="muted small">From a veterinary predisposition list, for conditions where food or weight can matter. Not a diagnosis. Ask your vet.</dd></div>` : ''}</dl>
    <p class="hint" style="margin-top:var(--space-4)">How we use the breed: it sets the growth curve and the large-breed puppy rules. Daily calories come from weight, age, neutering and activity, because breed alone does not predict energy needs reliably.</p>`);
}


// ---- shared shell: band with chips, section tabs, vet banner ---------------------------------
function shell(pet, plan, active, inner) {
  const months = ageInMonths(pet.birth);
  const age = months >= 24 ? `${Math.floor(months / 12)} yr${months % 12 ? ` ${months % 12} mo` : ''}` : `${months} mo`;
  const vet = plan.needsVet || pet.health?.length || (pet.species === 'dog' && plan.stage === 'growth' && pet.bcs >= 6);
  const art = pet.species === 'cat' ? (plan.stage === 'growth' ? 'cut-kitten' : 'cut-cat') : (plan.stage === 'growth' ? 'cut-puppy' : 'cut-beagle');
  return `${pageBand(pet.name, '', `<div class="pet-chips">${badge(pet.species === 'dog' ? (pet.breed || 'Mixed breed') : 'Cat', 'info', 'paw')}${badge(age)}<button class="badge badge--action" type="button" data-quick-weight aria-label="Log a new weight">${round(pet.weightKg, 1)} kg<span class="hide-sm"> / ${round(kgToLb(pet.weightKg), 1)} lb · Log weight</span></button>${badge(plan.stage === 'growth' ? 'Growing' : 'Adult', plan.stage === 'growth' ? 'good' : '')}</div>`, art)}<div class="page page--pet">
    ${plan.vetHold ? `<div style="margin-bottom:var(--space-5)">${verdictBanner('bad', `Talk to your vet about ${esc(pet.name)}'s weight`, `${esc(pet.name)} is still growing and is ${pet.bcs >= 7 ? 'carrying extra weight' : 'above the top of the growth chart'}. Growing pets should not be put on a diet from an app. Please book a vet check, and ask them how much to feed. Until then we do not show a calorie target or portion sizes.`)}</div>` : vet ? `<div style="margin-bottom:var(--space-5)">${verdictBanner('caution', 'Best to check in with your vet', 'Your answers suggest a vet should guide the diet (a medical condition, pregnancy or nursing, very thin, or weight loss in a growing pet). You can still browse, but treat the numbers as general guidance.')}</div>` : ''}
    ${inner}
    <div style="margin-top:var(--space-6)">${expNote()}</div></div>`;
}

// One description of the saved goal for every card: its FIXED date, days left, and progress against the ORIGINAL plan.
const PROGRESS_KIND = { on_track: 'good', ahead: 'good', behind: 'caution', no_data: '' };
function goalSummary(pet) {
  const g = effectiveGoal(pet); if (!g) return null;
  const gp = goalPlan(pet, g); const label = GOALS.find((x) => x.id === g.type).label.toLowerCase(); const pr = goalProgress(pet, g);
  const date = fmtDay(g.targetDate);
  let body;
  if (g.expired) body = `The goal date (${date}) has passed. Set a new goal to keep going.`;
  else if (g.type === 'grow' && !g.custom) body = `Expected about ${round(gp.targetKg, 1)} kg by ${date}. ${g.daysLeft} days left.`;
  else if (g.type === 'maintain') body = `Keep around ${round(g.startKg, 1)} kg until ${date}. ${g.daysLeft} days left, about ${gp.kcal} calories a day.`;
  else body = `${round(g.startKg, 1)} kg to ${round(g.targetKg, 1)} kg by ${date}. ${g.daysLeft} days left, about ${gp.kcal} calories a day.`;
  const badges = `${pr ? badge(g.expired ? 'Goal date reached' : pr.text, g.expired ? 'caution' : PROGRESS_KIND[pr.state]) : ''}${gp.pace.state !== 'good' ? badge(gp.pace.text, gp.pace.state) : ''}`;
  return { title: `Goal: ${label}`, body, badges, started: g.startOn, progress: pr, goal: g };
}

function growthGoalCard(pet, plan) {
  const months = ageInMonths(pet.birth); const limit = pet.species === 'cat' ? 21 : 35;
  let head; let growthLine;
  if (months > limit) {
    head = badge('Fully grown', 'info', 'check');
    growthLine = `${esc(pet.name)} is fully grown, so we track weight against a healthy ideal.`;
  } else {
    const pr = percentile(pet.weightKg, monthsExact(pet.birth), growthBands(pet));
    const label = pr.edge === 'below' ? 'below the 2nd percentile' : pr.edge === 'above' ? 'above the 98th percentile' : `around the ${ordinal(pr.value)} percentile`;
    head = badge(pr.edge ? 'Outside typical range' : 'In the typical range', pr.edge ? 'caution' : 'good', pr.edge ? 'alert' : 'check');
    growthLine = `${esc(pet.name)} is <strong>${label}</strong> for ${pet.species === 'cat' ? 'kittens' : 'their size group'}.`;
  }
  let goalTitle; let goalBody; let goalBadge = '';
  const gs = goalSummary(pet);
  if (gs) {
    goalTitle = gs.title; goalBody = gs.body; goalBadge = gs.badges;
  } else if (plan.stage === 'growth') { goalTitle = 'Goal: grow along a steady curve'; goalBody = 'Weigh every 2 to 4 weeks. A steady track matters more than any single reading.'; }
  else if (plan.losing) { goalTitle = `Goal: reach ${round(plan.ideal, 1)} kg`; goalBody = `Aim to lose about 1 to 2% of body weight per week. ${round(pet.weightKg - plan.ideal, 1)} kg to go.`; }
  else { goalTitle = 'Goal: stay at a healthy weight'; goalBody = 'Keep weight steady and re-check body shape every month.'; }
  const hasGoal = !!gs;
  return card(`<div class="row row--between"><h2>Growth</h2>${head}</div>
    <p class="ov-line">${growthLine}</p>
    <div class="ov-goal"><h3>${esc(goalTitle)}</h3><p class="muted">${esc(goalBody)}</p><div class="row">${goalBadge}</div></div>
    <div class="row">${button({ label: 'Growth chart', href: '/pet/growth', variant: 'secondary btn--small', iconName: 'chart' })}${button({ label: hasGoal ? 'Foods for this goal' : 'Set a goal, find foods', href: '/foods', variant: 'dark btn--small', iconName: 'arrow' })}</div>`, { cls: 'card--tight' });
}


const OUTCOME = { replaced: 'Replaced', cleared: 'Cleared', achieved: 'Reached', missed: 'Date passed' };
// Progress against the original plan, and every goal the pet has had by date, so a changed goal is never silent.
const ageWords = (m) => (m < 24 ? `${Math.round(m)} months` : `${(m / 12).toFixed(1).replace(/\.0$/, '')} years`);
// Roughly when each dog size stops growing; cats about 14 months. Only used to label the "fully grown" estimate.
const GROWN_AT = { I: 10, II: 11, III: 12, IV: 15, V: 18, VI: 24 };
// "If nothing changes": where the pet is heading on the track they are on now, and how that compares with their goal.
function projectionCard(pet) {
  const note = '<p class="hint" style="margin:var(--space-3) 0 0">An estimate from how similar pets grow and your recent weigh-ins. Real pets vary, so treat it as a guide, not a promise.</p>';
  const g = effectiveGoal(pet); const live = g && !g.expired ? g : null;
  if (chartKind(pet) === 'growth') {
    const pj = projectGrowth(pet); if (!pj) return '';
    const anchors = []; const m0 = pj.m0;
    if (m0 + 3 < pj.endM - 1) anchors.push([m0 + 3, `In 3 months, at ${ageWords(m0 + 3)}`]);
    if (m0 < 10.5 && Math.abs(12 - (m0 + 3)) > 1.5) anchors.push([12, 'At 12 months']);
    const grown = Math.min(pj.endM, pet.species === 'cat' ? 14 : GROWN_AT[pet.sizeCat] || 15);
    if (grown > m0 + 1) anchors.push([grown, `Fully grown, about ${ageWords(grown)}`]);
    const stats = anchors.slice(0, 3).map(([m, label]) => { const s = pj.spread(m); return stat(`${round(pj.kgAtMonth(m), 1)} kg`, label, `usually ${round(s.lo, 1)} to ${round(s.hi, 1)} kg`); }).join('');
    let vs = '';
    if (live) {
      const at = pj.kgAtDate(live.targetDate); const diff = at - live.targetKg; const tol = Math.max(0.6, 0.03 * live.targetKg);
      vs = `<p style="margin:var(--space-4) 0 0">On this track ${esc(pet.name)} would weigh about <strong>${round(at, 1)} kg</strong> by ${fmtDay(live.targetDate)}. Your goal is <strong>${round(live.targetKg, 1)} kg</strong>, ${Math.abs(diff) <= tol ? 'so the current track already gets there.' : diff < 0 ? 'which needs a little faster growth than now.' : 'so growth is already ahead of that.'}</p>`;
    }
    return card(`<h2>If nothing changes</h2><p class="muted" style="margin:0 0 var(--space-4)">${esc(pet.name)} is following about the ${ordinal(pj.pct)} percentile line. If that continues:</p><div class="grid grid--3">${stats}</div>${vs}${note}`);
  }
  const tr = projectTrend(pet);
  if (!tr) return card(`<h2>If nothing changes</h2><p class="muted" style="margin:0">Log a couple of weigh-ins at least a week apart and we will show where ${esc(pet.name)}'s weight is heading.</p>`);
  const steady = Math.abs(tr.perWeek) < 0.1;
  const pace = steady ? 'about steady' : `${tr.perWeek > 0 ? 'gaining' : 'losing'} about ${Math.abs(tr.perWeek).toFixed(1)} kg a week`;
  let vs = '';
  if (live && live.daysLeft > 0) {
    const weeksLeft = live.daysLeft / 7; const need = (live.targetKg - pet.weightKg) / weeksLeft; const at = tr.kgAtDate(live.targetDate);
    vs = `<p style="margin:var(--space-4) 0 0">At this pace ${esc(pet.name)} would weigh about <strong>${at} kg</strong> by ${fmtDay(live.targetDate)}. Your goal is <strong>${round(live.targetKg, 1)} kg</strong>, which needs about ${need > 0 ? '+' : ''}${need.toFixed(1)} kg a week.</p>`;
  }
  return card(`<h2>If nothing changes</h2><p class="muted" style="margin:0 0 var(--space-3)">Recently ${esc(pet.name)} is ${pace}.</p>${stat(`${tr.endKg} kg`, `By ${fmtDay(tr.endDate)}`, `about ${Math.round(tr.days / 7)} weeks from now`)}${vs}${note}`);
}

function goalHistoryCard(pet) {
  const gs = goalSummary(pet); const hist = getGoalHistory();
  if (!gs && !hist.length) return '';
  const pr = gs?.progress;
  const progress = gs ? `<div class="gprog"><div class="row row--between"><strong>${esc(gs.title)}</strong><span class="small muted">Set ${fmtDay(gs.started)}</span></div>
    <p class="muted" style="margin:var(--space-1) 0 var(--space-2)">${esc(gs.body)}</p><div class="row">${gs.badges}</div>
    ${pr && pr.state !== 'no_data' ? `<p class="small" style="margin:var(--space-3) 0 0">The original plan puts ${esc(pet.name)} at <strong>${pr.plannedKg} kg</strong> today. ${esc(pet.name)} is <strong>${round(pr.actualKg, 1)} kg</strong> (${pr.diffKg > 0 ? '+' : ''}${pr.diffKg} kg).</p>` : `<p class="small muted" style="margin:var(--space-3) 0 0">Log a weigh-in after ${fmtDay(gs.started)} to see how ${esc(pet.name)} is tracking.</p>`}
    ${pr && pr.pctDone != null ? `<div class="gbar" role="img" aria-label="${pr.pctDone} percent of the way to the target"><span style="width:${pr.pctDone}%"></span></div>` : ''}</div>` : '<p class="muted" style="margin:0">No active goal. Set one on the chart above.</p>';
  const rows = hist.map((h) => `<tr><td>${fmtDay(h.startOn)} to ${fmtDay(h.endedOn)}</td><td>${esc(GOALS.find((x) => x.id === h.type)?.label || h.type)}: ${round(h.startKg, 1)} to ${round(h.targetKg, 1)} kg by ${fmtDay(h.targetDate)}</td><td>${OUTCOME[h.outcome] || h.outcome}${h.endKg != null ? ` at ${round(h.endKg, 1)} kg` : ''}</td></tr>`).join('');
  return card(`<h2>Goal progress and history</h2>${progress}
    ${hist.length ? `<div class="table-wrap" style="margin-top:var(--space-4)"><table><thead><tr><th>When</th><th>Goal</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
    <p class="hint" style="margin:var(--space-3) 0 0">A goal keeps its date. Changing the weight or date starts a new goal, and the old one stays here.</p>`);
}

function historyCard(pet) {
  const logs = [...(pet.logs || [])].sort((a, b) => (a.on < b.on ? 1 : -1));
  if (!logs.length) return '';
  return card(`<h2>Weight history</h2><div class="table-wrap"><table><thead><tr><th>Date</th><th>Weight</th><th>Change</th></tr></thead><tbody>${logs.map((l, i) => { const prev = logs[i + 1]; const d = prev ? l.kg - prev.kg : null; return `<tr><td>${esc(l.on)}</td><td>${round(l.kg, 1)} kg</td><td>${d == null ? '-' : `${d > 0 ? '+' : ''}${round(d, 1)} kg`}</td></tr>`; }).join('')}</tbody></table></div>`);
}

function nutrientsCard(plan, targets) {
  const key = ['Crude Protein', 'Crude Fat', 'Calcium', 'Phosphorus'];
  return card(`<h2>Nutrients to look for</h2><p class="muted small">Per 1000 kcal, ${plan.stage === 'growth' ? 'growth' : 'adult'} profile (AAFCO).</p><div class="table-wrap"><table><thead><tr><th>Nutrient</th><th>Minimum</th><th>Maximum</th></tr></thead><tbody>${key.map((k) => { const t = targets[k]; return `<tr><td>${k.replace('Crude ', '')}</td><td>${t.min ?? '-'} ${t.unit}</td><td>${t.max ?? '-'}</td></tr>`; }).join('')}</tbody></table></div>`);
}

function energyWeighCard(pet, plan) {
  const w = weighStatus(pet);
  const due = w.dueInDays > 1 ? `Next weigh-in in ${w.dueInDays} days` : w.dueInDays === 1 ? 'Next weigh-in tomorrow' : w.dueInDays === 0 ? 'Weigh-in is due today' : 'Weigh-in is ready whenever you are';
  if (plan.hideKcal) return card(`<h2>Daily energy</h2><p>We are not showing a calorie target for ${esc(pet.name)}. Please ask your vet how much to feed.</p><div class="ov-weigh"><div><strong>Weigh-in</strong><div class="muted small">${w.dueInDays > 0 ? `Next weigh-in in ${w.dueInDays} days` : 'Weigh-in is ready whenever you are'}.</div></div>${button({ label: 'Log weight', variant: 'secondary btn--small', iconName: 'plus', attrs: 'data-quick-weight' })}</div>`);
  return card(`<h2>Daily energy</h2>
    <div class="ov-energy"><div><div class="kcal-hero kcal-hero--sm" data-count="${Math.round(plan.kcal)}">${Math.round(plan.kcal)}</div><span class="muted small">kcal per day</span></div>
      ${stat(`${round(plan.ideal, 1)} kg`, plan.ideal < pet.weightKg ? 'ideal weight (est.)' : 'target weight')}</div>
    <p class="hint">Approximate: please check this with your vet. ${esc(plan.method)}.${remainingKeys(pet).length ? ' Estimated from defaults until you answer the questions above.' : ''}${plan.losing ? ` Never go below ${Math.round(plan.floor)} kcal without a vet nutritionist.` : ''}</p>
    <div class="ov-weigh"><div><strong>Weigh-in</strong>${w.streak ? ` ${badge(`${w.streak} on schedule`, 'good', 'fire')}` : ''}<div class="muted small">${due}.</div></div>${button({ label: 'Log weight', variant: 'secondary btn--small', iconName: 'plus', attrs: 'data-quick-weight' })}</div>`, { cls: 'card--tight' });
}

// ---- Growth: the chart card holds the shared target picker -------------------------------------
function viewGrowth(pet, plan) {
  return {
    title: `Puppy & Kitten Growth Chart – ${pet.name}'s Goal Planner`,
    html: shell(pet, plan, 'growth', `<div class="stack">${weighCard(pet)}${percentileBlock(pet)}${projectionCard(pet)}${historyCard(pet)}${goalHistoryCard(pet)}</div>`),
    mount(root, rerender) {
      bindQuickWeight(root, rerender);
      if (new URLSearchParams(location.search).get('new') === '1') { history.replaceState(null, '', '/pet'); toast(`${pet.name}'s plan is ready`); }
      const growth = lifeStage(pet) === 'growth';
      mountTargetPicker(root.querySelector('.tpick'), pet, {
        onClamp: (b) => toast(`Kept within ${b.lo} to ${b.hi} kg`),
        onSave: (d) => {
          const r = targetCheck(pet, d.days, d.kg);
          const g = setGoal({ type: growth ? 'grow' : r.type, targetKg: d.kg, days: d.days, custom: growth ? true : undefined, fromChart: true });
          toast(`Goal set: ${d.kg} kg by ${fmtDay(g.targetDate)}`); rerender();
        },
        onClear: () => { clearGoal(); toast('Goal cleared. It is kept in your goal history.'); rerender(); },
      });
      root.querySelector('#skip')?.addEventListener('click', () => { updatePet({ skips: [...(pet.skips || []), new Date().toISOString().slice(0, 10)] }); toast('Skipped. Your streak is safe.'); rerender(); });
      root.querySelector('#remind')?.addEventListener('change', (e) => { updatePet({ remind: e.target.checked }); toast(e.target.checked ? 'We will remind you by email' : 'Reminders off'); });
      root.querySelector('#weigh')?.addEventListener('submit', (e) => { e.preventDefault(); const kg = Number(new FormData(e.target).get('kg')); const wc = kg > 0 ? weightCheck(pet, kg) : null; if (wc && wc.ok) { addWeighIn(kg, pet.bcs); toast('Weigh-in saved'); rerender(); } else toast(wc ? wc.message : 'Please enter a weight'); });
    },
  };
}

// ---- Profile: edit everything in one place ----------------------------------------------------
const today = () => new Date().toISOString().slice(0, 10);
// ---- Diet: what they eat, how it changed, what happened after --------------------------------------
function viewDiet(pet, plan) {
  return {
    title: `${pet.name}: diet`,
    html: shell(pet, plan, 'diet', `<div class="stack">${dietHtml(pet, plan)}</div>`),
    mount(root, rerender) { bindQuickWeight(root, rerender); mountDiet(root, pet, rerender); },
  };
}

// ---- Profile on phones: a grouped list; each row opens a bottom sheet with just that setting ------------
const ACTIVITY = [{ value: 'low', label: 'Low', sub: 'mostly resting' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High', sub: 'very active' }];
const HEALTH = [{ value: 'medical', label: 'Medical condition' }, { value: 'joints', label: 'Joint or knee problems' }, { value: 'pregnant', label: 'Pregnant or nursing' }];
const bcsList = (pet) => (pet.species === 'dog' ? BCS_OPTIONS.map((o) => ({ value: o.score, label: `${o.score}. ${o.label}` })) : [{ value: 5, label: 'Healthy weight' }, { value: 6, label: 'A bit heavy' }, { value: 3, label: 'Thin' }]);
const listOf = (a) => (a && a.length ? a.join(', ') : 'None');

function profileRows(pet) {
  const rows = [
    ['name', 'Name', pet.name],
    ['birth', 'Date of birth', fmtDay(pet.birth)],
    ...(pet.species === 'dog' ? [['breed', 'Breed', pet.breed || 'Mixed breed']] : []),
    ['weight', 'Weight', `${round(pet.weightKg, 1)} kg`],
    ['neutered', 'Spayed or neutered', pet.neutered ? 'Yes' : 'No'],
    ['activity', 'Activity', (ACTIVITY.find((a) => a.value === pet.activity) || ACTIVITY[1]).label],
    ['bcs', 'Body shape', (bcsList(pet).find((o) => o.value === Math.round(pet.bcs)) || {}).label || 'Not set'],
    ['allergies', 'Ingredients to avoid', listOf(pet.allergies)],
    ['health', 'Health notes', (pet.health || []).length ? pet.health.map((h) => (HEALTH.find((x) => x.value === h) || {}).label || h).join(', ') : 'None'],
  ];
  return `<section class="plist" aria-label="Profile settings">${rows.map(([k, l, v]) => `<button class="plist__row" type="button" ${k === 'weight' ? 'data-quick-weight' : `data-prow="${k}"`}><span class="plist__k">${l}</span><span class="plist__v">${esc(String(v))}</span></button>`).join('')}</section>`;
}

function openProfileSheet(key, pet, rerender) {
  const F = {
    name: ['Name', () => field({ id: 'p-name', label: 'Name', value: pet.name, attrs: 'autocomplete="off" required' })],
    birth: ['Date of birth', () => field({ id: 'p-birth', label: 'Date of birth (or an estimate)', type: 'date', value: pet.birth, attrs: `max="${today()}" required` })],
    breed: ['Breed', () => `${comboField({ id: 'p-breed', label: 'Breed', options: DOG_BREEDS.map((b) => b.name), value: pet.breed || '', placeholder: 'Leave empty for mixed breed', hint: 'We use it for the growth curve and usual adult weight.' })}${sizeBlock({ id: 'p-size', label: 'Adult size (used when breed is blank)', value: pet.sizeCat || 'IV', options: SIZE_CATEGORIES.map((s) => ({ value: s.id, label: s.label })) })}`],
    neutered: ['Spayed or neutered', () => choiceGroup({ name: 'neutered', legend: 'Spayed or neutered?', value: pet.neutered ? 'yes' : 'no', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] })],
    activity: ['Activity', () => choiceGroup({ name: 'activity', legend: 'Activity level', value: pet.activity, options: ACTIVITY })],
    bcs: ['Body shape', () => selectField({ id: 'p-bcs', label: 'Body shape', value: pet.bcs, options: bcsList(pet), hint: 'Feel the ribs and look from above.' })],
    allergies: ['Ingredients to avoid', () => choiceGroup({ name: 'allergies', legend: 'Ingredients to avoid', type: 'checkbox', value: pet.allergies || [], options: ALLERGENS.map((a) => ({ value: a, label: a })) })],
    health: ['Health notes', () => choiceGroup({ name: 'health', legend: 'Anything we should know?', type: 'checkbox', value: pet.health || [], options: HEALTH })],
  }[key];
  if (!F) return;
  openSheet({
    title: F[0],
    body: `<form class="stack" novalidate>${F[1]()}<div class="error-text" role="alert" data-err></div>${button({ label: 'Save', type: 'submit', iconName: 'check', attrs: 'style="width:100%"' })}</form>`,
    onMount(body, close) {
      mountCombos(body);
      if (key === 'breed') bindBreedSize(body, { breedId: 'p-breed', sizeId: 'p-size', lookup: breedSize, labelOf: (id) => SIZE_CATEGORIES.find((s) => s.id === id)?.label || id });
      body.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault(); const f = new FormData(e.target); const err = body.querySelector('[data-err]'); err.textContent = '';
        let patch = {};
        if (key === 'name') { const name = (f.get('p-name') || '').toString().trim(); if (!name) { err.textContent = 'Please give your pet a name.'; return; } patch = { name }; }
        if (key === 'birth') {
          const birth = (f.get('p-birth') || '').toString(); const bd = new Date(birth);
          if (!birth || Number.isNaN(bd.getTime()) || birth > today()) { err.textContent = 'Please enter a date of birth that is not in the future.'; return; }
          if ((Date.now() - bd.getTime()) / (365.25 * 864e5) > 30) { err.textContent = 'That date of birth looks too long ago. Is it right?'; return; }
          patch = { birth };
        }
        if (key === 'breed') { const breed = (f.get('p-breed') || '').toString().trim(); if (breed && !DOG_BREEDS.some((b) => b.name === breed)) { err.textContent = 'Pick a breed from the list, or leave it empty for a mixed breed.'; return; } patch = { breed, sizeCat: f.get('p-size') || pet.sizeCat }; }
        if (key === 'neutered') patch = { neutered: f.get('neutered') !== 'no', answered: { ...(pet.answered || {}), neutered: true } };
        if (key === 'activity') patch = { activity: f.get('activity') || pet.activity, answered: { ...(pet.answered || {}), activity: true } };
        if (key === 'bcs') patch = { bcs: Math.round(Number(f.get('p-bcs') || pet.bcs)), answered: { ...(pet.answered || {}), bcs: true } };
        if (key === 'allergies') patch = { allergies: f.getAll('allergies'), answered: { ...(pet.answered || {}), allergies: true } };
        if (key === 'health') patch = { health: f.getAll('health') };
        updatePet(patch); toast('Saved'); close(); rerender();
      });
    },
  });
}

function viewProfile(pet, plan) {
  const bcsOptions = pet.species === 'dog'
    ? BCS_OPTIONS.map((o) => ({ value: o.score, label: `${o.score}. ${o.label}` }))
    : [{ value: 5, label: 'Healthy weight' }, { value: 6, label: 'A bit heavy' }, { value: 3, label: 'Thin' }];
  const breedField = pet.species === 'dog'
    ? `${comboField({ id: 'p-breed', label: 'Breed', options: DOG_BREEDS.map((b) => b.name), value: pet.breed || '', placeholder: 'Leave empty for mixed breed', hint: 'We use it for the growth curve and usual adult weight.' })}
       ${sizeBlock({ id: 'p-size', label: 'Adult size (used when breed is blank)', value: pet.sizeCat || 'IV', options: SIZE_CATEGORIES.map((s) => ({ value: s.id, label: s.label })) })}` : '';
  return {
    title: `${pet.name}: profile`,
    html: shell(pet, plan, 'profile', `<div class="split split--sidebar"><div class="stack">
      ${profileRows(pet)}
      ${card(`<h2>Details</h2><form id="pform" class="stack" novalidate>
        <div class="grid grid--2">${field({ id: 'p-name', label: 'Name', value: pet.name, attrs: 'autocomplete="off" required' })}${field({ id: 'p-birth', label: 'Date of birth (or an estimate)', type: 'date', value: pet.birth, attrs: `max="${today()}" required` })}</div>
        ${breedField}
        <div class="field"><span class="legend">Current weight</span><p style="margin:0 0 var(--space-2)">${round(pet.weightKg, 1)} kg. To change it, log a new weigh-in.</p>${button({ label: 'Log a new weigh-in', href: '/pet/growth', variant: 'secondary', iconName: 'plus' })}</div>
        ${choiceGroup({ name: 'neutered', legend: 'Spayed or neutered?', value: pet.neutered ? 'yes' : 'no', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] })}
        ${choiceGroup({ name: 'activity', legend: 'Activity level', value: pet.activity, options: [{ value: 'low', label: 'Low', sub: 'mostly resting' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High', sub: 'very active' }] })}
        ${selectField({ id: 'p-bcs', label: 'Body shape', value: pet.bcs, options: bcsOptions, hint: 'Feel the ribs and look from above.' })}
        ${choiceGroup({ name: 'allergies', legend: 'Ingredients to avoid', type: 'checkbox', value: pet.allergies || [], options: ALLERGENS.map((a) => ({ value: a, label: a })) })}
        ${choiceGroup({ name: 'health', legend: 'Anything we should know?', type: 'checkbox', value: pet.health || [], options: [{ value: 'medical', label: 'Medical condition' }, { value: 'joints', label: 'Joint or knee problems' }, { value: 'pregnant', label: 'Pregnant or nursing' }] })}
        <div id="p-err" class="error-text" role="alert"></div>
        <div class="row">${button({ label: 'Save changes', type: 'submit', iconName: 'check' })}</div></form>`, { cls: 'profile-desktop' })}</div>
      <div class="stack">${breedCard(pet, plan)}${card(`<label class="switch"><input type="checkbox" id="remind" ${pet.remind ? 'checked' : ''}><span class="switch__ui" aria-hidden="true"></span><span class="small">Weekly weigh-in reminder email</span></label><p class="hint" style="margin:var(--space-2) 0 0">Reminders start when accounts launch.</p>`, { cls: 'card--tight' })}<button class="btn btn--ghost" id="reset" type="button">${icon('trash')}<span>Remove this pet and start over</span></button></div></div>`),
    mount(root, rerender) {
      bindQuickWeight(root, rerender);
      root.querySelector('#remind')?.addEventListener('change', (e) => { updatePet({ remind: e.target.checked }); toast(e.target.checked ? 'We will remind you by email' : 'Reminders off'); });
      root.querySelectorAll('[data-prow]').forEach((b) => b.addEventListener('click', () => openProfileSheet(b.dataset.prow, pet, rerender)));
      mountCombos(root);
      if (pet.species === 'dog') bindBreedSize(root, { breedId: 'p-breed', sizeId: 'p-size', lookup: breedSize, labelOf: (id) => SIZE_CATEGORIES.find((s) => s.id === id)?.label || id });
      root.querySelector('#pform').addEventListener('submit', (e) => {
        e.preventDefault(); const f = new FormData(e.target); const err = root.querySelector('#p-err'); err.textContent = '';
        const name = (f.get('p-name') || '').toString().trim(); const birth = (f.get('p-birth') || '').toString(); const breed = (f.get('p-breed') || '').toString().trim();
        if (!name) { err.textContent = 'Please give your pet a name.'; return; }
        const bd = new Date(birth); if (!birth || Number.isNaN(bd.getTime()) || birth > today()) { err.textContent = 'Please enter a date of birth that is not in the future.'; return; }
        if ((Date.now() - bd.getTime()) / (365.25 * 864e5) > 30) { err.textContent = 'That date of birth looks too long ago. Is it right?'; return; }
        if (pet.species === 'dog' && breed && !DOG_BREEDS.some((b) => b.name === breed)) { err.textContent = 'Pick a breed from the list, or leave it empty for a mixed breed.'; return; }
        updatePet({ name, birth, breed: pet.species === 'dog' ? breed : '', sizeCat: f.get('p-size') || pet.sizeCat, neutered: f.get('neutered') !== 'no', activity: f.get('activity') || pet.activity, bcs: Math.round(Number(f.get('p-bcs') || pet.bcs)), allergies: f.getAll('allergies'), health: f.getAll('health'), answered: { bcs: true, neutered: true, activity: true, allergies: true } });
        toast('Profile saved'); rerender();
      });
      root.querySelector('#reset')?.addEventListener('click', () => { if (confirm('Remove this pet profile?')) { clearPet(); location.assign('/new'); } });
    },
  };
}

export function render() {
  const pet = getPet(); if (!pet) return needPet();
  const plan = energyPlan(pet); const targets = nutrientTargets(pet);
  const sub = (location.pathname.match(/^\/pet\/(growth|profile|diet)/) || [])[1];
  if (sub === 'diet') return viewDiet(pet, plan);
  if (sub === 'profile') return viewProfile(pet, plan);
  return viewGrowth(pet, plan);
}
