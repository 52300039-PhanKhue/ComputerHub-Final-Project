# ComputerHub V6.2 — Điều chỉnh ngày 30/10/2026

- Sửa lựa chọn sắp xếp mặc định từ backend theo tên A–Z cho khớp form.
- Sửa Best Sellers: mọi sản phẩm đang hoạt động đều đủ điều kiện xếp theo sold_count.
- Đưa tồn kho vào thông tin giỏ; giới hạn tăng số lượng theo tồn kho đã biết.
- Mã giảm giá được vô hiệu hóa ngay khi người dùng sửa ô và chống kết quả API trả về chậm.
- Thêm `/api/cart/quote` để lấy giá, tồn kho, tên biến thể thực tế từ MongoDB.
- Trước khi checkout: đồng bộ giá/kho, yêu cầu xác nhận lại nếu có thay đổi.
- Server checkout từ chối giá hiển thị không khớp giá thực, tránh đổi giá bất ngờ.
- Admin đồng bộ giá cơ bản trên trang danh mục từ biến thể rẻ nhất khi cập nhật giá.
- Cảnh báo Bank Transfer chỉ demo, không xác minh giao dịch ngân hàng.
- Thêm 7 kiểm tra hồi quy frontend, bổ sung test smoke quote + giá lỗi thời.
- Cập nhật hồ sơ sinh viên, hướng dẫn chạy và checklist nộp theo thông báo LMS.

Không thay đổi nội dung đánh giá rubric chính thức. Không tạo video, minh chứng GitHub
hay thiết lập OAuth/SMTP thay cho người sở hữu tài khoản.
