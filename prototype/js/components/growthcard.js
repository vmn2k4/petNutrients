// GROWTH CARD: the pet's chart with its percentile, the target picker and the saved goal. One component, used by Home
// and anywhere else a pet's growth is shown. The long forecast and goal history sit in a separate "more" block so the
// card itself stays short.
import { setGoal, clearGoal, getGoalHistory } from '../store.js';
import { calc } from '../calc.js';
import { round, ordinal, fmtDay } from '../format.js';
import { targetPickerHtml, mountTargetPicker } from '../targetpicker.js';
import { toast } from '../sheet.js';
import { card, stat, badge, button, esc, disclosure, KCAL_NOTE } from '../ui.js';

// `v` is the pet's growth view from calc (growthPageView); every number below is read from it.
const GOAL_LABEL = { lose: 'Lose weight', maintain: 'Keep weight steady', gain: 'Gain weight', grow: 'Grow healthy' };
export function growthCardHtml(pet, v, { actions = true } = {}) {
  const months = v.ageMonths;
  const limit = pet.species === 'cat' ? 21 : 35;
  const bands = v.bands;
  if (v.kind === 'weight') {
    return card(`<div class="row row--between"><h2 style="margin:0">Weight over time</h2>${badge('Fully grown', 'info', 'check')}</div>
      <p style="margin-top:var(--space-3)">${esc(pet.name)} is fully grown. Weight is tracked against a healthy range.</p>
      ${targetPickerHtml(pet, v, { actions })}
      `);
  }
  const p = v.cur;
  const label = p.young ? 'too young for the percentile chart, which starts at 12 weeks (this uses the 12-week curve as a rough guide)' : p.edge === 'below' ? 'under 2nd percentile' : p.edge === 'above' ? 'over 98th percentile' : `${ordinal(p.value)} percentile`;
  const flag = p.edge || p.young ? 'caution' : 'good';
  return card(`
    <div class="row row--between"><h2 style="margin:0">Growth chart</h2>${badge(p.edge ? 'Outside typical range' : 'In the typical range', flag, p.edge ? 'alert' : 'check')}</div>
    <p class="growth-sum">${round(pet.weightKg, 1)} kg at ${months} mo · <strong>${label}</strong></p>
    ${targetPickerHtml(pet, v, { actions })}
    ${disclosure('Show the curve as a table', `<div class="table-wrap"><table><thead><tr><th>Month</th><th>2nd</th><th>25th</th><th>50th</th><th>75th</th><th>98th</th></tr></thead><tbody>${bands.filter((r) => r.m % 3 === 0 && r.m <= limit + 1).map((r) => `<tr><td>${r.m}</td><td>${r.p02}</td><td>${r.p25}</td><td>${r.p50}</td><td>${r.p75}</td><td>${r.p98}</td></tr>`).join('')}</tbody></table></div>`)}
  `);
}

// One description of the saved goal for every card: its FIXED date, days left, and progress against the ORIGINAL plan.
const PROGRESS_KIND = { on_track: 'good', ahead: 'good', behind: 'caution', no_data: '' };
function goalSummary(pet, v) {
  if (!v.summary) return null;
  const { goal: g, plan: gp, progress: pr } = v.summary; const label = GOAL_LABEL[g.type].toLowerCase();
  const date = fmtDay(g.targetDate);
  let body;
  if (g.expired) body = `The goal date (${date}) has passed. Set a new goal to keep going.`;
  else if (g.type === 'grow' && !g.custom) body = `Expected about ${round(gp.targetKg, 1)} kg by ${date}. ${g.daysLeft} days left.`;
  else if (g.type === 'maintain') body = `Keep around ${round(g.startKg, 1)} kg until ${date}. ${g.daysLeft} days left, about ${gp.kcal} kcal a day.`;
  else body = `${round(g.startKg, 1)} kg to ${round(g.targetKg, 1)} kg by ${date}. ${g.daysLeft} days left, about ${gp.kcal} kcal a day.`;
  const badges = `${pr ? badge(g.expired ? 'Goal date reached' : pr.text, g.expired ? 'caution' : PROGRESS_KIND[pr.state]) : ''}${gp.pace.state !== 'good' ? badge(gp.pace.text, gp.pace.state) : ''}`;
  return { title: `Goal: ${label}`, body, badges, started: g.startOn, progress: pr, goal: g };
}

const OUTCOME = { replaced: 'Replaced', cleared: 'Cleared', achieved: 'Reached', missed: 'Date passed' };
// Progress against the original plan, and every goal the pet has had by date, so a changed goal is never silent.
const ageWords = (m) => (m < 24 ? `${Math.round(m)} months` : `${(m / 12).toFixed(1).replace(/\.0$/, '')} years`);
// "If nothing changes": where the pet is heading on the track they are on now, and how that compares with their goal.
function projectionCard(pet, v) {
  const note = '<p class="hint" style="margin:var(--space-3) 0 0">An estimate from how similar pets grow and your recent weigh-ins. Real pets vary, so treat it as a guide, not a promise.</p>';
  const f = v.forecast; if (!f) return '';
  if (f.kind === 'growth') {
    const labelOf = { in3: (st) => `In 3 months, at ${ageWords(st.m)}`, at12: () => 'At 12 months', grown: (st) => `Fully grown, about ${ageWords(st.m)}` };
    const stats = f.stats.map((st) => stat(`${round(st.kg, 1)} kg`, labelOf[st.kind](st), `usually ${round(st.lo, 1)} to ${round(st.hi, 1)} kg`)).join('');
    let vs = '';
    if (f.vs) {
      const { at, goalKg, diff, tol, date } = f.vs;
      vs = `<p style="margin:var(--space-4) 0 0">On this track ${esc(pet.name)} would weigh about <strong>${round(at, 1)} kg</strong> by ${fmtDay(date)}. Your goal is <strong>${round(goalKg, 1)} kg</strong>, ${Math.abs(diff) <= tol ? 'so the current track already gets there.' : diff < 0 ? 'which needs a little faster growth than now.' : 'so growth is already ahead of that.'}</p>`;
    }
    return card(`<h2>If nothing changes</h2><p class="muted" style="margin:0 0 var(--space-4)">${esc(pet.name)} is following about the ${ordinal(f.pct)} percentile line. If that continues:</p><div class="grid grid--3">${stats}</div>${vs}${note}`);
  }
  if (f.none) return card(`<h2>If nothing changes</h2><p class="muted" style="margin:0">Log a couple of weigh-ins at least a week apart and we will show where ${esc(pet.name)}'s weight is heading.</p>`);
  const steady = Math.abs(f.perWeek) < 0.1;
  const pace = steady ? 'about steady' : `${f.perWeek > 0 ? 'gaining' : 'losing'} about ${Math.abs(f.perWeek).toFixed(1)} kg a week`;
  let vs = '';
  if (f.vs) vs = `<p style="margin:var(--space-4) 0 0">At this pace ${esc(pet.name)} would weigh about <strong>${f.vs.at} kg</strong> by ${fmtDay(f.vs.date)}. Your goal is <strong>${round(f.vs.goalKg, 1)} kg</strong>, which needs about ${f.vs.need > 0 ? '+' : ''}${f.vs.need.toFixed(1)} kg a week.</p>`;
  return card(`<h2>If nothing changes</h2><p class="muted" style="margin:0 0 var(--space-3)">Recently ${esc(pet.name)} is ${pace}.</p>${stat(`${f.endKg} kg`, `By ${fmtDay(f.endDate)}`, `about ${Math.round(f.days / 7)} weeks from now`)}${vs}${note}`);
}

function goalHistoryCard(pet, v) {
  const gs = goalSummary(pet, v); const hist = getGoalHistory();
  if (!gs && !hist.length) return '';
  const pr = gs?.progress;
  const progress = gs ? `<div class="gprog"><div class="row row--between"><strong>${esc(gs.title)}</strong><span class="small muted">Set ${fmtDay(gs.started)}</span></div>
    <p class="muted" style="margin:var(--space-1) 0 var(--space-2)">${esc(gs.body)}</p><div class="row">${gs.badges}</div>
    ${pr && pr.state !== 'no_data' ? `<p class="small" style="margin:var(--space-3) 0 0">The original plan puts ${esc(pet.name)} at <strong>${pr.plannedKg} kg</strong> today. ${esc(pet.name)} is <strong>${round(pr.actualKg, 1)} kg</strong> (${pr.diffKg > 0 ? '+' : ''}${pr.diffKg} kg).</p>` : `<p class="small muted" style="margin:var(--space-3) 0 0">Log a weigh-in after ${fmtDay(gs.started)} to see how ${esc(pet.name)} is tracking.</p>`}
    ${pr && pr.pctDone != null ? `<div class="gbar" role="img" aria-label="${pr.pctDone} percent of the way to the target"><span style="width:${pr.pctDone}%"></span></div>` : ''}</div>` : '<p class="muted" style="margin:0">No active goal. Set one on the chart above.</p>';
  const rows = hist.map((h) => `<tr><td>${fmtDay(h.startOn)} to ${fmtDay(h.endedOn)}</td><td>${esc(GOAL_LABEL[h.type] || h.type)}: ${round(h.startKg, 1)} to ${round(h.targetKg, 1)} kg by ${fmtDay(h.targetDate)}</td><td>${OUTCOME[h.outcome] || h.outcome}${h.endKg != null ? ` at ${round(h.endKg, 1)} kg` : ''}</td></tr>`).join('');
  return card(`<h2>Goal progress and history</h2>${progress}
    ${hist.length ? `<div class="table-wrap" style="margin-top:var(--space-4)"><table><thead><tr><th>When</th><th>Goal</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
    ${gs ? `<div style="margin-top:var(--space-4)"><a class="btn btn--dark" href="/foods">Find foods for this goal</a></div>` : ''}
    <p class="hint" style="margin:var(--space-3) 0 0">A goal keeps its date. Changing the weight or date starts a new goal, and the old one stays here. ${KCAL_NOTE}</p>`);
}

// Forecast and goal history together, folded away until asked for.
export const growthMoreHtml = (pet, v) => {
  const inner = `${projectionCard(pet, v)}${goalHistoryCard(pet, v)}`.trim();
  return inner ? disclosure('Forecast and goal history', `<div class="stack">${inner}</div>`) : '';
};

// Wire the target picker on a rendered growth card. Saving a goal or clearing it re-renders the screen.
export function mountGrowthCard(root, pet, v, rerender, { save = true } = {}) {
  const growth = v.kind === 'growth' && v.stage === 'growth';
  const goalType = async (d) => (growth ? 'grow' : (await calc('targetCheck', pet, d.days, d.kg)).type);
  const saveGoal = async (d) => setGoal({ type: await goalType(d), targetKg: d.kg, days: d.days, custom: growth ? true : undefined, fromChart: true });
  return mountTargetPicker(root.querySelector('.tpick'), pet, v, {
    feed: true,
    onFind: save ? (d) => { saveGoal(d); } : undefined, // foods are matched to the saved goal, so the target is kept when you go looking
    onClamp: (b) => toast(`Kept within ${b.lo} to ${b.hi} kg`),
    onSave: async (d) => { const g = await saveGoal(d); toast(`Goal set: ${d.kg} kg by ${fmtDay(g.targetDate)}`); rerender(); },
    onClear: async () => { await clearGoal(); toast('Goal cleared. It is kept in your goal history.'); rerender(); },
  });
}
