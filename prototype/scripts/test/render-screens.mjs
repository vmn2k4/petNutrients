// Renders the signed-in screens in Node against the deployed calc function and checks they produce the numbers.
// node --import ./prototype/scripts/test/register.mjs prototype/scripts/test/render-screens.mjs
import { readFileSync } from 'node:fs';
import { configure, getCatalog } from '../../../supabase/functions/calc/catalog.js';
const cfgText = readFileSync(new URL('../../js/config.js', import.meta.url), 'utf8');
configure({ url: cfgText.match(/SUPABASE_URL = '([^']+)'/)[1], key: cfgText.match(/SUPABASE_ANON_KEY = '([^']+)'/)[1] });
globalThis.__catalog = await getCatalog();
const html = (v) => (typeof v === 'string' ? v : v.html);
let bad = 0;
const check = (name, ok, extra = '') => { if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', name, extra); };
for (const [name, mod, fn] of [['dashboard', '../../js/screens/dashboard.js', 'render'], ['diet', '../../js/screens/dietscreen.js', 'render'], ['profile', '../../js/screens/profile.js', 'render']]) {
  try { const v = await (await import(mod))[fn](); const h = html(v); check(name, h.length > 500 && !/undefined|NaN|\[object/.test(h), `${h.length} chars`); }
  catch (e) { check(name, false, e.message); }
}
// Every screen module has to load (a changed import or a typo shows up here), and the ones that render without a page around them are rendered.
for (const m of ['foods', 'food', 'home', 'scan', 'tools', 'wizard', 'growth', 'guides', 'account', 'toxic-page']) {
  try { await import(`../../js/screens/${m}.js`); check(`load ${m}`, true); } catch (e) { check(`load ${m}`, false, e.message); }
}
for (const [name, fn] of [['growth page', async () => (await import('../../js/screens/growth.js')).render()], ['tools recipe', async () => (await import('../../js/screens/tools.js')).recipe()], ['foods', async () => (await import('../../js/screens/foods.js')).render()], ['food page', async () => (await import('../../js/screens/food.js')).render({ id: globalThis.__catalog.foods.find((f) => f.species === 'dog').id })], ['home', async () => (await import('../../js/screens/home.js')).render()]]) {
  try { const v = await fn(); const h = html(v); check(name, h.length > 300 && !/undefined|NaN|\[object/.test(h), `${h.length} chars`); } catch (e) { check(name, false, e.message); }
}
// The growth card also has to mount: the target picker asks calc for bounds, the check and the retarget.
try {
  const { mountTargetPicker } = await import('../../js/targetpicker.js');
  const { calc } = await import('../../js/calc.js');
  const { pet } = await import('./store-stub.mjs');
  const v = await calc('growthPageView', pet);
  check('growth view', v.bands.length > 5 && v.initial.hi > v.initial.lo && v.points.length === 3, `kind ${v.kind}, target ${v.initial.kg} kg in ${v.initial.days} days`);
  const r = await calc('retarget', pet, v.initial.days, v.initial.kg, 60);
  check('retarget', r.days === 60 && r.kg >= r.lo && r.kg <= r.hi, `${r.kg} kg (${r.lo} to ${r.hi})`);
  const c = await calc('targetCheck', pet, r.days, r.kg);
  check('target check', ['good', 'caution', 'bad'].includes(c.pace.state) && c.kcal > 0, `${c.pace.state}, ${Math.round(c.kcal)} kcal`);
} catch (e) { check('growth card', false, e.message); }
process.exit(bad ? 1 : 0);
