const fs = require('fs');
const assert = require('assert');
const code = fs.readFileSync(require('path').join(__dirname, '../src/server.js'), 'utf8');
assert(code.includes('Number.isSafeInteger(qty)') && code.includes('validatedCart'),
  'Server must validate checkout quantity before opening a transaction.');
assert(!code.includes('Math.max(1, Math.min(99, Number(item.quantity) || 1))'),
  'Unsafe server-side quantity clamp still exists.');
for (const quantity of [1.5, 0, -2, 100, null, 'abc', undefined, NaN, Infinity]) {
  const n = Number(quantity);
  assert(!Number.isSafeInteger(n) || n < 1 || n > 99, `${String(quantity)} should be invalid`);
}
for (const quantity of [1, 2, 99, '12']) {
  const n = Number(quantity);
  assert(Number.isSafeInteger(n) && n >= 1 && n <= 99, `${quantity} should be valid`);
}
console.log('PASS: checkout quantity guard, boundary cases, and unsafe clamp removal');
