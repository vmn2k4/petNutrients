// Copies the generated data the calculations read (growth curves, AAFCO, USDA ingredients) into the edge function so it deploys with it.
// domain.js and the other calculation code live in supabase/functions/calc and are the only copy.
// node supabase/functions/build.mjs   (run before `supabase functions deploy calc`)
import { copyFileSync } from 'node:fs';
const src = new URL('../../prototype/js/', import.meta.url);
const dst = new URL('./calc/', import.meta.url);
for (const f of ['reference-data.js', 'ingredients-data.js']) copyFileSync(new URL(f, src), new URL(f, dst));
console.log('copied reference-data.js, ingredients-data.js into supabase/functions/calc');
