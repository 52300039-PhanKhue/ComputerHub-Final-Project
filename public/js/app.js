const CART_KEY = 'computerhub_cart_v2';
const THEME_KEY = 'computerhub_theme';
const POINT_VALUE_VND = 1000;
const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content || '';
let checkoutDiscountPercent = 0;
let checkedDiscountCode = '';
let discountCheckSequence = 0;
let checkoutStep = 1;

const fmt = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0)) + 'đ';
const cart = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch { return []; }
};
const saveCart = items => {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartCount();
};
// Giới hạn tồn kho đã biết; server vẫn kiểm tra tồn kho mới nhất khi đặt hàng.
function cartStockLimit(item) {
  if (item.stock === undefined || item.stock === null) return 99; // giỏ hàng cũ chưa có stock
  const stock = Number(item.stock);
  return Number.isFinite(stock) ? Math.max(0, Math.min(99, Math.floor(stock))) : 0;
}
async function syncCartFromServer() {
  const items = cart();
  if (!items.length) return { changed: false, unavailable: false };
  const response = await fetch('/api/cart/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken() },
    body: JSON.stringify({ variant_ids: items.map(item => item.variant_id) })
  });
  if (!response.ok) throw new Error('Chưa thể kiểm tra giá và tồn kho mới nhất. Vui lòng thử lại.');
  const data = await response.json();
  const quotes = new Map((data.variants || []).map(v => [Number(v.variant_id), v]));
  let changed = false;
  let unavailable = false;
  const updated = items.map(item => {
    const quote = quotes.get(Number(item.variant_id));
    const next = { ...item };
    if (!quote) { next.stock = 0; unavailable = true; }
    else {
      next.price = Number(quote.price);
      next.stock = Number(quote.stock);
      next.product_name = quote.product_name;
      next.variant_name = quote.variant_name;
      if (Number(next.quantity) > cartStockLimit(next)) unavailable = true;
    }
    if (next.price !== item.price || next.stock !== item.stock ||
        next.product_name !== item.product_name || next.variant_name !== item.variant_name) changed = true;
    return next;
  });
  if (changed) {
    saveCart(updated);
    renderCart();
    renderCheckout();
    showToast('Giá hoặc tồn kho đã thay đổi. Vui lòng kiểm tra lại giỏ hàng trước khi đặt.', 'error');
  }
  if (unavailable && !changed) showToast('Có sản phẩm không đủ hàng. Hãy điều chỉnh giỏ trước khi đặt.', 'error');
  return { changed, unavailable };
}


function showToast(message, type = 'success') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = document.createElement('span');
  icon.textContent = type === 'error' ? '⚠' : '✓';
  const text = document.createElement('div');
  text.textContent = String(message ?? '');
  toast.append(icon, text);
  stack.appendChild(toast);
  setTimeout(() => toast.remove(), 3300);
}

function updateCartCount() {
  const el = document.getElementById('cartCount');
  if (el) el.textContent = cart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function addToCart(productId, productName, image = '') {
  const select = document.getElementById('variant');
  if (!select) return;
  const option = select.options[select.selectedIndex];
  const variantId = Number(select.value);
  const variantName = option.dataset.name || option.text.split(' — ')[0];
  const price = Number(option.dataset.price || 0);
  const stock = Number(option.dataset.stock || 0);
  const qtyInput = document.getElementById('qty');
  if (stock <= 0) return showToast('Biến thể này đã hết hàng.', 'error');
  const quantity = Math.max(1, Math.min(stock, 99, Math.trunc(Number(qtyInput?.value) || 1)));
  const items = cart();
  const found = items.find(item => item.variant_id === variantId);
  if (found) { found.quantity = Math.min(stock, 99, Number(found.quantity) + quantity); found.stock = stock; found.price = price; }
  else items.push({ product_id: productId, product_name: productName, variant_id: variantId, variant_name: variantName, price, stock, quantity, image });
  saveCart(items);
  showToast(`Đã thêm ${productName} vào giỏ hàng.`);
}

function removeCart(index) {
  const items = cart();
  items.splice(index, 1);
  saveCart(items);
  renderCart();
  renderCheckout();
  showToast('Đã xóa sản phẩm khỏi giỏ.');
}

function changeQty(index, value) {
  const items = cart();
  if (!items[index]) return;
  const stock = cartStockLimit(items[index]);
  if (stock === 0) return showToast('Sản phẩm đã hết hàng. Hãy xóa khỏi giỏ.', 'error');
  const wanted = Math.trunc(Number(value) || 1);
  items[index].quantity = Math.max(1, Math.min(stock, wanted));
  if (wanted > stock) showToast(`Chỉ còn ${stock} sản phẩm.`, 'error');
  saveCart(items);
  renderCart();
  renderCheckout();
}

function cartTotals() {
  const items = cart();
  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const tax = Math.round(subtotal * 0.08);
  const shipping = subtotal >= 20000000 || subtotal === 0 ? 0 : 50000;
  const discount = Math.round(subtotal * checkoutDiscountPercent / 100);
  const pointsInput = document.querySelector('[name="points_used"]');
  const userMax = Number(pointsInput?.max || 0);
  const requestedPoints = Math.max(0, Math.floor(Number(pointsInput?.value || 0)));
  const maxByTotal = Math.floor(Math.max(0, subtotal + tax + shipping - discount) / POINT_VALUE_VND);
  const pointsUsed = Math.min(requestedPoints, userMax, maxByTotal);
  const pointsValue = pointsUsed * POINT_VALUE_VND;
  const total = Math.max(0, subtotal + tax + shipping - discount - pointsValue);
  return { subtotal, tax, shipping, discount, pointsUsed, pointsValue, total };
}

function renderCart() {
  const root = document.getElementById('cartPage');
  if (!root) return;
  const items = cart();
  if (!items.length) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon">🛒</div><h3>Giỏ hàng đang trống</h3><p>Chọn một sản phẩm và phiên bản phù hợp để bắt đầu.</p><a class="btn" href="/products">Khám phá sản phẩm</a></div>`;
    const actions = document.querySelector('.cart-actions');
    if (actions) actions.style.display = 'none';
    return;
  }
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.08);
  const shipping = subtotal >= 20000000 ? 0 : 50000;
  root.innerHTML = `
    <div class="cart-layout">
      <section class="cart-list">
        ${items.map((item, index) => `
          <article class="cart-item">
            <img class="cart-thumb" src="${escapeHtml(item.image || '/images/products/placeholder-1.svg')}" alt="${escapeHtml(item.product_name)}">
            <div>
              <h3>${escapeHtml(item.product_name)}</h3>
              <div class="cart-item-meta">${escapeHtml(item.variant_name)}${item.stock !== undefined ? ` • Còn ${cartStockLimit(item)} sản phẩm (tham khảo)` : ''}</div>
              <div class="cart-item-actions">
                <input class="cart-qty-input" data-cart-index="${index}" aria-label="Số lượng" type="number" min="1" max="${Math.max(1, cartStockLimit(item))}" step="1" value="${item.quantity}" ${cartStockLimit(item) === 0 ? 'disabled title="Đã hết hàng"' : ''}>
                <button class="danger cart-remove-btn" data-cart-index="${index}" type="button">Xóa</button>
              </div>
            </div>
            <div class="cart-price"><div>${fmt(item.price * item.quantity)}</div><small class="muted">${fmt(item.price)} / sản phẩm</small></div>
          </article>`).join('')}
      </section>
      <aside class="panel cart-summary">
        <h2>Tóm tắt đơn hàng</h2>
        <div class="summary-line"><span>Tạm tính</span><b>${fmt(subtotal)}</b></div>
        <div class="summary-line"><span>Thuế 8%</span><b>${fmt(tax)}</b></div>
        <div class="summary-line"><span>Vận chuyển</span><b>${shipping ? fmt(shipping) : 'Miễn phí'}</b></div>
        <div class="summary-line total"><span>Tổng dự kiến</span><b>${fmt(subtotal + tax + shipping)}</b></div>
        <p class="summary-note">Miễn phí vận chuyển cho đơn hàng từ 20.000.000đ.</p>
        <a class="btn" style="width:100%;margin-top:14px" href="/checkout">Tiến hành thanh toán →</a>
      </aside>
    </div>`;
}

async function checkDiscount() {
  const input = document.getElementById('discount');
  const message = document.getElementById('discountMsg');
  if (!input || !message) return;
  const code = input.value.trim().toUpperCase();
  const sequence = ++discountCheckSequence;
  checkedDiscountCode = '';
  checkoutDiscountPercent = 0;
  if (!code) {
    checkoutDiscountPercent = 0;
    message.textContent = 'Nhập mã giảm giá gồm 5 ký tự.';
    renderCheckout();
    return;
  }
  try {
    const response = await fetch('/api/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken() },
      body: JSON.stringify({ code })
    });
    const data = await response.json();
    if (sequence !== discountCheckSequence || input.value.trim().toUpperCase() !== code) return;
    checkoutDiscountPercent = data.valid ? Number(data.percent || 0) : 0;
    checkedDiscountCode = data.valid ? code : '';
    message.textContent = data.message;
    message.style.color = data.valid ? 'var(--success)' : 'var(--danger)';
    renderCheckout();
  } catch {
    if (sequence !== discountCheckSequence) return;
    checkedDiscountCode = '';
    checkoutDiscountPercent = 0;
    message.textContent = 'Không thể kiểm tra mã lúc này.';
    message.style.color = 'var(--danger)';
  }
}

function renderCheckout() {
  const root = document.getElementById('checkoutSummary');
  if (!root) return;
  const items = cart();
  const totals = cartTotals();
  if (!items.length) {
    root.innerHTML = '<div class="empty-state"><div class="empty-icon">🛒</div><h3>Chưa có sản phẩm</h3><p>Quay lại cửa hàng để thêm sản phẩm trước khi thanh toán.</p><a class="btn" href="/products">Xem sản phẩm</a></div>';
    return;
  }
  root.innerHTML = `
    ${items.map(item => `<div class="summary-line"><span>${escapeHtml(item.product_name)} × ${item.quantity}</span><b>${fmt(item.price * item.quantity)}</b></div>`).join('')}
    <div class="summary-line"><span>Tạm tính</span><b>${fmt(totals.subtotal)}</b></div>
    <div class="summary-line"><span>Thuế 8%</span><b>${fmt(totals.tax)}</b></div>
    <div class="summary-line"><span>Vận chuyển</span><b>${totals.shipping ? fmt(totals.shipping) : 'Miễn phí'}</b></div>
    ${totals.discount ? `<div class="summary-line"><span>Giảm giá (${checkoutDiscountPercent}%)</span><b>−${fmt(totals.discount)}</b></div>` : ''}
    ${totals.pointsValue ? `<div class="summary-line"><span>${totals.pointsUsed} điểm thành viên</span><b>−${fmt(totals.pointsValue)}</b></div>` : ''}
    <div class="summary-line total"><span>Thanh toán</span><b>${fmt(totals.total)}</b></div>
    <p class="summary-note">100 điểm tương đương 100.000đ. Điểm mới được cộng sau khi đặt hàng.</p>`;
}

function setCheckoutStep(step) {
  checkoutStep = Math.max(1, Math.min(3, step));
  document.querySelectorAll('.checkout-step').forEach(el => el.classList.toggle('active', Number(el.dataset.step) === checkoutStep));
  document.querySelectorAll('.step-dot').forEach(el => el.classList.toggle('active', Number(el.dataset.step) === checkoutStep));
  const active = document.querySelector(`.checkout-step[data-step="${checkoutStep}"]`);
  if (active && window.innerWidth < 821) active.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function validateStep(step) {
  const section = document.querySelector(`.checkout-step[data-step="${step}"]`);
  if (!section) return true;
  const fields = [...section.querySelectorAll('input[required],textarea[required],select[required]')];
  for (const field of fields) {
    if (!field.reportValidity()) return false;
  }
  return true;
}

function useSavedAddress(button) {
  const form = document.getElementById('checkoutForm');
  if (!form) return;
  form.elements.full_name.value = button.dataset.name || '';
  form.elements.phone.value = button.dataset.phone || '';
  form.elements.address.value = button.dataset.address || '';
  document.querySelectorAll('.saved-address-btn').forEach(x => x.classList.remove('active'));
  button.classList.add('active');
  showToast('Đã điền địa chỉ đã lưu.');
}

function updateVariantUI() {
  const select = document.getElementById('variant');
  if (!select) return;
  const option = select.options[select.selectedIndex];
  const price = Number(option.dataset.price || 0);
  const stock = Number(option.dataset.stock || 0);
  const priceEl = document.getElementById('detailPrice');
  const stockEl = document.getElementById('variantStock');
  const qty = document.getElementById('qty');
  if (priceEl) priceEl.textContent = fmt(price);
  if (stockEl) {
    stockEl.textContent = stock > 0 ? `Còn ${stock} sản phẩm` : 'Tạm hết hàng';
    stockEl.style.color = stock > 0 ? 'var(--success)' : 'var(--danger)';
  }
  if (qty) qty.max = Math.max(1, stock);
  const addButton = document.getElementById('addToCartBtn');
  if (addButton) addButton.disabled = stock <= 0;
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}


function initCsrfForms() {
  const token = csrfToken();
  if (!token) return;
  document.querySelectorAll('form[method="post"],form[method="POST"]').forEach(form => {
    if (form.querySelector('input[name="_csrf"]')) return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = '_csrf';
    input.value = token;
    form.appendChild(input);
  });
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  setTheme(saved || 'light');
  document.getElementById('themeToggle')?.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));
}

function initGallery() {
  document.querySelectorAll('.thumb').forEach(button => {
    button.addEventListener('click', () => {
      const image = button.querySelector('img');
      const main = document.querySelector('.main-img');
      if (image && main) main.src = image.src;
      document.querySelectorAll('.thumb').forEach(x => x.classList.remove('active'));
      button.classList.add('active');
    });
  });
}

function initMobileNav() {
  const toggle = document.getElementById('mobileNavToggle');
  const nav = document.getElementById('siteNav');
  toggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.getElementById('filterToggle')?.addEventListener('click', () => document.querySelector('.filter')?.classList.toggle('open'));
}

function initReveal() {
  const nodes = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) return nodes.forEach(x => x.classList.add('visible'));
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .08 });
  nodes.forEach(node => observer.observe(node));
}

const checkoutForm = document.getElementById('checkoutForm');
if (checkoutForm) {
  checkoutForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (![1, 2, 3].every(validateStep)) return;
    const discountValue = checkoutForm.elements.discount_code?.value.trim().toUpperCase() || '';
    if (discountValue && checkedDiscountCode !== discountValue) return showToast('Hãy bấm Kiểm tra mã giảm giá trước khi xác nhận đơn.', 'error');
    const submit = checkoutForm.querySelector('[type="submit"]');
    if (submit) { submit.disabled = true; submit.textContent = 'Đang tạo đơn hàng...'; }
    try {
      const check = await syncCartFromServer();
      if (check.changed || check.unavailable) throw new Error('Vui lòng xem lại giá và tồn kho trong giỏ hàng trước khi xác nhận lại.');
      const payload = Object.fromEntries(new FormData(checkoutForm).entries());
      payload.cart = cart();
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken() },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể thanh toán.');
      saveCart([]);
      location.href = data.success_url || `/orders/${data.order_number}?success=1`;
    } catch (error) {
      showToast(error.message, 'error');
      if (submit) { submit.disabled = false; submit.textContent = 'Xác nhận đặt hàng'; }
    }
  });
  document.querySelectorAll('.checkout-next').forEach(button => button.addEventListener('click', () => {
    const from = Number(button.dataset.from || checkoutStep);
    if (validateStep(from)) setCheckoutStep(from + 1);
  }));
  document.querySelectorAll('.checkout-prev').forEach(button => button.addEventListener('click', () => setCheckoutStep(Number(button.dataset.to || checkoutStep - 1))));
  document.querySelector('[name="points_used"]')?.addEventListener('input', renderCheckout);
}

if (window.productRoom && window.io) {
  const socket = io({ transports: ['websocket'] });
  socket.emit('product:join', window.productRoom);
  socket.on('review:new', payload => {
    const review = payload?.review || payload;
    const summary = payload?.ratingSummary;
    const list = document.getElementById('reviewList');
    if (list && review) {
      list.querySelector('.empty-state')?.remove();
      const initial = escapeHtml((review.reviewer || 'G').slice(0, 1).toUpperCase());
      list.insertAdjacentHTML('afterbegin', `<div class="review"><div class="review-head"><div class="review-user"><span class="avatar">${initial}</span><div><b>${escapeHtml(review.reviewer)}</b><small style="display:block">Vừa xong</small></div></div><span class="stars">${review.rating ? '★'.repeat(review.rating) : ''}</span></div><p>${escapeHtml(review.comment)}</p></div>`);
    }
    if (summary) {
      const average = Number(summary.average || 0);
      const count = Number(summary.count || 0);
      const stars = Array.from({ length: 5 }, (_, i) => average >= i + 1 ? '★' : '☆').join('');
      ['ratingStarsTop', 'ratingStarsBox'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = stars; });
      ['ratingAverageTop', 'ratingAverageBox'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = average.toFixed(1); });
      ['ratingCountTop', 'ratingCountBox'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = `${count} lượt chấm sao`; });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const addButton = document.getElementById('addToCartBtn');
  addButton?.addEventListener('click', () => addToCart(
    Number(addButton.dataset.productId),
    addButton.dataset.productName || '',
    addButton.dataset.productImage || ''
  ));
  document.getElementById('checkDiscountBtn')?.addEventListener('click', checkDiscount);
  document.getElementById('discount')?.addEventListener('input', () => {
    ++discountCheckSequence;
    checkedDiscountCode = '';
    checkoutDiscountPercent = 0;
    const message = document.getElementById('discountMsg');
    if (message) { message.textContent = 'Mã đã thay đổi. Hãy bấm Kiểm tra mã để áp dụng.'; message.style.color = 'var(--muted)'; }
    renderCheckout();
  });
  document.querySelectorAll('.saved-address-btn').forEach(button => button.addEventListener('click', () => useSavedAddress(button)));
  document.getElementById('cartPage')?.addEventListener('click', event => {
    const button = event.target.closest('.cart-remove-btn');
    if (button) removeCart(Number(button.dataset.cartIndex));
  });
  document.getElementById('cartPage')?.addEventListener('change', event => {
    const input = event.target.closest('.cart-qty-input');
    if (input) changeQty(Number(input.dataset.cartIndex), input.value);
  });
  document.querySelectorAll('form[data-confirm]').forEach(form => {
    form.addEventListener('submit', event => {
      if (!window.confirm(form.dataset.confirm || 'Bạn có chắc không?')) event.preventDefault();
    });
  });
  initTheme();
  initCsrfForms();
  initMobileNav();
  initGallery();
  initReveal();
  updateCartCount();
  renderCart();
  renderCheckout();
  if (document.getElementById('cartPage') || document.getElementById('checkoutSummary')) {
    syncCartFromServer().catch(() => showToast('Không thể đồng bộ giá và tồn kho lúc này. Hệ thống sẽ kiểm tra lại khi đặt hàng.', 'error'));
  }
  updateVariantUI();
  document.getElementById('variant')?.addEventListener('change', updateVariantUI);
  document.querySelectorAll('.saved-address-btn[data-default="1"]').forEach(button => button.classList.add('active'));
  setCheckoutStep(1);
});




/* HIEN / AN MAT KHAU - COMPUTERHUB */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[type="password"]').forEach(input => {
    if (input.closest('.password-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'password-wrap';

    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'password-eye';
    button.textContent = '👁';
    button.setAttribute('aria-label', 'Hiện mật khẩu');
    button.setAttribute('aria-pressed', 'false');
    button.title = 'Hiện mật khẩu';

    button.addEventListener('click', () => {
      const show = input.type === 'password';

      input.type = show ? 'text' : 'password';

      button.setAttribute('aria-pressed', String(show));
      button.setAttribute(
        'aria-label',
        show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
      );
      button.title = show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';
    });

    wrap.appendChild(button);
  });
});

