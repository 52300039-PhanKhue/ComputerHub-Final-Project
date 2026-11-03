# ComputerHub V5 — Final hardening pass

V5 is the final code-hardening pass over V4. It focuses on issues that could cause rubric/demo failures rather than adding unrelated features.

## Fixed / improved
- Safe product archival instead of unsafe hard-delete, preserving historical order/statistics references.
- Public catalog/detail/checkout ignore archived products; admin can restore them.
- Realtime review event updates the visible rating count/average/stars as well as the comment list.
- Strict star-rating validation for malformed values.
- Server-side payment-method allow-list.
- Profit calculation now subtracts merchandise cost, discount and redeemed loyalty value.
- Advanced dashboard "product types" now means distinct sold categories.
- Category validation before product create/update.
- Stronger variant price/cost/stock validation.
- Light mode is the true first-run default; user preference is still remembered.
- Helmet Content-Security-Policy enabled with project-compatible directives.
- Nodemailer moved to the supported 10.x line.
- Version/document labels aligned to V5.
- Expanded smoke test for guest checkout, guest rating rejection, admin auth, product archive/restore, and isolated test database.

## External items still required
Real Google OAuth credentials, real team Git/GitHub evidence, demo.mp4, instructor Rubrik.docx, and final testing on the grading environment cannot be fabricated by source code.
