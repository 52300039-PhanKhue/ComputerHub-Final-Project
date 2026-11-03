# FINAL VERIFICATION — ComputerHub V6 MongoDB

## 1. Kiểm tra code trước khi chạy

```bash
npm install
npm run verify:syntax
npm run test:static
npm audit
```

Kỳ vọng:
- syntax PASS
- static MongoDB verification PASS
- không còn `better-sqlite3`, `src/db.js`, `data/store.db`, `db.prepare(...)`
- 12 Mongoose models chính được load
- 22 EJS templates compile
- không còn inline onclick/onchange/onsubmit gây lỗi CSP

## 2. Kiểm tra MongoDB Atlas

`.env` cần:

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=computerhub_v6
```

Sau đó:

```bash
npm run seed
npm start
```

Mở `/health`, cần thấy `mongoReady: true`.

## 3. Automated Mongo smoke

```bash
npm test
```

Test dùng database tạm `computerhub_smoke_...`, sau test sẽ drop database tạm. Test cover:
- rendering + pagination
- Helmet/CSP + CSRF
- SAVE5
- guest comment/rating rule
- guest checkout + auto account
- Mongo persistence
- admin login/guard
- archive/restore product
- order status history
- 404

## 4. Manual regression

Test theo `TEST_PLAN.md`, đặc biệt:
- add to cart
- discount button
- checkout
- order history
- admin status update
- product/stock admin
- profile addresses
- user ban/unban
- responsive + light/dark

## 5. External items

- Google OAuth cần credentials thật.
- Email local Docker dùng Mailpit.
- GitHub Insights, demo.mp4 và Rubrik.docx phải do nhóm bổ sung theo yêu cầu giảng viên.

Không gọi project là “không thể có bug”. Bản V6 được rà để loại các lỗi đã biết và chuyển data layer sang MongoDB hoàn toàn; môi trường Atlas/Docker thật vẫn phải được chạy một vòng trên máy nộp.

## 6. Kết quả rà soát trước khi đóng gói (môi trường tạo bản V6)

Đã chạy và PASS:
- `npm run verify:syntax`
- `npm run test:static`
- `npm audit --omit=dev --offline` -> 0 vulnerabilities
- scan không còn runtime SQLite / `better-sqlite3`
- scan không còn inline event handler trong views/public JS
- Docker Compose YAML parse thành công

`npm test` đã được gọi thử nhưng môi trường đóng gói này không truy cập DNS ra MongoDB Atlas, nên dừng tại bước kết nối SRV với lỗi `querySrv ECONNREFUSED`. Đây là giới hạn mạng của môi trường đóng gói, không được ghi nhận là một smoke PASS. Hãy chạy `npm test` trên máy Windows có thể kết nối Atlas trước khi nộp; test dùng DB tạm và không sửa DB chính.
