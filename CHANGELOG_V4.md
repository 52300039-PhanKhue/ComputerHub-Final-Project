# ComputerHub V4 — Final Verified UI & QA Pass

## Mục tiêu
V4 tập trung vào hai việc: hoàn thiện giao diện để nhìn giống một cửa hàng công nghệ thực tế hơn và làm bộ kiểm thử an toàn hơn để không tác động vào database đang dùng.

## Thay đổi chính
- Hero trang chủ dùng chính sản phẩm thật trong catalog thay cho mô hình minh họa CSS đơn giản.
- Thiết kế lại hero, category cards, promo coupon, product cards, service cards và footer.
- Dark mode được nâng sáng hơn, giảm cảm giác đen nặng nhưng vẫn giữ tương phản.
- Header/category navigation có icon, focus state và accessibility tốt hơn.
- Nút menu mobile cập nhật `aria-expanded`.
- Bổ sung `prefers-reduced-motion` cho người dùng hạn chế animation.
- Product card có metadata rõ hơn và CTA dễ nhận biết.
- Smoke test sử dụng database riêng `data/store.smoke.db`; chạy `npm test` không còn đụng vào `store.db` đang dùng.
- Smoke test kiểm tra thêm pagination, Helmet security header, 404 và lỗi render `undefined`.
- Version nâng lên 4.0.0.

## Không giả lập credential
Google OAuth vẫn cần credential Google thật. SMTP public vẫn cần cấu hình SMTP thật; Docker Compose đã có Mailpit để demo email local.
