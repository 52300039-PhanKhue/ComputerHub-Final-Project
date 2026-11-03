const mongoose = require('mongoose');

const baseOptions = {
  versionKey: false,
  id: false,
  toJSON: { virtuals: false },
  toObject: { virtuals: false }
};

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
}, { ...baseOptions, collection: 'counters' });

const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  full_name: { type: String, required: true, trim: true },
  password_hash: { type: String, default: null },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer', index: true },
  banned: { type: Boolean, default: false },
  loyalty_points: { type: Number, default: 0, min: 0 },
  google_id: { type: String, default: undefined },
  created_at: { type: Date, default: Date.now, index: true }
}, { ...baseOptions, collection: 'users' });
userSchema.index({ google_id: 1 }, { unique: true, sparse: true });

const addressSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  label: { type: String, default: 'Home' },
  recipient_name: { type: String, required: true },
  phone: { type: String, default: '' },
  address_line: { type: String, required: true },
  is_default: { type: Boolean, default: false }
}, { ...baseOptions, collection: 'addresses' });
addressSchema.index({ user_id: 1, is_default: -1, id: -1 });

const categorySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true }
}, { ...baseOptions, collection: 'categories' });

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  brand: { type: String, required: true, trim: true, index: true },
  category_id: { type: Number, required: true, index: true },
  short_description: { type: String, required: true },
  long_description: { type: String, required: true },
  base_price: { type: Number, required: true, min: 0, index: true },
  is_new: { type: Boolean, default: false, index: true },
  sold_count: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true, index: true },
  created_at: { type: Date, default: Date.now, index: true }
}, { ...baseOptions, collection: 'products' });
productSchema.index({ active: 1, category_id: 1, created_at: -1 });
productSchema.index({ name: 'text', short_description: 'text', brand: 'text' });

const productImageSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  product_id: { type: Number, required: true, index: true },
  url: { type: String, required: true }
}, { ...baseOptions, collection: 'product_images' });

const variantSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  product_id: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true, index: true },
  price: { type: Number, required: true, min: 0 },
  cost_price: { type: Number, default: 0, min: 0 },
  stock: { type: Number, default: 0, min: 0 }
}, { ...baseOptions, collection: 'variants' });

const reviewSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  product_id: { type: Number, required: true, index: true },
  user_id: { type: Number, default: null, index: true },
  guest_name: { type: String, default: null },
  comment: { type: String, required: true },
  rating: { type: Number, default: null, min: 1, max: 5 },
  created_at: { type: Date, default: Date.now, index: true }
}, { ...baseOptions, collection: 'reviews' });
reviewSchema.index({ product_id: 1, created_at: -1 });

const discountSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  percent_off: { type: Number, required: true, min: 1, max: 100 },
  max_uses: { type: Number, required: true, min: 1, max: 10 },
  used_count: { type: Number, default: 0, min: 0 },
  created_at: { type: Date, default: Date.now, index: true }
}, { ...baseOptions, collection: 'discounts' });

const orderSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  order_number: { type: String, required: true, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, required: true, min: 0 },
  shipping_fee: { type: Number, required: true, min: 0 },
  discount_amount: { type: Number, default: 0, min: 0 },
  points_used: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  profit: { type: Number, default: 0 },
  discount_code: { type: String, default: null, index: true },
  shipping_name: { type: String, required: true },
  shipping_phone: { type: String, required: true },
  shipping_address: { type: String, required: true },
  payment_method: { type: String, enum: ['COD', 'Bank Transfer'], required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'shipping', 'delivered'], default: 'pending', index: true },
  created_at: { type: Date, default: Date.now, index: true }
}, { ...baseOptions, collection: 'orders' });

const orderItemSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  order_id: { type: Number, required: true, index: true },
  product_id: { type: Number, required: true, index: true },
  variant_id: { type: Number, required: true },
  product_name: { type: String, required: true },
  variant_name: { type: String, required: true },
  unit_price: { type: Number, required: true, min: 0 },
  unit_cost: { type: Number, default: 0, min: 0 },
  quantity: { type: Number, required: true, min: 1 }
}, { ...baseOptions, collection: 'order_items' });

const orderStatusHistorySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  order_id: { type: Number, required: true, index: true },
  status: { type: String, enum: ['pending', 'confirmed', 'shipping', 'delivered'], required: true },
  created_at: { type: Date, default: Date.now, index: true }
}, { ...baseOptions, collection: 'order_status_history' });

const passwordResetSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  token: { type: String, required: true, unique: true, index: true },
  expires_at: { type: Date, required: true, index: true },
  used: { type: Boolean, default: false, index: true }
}, { ...baseOptions, collection: 'password_resets' });

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Address = mongoose.models.Address || mongoose.model('Address', addressSchema);
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const ProductImage = mongoose.models.ProductImage || mongoose.model('ProductImage', productImageSchema);
const Variant = mongoose.models.Variant || mongoose.model('Variant', variantSchema);
const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
const Discount = mongoose.models.Discount || mongoose.model('Discount', discountSchema);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const OrderItem = mongoose.models.OrderItem || mongoose.model('OrderItem', orderItemSchema);
const OrderStatusHistory = mongoose.models.OrderStatusHistory || mongoose.model('OrderStatusHistory', orderStatusHistorySchema);
const PasswordReset = mongoose.models.PasswordReset || mongoose.model('PasswordReset', passwordResetSchema);

async function nextId(name, session = null) {
  const options = { upsert: true, new: true, setDefaultsOnInsert: true };
  if (session) options.session = session;
  const row = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    options
  );
  return row.seq;
}

async function ensureCounterAtLeast(name, value) {
  await Counter.updateOne(
    { name },
    { $max: { seq: Number(value) || 0 }, $setOnInsert: { name } },
    { upsert: true }
  );
}

module.exports = {
  mongoose,
  Counter,
  User,
  Address,
  Category,
  Product,
  ProductImage,
  Variant,
  Review,
  Discount,
  Order,
  OrderItem,
  OrderStatusHistory,
  PasswordReset,
  nextId,
  ensureCounterAtLeast
};
