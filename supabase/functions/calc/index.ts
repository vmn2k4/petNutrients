// Supabase Edge Function "calc": runs the shared pet-nutrition calculations (growth, calories, goals, food fit, diet).
// @ts-ignore handler.js is plain JavaScript
import { handle } from './handler.js';
// @ts-ignore catalog.js is plain JavaScript
import { configure } from './catalog.js';

configure({ url: Deno.env.get('SUPABASE_URL') ?? '', key: Deno.env.get('SUPABASE_ANON_KEY') ?? '' });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const out = await handle(await req.json());
    return new Response(JSON.stringify(out), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
