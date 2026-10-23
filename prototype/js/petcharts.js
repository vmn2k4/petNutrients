// Shared chart options for a pet, used by the Growth tab and the goal card on Foods, so both show the same thing.
// `v` is the pet's growth view from calc (growthPageView): the curve, each weigh-in with its percentile, the projection and the diet changes.
import { fmtDay, ordinal, round, todayStr, ageText } from './format.js';

const tipHtml = (rows) => rows.filter(Boolean).map(([k, v]) => `<span><small>${k}</small><strong>${v}</strong></span>`).join('');
// What the tip shows for one weigh-in: date, age, weight and (for growing pets) percentile.
const dotInfo = (v) => (p) => {
  const on = p.on || todayStr(); const pt = v.points.find((x) => x.on === on);
  const pc = v.growing ? (pt ? pt.pct : v.cur) : null; const m = Math.floor(pt ? pt.m : v.nowM);
  return tipHtml([['Date', fmtDay(on)], ['Age', ageText(m)], ['Weight', `${round(p.kg, 1)} kg`], pc && ['Percentile', pc.edge === 'below' ? 'under 2nd' : pc.edge === 'above' ? 'over 98th' : ordinal(pc.value)]]);
};

// One flag per day the diet changed, numbered oldest first (the Diet page uses the same numbers).
const dietMarks = (v, at) => v.dietMarks.map((c, i) => ({ n: v.dietMarks.length - i, date: c.date, label: `${fmtDay(c.date)}: diet change`, ...at(c) }));

// Growing pets get the growth curve; fully grown pets get weight over time.
export const chartKind = (v) => v.kind;

export function growthChartOpts(pet, v) {
  const limit = pet.species === 'cat' ? 21 : 35;
  // each weigh-in at its real age (worked out in days, shown to people only as months), so weeks within a month spread out
  const pts = v.points.map((l) => ({ m: l.m, kg: l.kg, on: l.on })).filter((p) => p.m <= limit);
  const last = pts[pts.length - 1];
  if (!last || Math.abs(last.kg - pet.weightKg) > 0.001) pts.push({ m: v.nowM, kg: pet.weightKg, on: todayStr() });
  const fullMax = pet.species === 'cat' ? 21 : 36; const zoomMax = Math.min(fullMax, Math.max(12, v.ageMonths + 9));
  const canZoom = zoomMax < fullMax; const zoomOn = canZoom && v.ageMonths < 18;
  return { bands: v.bands, projection: v.projection, marks: dietMarks(v, (c) => ({ m: c.m })), points: pts, pointInfo: dotInfo(v), maxMonth: zoomOn ? zoomMax : fullMax, fullMax, zoomMax, canZoom, zoomOn, title: `${pet.name} growth chart`, label: pet.name };
}

export function weightChartOpts(pet, v) {
  const ideal = Math.abs(v.plan.ideal - pet.weightKg) > 0.3 ? v.plan.ideal : null;
  const logs = v.points.length ? v.points.map((l) => ({ on: l.on, kg: l.kg })) : [{ on: todayStr(), kg: pet.weightKg }];
  return { points: logs, pointInfo: dotInfo(v), projection: v.projection, marks: dietMarks(v, (c) => ({ t: new Date(`${c.date}T00:00:00Z`).getTime() })), idealKg: ideal, range: v.breed ? { min: v.breed.min, max: v.breed.max } : null, label: pet.name, title: `${pet.name} weight over time` };
}
