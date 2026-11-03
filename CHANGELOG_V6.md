# CHANGELOG V6 — MongoDB migration

## Database
- Removed SQLite runtime and `better-sqlite3` dependency.
- Removed `src/db.js` and local `data/store.db` usage.
- Added Mongoose models for users, addresses, categories, products, images, variants, reviews, discounts, orders, order items, status history and password resets.
- Added counter collection to preserve simple numeric IDs used by existing routes/views.
- `src/seed.js` now seeds MongoDB Atlas idempotently.
- Server waits for MongoDB before listening.

## Checkout/data integrity
- Checkout now runs in a MongoDB transaction.
- Stock decrement is conditional and atomic.
- Discount usage increment is conditional and atomic.
- Order, items, status history and loyalty updates are persisted in MongoDB.
- Password-reset/account-setup tokens are stored in MongoDB.

## Frontend bug fixes
- Removed broken inline `onclick` from Add to Cart.
- Removed broken inline `onclick` from discount check.
- Removed inline cart `onclick/onchange` and moved to event delegation.
- Removed inline confirm handlers and replaced with `data-confirm` listeners.
- CSP now blocks inline event attributes (`script-src-attr 'none'`).

## Docker/scaling
- Docker instances share MongoDB Atlas rather than a SQLite volume.
- `/health` reports Mongo readiness.
- Redis Socket.IO adapter and Mailpit remain supported.

## Verification
- Added `npm run test:static`.
- Mongo smoke test uses an isolated temporary Mongo database and drops it after completion.
