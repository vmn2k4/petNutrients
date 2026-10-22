// Shared chart options for a pet, used by the Growth tab and the goal card on Foods, so both show the same thing.
import { growthBands, ageInMonths, monthsExact, energyPlan, projectGrowth, projectTrend, dietChanges, fmtDay } from './domain.js';

// One flag per day the diet changed, numbered oldest first (the Diet page uses the same numbers).
const dietMarks = (pet, at) => { const ch = dietChanges(pet.diet || []); return ch.map((c, i) => ({ n: ch.length - i, date: c.date, label: `${fmtDay(c.date)}: diet change`, ...at(c.date) })); };
import { DOG_BREEDS } from './reference.js';

// Growing pets get the growth curve; fully grown pets get weight over time.
export const chartKind = (pet) => (ageInMonths(pet.birth) > (pet.species === 'cat' ? 21 : 35) ? 'weight' : 'growth');

export function growthChartOpts(pet) {
  const months = ageInMonths(pet.birth); const limit = pet.species === 'cat' ? 21 : 35;
  // each weigh-in at its real age (worked out in days, shown to people only as months), so weeks within a month spread out
  const pts = (pet.logs || []).slice().sort((a, b) => (a.on < b.on ? -1 : 1)).map((l) => ({ m: monthsExact(pet.birth, l.on), kg: l.kg })).filter((p) => p.m <= limit);
  const last = pts[pts.length - 1];
  if (!last || Math.abs(last.kg - pet.weightKg) > 0.001) pts.push({ m: monthsExact(pet.birth), kg: pet.weightKg });
  const fullMax = pet.species === 'cat' ? 21 : 36; const zoomMax = Math.min(fullMax, Math.max(12, months + 9));
  const canZoom = zoomMax < fullMax; const zoomOn = canZoom && months < 18;
  return { bands: growthBands(pet), projection: projectGrowth(pet), marks: dietMarks(pet, (d) => ({ m: monthsExact(pet.birth, d) })), points: pts, maxMonth: zoomOn ? zoomMax : fullMax, fullMax, zoomMax, canZoom, zoomOn, title: `${pet.name} growth chart`, label: pet.name };
}

export function weightChartOpts(pet) {
  const plan = energyPlan(pet); const b = pet.species === 'dog' && pet.breed ? DOG_BREEDS.find((x) => x.name === pet.breed) : null;
  const ideal = Math.abs(plan.ideal - pet.weightKg) > 0.3 ? plan.ideal : null;
  const logs = pet.logs && pet.logs.length ? pet.logs : [{ on: new Date().toISOString().slice(0, 10), kg: pet.weightKg }];
  return { points: logs, projection: projectTrend(pet), marks: dietMarks(pet, (d) => ({ t: new Date(`${d}T00:00:00Z`).getTime() })), idealKg: ideal, range: b ? { min: b.min, max: b.max } : null, label: pet.name, title: `${pet.name} weight over time` };
}
