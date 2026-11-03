# ComputerHub V6.2 — rubric checklist (tự kiểm tra, chưa phải điểm chính thức)

Use this as a self-evaluation aid. The instructor's official `Rubrik.docx` still needs to be completed when provided.

## Customer features — 6.0

| Requirement | Implementation / demo location | Status |
|---|---|---|
| Social Media Authentication | Google Passport routes `/auth/google`, callback; configure credentials | Có mã - thiếu credentials Google OAuth |
| View profile | `/profile` | Có mã - cần test thực tế |
| Change password | `/profile/password` | Có mã - cần test thực tế |
| Password recovery | `/forgot-password`, expiring email token | Có mã - cần test thực tế |
| Multiple delivery addresses | `/profile` address management | Có mã - cần test thực tế |
| Purchase history | `/profile` | Có mã - cần test thực tế |
| Purchase detail | `/orders/:number` | Có mã - cần test thực tế |
| Landing Page | `/` | Có mã - cần test thực tế |
| Product Catalog / categories | `/products` + category query | Có mã - cần test thực tế |
| Pagination | `/products?page=N`, pages always rendered | Có mã - cần test thực tế |
| Product detail | `/products/:slug` | Có mã - cần test thực tế |
| Product variants | Product detail; 2 seeded variants/product | Có mã - cần test thực tế |
| Keyword search | `/products?q=...` | Có mã - cần test thực tế |
| Filtering | brand + min/max price + rating + category | Có mã - cần test thực tế |
| Ordering | A-Z, Z-A, price asc/desc | Có mã - cần test thực tế |
| Display cart | `/cart` | Có mã - cần test thực tế |
| Update cart realtime | local JS rerender, no reload | Có mã - cần test thực tế |
| Checkout process | `/checkout`, 3 steps | Có mã - cần test thực tế |
| Discount during purchase | `SAVE5` / admin codes, preview + server validation | Có mã - cần test thực tế |
| Email after order | Nodemailer; Mailpit works in Docker | Có mã - cần test thực tế |
| Product comment | guest allowed | Có mã - cần test thực tế |
| Star rating | login required | Có mã - cần test thực tế |
| Realtime review/rating | Socket.IO; Redis adapter in scaled Docker | Có mã - cần test thực tế |
| Loyalty program | earn/redeem; 1 point = 1,000 VND | Có mã - cần test thực tế |

Landing-page category rule: in addition to New Products and Best Sellers, `/` renders actual product selections for **Laptops, Monitors and Storage**.

## Admin features — 2.0

| Requirement | Implementation / demo location | Status |
|---|---|---|
| Product Management | `/admin/products` add/update/delete/images/categories/stock | Có mã - cần test thực tế |
| User Management | `/admin/users` update + ban/unban | Có mã - cần test thực tế |
| Discount Management | `/admin/discounts` and applied orders | Có mã - cần test thực tế |
| Order list | `/admin/orders`, newest first, 20/page, time filters | Có mã - cần test thực tế |
| Order detail + status | `/admin/orders/:id` | Có mã - cần test thực tế |
| Simple Dashboard | `/admin` | Có mã - cần test thực tế |
| Advanced Dashboard | `/admin/analytics`, default year + quarter/month/week/custom | Có mã - cần test thực tế |

## Other requirements — 2.0

| Requirement | Evidence | Status |
|---|---|---|
| UI/UX | V6 responsive Light/Dark design, polished store/admin flows | Có giao diện - cần trình duyệt, giảng viên quyết định |
| Teamworking | Real GitHub Insights screenshots + real history | **Cá nhân: mục này theo đề = 0/0.5; không giả chứng cứ nhóm** |
| Responsive | Desktop/tablet/mobile CSS breakpoints + responsive components | Có mã - cần test thực tế |
| Horizontal scaling | Nginx + web1 + web2 + externalized shared data + JWT stateless auth + Redis Socket.IO adapter | Có cấu hình Docker; chưa kiểm tra vận hành thực |

## Deployment

`docker compose up -d` là phương án đóng gói ưu tiên; PHẢI chạy thử trên máy có Docker trước khi nộp.

## Mandatory non-code submission items

Cần nộp các mục thực tế sau (sau khi thầy duyệt làm cá nhân): `demo.mp4`, real `git/` screenshots, official `Rubrik.docx`, final folder/ZIP naming, and grading credentials in `Readme.txt`.

**Thông báo LMS 30/10/2026:** mẫu ZIP nhóm `StudentCode1_StudentCode2_final`; do làm một mình nên chưa có mẫu tên hợp lệ được duyệt. Xin thầy xác nhận trước khi nộp, hạn nộp **05/12/2026 23:59**.
