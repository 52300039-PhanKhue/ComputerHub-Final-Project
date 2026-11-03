# Final manual test plan — V6 MongoDB

Run this before recording `demo.mp4` and again before zipping the submission.


## 0. MongoDB preflight
- `.env` has `MONGODB_URI` and `MONGODB_DB_NAME=computerhub_v6`.
- Run `npm run verify:syntax`.
- Run `npm run test:static`.
- Run `npm run seed`.
- Run `npm start`, open `/health`, confirm `mongoReady: true`.
- In MongoDB Atlas, verify collections such as `products`, `users`, `orders`, `variants`, `discounts` exist after seed.

## 1. Home / responsive / theme
- Open `/` in Light mode.
- Toggle Dark, refresh, confirm preference persists.
- Verify New Products, Best Sellers, Laptops, Monitors and Storage product sections.
- Test desktop, tablet and mobile widths in Chrome DevTools.
- Test mobile navigation and search.

## 2. Catalog
- `/products`: page numbers visible even when only one page under a filtered result.
- Navigate page 1/2/3 with seed data.
- Search by a keyword.
- Filter brand.
- Set min/max price.
- Filter rating.
- Filter category.
- Test A-Z, Z-A, price asc, price desc.

## 3. Product detail
- Verify brand and descriptions.
- Click all 3 gallery images.
- Switch Standard/Premium; verify price/stock changes.
- Confirm each seeded product has at least 2 variants.
- Guest: post comment with no star.
- Guest: attempting to send star must be unavailable/rejected.
- Logged-in user: post comment + star.
- Open same product in second window; demonstrate realtime review.

## 4. Cart
- Add product.
- Add same variant again.
- Change quantity without reload.
- Remove product without reload.
- Verify subtotal, 8% tax, shipping rule.

## 5. Guest checkout
- Logout.
- Add product and checkout without login.
- Complete all three steps.
- Check `SAVE5` preview.
- Place order.
- Verify guest success/receipt screen.
- With Docker, open Mailpit `http://localhost:8025` and verify confirmation email + account setup link.
- Set password via link, login, verify previous order appears in history.

## 6. Logged-in checkout / addresses / loyalty
- Login `demo@computerhub.vn / Demo@123456`.
- Verify default address pre-fills checkout.
- Add another address; set it default; delete a non-default address.
- Apply discount.
- Use some loyalty points.
- Place order and confirm point balance changes correctly.

## 7. Password recovery
- Logout.
- Use Forgot password for demo customer.
- Docker: open Mailpit and click reset link.
- Set new >=8-character password.
- Login with new password.
- Restore demo password before presentation if desired by reseeding a clean Docker volume.

## 8. Admin
Login `admin@computerhub.vn / Admin@123456`.

Dashboard:
- Customer count, new users, orders, revenue.
- Best-selling chart + recent orders.

Advanced dashboard:
- Year (default), quarter, month, week.
- Custom start/end.
- Orders, revenue, profit, units and product types.

Products:
- Add a product with 5 description lines; verify auto 2 variants + 3 images.
- Update product and image URLs.
- Update both variant prices/stocks.
- Add/update/delete an unused category.
- Delete test product and verify no server crash.

Users:
- Edit customer name/email.
- Ban/unban customer.

Orders:
- Verify newest first and 20/page.
- Filter today/yesterday/week/month/custom date range.
- Open order detail.
- Change pending -> confirmed -> shipping -> delivered.
- Confirm status history newest first.

Discounts:
- Create exactly 5-character alphanumeric code.
- Set usage max <=10.
- Apply it in checkout.
- Return to admin and verify used count + order list.

## 9. Docker/scaling
- `docker compose up -d` only.
- Store opens at port 3000.
- Mailpit opens at port 8025.
- `docker compose ps` shows web1/web2 healthy.
- Repeated `/health` requests show web instances.

## 10. Automated smoke
After `npm install`:

```bash
npm test
```

Expected final line contains: `MongoDB V6 smoke test passed`.


## Bổ sung test hồi quy V6.2 (không được bỏ qua)

- [ ] Có biến thể tồn kho 2: thêm vào giỏ rồi nhập 99 => UI phải giới hạn ở 2 và có thông báo.
- [ ] Mã SAVE5 đã kiểm tra giảm 5%; sửa thành ABCDE => giảm cũ biến mất, chưa được phép xác nhận đơn khi chưa kiểm tra lại.
- [ ] Dùng admin đổi giá biến thể khi khách còn giữ giỏ cũ; mở giỏ/checkout => thấy giá mới và cảnh báo.
- [ ] Admin sửa giá biến thể thấp nhất => giá catalog/filter/sort theo mức mới.
- [ ] Thử đồng thời 2 tab/sessions áp coupon/đặt sản phẩm gần hết kho => server không được tạo đơn vượt tồn hoặc quá lượt.
- [ ] Guest đặt COD => MongoDB có orders/order_items, người mua có user, giảm tồn kho.
- [ ] Chọn Bank Transfer => đơn vẫn pending và không được trình bày là đã xác minh thanh toán ngân hàng.
- [ ] Docker `docker compose up -d` trên máy khác, thử cả web1/web2, Socket.IO, email Mailpit và login.
