# ComputerHub V3 — final submission hardening

Compared with Enhanced V2, V3 focuses on rubric gaps, grading reliability and security rather than only visual changes.

## Rubric coverage fixes
- Landing page now renders actual product selections for three additional categories: Laptops, Monitors and Storage, in addition to New Products and Best Sellers.
- Advanced analytics defaults to yearly view as requested.
- Product management can update the three product image URLs as well as details and variant stock/price.
- New orders start at `pending` and status history records transitions.
- Guest checkout emails can include a password-setup link so an automatically created guest account can later log in and see its order.

## Security / correctness
- CSRF protection for all POST mutations and JSON checkout/discount API calls.
- Auth/reset rate limiting plus existing global rate limiting.
- Safe post-login redirects.
- POST logout.
- Production JWT secret validation.
- Cookie security is configurable for local HTTP Docker vs HTTPS production.
- Password-reset email tokens are single use and expiry comparison is fixed.
- Server-side phone/address validation.
- Atomic checkout with conditional inventory decrement.
- Discount usage is rechecked/conditionally incremented inside the checkout transaction.
- Random suffix added to order numbers to reduce collision risk across replicas.
- Better 500 handling and `/health` endpoint.

## Email / demo reliability
- Docker Compose includes Mailpit; order confirmation and password recovery can be demonstrated without an external SMTP account.
- Forgot-password no longer depends on printing the reset link for the Docker demo.

## Horizontal scaling demonstration
- Nginx load balancer.
- Two independent Node.js/Express web instances.
- JWT-based stateless authentication.
- Shared externalized SQLite volume with WAL/busy timeout for the controlled single-host coursework demo.
- Redis-backed Socket.IO adapter so realtime reviews work across web replicas.
- Per-instance response header and health endpoint for evidence.

## Self-contained charts
- Chart.js is installed as a project dependency and served locally rather than loaded from a public CDN.

## Submission support
- `RUBRIC_CHECKLIST.md`
- `TEST_PLAN.md`
- `HORIZONTAL_SCALING.md`
- `GOOGLE_OAUTH_SETUP.md`
- `DEMO_SCRIPT.md`
- `SUBMISSION_CHECKLIST.md`
- automated smoke-test script (`npm test`)
