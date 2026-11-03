# V6.1 – thay doi co the kiem chung

- `src/server.js`: tu choi so luong checkout sai (nguyen 1..99) **truoc khi mo transaction**; bo clamp nguyen de so le khong the tao don/tru kho.
- `tests/smoke.js`: them kiem tra so luong sai va assert khong ghi users/orders/stock.
- `tests/quantity-source-check.js`: test xac nhan guard tinh khong can MongoDB.
- `public/js/app.js`: chuan hoa so luong client va step=1.
- Thay `new: true` deprecation bang `returnDocument: 'after'` o server.
- `docker-compose.yml`: them mongodb/rs0 va docker/mongo-init.js, MongoDB duoc dong goi rieng thay vi bat buoc Atlas.
- `KIEM_TRA_1_LAN.cmd`: kem bo kiem tra de ban tu chay tren Windows.
- `.env`: khong dua vao ZIP; su dung .env.example.

Chua duoc test bang Docker Desktop thuc te hoac OAuth Google. Cac yeu cau ngoai ma nguon nhu video / rubric / git khong the tao tu test.
