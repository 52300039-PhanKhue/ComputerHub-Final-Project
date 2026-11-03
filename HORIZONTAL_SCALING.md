# Horizontal scaling — ComputerHub V6 MongoDB

Kiến trúc Docker:

```text
Browser
  -> Nginx
      -> web1 (Express)
      -> web2 (Express)
          -> MongoDB Atlas (shared persistent database)
          -> Redis (Socket.IO adapter)
          -> Mailpit (SMTP demo)
```

## Vì sao hai web instance dùng chung được?

- Authentication dùng JWT cookie nên không phụ thuộc session RAM của một instance.
- Dữ liệu users/products/orders/stock/discount nằm trên MongoDB Atlas, không nằm trong filesystem container.
- Socket.IO dùng Redis adapter nên event review realtime có thể đi qua web1/web2.
- Nginx phân phối request giữa hai instance.

## Cách demo

1. Đảm bảo `.env` có `MONGODB_URI`.
2. Chạy `docker compose up -d --build`.
3. Mở `http://localhost:3000`.
4. Chạy nhiều lần:

```bash
curl -I http://localhost:3000/health
```

Header `X-ComputerHub-Instance` sẽ cho thấy `web1` hoặc `web2`.

`/health` còn trả `mongoReady: true`, chứng minh instance đang dùng MongoDB.

## Lưu ý

MongoDB Atlas là database ngoài Docker. `docker compose down -v` không xóa dữ liệu Atlas. Muốn reset dữ liệu demo, dùng database test riêng hoặc xóa database/collections có chủ đích rồi chạy `npm run seed`.
