# Marketplace and single-alias rollout

## Deployment

Deploy the frontend and backend together. Backend startup runs the idempotent single-alias migration: it clears `users.alias2` and `users.alias2_updated_at`, and requires an alias for accounts with no primary alias. It does not delete purchased username inventory. Backup imports also clear retired secondary values. The retired secondary-alias mutation returns HTTP 410.

New Discord accounts must choose their one alias before using the dashboard. Profile saves and catalog checkout also enforce this on the backend. Existing users with a primary alias keep it. Existing customized profiles keep their saved designs; new empty profiles start with the minimal name card.

## Create a product

1. Open Dashboard → Account → Admin → Marketplace.
2. Create a product with a unique slug, title, description, price in cents, currency, and stock. Blank stock means unlimited digital stock. Zero means sold out.
3. Choose a supported delivery: lifetime Premium or a store badge. Platform roles such as Owner, Staff and Administrator cannot be sold.
4. Save the product. Admin shows its backend environment key, such as `TOURN_PRODUCT_SUMMER_BADGE`.
5. On the backend host, add **one environment variable for this product**, for example `TOURN_PRODUCT_SUMMER_BADGE=123456:789012`. The first number is the real SellAuth product ID; the second is its variant ID. Do not put API keys or secrets in the Admin form.
6. Configure the matching price, currency, stock limit and dynamic delivery in SellAuth. The provider owns the final payment amount and sale limit. Catalog stock is checked before checkout and decremented after verified delivery; it is not a reservation system.
7. Restart/redeploy the backend. Publish the product in Admin when ready. A published but unmapped product displays Coming soon and cannot check out.

Global integration variables remain `SELLAUTH_SHOP_ID`, `SELLAUTH_SHOP_URL`, and `SELLAUTH_WEBHOOK_SECRET`. Keep the existing JWT signing secret stable so purchased fallback codes remain decryptable. The webhook URL is `/api/commerce/sellauth/delivery`.

Product delivery type, badge and environment key are immutable after creation, protecting orders already in flight. Create a new product for a different reward. Title, copy, image, price, stock and publication status remain editable. Unpublish instead of deleting products so earlier paid orders can still be fulfilled.

## Payment behavior

Checkout receives only a catalog ID from the client. The server selects the provider product and variant from that product’s environment key and signs the account/catalog identity. Browser success callbacks never grant ownership. Only a signed, completed SellAuth delivery grants Premium or a badge; a missing or mismatched checkout ticket produces a redeemable fallback code. Delivery replay returns the same code without consuming stock twice.

Legacy character purchases and old cart checkout are retired. Existing paid character orders, owned inventory and redemption codes continue to work. Retired secondary addresses stop resolving through that field after the startup migration. Public profile lookup no longer treats every inactive inventory handle as an active profile alias.

## Visual changes

The new empty profile uses a 640px default card, 130px minimum height, 22px corners and a 38px name before responsive scaling. It contains no placeholder avatar, bio or widgets. Card controls still apply. Existing saved sizes are preserved. The reaction group has no surrounding pill background. The full-page Getting started route includes the current draft, a decorative 3D desktop/phone view, six setup steps and the existing Save now action. The public footer uses dark surfaces and Tourn/Discord/navigation marks.

See [220 future improvements](website-220-recommendations.md). Those are recommendations, not a claim that 220 bugs were found or fixed.
