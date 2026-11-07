require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const nodemailer = require('nodemailer');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const connectMongoDB = require('./mongodb');
const {
  mongoose, User, Address, Category, Product, ProductImage, Variant, Review, Discount,
  Order, OrderItem, OrderStatusHistory, PasswordReset, nextId
} = require('./models');

const app = express();
const server = http.createServer(app);


if (process.env.VERCEL) {
  app.use(async (req, res, next) => {
    try {
      await connectMongoDB();
      next();
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      res.status(503).json({
        ok: false,
        mongoReady: false,
        message: 'Không thể kết nối cơ sở dữ liệu.'
      });
    }
  });
}



const io = new Server(server);
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const POINT_VALUE_VND = 1000;
const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE_SECURE = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : IS_PROD;
const INSTANCE_ID = process.env.INSTANCE_ID || 'local';
const GOOGLE_OAUTH_ENABLED = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (IS_PROD && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('replace_'))) {
  throw new Error('Production requires JWT_SECRET with at least 32 characters.');
}

app.set('view engine', 'ejs');
app.set('trust proxy', 1);
app.set('views', path.join(__dirname, '..', 'views'));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"]
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/vendor/chartjs', express.static(path.join(__dirname, '..', 'node_modules', 'chart.js', 'dist')));
app.use(passport.initialize());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: 'draft-7', legacyHeaders: false });
const authCookieOptions = { httpOnly: true, sameSite: 'lax', secure: COOKIE_SECURE, maxAge: 7 * 86400000, path: '/' };
const csrfCookieOptions = { httpOnly: true, sameSite: 'strict', secure: COOKIE_SECURE, path: '/' };
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sameToken = (a, b) => {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
};
app.use((req, res, next) => {
  let token = req.cookies.csrf;
  if (!/^[a-f0-9]{64}$/.test(String(token || ''))) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf', token, csrfCookieOptions);
  }
  res.locals.csrfToken = token;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const sent = req.get('x-csrf-token') || req.body?._csrf;
    if (!sameToken(token, sent)) {
      if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'Phiên biểu mẫu không hợp lệ. Hãy tải lại trang và thử lại.' });
      return res.status(403).send('CSRF validation failed. Reload the page and try again.');
    }
  }
  next();
});
app.use((req, res, next) => { res.setHeader('X-ComputerHub-Instance', INSTANCE_ID); next(); });

const money = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0)) + 'đ';
const safe = s => String(s || '').replace(/[<>]/g, '');
const cleanEmail = s => String(s || '').trim().toLowerCase();
const slugify = s => safe(s).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const validPhone = s => /^[0-9+().\-\s]{7,20}$/.test(String(s || '').trim());
const safeRedirect = value => {
  const next = String(value || '');
  return next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/';
};
const descriptionHasFiveLines = value => String(value || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean).length >= 5;
const hashResetToken = token => crypto.createHash('sha256').update(String(token || '')).digest('hex');
const setFlash = (res, message) => res.cookie('flash', message, { maxAge: 8000, sameSite: 'lax' });
const dateTime = value => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
};
const escapeRegExp = value => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const bool = value => Boolean(value);

function signUser(user) {
  return jwt.sign({ id: Number(user.id), role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}
async function getCurrentUser(req) {
  try {
    if (!req.cookies.auth) return null;
    const payload = jwt.verify(req.cookies.auth, JWT_SECRET);
    return await User.findOne({ id: Number(payload.id) }).select('id email full_name role banned loyalty_points').lean();
  } catch {
    return null;
  }
}
const requireUser = asyncRoute(async (req, res, next) => {
  const user = await getCurrentUser(req);
  if (!user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  if (user.banned) return res.status(403).send('Account banned');
  req.user = user;
  next();
});
const requireAdmin = asyncRoute(async (req, res, next) => {
  const user = await getCurrentUser(req);
  if (!user || user.role !== 'admin') return res.status(403).send('Admin only');
  req.user = user;
  next();
});
function orderReceiptToken(order) {
  return jwt.sign({ orderId: order.id, number: order.order_number, kind: 'receipt' }, JWT_SECRET, { expiresIn: '30m' });
}
function verifyReceipt(number, token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.kind === 'receipt' && payload.number === number ? payload : null;
  } catch {
    return null;
  }
}

app.use(asyncRoute(async (req, res, next) => {
  res.locals.user = await getCurrentUser(req);
  res.locals.money = money;
  res.locals.dateTime = dateTime;
  res.locals.path = req.path;
  res.locals.flash = req.cookies.flash || '';
  res.locals.POINT_VALUE_VND = POINT_VALUE_VND;
  res.locals.googleOAuthEnabled = GOOGLE_OAUTH_ENABLED;
  if (req.cookies.flash) res.clearCookie('flash');
  next();
}));

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = cleanEmail(profile.emails?.[0]?.value);
      if (!email || !validator.isEmail(email)) return done(new Error('Google account did not provide a valid email.'));
      let user = await User.findOne({ $or: [{ google_id: profile.id }, { email }] });
      if (!user) {
        user = await User.create({ id: await nextId('users'), email, full_name: profile.displayName || email, google_id: profile.id });
      } else if (!user.google_id) {
        user.google_id = profile.id;
        await user.save();
      }
      if (user.banned) return done(null, false);
      done(null, user.toObject());
    } catch (error) {
      done(error);
    }
  }));
}

async function decorateProducts(products) {
  if (!products.length) return [];
  const ids = products.map(p => Number(p.id));
  const categoryIds = [...new Set(products.map(p => Number(p.category_id)))];
  const [categories, images, ratings] = await Promise.all([
    Category.find({ id: { $in: categoryIds } }).lean(),
    ProductImage.find({ product_id: { $in: ids } }).sort({ id: 1 }).lean(),
    Review.aggregate([
      { $match: { product_id: { $in: ids } } },
      { $group: { _id: '$product_id', rating: { $avg: '$rating' }, review_count: { $sum: 1 } } }
    ])
  ]);
  const catMap = new Map(categories.map(c => [c.id, c]));
  const imageMap = new Map();
  for (const image of images) if (!imageMap.has(image.product_id)) imageMap.set(image.product_id, image.url);
  const ratingMap = new Map(ratings.map(r => [r._id, { rating: Number(r.rating || 0), review_count: Number(r.review_count || 0) }]));
  return products.map(product => {
    const category = catMap.get(product.category_id) || {};
    const rating = ratingMap.get(product.id) || { rating: 0, review_count: 0 };
    return { ...product, category_name: category.name || '', category_slug: category.slug || '', image: imageMap.get(product.id) || '/images/products/placeholder-1.svg', ...rating };
  });
}
async function ratingSummary(productId) {
  const rows = await Review.aggregate([
    { $match: { product_id: Number(productId), rating: { $ne: null } } },
    { $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$rating' } } }
  ]);
  return rows[0] ? { count: rows[0].count, average: Number(rows[0].average || 0) } : { count: 0, average: 0 };
}
async function reviewsForProduct(productId) {
  const reviews = await Review.find({ product_id: Number(productId) }).sort({ created_at: -1 }).lean();
  const userIds = [...new Set(reviews.map(r => r.user_id).filter(Boolean))];
  const users = await User.find({ id: { $in: userIds } }).select('id full_name').lean();
  const userMap = new Map(users.map(u => [u.id, u.full_name]));
  return reviews.map(r => ({ ...r, reviewer: (r.user_id && userMap.get(r.user_id)) || r.guest_name || 'Guest' }));
}

/* ------------------------------ CUSTOMER STORE ------------------------------ */
app.get('/', asyncRoute(async (req, res) => {
  const [newRaw, bestRaw, categoryRows] = await Promise.all([
    Product.find({ active: true, is_new: true }).sort({ created_at: -1, id: -1 }).limit(8).lean(),
    Product.find({ active: true }).sort({ sold_count: -1, id: -1 }).limit(8).lean(),
    Category.find().sort({ name: 1 }).lean()
  ]);
  const [newProducts, best] = await Promise.all([decorateProducts(newRaw), decorateProducts(bestRaw)]);
  const counts = await Product.aggregate([{ $match: { active: true } }, { $group: { _id: '$category_id', count: { $sum: 1 } } }]);
  const countMap = new Map(counts.map(x => [x._id, x.count]));
  const categories = categoryRows.map(c => ({ ...c, product_count: countMap.get(c.id) || 0 }));
  const categorySections = [];
  for (const slug of ['laptops', 'monitors', 'storage']) {
    const category = categoryRows.find(c => c.slug === slug);
    if (!category) continue;
    const raw = await Product.find({ active: true, category_id: category.id }).sort({ sold_count: -1, id: -1 }).limit(4).lean();
    categorySections.push({ category, products: await decorateProducts(raw) });
  }
  res.render('home', { newProducts, best, categories, categorySections });
}));

app.get('/products', asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const per = 8;
  const q = String(req.query.q || '').trim();
  const brand = String(req.query.brand || '').trim();
  const categorySlug = String(req.query.category || '').trim();
  const min = Math.max(0, Number(req.query.min) || 0);
  const maxRaw = Number(req.query.max);
  const max = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : 999999999;
  const rating = Math.max(0, Number(req.query.rating) || 0);
  const filter = { active: true, base_price: { $gte: min, $lte: max } };
  if (q) {
    const rx = new RegExp(escapeRegExp(q), 'i');
    filter.$or = [{ name: rx }, { short_description: rx }, { brand: rx }];
  }
  if (brand) filter.brand = brand;
  if (categorySlug) {
    const category = await Category.findOne({ slug: categorySlug }).lean();
    if (!category) filter.category_id = -1;
    else filter.category_id = category.id;
  }
  let products = await decorateProducts(await Product.find(filter).lean());
  if (rating) products = products.filter(p => Number(p.rating || 0) >= rating);
  const sort = String(req.query.sort || 'name_asc');
  products.sort((a, b) => {
    if (sort === 'name_asc') return a.name.localeCompare(b.name, 'vi');
    if (sort === 'name_desc') return b.name.localeCompare(a.name, 'vi');
    if (sort === 'price_asc') return a.base_price - b.base_price;
    if (sort === 'price_desc') return b.base_price - a.base_price;
    return new Date(b.created_at) - new Date(a.created_at) || b.id - a.id;
  });
  const total = products.length;
  const pageProducts = products.slice((page - 1) * per, page * per);
  const [categories, brandRows] = await Promise.all([
    Category.find().sort({ name: 1 }).lean(),
    Product.distinct('brand', { active: true })
  ]);
  res.render('products', {
    products: pageProducts,
    page,
    pages: Math.max(1, Math.ceil(total / per)),
    total,
    filters: req.query,
    categories,
    brands: brandRows.sort((a, b) => a.localeCompare(b, 'vi')).map(x => ({ brand: x }))
  });
}));

app.get('/products/:slug', asyncRoute(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, active: true }).lean();
  if (!product) return res.status(404).render('404');
  const category = await Category.findOne({ id: product.category_id }).lean();
  product.category_name = category?.name || '';
  product.category_slug = category?.slug || '';
  product.images = await ProductImage.find({ product_id: product.id }).sort({ id: 1 }).lean();
  product.variants = await Variant.find({ product_id: product.id }).sort({ price: 1 }).lean();
  const [reviews, summary, relatedRaw] = await Promise.all([
    reviewsForProduct(product.id),
    ratingSummary(product.id),
    Product.find({ active: true, category_id: product.category_id, id: { $ne: product.id } }).sort({ sold_count: -1 }).limit(4).lean()
  ]);
  res.render('product-detail', { product, reviews, ratingSummary: summary, related: await decorateProducts(relatedRaw) });
}));

app.post('/products/:id/reviews', asyncRoute(async (req, res) => {
  const user = await getCurrentUser(req);
  const productId = Number(req.params.id);
  const comment = safe(req.body.comment).trim().slice(0, 1200);
  const rating = req.body.rating ? Number(req.body.rating) : null;
  const product = await Product.findOne({ id: productId, active: true }).lean();
  if (!product) return res.status(404).render('404');
  if (!comment) return res.status(400).send('Comment required');
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return res.status(400).send('Invalid rating');
  if (rating !== null && !user) return res.status(401).send('Login is required to rate with stars');
  const guestName = user ? null : safe(req.body.guest_name || 'Guest').slice(0, 80);
  const doc = await Review.create({ id: await nextId('reviews'), product_id: productId, user_id: user?.id || null, guest_name: guestName, comment, rating });
  const review = { ...doc.toObject(), reviewer: user?.full_name || guestName || 'Guest' };
  const summary = await ratingSummary(productId);
  io.to(`product:${productId}`).emit('review:new', { review, ratingSummary: summary });
  setFlash(res, 'Cảm ơn bạn! Bình luận đã được đăng.');
  res.redirect(req.get('referer') || '/products');
}));
io.on('connection', socket => socket.on('product:join', id => socket.join(`product:${Number(id)}`)));

/* ------------------------------ AUTH & PROFILE ------------------------------ */
app.get('/register', (req, res) => res.render('auth', { mode: 'register' }));
app.post('/register', authLimiter, asyncRoute(async (req, res) => {
  const email = cleanEmail(req.body.email);
  const fullName = safe(req.body.full_name).trim();
  const address = safe(req.body.address).trim();
  if (!validator.isEmail(email) || fullName.length < 2 || !address) {
    return res.status(400).render('auth', { mode: 'register', error: 'Theo yêu cầu bài, hãy nhập email, họ tên và địa chỉ giao hàng.' });
  }
  if (await User.exists({ email })) return res.status(400).render('auth', { mode: 'register', error: 'Email này đã tồn tại.' });
  const user = await User.create({ id: await nextId('users'), email, full_name: fullName, password_hash: null });
  await Address.create({ id: await nextId('addresses'), user_id: user.id, label: 'Nhà riêng', recipient_name: fullName, phone: '', address_line: address, is_default: true });
  res.cookie('auth', signUser(user), authCookieOptions);
  setFlash(res, 'Tạo tài khoản thành công. Hãy đặt mật khẩu trong phần Bảo mật trước khi đăng xuất.');
  res.redirect('/profile');
}));
app.get('/login', (req, res) => res.render('auth', { mode: 'login' }));
app.post('/login', authLimiter, asyncRoute(async (req, res) => {
  const email = cleanEmail(req.body.email);
  const user = await User.findOne({ email }).lean();
  if (!user || !user.password_hash || !bcrypt.compareSync(req.body.password || '', user.password_hash) || user.banned) {
    return res.status(401).render('auth', { mode: 'login', error: 'Email/mật khẩu không đúng hoặc tài khoản đã bị khóa.' });
  }
  res.cookie('auth', signUser(user), authCookieOptions);
  res.redirect(safeRedirect(req.query.next));
}));
app.post('/logout', (req, res) => { res.clearCookie('auth', { path: '/' }); res.redirect('/'); });
app.get('/auth/google', (req, res, next) => GOOGLE_OAUTH_ENABLED
  ? passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
  : res.status(503).send('Google OAuth is not configured in .env'));
app.get('/auth/google/callback', (req, res, next) => GOOGLE_OAUTH_ENABLED
  ? passport.authenticate('google', { session: false, failureRedirect: '/login' })(req, res, () => {
      res.cookie('auth', signUser(req.user), authCookieOptions);
      res.redirect('/');
    })
  : next());

function mailTransporter() {
  if (!process.env.SMTP_HOST) return null;
  const options = { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT || 587) === 465 };
  if (process.env.SMTP_USER) options.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' };
  return nodemailer.createTransport(options);
}
async function sendPasswordResetEmail(user, token) {
  const transporter = mailTransporter();
  if (!transporter) return false;
  const link = `${BASE_URL}/reset-password/${token}`;
  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'ComputerHub <no-reply@computerhub.vn>',
    to: user.email,
    subject: 'ComputerHub - đặt lại mật khẩu',
    text: `Xin chào ${user.full_name},\n\nMở liên kết sau trong 30 phút để đặt lại mật khẩu:\n${link}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`
  });
  return true;
}

app.get('/forgot-password', (req, res) => res.render('forgot', { token: null }));
app.post('/forgot-password', authLimiter, asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: cleanEmail(req.body.email) }).lean();
  if (user) {
    await PasswordReset.updateMany({ user_id: user.id, used: false }, { $set: { used: true } });
    const token = crypto.randomBytes(32).toString('hex');
    await PasswordReset.create({ id: await nextId('password_resets'), user_id: user.id, token: hashResetToken(token), expires_at: new Date(Date.now() + 30 * 60000) });
    try {
      const mailed = await sendPasswordResetEmail(user, token);
      if (!mailed && !IS_PROD) console.log(`Password reset link (development only): ${BASE_URL}/reset-password/${token}`);
    } catch (error) {
      console.error('Password reset email failed:', error.message);
    }
  }
  res.render('forgot', { token: null, message: 'Nếu email tồn tại, hệ thống đã gửi liên kết khôi phục. Khi chạy Docker, mở Mailpit tại http://localhost:8025 để xem email demo.' });
}));
app.get('/reset-password/:token', (req, res) => res.render('forgot', { token: req.params.token }));
app.post('/reset-password/:token', authLimiter, asyncRoute(async (req, res) => {
  const row = await PasswordReset.findOne({ token: hashResetToken(req.params.token), used: false, expires_at: { $gt: new Date() } }).lean();
  if (!row || String(req.body.password || '').length < 8) return res.status(400).send('Invalid/expired token or password too short');
  await Promise.all([
    User.updateOne({ id: row.user_id }, { $set: { password_hash: bcrypt.hashSync(req.body.password, 12) } }),
    PasswordReset.updateOne({ id: row.id }, { $set: { used: true } })
  ]);
  setFlash(res, 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.');
  res.redirect('/login');
}));

app.get('/profile', requireUser, asyncRoute(async (req, res) => {
  const [profile, addresses, orders] = await Promise.all([
    User.findOne({ id: req.user.id }).lean(),
    Address.find({ user_id: req.user.id }).sort({ is_default: -1, id: -1 }).lean(),
    Order.find({ user_id: req.user.id }).sort({ created_at: -1 }).lean()
  ]);
  const orderIds = orders.map(o => o.id);
  const items = await OrderItem.find({ order_id: { $in: orderIds } }).sort({ id: 1 }).lean();
  const itemMap = new Map();
  for (const item of items) {
    if (!itemMap.has(item.order_id)) itemMap.set(item.order_id, []);
    itemMap.get(item.order_id).push({ product_name: item.product_name, variant_name: item.variant_name, quantity: item.quantity });
  }
  orders.forEach(order => { order.items = itemMap.get(order.id) || []; });
  res.render('profile', { profile, addresses, orders, hasPassword: Boolean(profile.password_hash) });
}));
app.post('/profile', requireUser, asyncRoute(async (req, res) => {
  const fullName = safe(req.body.full_name).trim();
  const email = cleanEmail(req.body.email);
  if (fullName.length < 2 || !validator.isEmail(email)) {
    setFlash(res, 'Thông tin chưa hợp lệ.');
    return res.redirect('/profile');
  }
  const existing = await User.findOne({ email, id: { $ne: req.user.id } }).lean();
  if (existing) setFlash(res, 'Email đã được tài khoản khác sử dụng.');
  else {
    await User.updateOne({ id: req.user.id }, { $set: { full_name: fullName, email } });
    setFlash(res, 'Đã cập nhật thông tin cá nhân.');
  }
  res.redirect('/profile');
}));
app.post('/profile/password', requireUser, asyncRoute(async (req, res) => {
  const user = await User.findOne({ id: req.user.id }).lean();
  if (user.password_hash && !bcrypt.compareSync(req.body.current_password || '', user.password_hash)) {
    setFlash(res, 'Mật khẩu hiện tại không đúng.');
    return res.redirect('/profile');
  }
  if ((req.body.new_password || '').length < 8) {
    setFlash(res, 'Mật khẩu mới phải có ít nhất 8 ký tự.');
    return res.redirect('/profile');
  }
  await User.updateOne({ id: user.id }, { $set: { password_hash: bcrypt.hashSync(req.body.new_password, 12) } });
  setFlash(res, user.password_hash ? 'Đổi mật khẩu thành công.' : 'Đã tạo mật khẩu đăng nhập cho tài khoản.');
  res.redirect('/profile');
}));
app.post('/profile/addresses', requireUser, asyncRoute(async (req, res) => {
  const recipient = safe(req.body.recipient_name).trim();
  const phone = safe(req.body.phone).trim();
  const addressLine = safe(req.body.address_line).trim();
  if (recipient.length < 2 || !validPhone(phone) || addressLine.length < 8) {
    setFlash(res, 'Địa chỉ hoặc số điện thoại chưa hợp lệ.');
    return res.redirect('/profile');
  }
  if (req.body.is_default) await Address.updateMany({ user_id: req.user.id }, { $set: { is_default: false } });
  await Address.create({ id: await nextId('addresses'), user_id: req.user.id, label: safe(req.body.label || 'Địa chỉ').trim().slice(0, 60), recipient_name: recipient, phone, address_line: addressLine, is_default: Boolean(req.body.is_default) });
  setFlash(res, 'Đã thêm địa chỉ giao hàng.');
  res.redirect('/profile');
}));
app.post('/profile/addresses/:id/default', requireUser, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const address = await Address.findOne({ id, user_id: req.user.id }).lean();
  if (address) {
    await Address.updateMany({ user_id: req.user.id }, { $set: { is_default: false } });
    await Address.updateOne({ id, user_id: req.user.id }, { $set: { is_default: true } });
    setFlash(res, 'Đã đặt địa chỉ mặc định.');
  }
  res.redirect('/profile');
}));
app.post('/profile/addresses/:id/delete', requireUser, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const address = await Address.findOne({ id, user_id: req.user.id }).lean();
  if (address) {
    await Address.deleteOne({ id, user_id: req.user.id });
    if (address.is_default) {
      const replacement = await Address.findOne({ user_id: req.user.id }).sort({ id: -1 }).lean();
      if (replacement) await Address.updateOne({ id: replacement.id, user_id: req.user.id }, { $set: { is_default: true } });
    }
    setFlash(res, 'Đã xóa địa chỉ.');
  } else {
    setFlash(res, 'Địa chỉ không tồn tại.');
  }
  res.redirect('/profile');
}));

/* ------------------------------ CART / CHECKOUT ----------------------------- */
app.get('/cart', (req, res) => res.render('cart'));
app.get('/checkout', asyncRoute(async (req, res) => {
  const user = await getCurrentUser(req);
  const addresses = user ? await Address.find({ user_id: user.id }).sort({ is_default: -1, id: -1 }).lean() : [];
  const defaultAddress = addresses.find(a => a.is_default) || addresses[0] || null;
  res.render('checkout', { addresses, defaultAddress });
}));
app.post('/api/discount', asyncRoute(async (req, res) => {
  const code = String(req.body.code || '').toUpperCase().trim();
  const discount = await Discount.findOne({ code }).lean();
  if (!discount || discount.used_count >= discount.max_uses) return res.json({ valid: false, percent: 0, message: 'Mã không hợp lệ hoặc đã hết lượt sử dụng.' });
  res.json({ valid: true, code: discount.code, percent: discount.percent_off, message: `Áp dụng thành công: giảm ${discount.percent_off}%.` });
}));

async function sendOrderEmail(user, order, accountSetupLink = '') {
  if (!process.env.SMTP_HOST) return false;
  const items = await OrderItem.find({ order_id: order.id }).lean();
  const itemText = items.map(i => `- ${i.product_name} (${i.variant_name}) x${i.quantity}: ${money(i.unit_price * i.quantity)}`).join('\n');
  const transporter = mailTransporter();
  if (!transporter) return false;
  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'ComputerHub <no-reply@example.com>',
    to: user.email,
    subject: `ComputerHub xác nhận đơn ${order.order_number}`,
    text: `Xin chào ${user.full_name},\n\nĐơn hàng ${order.order_number} đã được tạo.\n${itemText}\n\nTổng thanh toán: ${money(order.total)}\nTrạng thái: ${order.status}\nGiao tới: ${order.shipping_address}${accountSetupLink ? `\n\nBạn mua với tư cách khách. Đặt mật khẩu để đăng nhập và xem lại đơn hàng tại:\n${accountSetupLink}` : ''}\n\nCảm ơn bạn đã mua sắm tại ComputerHub.`
  });
  return true;
}

async function createOne(Model, data, session) {
  const docs = await Model.create([data], { session });
  return docs[0];
}

// Đồng bộ giá/tồn kho thực tế trước khi khách xác nhận đơn. Giá trên localStorage chỉ là tham khảo.
app.post('/api/cart/quote', asyncRoute(async (req, res) => {
  const raw = req.body?.variant_ids;
  if (!Array.isArray(raw) || raw.length > 99) return res.status(400).json({ error: 'Giỏ hàng không hợp lệ.' });
  const ids = [...new Set(raw.map(Number))];
  if (ids.some(id => !Number.isSafeInteger(id) || id < 1)) return res.status(400).json({ error: 'Mã biến thể không hợp lệ.' });
  const variants = await Variant.find({ id: { $in: ids } }).lean();
  const products = await Product.find({ id: { $in: variants.map(v => v.product_id) } }).lean();
  const active = new Map(products.filter(p => p.active).map(p => [p.id, p]));
  const validVariants = variants.filter(v => active.has(v.product_id));
  return res.json({ ok: true, variants: validVariants.map(v => ({
    variant_id: v.id, product_id: v.product_id, product_name: active.get(v.product_id).name,
    variant_name: v.name, price: v.price, stock: v.stock
  })) });
}));

app.post('/api/checkout', asyncRoute(async (req, res) => {
  const cart = Array.isArray(req.body.cart) ? req.body.cart : [];
  if (!cart.length) return res.status(400).json({ error: 'Giỏ hàng đang trống.' });
  // Validate all quantities before touching the database. Never silently round
  // fractional, negative or out-of-range values: they could corrupt stock.
  const validatedCart = [];
  for (const item of cart) {
    const qty = Number(item?.quantity);
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 99) {
      return res.status(400).json({ error: 'Số lượng sản phẩm phải là số nguyên từ 1 đến 99.' });
    }
    const displayPrice = Number(item?.price);
    if (!Number.isSafeInteger(displayPrice) || displayPrice < 0) {
      return res.status(400).json({ error: 'Giá trong giỏ hàng không hợp lệ. Vui lòng làm mới giỏ hàng.' });
    }
    validatedCart.push({ variant_id: item?.variant_id, quantity: qty, display_price: displayPrice });
  }
  const loggedUser = await getCurrentUser(req);
  const wasGuest = !loggedUser;
  const email = cleanEmail(req.body.email || loggedUser?.email || '');
  const fullName = safe(req.body.full_name || loggedUser?.full_name).trim();
  const phone = safe(req.body.phone).trim();
  const address = safe(req.body.address).trim();
  if (!validator.isEmail(email) || fullName.length < 2 || !validPhone(phone) || address.length < 8) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ họ tên, email, số điện thoại và địa chỉ.' });
  }
  const paymentMethod = String(req.body.payment_method || '');
  if (!['COD', 'Bank Transfer'].includes(paymentMethod)) return res.status(400).json({ error: 'Phương thức thanh toán không hợp lệ.' });

  const session = await mongoose.startSession();
  let order;
  let user;
  let setupToken = '';
  try {
    await session.withTransaction(async () => {
      user = loggedUser ? await User.findOne({ id: loggedUser.id }).session(session) : await User.findOne({ email }).session(session);
      if (user?.banned) throw new Error('Tài khoản liên kết với email này đang bị khóa.');
      if (!user) {
        user = await createOne(User, { id: await nextId('users', session), email, full_name: fullName, password_hash: null }, session);
        await createOne(Address, { id: await nextId('addresses', session), user_id: user.id, label: 'Địa chỉ đơn đầu tiên', recipient_name: fullName, phone, address_line: address, is_default: true }, session);
      }

      let subtotal = 0;
      const items = [];
      for (const item of validatedCart) {
        const variant = await Variant.findOne({ id: Number(item.variant_id) }).session(session).lean();
        const product = variant ? await Product.findOne({ id: variant.product_id, active: true }).session(session).lean() : null;
        const qty = item.quantity;
        if (!variant || !product) throw new Error('Có sản phẩm không còn tồn tại. Vui lòng làm mới giỏ hàng.');
        if (item.display_price !== variant.price) throw new Error('Giá sản phẩm đã thay đổi. Vui lòng xem lại giỏ hàng và xác nhận lần nữa.');
        if (variant.stock < qty) throw new Error(`${product.name} chỉ còn ${variant.stock} sản phẩm.`);
        subtotal += variant.price * qty;
        items.push({ variant, product, qty });
      }

      const tax = Math.round(subtotal * 0.08);
      const shipping = subtotal >= 20000000 ? 0 : 50000;
      let discountAmount = 0;
      let code = null;
      let discount = null;
      if (req.body.discount_code) {
        code = String(req.body.discount_code).toUpperCase().trim();
        discount = await Discount.findOne({ code }).session(session).lean();
        if (!discount || discount.used_count >= discount.max_uses) throw new Error('Mã giảm giá không còn hợp lệ. Hãy kiểm tra lại trước khi đặt hàng.');
        discountAmount = Math.round(subtotal * discount.percent_off / 100);
      }
      const beforePoints = Math.max(0, subtotal + tax + shipping - discountAmount);
      const requestedPoints = wasGuest ? 0 : Math.max(0, Math.floor(Number(req.body.points_used) || 0));
      const maxPointsByOrder = Math.floor(beforePoints / POINT_VALUE_VND);
      const pointsUsed = Math.min(requestedPoints, Number(user.loyalty_points || 0), maxPointsByOrder);
      const pointsDiscount = pointsUsed * POINT_VALUE_VND;
      const total = Math.max(0, beforePoints - pointsDiscount);
      const costTotal = items.reduce((sum, x) => sum + Number(x.variant.cost_price || 0) * x.qty, 0);
      const profit = subtotal - discountAmount - pointsDiscount - costTotal;
      const orderNumber = 'CH' + Date.now().toString().slice(-10) + crypto.randomBytes(2).toString('hex').toUpperCase();
      order = await createOne(Order, {
        id: await nextId('orders', session), order_number: orderNumber, user_id: user.id, subtotal, tax, shipping_fee: shipping,
        discount_amount: discountAmount, points_used: pointsUsed, total, profit, discount_code: code,
        shipping_name: fullName, shipping_phone: phone, shipping_address: address, payment_method: paymentMethod, status: 'pending'
      }, session);

      for (const { variant, product, qty } of items) {
        const updated = await Variant.findOneAndUpdate({ id: variant.id, stock: { $gte: qty } }, { $inc: { stock: -qty } }, { returnDocument: 'after', session });
        if (!updated) throw new Error(`${product.name} vừa thay đổi tồn kho. Vui lòng thử lại.`);
        await Product.updateOne({ id: product.id }, { $inc: { sold_count: qty } }, { session });
        await createOne(OrderItem, {
          id: await nextId('order_items', session), order_id: order.id, product_id: product.id, variant_id: variant.id,
          product_name: product.name, variant_name: variant.name, unit_price: variant.price, unit_cost: variant.cost_price || 0, quantity: qty
        }, session);
      }
      await createOne(OrderStatusHistory, { id: await nextId('order_status_history', session), order_id: order.id, status: 'pending' }, session);
      if (discount) {
        const used = await Discount.findOneAndUpdate({ id: discount.id, used_count: { $lt: discount.max_uses } }, { $inc: { used_count: 1 } }, { returnDocument: 'after', session });
        if (!used) throw new Error('Mã giảm giá vừa hết lượt sử dụng. Vui lòng kiểm tra lại.');
      }
      const earned = Math.floor(total / 10000);
      await User.updateOne({ id: user.id }, { $inc: { loyalty_points: earned - pointsUsed } }, { session });
      if (wasGuest && !user.password_hash) {
        setupToken = crypto.randomBytes(32).toString('hex');
        await PasswordReset.updateMany({ user_id: user.id, used: false }, { $set: { used: true } }, { session });
        await createOne(PasswordReset, { id: await nextId('password_resets', session), user_id: user.id, token: hashResetToken(setupToken), expires_at: new Date(Date.now() + 24 * 60 * 60000) }, session);
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  } finally {
    await session.endSession();
  }

  const freshUser = await User.findOne({ id: user.id }).lean();
  const freshOrder = await Order.findOne({ id: order.id }).lean();
  const accountSetupLink = setupToken ? `${BASE_URL}/reset-password/${setupToken}` : '';
  try { await sendOrderEmail(freshUser, freshOrder, accountSetupLink); } catch (error) { console.error('Order email failed:', error.message); }
  const receipt = orderReceiptToken(freshOrder);
  const successUrl = wasGuest ? `/order-success/${freshOrder.order_number}?receipt=${encodeURIComponent(receipt)}` : `/orders/${freshOrder.order_number}?success=1`;
  res.json({ ok: true, order_number: freshOrder.order_number, success_url: successUrl });
}));

app.get('/order-success/:number', asyncRoute(async (req, res) => {
  const receipt = verifyReceipt(req.params.number, req.query.receipt || '');
  if (!receipt) return res.status(403).send('Receipt link is invalid or expired.');
  const order = await Order.findOne({ id: Number(receipt.orderId), order_number: req.params.number }).lean();
  if (!order) return res.status(404).render('404');
  const [items, history] = await Promise.all([
    OrderItem.find({ order_id: order.id }).sort({ id: 1 }).lean(),
    OrderStatusHistory.find({ order_id: order.id }).sort({ created_at: -1 }).lean()
  ]);
  res.render('order-detail', { order, items, history, guestReceipt: true, success: true });
}));
app.get('/orders/:number', requireUser, asyncRoute(async (req, res) => {
  const order = await Order.findOne({ order_number: req.params.number, user_id: req.user.id }).lean();
  if (!order) return res.status(404).render('404');
  const [items, history] = await Promise.all([
    OrderItem.find({ order_id: order.id }).sort({ id: 1 }).lean(),
    OrderStatusHistory.find({ order_id: order.id }).sort({ created_at: -1 }).lean()
  ]);
  res.render('order-detail', { order, items, history, guestReceipt: false, success: req.query.success === '1' });
}));

/* ---------------------------------- ADMIN ---------------------------------- */
app.get('/admin', requireAdmin, asyncRoute(async (req, res) => {
  const since30 = new Date(Date.now() - 30 * 86400000);
  const [users, newUsers, orders, revenueAgg, itemRows, recent] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'customer', created_at: { $gte: since30 } }),
    Order.countDocuments(),
    Order.aggregate([{ $group: { _id: null, revenue: { $sum: '$total' } } }]),
    OrderItem.aggregate([{ $group: { _id: '$product_name', qty: { $sum: '$quantity' } } }, { $sort: { qty: -1 } }, { $limit: 7 }]),
    Order.find().sort({ created_at: -1 }).limit(6).lean()
  ]);
  const userIds = [...new Set(recent.map(o => o.user_id))];
  const buyerRows = await User.find({ id: { $in: userIds } }).select('id full_name').lean();
  const buyerMap = new Map(buyerRows.map(u => [u.id, u.full_name]));
  const recentOrders = recent.map(o => ({ ...o, buyer: buyerMap.get(o.user_id) || 'Khách hàng' }));
  const best = itemRows.map(x => ({ product_name: x._id, qty: x.qty }));
  res.render('admin/dashboard', { stats: { users, newUsers, orders, revenue: revenueAgg[0]?.revenue || 0 }, best, recentOrders });
}));

function analyticsLabel(date, mode) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (mode === 'year') return String(y);
  if (mode === 'quarter') return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
  if (mode === 'week') {
    const start = new Date(y, 0, 1);
    const day = Math.floor((d - start) / 86400000);
    return `${y}-W${String(Math.floor((day + start.getDay()) / 7)).padStart(2, '0')}`;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}
function dateRangeFilter(start, end) {
  if (!start || !end) return {};
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T23:59:59.999`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return {};
  return { created_at: { $gte: from, $lte: to } };
}
app.get('/admin/analytics', requireAdmin, asyncRoute(async (req, res) => {
  const mode = ['year', 'quarter', 'month', 'week'].includes(req.query.mode) ? req.query.mode : 'year';
  const start = req.query.start || '';
  const end = req.query.end || '';
  const orders = await Order.find(dateRangeFilter(start, end)).sort({ created_at: 1 }).lean();
  const orderIds = orders.map(o => o.id);
  const items = await OrderItem.find({ order_id: { $in: orderIds } }).lean();
  const products = await Product.find({ id: { $in: [...new Set(items.map(i => i.product_id))] } }).select('id category_id').lean();
  const productMap = new Map(products.map(p => [p.id, p]));
  const itemsByOrder = new Map();
  for (const item of items) {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
    itemsByOrder.get(item.order_id).push(item);
  }
  const grouped = new Map();
  for (const order of orders) {
    const label = analyticsLabel(order.created_at, mode);
    if (!grouped.has(label)) grouped.set(label, { label, orders: 0, revenue: 0, profit: 0, products: 0, categories: new Set() });
    const row = grouped.get(label);
    row.orders += 1;
    row.revenue += Number(order.total || 0);
    row.profit += Number(order.profit || 0);
    for (const item of itemsByOrder.get(order.id) || []) {
      row.products += Number(item.quantity || 0);
      const p = productMap.get(item.product_id);
      if (p) row.categories.add(p.category_id);
    }
  }
  const rows = [...grouped.values()].sort((a, b) => a.label.localeCompare(b.label)).map(r => ({ ...r, types: r.categories.size, categories: undefined }));
  res.render('admin/analytics', { rows, mode, start, end });
}));

app.get('/admin/products', requireAdmin, asyncRoute(async (req, res) => {
  const [productsRaw, categoriesRaw, variants, images] = await Promise.all([
    Product.find().sort({ created_at: -1, id: -1 }).lean(),
    Category.find().sort({ name: 1 }).lean(),
    Variant.find().sort({ product_id: 1, price: 1 }).lean(),
    ProductImage.find().sort({ product_id: 1, id: 1 }).lean()
  ]);
  const catMap = new Map(categoriesRaw.map(c => [c.id, c]));
  const products = productsRaw.map(p => {
    const pv = variants.filter(v => v.product_id === p.id);
    return { ...p, category_name: catMap.get(p.category_id)?.name || '', variant_count: pv.length, total_stock: pv.reduce((s, v) => s + Number(v.stock || 0), 0) };
  });
  const categories = categoriesRaw.map(c => {
    const cp = productsRaw.filter(p => p.category_id === c.id);
    return { ...c, product_count: cp.length, active_product_count: cp.filter(p => p.active).length };
  });
  res.render('admin/products', { products, categories, variants, images });
}));
app.post('/admin/products', requireAdmin, asyncRoute(async (req, res) => {
  try {
    const slug = slugify(req.body.slug || req.body.name);
    const price = Math.max(0, Number(req.body.base_price) || 0);
    const name = safe(req.body.name).trim();
    const brand = safe(req.body.brand).trim();
    const longDescription = safe(req.body.long_description).trim();
    const categoryId = Number(req.body.category_id);
    if (!slug) throw new Error('Slug không hợp lệ.');
    if (name.length < 2 || brand.length < 2 || price <= 0 || !descriptionHasFiveLines(longDescription)) throw new Error('Tên/brand/giá chưa hợp lệ hoặc mô tả chi tiết chưa đủ 5 dòng.');
    if (!(await Category.exists({ id: categoryId }))) throw new Error('Danh mục không tồn tại.');
    if (await Product.exists({ slug })) throw new Error('Slug sản phẩm đã tồn tại.');
    const product = await Product.create({ id: await nextId('products'), name, slug, brand, category_id: categoryId, short_description: safe(req.body.short_description).trim(), long_description: longDescription, base_price: price, is_new: bool(req.body.is_new) });
    const skuBase = slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'PRODUCT';
    await Variant.insertMany([
      { id: await nextId('variants'), product_id: product.id, name: 'Standard', sku: `${skuBase}-${product.id}-STD`, price, cost_price: Math.round(price * .82), stock: 10 },
      { id: await nextId('variants'), product_id: product.id, name: 'Premium', sku: `${skuBase}-${product.id}-PRO`, price: Math.round(price * 1.15), cost_price: Math.round(price * 1.15 * .82), stock: 8 }
    ]);
    const fallback = ['/images/products/placeholder-1.svg', '/images/products/placeholder-2.svg', '/images/products/placeholder-3.svg'];
    const urls = [req.body.image1, req.body.image2, req.body.image3].map((url, i) => safe(url).trim() || fallback[i]);
    const imageDocs = [];
    for (const url of urls) imageDocs.push({ id: await nextId('product_images'), product_id: product.id, url });
    await ProductImage.insertMany(imageDocs);
    setFlash(res, 'Đã thêm sản phẩm với 2 biến thể và 3 hình ảnh.');
  } catch (error) {
    setFlash(res, `Không thể thêm sản phẩm: ${error.message}`);
  }
  res.redirect('/admin/products');
}));
app.post('/admin/products/:id/update', requireAdmin, asyncRoute(async (req, res) => {
  try {
    const id = Number(req.params.id);
    const name = safe(req.body.name).trim();
    const brand = safe(req.body.brand).trim();
    const longDescription = safe(req.body.long_description).trim();
    const categoryId = Number(req.body.category_id);
    if (name.length < 2 || brand.length < 2 || !descriptionHasFiveLines(longDescription)) throw new Error('Tên/brand hoặc mô tả chi tiết chưa đủ 5 dòng.');
    if (!(await Category.exists({ id: categoryId }))) throw new Error('Danh mục không tồn tại.');
    const prices = await Variant.find({ product_id: id }).select('price').lean();
    if (!prices.length) throw new Error('Sản phẩm thiếu biến thể.');
    const basePrice = Math.min(...prices.map(v => v.price));
    const updated = await Product.findOneAndUpdate({ id }, { $set: { name, brand, category_id: categoryId, base_price: basePrice, short_description: safe(req.body.short_description).trim(), long_description: longDescription, is_new: bool(req.body.is_new) } }, { returnDocument: 'after' });
    if (!updated) throw new Error('Sản phẩm không tồn tại.');
    const existing = await ProductImage.find({ product_id: id }).sort({ id: 1 }).limit(3);
    for (const [index, raw] of [req.body.image1, req.body.image2, req.body.image3].entries()) {
      const cleaned = safe(raw).trim();
      if (!cleaned) continue;
      if (existing[index]) await ProductImage.updateOne({ id: existing[index].id }, { $set: { url: cleaned } });
      else await ProductImage.create({ id: await nextId('product_images'), product_id: id, url: cleaned });
    }
    setFlash(res, 'Đã cập nhật sản phẩm và hình ảnh.');
  } catch (error) {
    setFlash(res, `Không thể cập nhật: ${error.message}`);
  }
  res.redirect('/admin/products');
}));
app.post('/admin/products/:id/delete', requireAdmin, asyncRoute(async (req, res) => {
  const result = await Product.updateOne({ id: Number(req.params.id), active: true }, { $set: { active: false } });
  setFlash(res, result.modifiedCount ? 'Đã ẩn sản phẩm khỏi cửa hàng. Lịch sử đơn hàng và dữ liệu thống kê vẫn được giữ nguyên.' : 'Sản phẩm không tồn tại hoặc đã được ẩn.');
  res.redirect('/admin/products');
}));
app.post('/admin/products/:id/restore', requireAdmin, asyncRoute(async (req, res) => {
  const result = await Product.updateOne({ id: Number(req.params.id), active: false }, { $set: { active: true } });
  setFlash(res, result.modifiedCount ? 'Đã khôi phục sản phẩm lên cửa hàng.' : 'Sản phẩm không tồn tại hoặc đang hoạt động.');
  res.redirect('/admin/products');
}));
app.post('/admin/variants/:id/update', requireAdmin, asyncRoute(async (req, res) => {
  const price = Number(req.body.price);
  const cost = Number(req.body.cost_price);
  const stock = Number(req.body.stock);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(cost) || cost < 0 || !Number.isInteger(stock) || stock < 0) {
    setFlash(res, 'Giá bán, giá vốn hoặc tồn kho không hợp lệ.');
    return res.redirect('/admin/products');
  }
  const updated = await Variant.findOneAndUpdate({ id: Number(req.params.id) }, { $set: { price: Math.round(price), cost_price: Math.round(cost), stock } }, { returnDocument: 'after' });
  if (!updated) { setFlash(res, 'Biến thể không tồn tại.'); return res.redirect('/admin/products'); }
  // Giá hiển thị/sắp xếp/lọc phải khớp giá biến thể rẻ nhất.
  const variants = await Variant.find({ product_id: updated.product_id }).select('price').lean();
  await Product.updateOne({ id: updated.product_id }, { $set: { base_price: Math.min(...variants.map(v => v.price)) } });
  setFlash(res, 'Đã cập nhật giá/tồn kho biến thể và đồng bộ giá danh mục.');
  res.redirect('/admin/products');
}));
app.post('/admin/categories', requireAdmin, asyncRoute(async (req, res) => {
  const name = safe(req.body.name).trim();
  const slug = slugify(req.body.slug || name);
  try {
    if (!name || !slug) throw new Error('Tên hoặc slug không hợp lệ.');
    if (await Category.exists({ $or: [{ name }, { slug }] })) throw new Error('Tên hoặc slug danh mục đã tồn tại.');
    await Category.create({ id: await nextId('categories'), name, slug });
    setFlash(res, 'Đã thêm danh mục.');
  } catch (error) {
    setFlash(res, error.message || 'Tên hoặc slug danh mục đã tồn tại.');
  }
  res.redirect('/admin/products');
}));
app.post('/admin/categories/:id/update', requireAdmin, asyncRoute(async (req, res) => {
  try {
    const id = Number(req.params.id);
    const name = safe(req.body.name).trim();
    const slug = slugify(req.body.slug || name);
    const duplicate = await Category.findOne({ id: { $ne: id }, $or: [{ name }, { slug }] }).lean();
    if (duplicate) throw new Error('Tên hoặc slug bị trùng.');
    await Category.updateOne({ id }, { $set: { name, slug } });
    setFlash(res, 'Đã cập nhật danh mục.');
  } catch (error) {
    setFlash(res, `Không thể cập nhật danh mục: ${error.message}`);
  }
  res.redirect('/admin/products');
}));
app.post('/admin/categories/:id/delete', requireAdmin, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const used = await Product.countDocuments({ category_id: id });
  if (used) setFlash(res, 'Không thể xóa danh mục đang có sản phẩm.');
  else {
    await Category.deleteOne({ id });
    setFlash(res, 'Đã xóa danh mục.');
  }
  res.redirect('/admin/products');
}));

app.get('/admin/users', requireAdmin, asyncRoute(async (req, res) => {
  res.render('admin/users', { users: await User.find({ role: 'customer' }).sort({ created_at: -1 }).lean() });
}));
app.post('/admin/users/:id/update', requireAdmin, asyncRoute(async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fullName = safe(req.body.full_name).trim();
    const email = cleanEmail(req.body.email);
    if (!validator.isEmail(email) || fullName.length < 2) throw new Error('Thông tin không hợp lệ.');
    if (await User.exists({ email, id: { $ne: id } })) throw new Error('Email đã được tài khoản khác sử dụng.');
    await User.updateOne({ id, role: 'customer' }, { $set: { full_name: fullName, email } });
    setFlash(res, 'Đã cập nhật người dùng.');
  } catch (error) {
    setFlash(res, `Không thể cập nhật người dùng: ${error.message}`);
  }
  res.redirect('/admin/users');
}));
app.post('/admin/users/:id/ban', requireAdmin, asyncRoute(async (req, res) => {
  const user = await User.findOne({ id: Number(req.params.id), role: 'customer' });
  if (user) { user.banned = !user.banned; await user.save(); }
  setFlash(res, 'Đã thay đổi trạng thái người dùng.');
  res.redirect('/admin/users');
}));

function adminOrderFilter(query) {
  const range = query.range || '';
  const now = new Date();
  let start;
  let end;
  if (range === 'today') { start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); end = new Date(start.getTime() + 86400000 - 1); }
  else if (range === 'yesterday') { end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999); start = new Date(end.getFullYear(), end.getMonth(), end.getDate()); }
  else if (range === 'week') { start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); end = now; }
  else if (range === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); end = now; }
  else if (query.start && query.end) return dateRangeFilter(query.start, query.end);
  return start ? { created_at: { $gte: start, $lte: end } } : {};
}
app.get('/admin/orders', requireAdmin, asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const per = 20;
  const filter = adminOrderFilter(req.query);
  const [total, rows] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter).sort({ created_at: -1 }).skip((page - 1) * per).limit(per).lean()
  ]);
  const userIds = [...new Set(rows.map(o => o.user_id))];
  const users = await User.find({ id: { $in: userIds } }).select('id full_name').lean();
  const userMap = new Map(users.map(u => [u.id, u.full_name]));
  const orders = rows.map(o => ({ ...o, buyer: userMap.get(o.user_id) || 'Khách hàng' }));
  res.render('admin/orders', { orders, page, pages: Math.max(1, Math.ceil(total / per)), filters: req.query, total });
}));
app.get('/admin/orders/:id', requireAdmin, asyncRoute(async (req, res) => {
  const order = await Order.findOne({ id: Number(req.params.id) }).lean();
  if (!order) return res.status(404).render('404');
  const [user, items, history] = await Promise.all([
    User.findOne({ id: order.user_id }).lean(),
    OrderItem.find({ order_id: order.id }).sort({ id: 1 }).lean(),
    OrderStatusHistory.find({ order_id: order.id }).sort({ created_at: -1 }).lean()
  ]);
  res.render('admin/order-detail', { order: { ...order, email: user?.email || '', buyer: user?.full_name || 'Khách hàng' }, items, history });
}));
app.post('/admin/orders/:id/status', requireAdmin, asyncRoute(async (req, res) => {
  const allowed = ['pending', 'confirmed', 'shipping', 'delivered'];
  if (!allowed.includes(req.body.status)) return res.status(400).send('Invalid status');
  const id = Number(req.params.id);
  const order = await Order.findOne({ id });
  if (!order) return res.status(404).render('404');
  if (order.status !== req.body.status) {
    order.status = req.body.status;
    await order.save();
    await OrderStatusHistory.create({ id: await nextId('order_status_history'), order_id: id, status: req.body.status });
    setFlash(res, 'Đã cập nhật trạng thái đơn hàng.');
  } else setFlash(res, 'Trạng thái không thay đổi.');
  res.redirect('/admin/orders/' + req.params.id);
}));

app.get('/admin/discounts', requireAdmin, asyncRoute(async (req, res) => {
  res.render('admin/discounts', { discounts: await Discount.find().sort({ created_at: -1 }).lean() });
}));
app.post('/admin/discounts', requireAdmin, asyncRoute(async (req, res) => {
  const code = String(req.body.code || '').toUpperCase().trim();
  if (!/^[A-Z0-9]{5}$/.test(code)) {
    setFlash(res, 'Mã phải gồm đúng 5 ký tự chữ/số.');
    return res.redirect('/admin/discounts');
  }
  try {
    if (await Discount.exists({ code })) throw new Error('Mã giảm giá đã tồn tại.');
    await Discount.create({ id: await nextId('discounts'), code, percent_off: Math.max(1, Math.min(100, Number(req.body.percent_off))), max_uses: Math.max(1, Math.min(10, Number(req.body.max_uses))) });
    setFlash(res, 'Đã tạo mã giảm giá.');
  } catch (error) {
    setFlash(res, error.message || 'Mã giảm giá đã tồn tại.');
  }
  res.redirect('/admin/discounts');
}));
app.get('/admin/discounts/:code/orders', requireAdmin, asyncRoute(async (req, res) => {
  res.render('admin/discount-orders', { code: req.params.code, orders: await Order.find({ discount_code: req.params.code }).sort({ created_at: -1 }).lean() });
}));

app.get('/health', (req, res) => res.json({ ok: true, instance: INSTANCE_ID, database: mongoose.connection.name || process.env.MONGODB_DB_NAME || 'computerhub_v6', mongoReady: mongoose.connection.readyState === 1, time: new Date().toISOString() }));

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'Đã có lỗi phía máy chủ.' });
  res.status(500).render('404', { serverError: true });
});
app.use((req, res) => res.status(404).render('404'));

async function startServer() {
  await connectMongoDB();
  if (process.env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log(`Socket.IO Redis adapter connected on ${INSTANCE_ID}.`);
    } catch (error) {
      console.error('Redis adapter unavailable; realtime remains local to this instance:', error.message);
    }
  }
  server.listen(PORT, () => console.log(`ComputerHub running at ${BASE_URL} [instance=${INSTANCE_ID}]`));
}

if (require.main === module) {
  startServer().catch(error => { console.error(error); process.exit(1); });
}

module.exports = app;
module.exports.app = app;
module.exports.server = server;
module.exports.startServer = startServer;