// Node loader for render tests: swaps js/store.js for the stub, and gives the browser globals the screens touch at import time.
export async function resolve(specifier, context, next) {
  if (/(^|\/)store\.js$/.test(specifier)) return { url: new URL('./store-stub.mjs', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}
