const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const ROOT = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const pkg = JSON.parse(read('package.json'));
assert(!pkg.dependencies?.['better-sqlite3'], 'better-sqlite3 must not remain in dependencies');
assert(pkg.dependencies?.mongoose, 'mongoose dependency is required');
assert(!fs.existsSync(path.join(ROOT, 'src', 'db.js')), 'Legacy SQLite src/db.js must be removed');
assert(!fs.existsSync(path.join(ROOT, 'data', 'store.db')), 'Legacy SQLite store.db must be removed');

const server = read('src/server.js');
const seed = read('src/seed.js');
for (const [name, source] of [['server.js', server], ['seed.js', seed]]) {
  assert(!/better-sqlite3|db\.prepare|db\.transaction|SELECT\s+\*\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM/i.test(source), `${name} still contains SQLite/SQL data access`);
}
assert(server.includes("require('./models')"), 'Server must use Mongoose models');
assert(server.includes('await connectMongoDB()'), 'Server must await MongoDB before listening');
assert(server.includes("scriptSrcAttr: [\"'none'\"]"), 'CSP should forbid inline event attributes');
assert(server.includes("app.post('/api/checkout'"), 'Checkout route missing');
assert(server.includes("app.post('/api/discount'"), 'Discount route missing');
assert(server.includes("app.post('/admin/orders/:id/status'"), 'Admin status route missing');
assert(server.includes('GOOGLE_OAUTH_ENABLED'), 'Google OAuth routes should require both client ID and secret');

const appJs = read('public/js/app.js');
assert(appJs.includes("getElementById('addToCartBtn')"), 'Add-to-cart event binding missing');
assert(appJs.includes("getElementById('checkDiscountBtn')"), 'Discount event binding missing');
assert(appJs.includes('.cart-remove-btn'), 'Cart event delegation missing');
assert(appJs.includes("querySelectorAll('.saved-address-btn')"), 'Saved-address click binding missing');
assert(!/onclick=|onchange=|onsubmit=/.test(appJs), 'public/js/app.js still generates inline event handlers');
assert(!/toast\.innerHTML\s*=/.test(appJs), 'Toast messages must use textContent instead of HTML injection');
assert(appJs.includes('escapeHtml(item.image'), 'Cart image URL should be HTML-escaped before rendering');

const viewFiles = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full);
    else if (item.name.endsWith('.ejs')) viewFiles.push(full);
  }
}
walk(path.join(ROOT, 'views'));
for (const file of viewFiles) {
  const source = fs.readFileSync(file, 'utf8');
  assert(!/\son(?:click|change|submit|input)=/i.test(source), `${path.relative(ROOT, file)} still contains inline event attributes`);
  ejs.compile(source, { filename: file });
}

const models = require('../src/models');
const required = ['User','Address','Category','Product','ProductImage','Variant','Review','Discount','Order','OrderItem','OrderStatusHistory','PasswordReset'];
for (const name of required) {
  assert(models[name], `Missing Mongo model: ${name}`);
  assert(models[name].schema.path('id'), `${name} must expose numeric id for existing routes/views`);
}
assert(models.User.schema.path('email').options.unique === true, 'User email should be unique');
assert(models.Product.schema.path('slug').options.unique === true, 'Product slug should be unique');
assert(models.Variant.schema.path('sku').options.unique === true, 'Variant SKU should be unique');
assert(models.Order.schema.path('order_number').options.unique === true, 'Order number should be unique');

console.log(`✓ Static MongoDB verification passed: ${required.length} models, ${viewFiles.length} EJS templates, no SQLite data layer, no inline event handlers.`);
