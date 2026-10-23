// FORMAT: display helpers only (units and dates). Nothing here decides anything about a pet; those answers come from calc.js.
export const LB_PER_KG = 2.20462;
export const kgToLb = (kg) => kg * LB_PER_KG;
export const lbToKg = (lb) => lb / LB_PER_KG;
export const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const addDaysStr = (iso, n) => { const t = new Date(`${iso}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
export const fmtDay = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
export const ageText = (months) => (months >= 24 ? `${Math.floor(months / 12)} yr${months % 12 ? ` ${months % 12} mo` : ''}` : `${months} mo`);
export const unitWords = (u, n) => (['g', 'ml', 'tsp', 'tbsp'].includes(u) ? u : (n === 1 ? u : (u === 'piece' ? 'pieces' : `${u}s`)));
export const perDay = (it) => it.amount * it.timesPerDay;
