COMPUTERHUB V6.2 - WEB PROGRAMMING WITH NODE.JS - FINAL PROJECT
===============================================================
Dự án: cửa hàng máy tính và linh kiện máy tính (Node.js/Express/EJS/Mongoose/MongoDB)
Sinh viên: Phan Khuê  |  MSSV: 52300039  |  Lớp: 23050261  |  Khóa: 27
Ngành: Kỹ thuật phần mềm  |  Trường Đại học Tôn Đức Thắng - Phân hiệu Khánh Hòa
Trạng thái: BẢN ĐÃ SỬA MÃ NGUỒN, CHƯA PHẢI BẢN ĐƯỢC XÁC NHẬN ĐẠT 10/10.

I. CHẠY LOCAL BẰNG WINDOWS (MONGODB ATLAS)
1. Cài Node.js >= 20 và tạo bản sao database để thử nghiệm.
2. Tại thư mục chứa package.json: copy .env.example thành .env.
3. Điền MONGODB_URI, MONGODB_DB_NAME và JWT_SECRET đủ mạnh vào .env.
4. Mở terminal chạy: npm ci
5. Chạy: npm run verify:syntax
6. Chạy: npm run test:quantity
7. Chạy: npm run test:ui-regression
8. Chạy: npm run test:static
9. Chạy: npm test (sử dụng database SMOKE RIÊNG; cần URI MongoDB hỗ trợ transactions)
10. Chỉ chạy `npm run seed` trong DATABASE DEMO ĐÃ SAO LƯU / DB MỚI.
11. Chạy: npm start
12. Mở trang: http://localhost:3000  |  health: http://localhost:3000/health

Lệnh kiểm tra nhanh trên Windows: KIEM_TRA_1_LAN.cmd
Demo sau khi seed database thử:
  Khách: demo@computerhub.vn / Demo@123456
  Quản trị: admin@computerhub.vn / Admin@123456
  Mã giảm: SAVE5 (5% / tối đa 10 lượt)
CẢNH BÁO: tài khoản/mật khẩu demo phải đổi nếu đưa hệ thống lên internet.

II. CHẠY DOCKER COMPOSE (MONGODB TRONG CONTAINER)
Trong thư mục chứa docker-compose.yml, với Docker Desktop đã chạy:
  docker compose up -d
Lần đầu có thể mất thời gian build/pull image và seed dữ liệu thử nghiệm.
- Web (Nginx phân tải hai web instances): http://localhost:3000
- Mailpit thử email: http://localhost:8025
- Database Docker là MongoDB replica set rs0, KHÔNG PHẢI Atlas theo mặc định.
- Nếu cần dùng database ngoài, Docker có thể nhận DOCKER_MONGODB_URI từ môi trường.
- Dừng: docker compose down
- KHÔNG tự dùng docker compose down -v khi dữ liệu demo cần giữ.
Chú ý: `npm start` và Docker đều dùng cổng 3000; chỉ chạy một cách một lúc.

III. CHỨC NĂNG CÓ MÃ NGUỒN
Khách: trang chủ/danh mục/tìm kiếm/lọc/sắp xếp/phân trang, chi tiết/biến thể,
bình luận và đánh giá sao, giỏ hàng, 3 bước thanh toán, mua không đăng nhập,
profile/nhiều địa chỉ, đơn và lịch sử trạng thái, coupon, tích điểm, email.
Admin: dashboard/analytics, quản lý sản phẩm/biến thể/danh mục, khách hàng,
đơn hàng/trạng thái và mã giảm giá.

IV. CẢNH BÁO VÀ GIỚI HẠN QUAN TRỌNG
- Google OAuth yêu cầu GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET thật, chưa tích hợp sẵn bí mật.
- Email local yêu cầu SMTP; với Docker thử qua Mailpit.
- Chuyển khoản ngân hàng CHỈ LÀ LUỒNG DEMO TẠO ĐƠN CHỜ XÁC NHẬN;
  không có cổng thanh toán, không xác minh tiền về ngân hàng. Không coi là đã thanh toán.
- Dữ liệu giỏ trong localStorage mang tính tạm; /api/cart/quote cập nhật giá và tồn kho
  từ MongoDB trước khi đặt đơn. Server luôn kiểm tra lại giá, kho, coupon, điểm.
- Giá sản phẩm trên catalog = mức thấp nhất của các biến thể; admin sửa giá từng biến thể.
- Điểm: 1 điểm = 1.000 VND; tích 10% giá trị đơn = floor(total/10000) điểm.
- Điểm sử dụng tối đa = số điểm đang có hoặc tổng tiền đơn / 1.000, lấy mức thấp hơn.
- `npm run seed` có thể reset tài khoản demo, coupon và cập nhật dữ liệu mẫu!
- `npm test` chỉ là smoke test: không chứng minh đã đạt toàn bộ rubric 10 điểm.

V. NỘP BÀI
LMS hiển thị hạn nộp 23:59 ngày 05/12/2026; mỗi nhóm nộp một file ZIP.
Mẫu LMS cho nhóm là StudentCode1_StudentCode2_final. Sinh viên xác nhận được phép nộp CÁ NHÂN. ZIP hồ sơ này sử dụng tên 52300039_final.zip.
Ngoài mã nguồn còn cần demo.mp4 1080p có lời thuyết minh, chỉ dùng bằng chứng Git thật nếu có,
Rubrik.docx do giảng viên phát, README và hồ sơ khác theo PDF.
ĐỌC: HUONG_DAN_NOP_BAI_2026.txt + BAO_CAO_SUA_VA_TEST.md.
Hình thức: cá nhân (01 sinh viên). PDF yêu cầu nhóm 2–3 và không tính 0.5 điểm teamwork nếu làm một mình. Sinh viên đã xác nhận hình thức làm cá nhân được chấp nhận; điểm teamwork theo rubric gốc có thể không có.
