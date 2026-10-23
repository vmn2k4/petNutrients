import { register } from 'node:module';
register('./loader.mjs', import.meta.url);
const mem = {}; globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
globalThis.location = { search: '', pathname: '/', href: 'http://localhost/' };
globalThis.document = { querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, appendChild() {} }) };
globalThis.window = globalThis;
