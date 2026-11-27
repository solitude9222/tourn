# External provider inventory

| Dependency | Use | Failure behavior / ownership |
| --- | --- | --- |
| Discord OAuth / REST / Gateway | Sign-in, linked identity, actual presence and managed role awards | Backend tokens only; role outages preserve previously verified awards; linked permissions never come from client claims |
| SellAuth | Configured marketplace checkout, signed fulfillment, read-only product comparison | Per-product backend mappings; fixed official API host, bounded timeout, sanitized comparison, explicit local sync; unavailable credentials produce a setup error |
| Stripe (legacy username inventory) | Fulfillment of supported existing username transactions | Verified provider payment and idempotent database delivery; retired character sales stay unavailable |
| AniList GraphQL | Anime catalog | Bounded request timeout, cancellable/deduplicated searches and retry UI |
| FreeToGame | Game catalog | Shared request/cache and recoverable provider failures |
| Apple iTunes Search | Artist/song artwork | Search cache, cancellation and retry |
| Wikipedia / Wikimedia | Film metadata and artwork | Timeout, search cancellation and artwork fallback |
| Google Fonts | Optional owner-selected fonts | System fallback; profile content does not depend on successful font fetch |
| Owner-selected media hosts | Images, video, audio and avatar decorations | Loading poster/fallback, controls and manual media-recovery check; host availability cannot be guaranteed |

SellAuth integration follows the official API introduction and Get Product contract: https://sellauth.mintlify.site/api-reference/introduction and https://sellauth.mintlify.site/api-reference/products/get-product . Product variant IDs are resolved on the backend. Never include API keys, customer information or redeemable code contents in browser diagnostics.
