# Security

## Reporting a vulnerability

Report privately using GitHub’s “Report a vulnerability” entry in the repository Security tab if the repository owner has enabled private vulnerability reporting. If that option is unavailable, contact the owner privately before sharing exploit details. Do not publish session tokens, personal data, payment information, or working exploits in public issues. Include the affected route, a minimal reproduction using accounts you own, expected behavior, and impact. Do not test purchases with other people’s accounts or disrupt live inventory.

## Review completed 2026-11-12

This was a focused source review and local test run, not a guarantee that the entire deployed service is free of vulnerabilities.

Fixed:

- Public password signup trusted unverified email matches for owner/admin roles and automatically privileged the first account. Public password signups now always receive ordinary roles, configured privileged addresses cannot be claimed that way, and only a configured server bootstrap or verified Discord email may establish privileged access. Registration restrictions apply even to the first public account.
- OAuth silently attached accounts by matching email without checking Discord's verified flag. Only verified provider emails are trusted; matching emails no longer silently merge accounts. Linking requires the existing signed-in Settings flow, preventing account pre-hijacking through an attacker-created password account.

- Unauthenticated catalog reads performed Stripe requests for every reservation. Catalog reads now only query the database; a bounded, single-flight background job handles reconciliation.
- A buyer could hold multiple stock items at once. A database transaction and per-buyer advisory lock enforce one pending order per account, with row locks protecting each unique name.
- Checkout creation could leave an unrecorded payment session after a timeout or process failure. Orders and their exact Stripe payload are now durable before the external call; retries use the same idempotency key. Payment fulfillment also handles a webhook arriving before the checkout ID is persisted.
- Staff could modify staff roles or edit owner accounts. Only the owner may perform those operations. Other administrative stock controls still require the existing server-side admin check.
- Browser writes without an Origin header were allowed without consulting Fetch Metadata. Cross-site browser writes without a trusted Origin are now blocked. Signed server-to-server webhooks still work and require their Stripe signature.
- Account, admin, market and billing responses now use no-store caching. Public stock responses exclude buyer IDs, order IDs and Stripe checkout details.
- Unknown one-time Checkout sessions can no longer grant Premium. The existing verified subscription flow grants the plan; username purchases use their own verified fulfillment path.

Verified protections:

- Amount, currency, buyer, order and checkout identity must match before ownership is granted. Browser prices and success URLs never grant ownership.
- Stock prices and listing status are controlled on the server. Owned and reserved stock cannot be repriced. All SQL values are parameterized.
- Gifting and activation require the current owner. Gifting requires confirmation of the recipient's original username. A replayed payment cannot take a gifted name back.
- Reservation cancellation only affects the current buyer and only releases stock after Stripe confirms expiration. Ambiguous network failures retain the order rather than making the name available to another buyer.

Tests live in `tests/security.test.mjs` and `tests/usernames.test.mjs`. The front-end specific/random selectors and signed-out purchase flow were checked in the browser against a local, ephemeral test database. Production code contains no seeded stock.

Both tracked lockfiles were checked against the npm advisory bulk endpoint on the review date; the endpoint returned no known advisories for their pinned package versions. This does not rule out unknown issues, configuration errors, or vulnerabilities in the live deployment. No live payment or external penetration test was performed. Existing account roles are retained: the owner should review current privileged accounts for unexpected grants created before these fixes.

References: [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests), [Stripe webhooks](https://docs.stripe.com/webhooks).
