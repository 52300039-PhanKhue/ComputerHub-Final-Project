require('dotenv').config();
const { spawnSync, spawn } = require('child_process');
const path = require('path');
const mongoose = require('mongoose');

const ROOT = path.join(__dirname, '..');
const PORT = 3199;
const BASE = `http://127.0.0.1:${PORT}`;
const TEST_DB = `computerhub_smoke_${process.pid}_${Date.now()}`;

function assert(condition, message) { if (!condition) throw new Error(message); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function get(pathname, cookie = '') {
  return fetch(BASE + pathname, { redirect: 'manual', headers: cookie ? { Cookie: cookie } : {} });
}
function parseCsrf(html, setCookie) {
  const token = html.match(/name="csrf-token" content="([a-f0-9]{64})"/)?.[1];
  const csrfCookie = String(setCookie || '').match(/csrf=([a-f0-9]{64})/)?.[1];
  assert(token && csrfCookie && token === csrfCookie, 'CSRF token/cookie missing');
  return { token, csrfCookie };
}
function authCookieFrom(response) {
  const raw = response.headers.get('set-cookie') || '';
  const value = raw.match(/auth=([^;]+)/)?.[1];
  assert(value, 'Login did not issue auth cookie');
  return value;
}

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required for MongoDB smoke test');
  const commonEnv = { ...process.env, NODE_ENV: 'test', MONGODB_DB_NAME: TEST_DB, MONGODB_TIMEOUT_MS: '12000' };
  const seeded = spawnSync(process.execPath, ['src/seed.js'], { cwd: ROOT, stdio: 'inherit', env: commonEnv });
  assert(seeded.status === 0, 'MongoDB seed failed');

  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...commonEnv, PORT: String(PORT), BASE_URL: BASE, JWT_SECRET: 'test-secret-that-is-long-enough-for-smoke-tests-2026', INSTANCE_ID: 'smoke' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', data => process.stdout.write(data));
  child.stderr.on('data', data => process.stderr.write(data));

  let models;
  try {
    let healthy = false;
    for (let i = 0; i < 60; i++) {
      try {
        const r = await get('/health');
        if (r.ok) {
          const health = await r.json();
          if (health.mongoReady) { healthy = true; break; }
        }
      } catch {}
      await sleep(250);
    }
    assert(healthy, 'Server did not become healthy with MongoDB');

    await mongoose.connect(process.env.MONGODB_URI, { dbName: TEST_DB, serverSelectionTimeoutMS: 12000 });
    models = require('../src/models');
    const { Product, Variant, Review, User, Order, OrderStatusHistory } = models;

    for (const pathname of ['/', '/products', '/products/astrabook-pro-14', '/login', '/checkout']) {
      const r = await get(pathname);
      assert(r.status === 200, `${pathname} expected 200, got ${r.status}`);
      const html = await r.text();
      assert(html.includes('ComputerHub') || html.includes('COMPUTER'), `${pathname} did not render ComputerHub HTML`);
      assert(!html.includes('undefined'), `${pathname} rendered an undefined value`);
    }

    const home = await fetch(BASE + '/');
    assert(home.headers.get('x-content-type-options') === 'nosniff', 'Helmet X-Content-Type-Options missing');
    const csp = home.headers.get('content-security-policy') || '';
    assert(csp.includes("default-src 'self'"), 'Content-Security-Policy missing');
    assert(csp.includes("script-src-attr 'none'"), 'Inline event attributes should be blocked by CSP');
    const homeHtml = await home.text();
    const { token, csrfCookie } = parseCsrf(homeHtml, home.headers.get('set-cookie'));
    const anonymousCookie = `csrf=${csrfCookie}`;

    const discount = await fetch(BASE + '/api/discount', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token, Cookie: anonymousCookie }, body: JSON.stringify({ code: 'SAVE5' })
    });
    const discountData = await discount.json();
    assert(discount.status === 200 && discountData.valid === true && Number(discountData.percent) === 5, 'SAVE5 should be valid 5%');

    const product = await Product.findOne({ slug: 'astrabook-pro-14' }).lean();
    assert(product?.id, 'Seeded product missing');
    const guestRating = await fetch(`${BASE}/products/${product.id}/reviews`, {
      method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: anonymousCookie },
      body: new URLSearchParams({ _csrf: token, guest_name: 'Smoke Guest', comment: 'Guest rating should be rejected', rating: '5' })
    });
    assert(guestRating.status === 401, `Guest star rating expected 401, got ${guestRating.status}`);
    const guestComment = await fetch(`${BASE}/products/${product.id}/reviews`, {
      method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: anonymousCookie },
      body: new URLSearchParams({ _csrf: token, guest_name: 'Smoke Guest', comment: 'Smoke guest comment without rating' })
    });
    assert(guestComment.status === 302, `Guest comment expected redirect, got ${guestComment.status}`);
    assert(await Review.exists({ product_id: product.id, guest_name: 'Smoke Guest', rating: null }), 'Guest comment was not stored in MongoDB');

    const variant = await Variant.findOne({ stock: { $gt: 0 } }).sort({ id: 1 }).lean();
    assert(variant?.id, 'No in-stock variant available');
    // Authoritative quote is checked before the order is created.
    const quote = await fetch(BASE + '/api/cart/quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token, Cookie: anonymousCookie },
      body: JSON.stringify({ variant_ids: [variant.id] })
    });
    const quoteData = await quote.json();
    assert(quote.status === 200 && quoteData.variants.some(v => v.variant_id === variant.id && v.price === variant.price), 'Cart quote price must match MongoDB');
    const guestEmail = `smoke-${Date.now()}@example.test`;
    const checkout = await fetch(BASE + '/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token, Cookie: anonymousCookie },
      body: JSON.stringify({ full_name: 'Smoke Checkout', email: guestEmail, phone: '0901234567', address: '123 Smoke Test Street, Nha Trang', payment_method: 'COD', discount_code: 'SAVE5', cart: [{ variant_id: variant.id, quantity: 1, price: variant.price }] })
    });
    if (checkout.status !== 200) throw new Error(`Guest checkout expected 200, got ${checkout.status}: ${await checkout.text()}`);
    const checkoutData = await checkout.json();
    const createdUser = await User.findOne({ email: guestEmail }).lean();
    const createdOrder = await Order.findOne({ order_number: checkoutData.order_number }).lean();
    assert(createdUser && createdOrder && createdOrder.user_id === createdUser.id, 'Guest account/order linkage failed');
    assert(createdOrder.discount_amount > 0 && createdOrder.discount_code === 'SAVE5', 'Discount was not persisted on order');
    assert(await OrderStatusHistory.exists({ order_id: createdOrder.id, status: 'pending' }), 'Initial status history missing');

    // Regression: malformed quantity must be rejected without creating an order,
    // creating a guest user or changing stock (formerly 1.5 was accepted).
    for (const [i, invalidQty] of [1.5, 0, -2, 100, 'abc', null].entries()) {
      const badEmail = `smoke-badqty-${Date.now()}-${i}@example.test`;
      const ordersBefore = await Order.countDocuments();
      const stockBefore = (await Variant.findOne({ id: variant.id }).lean()).stock;
      const badResponse = await fetch(BASE + '/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token, Cookie: anonymousCookie },
        body: JSON.stringify({ full_name: 'Invalid Quantity', email: badEmail,
          phone: '0901234567', address: '123 Smoke Test Street, Nha Trang',
          payment_method: 'COD', cart: [{ variant_id: variant.id, quantity: invalidQty, price: variant.price }] })
      });
      assert(badResponse.status === 400, `Quantity ${JSON.stringify(invalidQty)} must be rejected, got ${badResponse.status}`);
      assert(await Order.countDocuments() === ordersBefore, 'Invalid quantity created an order');
      assert(!(await User.exists({ email: badEmail })), 'Invalid quantity created a user');
      assert((await Variant.findOne({ id: variant.id }).lean()).stock === stockBefore,
        'Invalid quantity changed inventory');
    }

    // Price changed while customer was shopping: reject stale displayed total without creating an order.
    const ordersBeforeStale = await Order.countDocuments();
    const staleResponse = await fetch(BASE + '/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token, Cookie: anonymousCookie },
      body: JSON.stringify({ full_name: 'Stale Price', email: `stale-${Date.now()}@example.test`,
        phone: '0901234567', address: '123 Smoke Test Street, Nha Trang', payment_method: 'COD',
        cart: [{ variant_id: variant.id, quantity: 1, price: variant.price - 1 }] })
    });
    assert(staleResponse.status === 400, `Stale price expected 400, got ${staleResponse.status}`);
    assert(await Order.countDocuments() === ordersBeforeStale, 'Stale price must not create an order');

    const loginPage = await fetch(BASE + '/login');
    const loginHtml = await loginPage.text();
    const loginCsrf = parseCsrf(loginHtml, loginPage.headers.get('set-cookie'));
    const loginResponse = await fetch(BASE + '/login', {
      method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: `csrf=${loginCsrf.csrfCookie}` },
      body: new URLSearchParams({ _csrf: loginCsrf.token, email: 'admin@computerhub.vn', password: 'Admin@123456' })
    });
    assert(loginResponse.status === 302, `Admin login expected 302, got ${loginResponse.status}`);
    const auth = authCookieFrom(loginResponse);
    const adminCookie = `csrf=${loginCsrf.csrfCookie}; auth=${auth}`;
    assert((await get('/admin', adminCookie)).status === 200, 'Authenticated /admin expected 200');
    assert((await get('/admin')).status === 403, 'Anonymous /admin expected 403');

    const archiveProduct = await Product.findOne({ active: true }).sort({ id: -1 }).lean();
    const archive = await fetch(`${BASE}/admin/products/${archiveProduct.id}/delete`, {
      method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: adminCookie }, body: new URLSearchParams({ _csrf: loginCsrf.token })
    });
    assert(archive.status === 302, 'Product archive expected redirect');
    assert((await Product.findOne({ id: archiveProduct.id }).lean()).active === false, 'Product was not archived in MongoDB');
    assert((await get(`/products/${archiveProduct.slug}`)).status === 404, 'Archived product should be hidden');
    const restore = await fetch(`${BASE}/admin/products/${archiveProduct.id}/restore`, {
      method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: adminCookie }, body: new URLSearchParams({ _csrf: loginCsrf.token })
    });
    assert(restore.status === 302 && (await Product.findOne({ id: archiveProduct.id }).lean()).active === true, 'Product restore failed');

    const statusUpdate = await fetch(`${BASE}/admin/orders/${createdOrder.id}/status`, {
      method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: adminCookie },
      body: new URLSearchParams({ _csrf: loginCsrf.token, status: 'confirmed' })
    });
    assert(statusUpdate.status === 302, 'Order status update expected redirect');
    assert((await Order.findOne({ id: createdOrder.id }).lean()).status === 'confirmed', 'Order status did not update');
    assert(await OrderStatusHistory.exists({ order_id: createdOrder.id, status: 'confirmed' }), 'Confirmed status history missing');

    assert((await get('/products?page=2&sort=price_asc')).status === 200, 'Catalog page 2 should render');
    assert((await get('/definitely-not-a-real-page')).status === 404, 'Unknown route should return 404');
    console.log('\n✓ MongoDB V6 smoke test passed: rendering, pagination, CSP/Helmet, CSRF, discount, reviews, guest checkout, Mongo persistence, admin guard, archive/restore, order status history, 404.');
  } finally {
    child.kill('SIGTERM');
    await sleep(300);
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.dropDatabase();
        await mongoose.disconnect();
      }
    } catch (error) {
      console.error('Smoke cleanup warning:', error.message);
    }
  }
})().catch(error => { console.error('\n✗ MongoDB smoke test failed:', error.message); process.exitCode = 1; });
