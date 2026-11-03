// Browser-side regression tests: no MongoDB, third-party dependencies or real browser needed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const storage = new Map();
const listeners = {};
const discount = { value: '', addEventListener: (type, cb) => { listeners['discount:' + type] = cb; } };
const variantOption = { dataset: { name: 'Standard', price: '1000000', stock: '2' }, text: 'Standard — 1.000.000đ' };
const variant = { options: [variantOption], selectedIndex: 0, value: '1', addEventListener() {} };
const qty = { value: '1' };
const count = { textContent: '' };
const elementMap = { variant, qty, cartCount: count, discount, discountMsg: { textContent: '', style: {} }, checkDiscountBtn: { addEventListener() {} } };
const domListeners = {};
const document = {
  getElementById: id => elementMap[id] || null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: (event, cb) => { domListeners[event] = cb; },
  documentElement: { dataset: {} },
  dispatchEvent: () => {},
};
const localStorage = { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, String(v)) };
let quotePrice = 1000000;
let quoteStock = 2;
const fetch = async (url) => {
  if (url === '/api/discount') return { ok: true, json: async () => ({ valid: true, percent: 5, message: 'OK' }) };
  if (url === '/api/cart/quote') return { ok: true, json: async () => ({ variants: [{ variant_id: 1, product_id: 1, product_name: 'Laptop', variant_name: 'Standard', price: quotePrice, stock: quoteStock }] }) };
  throw new Error(`Unexpected endpoint ${url}`);
};
const context = vm.createContext({ document, window: { innerWidth: 1280 }, location: {}, localStorage, fetch,
  Intl, Number, Math, String, JSON, setTimeout: () => {}, CustomEvent: function () {}, console });
const source = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');
vm.runInContext(source, context, { filename: 'app.js' });
vm.runInContext('showToast = () => {};', context); // don't render browser-only toast elements
const run = code => vm.runInContext(code, context);

(async () => {
  run('addToCart(1,"Laptop","/x.svg")');
  assert.equal(run('cart()[0].stock'), 2, 'Must preserve stock snapshot');
  run('changeQty(0,99)');
  assert.equal(run('cart()[0].quantity'), 2, 'Must not exceed stock when quantity is edited');
  run('changeQty(0,0)');
  assert.equal(run('cart()[0].quantity'), 1, 'Must not accept zero quantity');
  discount.value = 'SAVE5';
  await run('checkDiscount()');
  assert.equal(run('checkoutDiscountPercent'), 5, 'Discount must be active after validation');
  discount.value = 'XXXXX';
  domListeners.DOMContentLoaded();
  listeners['discount:input']();
  assert.equal(run('checkoutDiscountPercent'), 0, 'Editing code must invalidate old discount');
  assert.equal(run('checkedDiscountCode'), '', 'Editing code must reset validated code');
  quotePrice = 1200000;
  const result = await run('syncCartFromServer()');
  assert.equal(result.changed, true, 'Must detect price change');
  assert.equal(run('cart()[0].price'), quotePrice, 'Must use authoritative quote price');
  quoteStock = 0;
  const missingStock = await run('syncCartFromServer()');
  assert.equal(missingStock.unavailable, true, 'Out of stock must be flagged');
  assert.equal(run('cartStockLimit(cart()[0])'), 0, 'Cannot increase stock-zero item');
  console.log('PASS: 7 frontend regressions (stock, quantity, discount, price sync, availability)');
})().catch(error => { console.error('FAIL:', error); process.exitCode = 1; });
