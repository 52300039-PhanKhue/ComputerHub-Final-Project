# Checklist nộp Node.js cuối kỳ — Phan Khuê (52300039) — LÀM CÁ NHÂN

**Theo ảnh LMS ngày 30/10/2026:** hạn nộp **23:59, 05/12/2026**; một ZIP cho mỗi nhóm; mẫu `StudentCode1_StudentCode2_final`.

- [ ] Hỏi giảng viên có đồng ý cho làm **một mình** dù PDF yêu cầu nhóm 2–3 người hay không.
- [ ] Xin thầy xác nhận **tên folder/ZIP dành cho một MSSV**; `52300039_final.zip` chỉ là tên đề xuất, chưa được duyệt.
- [ ] Chấp nhận nếu được phép làm cá nhân thì mục **Teamworking 0,5 điểm không được tính** theo rubric PDF.
- [ ] Chạy `npm ci`, `npm run verify:syntax`, `npm run test:quantity`, `npm run test:ui-regression`, `npm run test:static`, `npm test` ở máy có dịch vụ thật.
- [ ] Chạy Docker từ bản giải nén sạch: `docker compose up -d`; kiểm tra `/health`, email, reverse proxy, web1/web2.
- [ ] Test thủ công toàn bộ mục trong `TEST_PLAN.md`; thử guest checkout, hoàn tiền/đơn bị lỗi, coupon, points, admin, trạng thái.
- [ ] Cấu hình và thử Google OAuth thật; kiểm tra email Mailpit/SMTP và khôi phục mật khẩu.
- [ ] Kiểm tra chuyển khoản: bản hiện tại chỉ mô phỏng chọn phương thức; không tự nhận là thanh toán ngân hàng đã xác thực.
- [ ] Quay `demo.mp4` thật, >=1080p, âm thanh rõ, demo tất cả mục tự đánh giá.
- [ ] Không giả mạo teamwork hoặc Git; chỉ đưa bằng chứng Git/commit thực tế nếu có.
- [ ] Điền `Rubrik.docx` **mẫu do giảng viên phát** trung thực, không tự khai đã chạy các chức năng chưa thử.
- [ ] Đặt mã nguồn trong `source/` và thêm README, demo.mp4, Rubrik, báo cáo, bonus khi có bằng chứng.
- [ ] Không cho `.env`, tokens, node_modules, mật khẩu, cache, log vào ZIP.
- [ ] Kiểm tra ZIP cuối trên máy khác rồi nộp theo đúng mẫu thầy đã duyệt.

**Trạng thái:** bản source V6.2 đã sửa một số lỗi và kiểm tra offline một phần; CHƯA xác nhận 10/10, CHƯA là bộ hồ sơ nộp hoàn chỉnh.
