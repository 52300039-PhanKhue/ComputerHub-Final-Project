# GIẢI THÍCH COMPUTERHUB V6 MONGODB — HỌC ĐỂ TỰ LÀM, KHÔNG HỌC THUỘC

> Đây là tài liệu giải thích kiến trúc. V6 bao gồm CSRF, email Mailpit, hai web instance + Nginx + Redis, kiểm tra tồn kho/mã giảm giá chặt hơn và landing page đúng nhóm danh mục của đề. Hãy hiểu **luồng dữ liệu** trước khi nhớ cú pháp.

## 1. Hãy hình dung project có 4 tầng

1. **Trình duyệt**: EJS + CSS + JavaScript trong `views/` và `public/`.
2. **Server**: Express trong `src/server.js` nhận URL, xử lý dữ liệu và trả trang/JSON.
3. **Database**: MongoDB Atlas; schema/model Mongoose nằm ở `src/models/index.js`, kết nối ở `src/mongodb.js`.
4. **Dữ liệu mẫu**: `src/seed.js` tạo admin, customer demo, danh mục, sản phẩm, variants, ảnh và vài đơn mẫu.

Luồng đơn giản nhất:

`Chrome -> GET /products -> Express -> Mongoose -> MongoDB Atlas -> EJS -> HTML -> Chrome`

Khi thêm giỏ hàng:

`Nút Add to Cart -> public/js/app.js -> localStorage -> giao diện cart cập nhật ngay`

Khi đặt hàng:

`Checkout -> POST /api/checkout -> server kiểm tra lại giá/tồn kho/discount -> MongoDB transaction -> trả success_url`

## 2. File nào sửa cái gì?

### Giao diện toàn website
- `public/css/app.css`: màu sắc, spacing, card, responsive, light/dark.
- `views/partials/header.ejs`: header, search, nav, theme toggle.
- `views/partials/footer.ejs`: footer.

### Trang chủ
- `views/home.ejs`

### Danh sách sản phẩm
- `views/products.ejs`
- `views/partials/product-card.ejs`

### Chi tiết sản phẩm
- `views/product-detail.ejs`

### Giỏ hàng / Checkout
- `views/cart.ejs`
- `views/checkout.ejs`
- logic phía trình duyệt ở `public/js/app.js`

### Tài khoản
- `views/auth.ejs`
- `views/forgot.ejs`
- `views/profile.ejs`

### Admin
- `views/admin/`
- route xử lý vẫn nằm trong `src/server.js`

### Dữ liệu sản phẩm mẫu
- `src/seed.js`
- ảnh local nằm ở `public/images/products/`

## 3. Light / Dark mode hoạt động thế nào?

CSS dùng biến như:

```css
:root {
  --bg: #f5f7fb;
  --surface: #ffffff;
  --text: #101828;
  --primary: #375dfb;
}
```

Dark mode ghi đè các biến:

```css
html[data-theme="dark"] {
  --bg: #090d16;
  --surface: #111827;
  --text: #f8fafc;
}
```

JavaScript chỉ đổi `data-theme` trên thẻ `<html>`. Vì toàn bộ component dùng biến CSS, tất cả trang đổi màu theo mà không cần viết hai bộ giao diện riêng.

Theme được lưu trong `localStorage`, nên reload trang vẫn giữ lựa chọn.

## 4. Vì sao ảnh cũ bị lặp?

Bản đầu dùng cùng một URL Unsplash cho mọi sản phẩm. Bản mới dùng 18 sản phẩm x 3 hình = 54 SVG local khác nhau.

Ví dụ:

```text
public/images/products/astrabook-pro-14-1.svg
public/images/products/astrabook-pro-14-2.svg
public/images/products/astrabook-pro-14-3.svg
```

`src/seed.js` gắn ba ảnh này vào bảng `product_images`.

Sau khi đổi code, phải chạy lại:

```cmd
npm run seed
```

để database đang có trên máy cập nhật ảnh mới.

## 5. Product variants

Một sản phẩm có nhiều phiên bản trong bảng `variants`.

Ví dụ:

- Standard: 25.990.000đ, tồn 12
- Premium: 29.888.500đ, tồn 8

Khi người dùng đổi select variant, `updateVariantUI()` trong `public/js/app.js` đọc `data-price` và `data-stock` rồi thay giá/tồn kho ngay trên giao diện.

Khi checkout, server **không tin giá do browser gửi lên**. Server lấy lại variant từ MongoDB Atlas và tự tính giá. Đây là điểm quan trọng để tránh người dùng sửa giá bằng DevTools.

## 6. Cart

Giỏ hàng được lưu ở trình duyệt:

```js
localStorage.setItem('computerhub_cart_v2', ...)
```

Vì vậy tăng/giảm số lượng không cần reload. `renderCart()` tính lại subtotal, thuế và phí vận chuyển ngay.

Nhưng khi đặt hàng, server vẫn kiểm tra lại tồn kho và giá thật trong database.

## 7. Checkout 3 bước

- Bước 1: giao hàng.
- Bước 2: discount + loyalty.
- Bước 3: payment method + xác nhận.

`checkDiscount()` gọi:

```text
POST /api/discount
```

Server kiểm tra mã có tồn tại và còn lượt sử dụng không. Nếu hợp lệ, client cập nhật preview tổng tiền trước khi khách thanh toán.

## 8. Loyalty points

Đề cho ví dụ 1.000.000 VND -> 100 points -> 100.000 VND.

Vì vậy:

```text
1 point = 1.000 VND
```

Điểm kiếm được:

```js
Math.floor(total / 10000)
```

Ví dụ:

```text
1.000.000 / 10.000 = 100 points
```

Khi dùng 100 points:

```text
100 x 1.000 = 100.000 VND giảm
```

## 9. Guest checkout

Guest không cần login.

Nếu email chưa tồn tại, hệ thống tự tạo account không có password ban đầu. Đơn vẫn gắn với account đó.

Ngay sau checkout, guest nhận một URL receipt tạm thời có JWT token. Nhờ vậy guest nhìn thấy trang đặt hàng thành công mà không bị ép login ngay.

Muốn sử dụng tài khoản về sau, người dùng có thể dùng Password Recovery để tạo password.

## 10. Registration theo đúng form tối giản của đề

Form tạo account chỉ lấy:

- Email
- Họ tên
- Địa chỉ giao hàng

Sau khi đăng ký, account được auto-login. Trong Profile, phần Security cho phép tạo password lần đầu. Sau đó việc đổi password sẽ yêu cầu nhập password hiện tại.

## 11. Reviews + WebSocket

Comment không bắt buộc login.

Rating sao bắt buộc login.

Khi có review mới:

```js
io.to(`product:${productId}`).emit('review:new', review)
```

Browser khác đang mở cùng sản phẩm sẽ nhận event và thêm review vào trang mà không reload.

## 12. Admin product management

Trang `admin/products` giờ có đủ các phần:

- Add product
- Update product
- Delete product
- Manage categories
- Update variant price
- Update variant stock

Các route tương ứng ở cuối `src/server.js`.

## 13. Responsive

Các breakpoint chính nằm cuối `public/css/app.css`:

- Desktop: 4 product cards/row.
- Tablet: 2–3 cards/row.
- Mobile: card chuyển dạng ngang, menu thu gọn, filter có nút mở, checkout thành 1 cột.

Bạn có thể test bằng Chrome:

```text
F12 -> Toggle device toolbar
```

## 14. Cách học code này mà không học vẹt

Khi học, đừng đọc cả project một lúc. Hãy theo thứ tự:

1. `views/home.ejs` — hiểu HTML/EJS.
2. `public/css/app.css` — hiểu class biến thành giao diện thế nào.
3. `public/js/app.js` — hiểu click, localStorage, fetch.
4. `src/server.js` route `/products` — hiểu request/response.
5. `src/models/index.js` + `src/mongodb.js` — hiểu schema Mongoose và kết nối MongoDB.
6. Route `/api/checkout` — ghép toàn bộ kiến thức lại.

Khi bạn hỏi tiếp, nên học từng đoạn 10–20 dòng rồi tự sửa một thay đổi nhỏ. Ví dụ: đổi màu nút, đổi số sản phẩm/trang, thêm một field, rồi xem kết quả. Cách đó sẽ giúp bạn biết chính xác code nằm ở đâu và sửa sai thế nào.

## 10. V6 có gì về bảo mật?

Mọi POST giờ cần CSRF token. Token được server đặt trong cookie và render vào `<meta name="csrf-token">`; JavaScript tự thêm `_csrf` vào form và gửi `X-CSRF-Token` cho `fetch`. Server so sánh hai token trước khi cho phép thay đổi dữ liệu.

Checkout vẫn **không tin giá trong localStorage**: server lấy lại variant thật từ MongoDB, kiểm tra tồn kho, giá, discount và điểm, sau đó ghi toàn bộ trong MongoDB transaction.

## 11. V6 scale như thế nào trong Docker?

`Nginx -> web1/web2`. Hai web instance dùng JWT nên không cần session RAM. Cả hai cùng đọc/ghi MongoDB Atlas nên dữ liệu không phụ thuộc filesystem container; Socket.IO dùng Redis adapter để review realtime đi qua các instance.
