# BÁO CÁO SỬA VÀ TEST – COMPUTERHUB V6.2

**Người thực hiện hồ sơ:** Phan Khuê – MSSV 52300039 – Lớp 23050261 – Khóa 27  
**Đơn vị:** Trường Đại học Tôn Đức Thắng – Phân hiệu Khánh Hòa – Kỹ thuật phần mềm  
**Đối chiếu:** NodeJS Final Project(2).pdf (13 trang) và ảnh LMS ngày 30/10/2026.

## Các lỗi đã sửa trong source

| Hạng mục | Trước | Đã chỉnh |
|---|---|---|
| Giỏ hàng | Sửa số lượng chỉ giới hạn 99 | Lưu tồn kho và giới hạn theo giá trị đã đồng bộ |
| Mã giảm giá | Đổi code mà vẫn giữ % cũ | Reset phần trăm và trạng thái đã xác minh |
| Catalog | Mặc định UI A–Z, backend theo ngày | Backend mặc định A–Z |
| Best sellers | Bỏ sản phẩm is_new=true | Chọn toàn bộ sản phẩm active |
| Tổng tiền checkout | localStorage có thể khác MongoDB | API quote và từ chối đơn khi giá thay đổi |
| Admin giá biến thể | Có thể lệch base_price trong catalog | Tính lại base_price theo min variant.price |
| Bank Transfer | Có nguy cơ hiểu lầm là trả tiền online | Ghi rõ chỉ tạo đơn pending, không xác minh chuyển khoản |

## Kết quả đã chạy trong môi trường sửa

- **PASS:** `npm run verify:syntax` (cú pháp các file JS được liệt kê).
- **PASS:** `npm run test:quantity` (kiểm tra số lượng).
- **PASS:** `npm run test:ui-regression` (7 nhóm kiểm tra logic giỏ, mã, giá và tồn kho giả lập).
- **PASS:** `node kiem_tra_rubric.js` (13/13 kiểm tra hiện diện mã, 7 mục CHECK chưa xác minh).
- **CHƯA CHẠY:** `npm run test:static` do thiếu thư viện EJS/Mongoose.
- **CHƯA CHẠY:** `npm test` vì không có MONGODB_URI/dịch vụ MongoDB thật và dependencies.
- **CHƯA CHẠY:** `docker compose up -d` vì môi trường không có Docker daemon.
- **CHƯA TEST:** giao diện thực tế, OAuth, email, responsive, container scaling, thanh toán thật.
- **Thử cài thư viện offline:** `npm ci --offline --ignore-scripts` báo ENOTCACHED do thiếu npm cache.

Các test sử dụng `node:vm` mô phỏng frontend. Kết quả không đồng nghĩa trang web đã được kiểm tra end-to-end.

## Để hướng đến 10/10 theo đề

1. Thiết lập môi trường thực, chạy `npm ci`, `npm run test:static`, `npm test` và Docker.
2. Chạy thử đơn guest, khách đăng nhập có mã/điểm, thay đổi tồn kho/giá, lịch sử đơn và admin.
3. Thử email qua Mailpit/SMTP, Google OAuth với credentials cá nhân hợp lệ.
4. Dùng Chrome DevTools và máy thật xác nhận UI/responsive, kiểm tra dashboard, dữ liệu thời gian.
5. Quay demo 1080p có âm thanh, cung cấp GitHub Insights thật và Rubrik.docx của thầy.
6. Vì dự án làm cá nhân, xin thầy xác nhận hình thức nộp và tên ZIP một MSSV trước 23:59 ngày 05/12/2026; không thêm MSSV không có thật.

**Không thể kết luận chắc chắn điểm 10/10 chỉ từ mã nguồn.** Quyền quyết định rubric và việc đánh giá demo thuộc giảng viên.

**Lưu ý cá nhân:** theo PDF, nhóm phải 2–3 người; làm cá nhân không được 0.5 điểm Teamworking và phải xin thầy xác nhận có chấp thuận nộp không.
