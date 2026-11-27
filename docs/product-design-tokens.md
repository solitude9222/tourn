# Shared product design tokens

Product surfaces use black/blue independently of profile-owner colors. Shared implementation tokens live in src/usability.css and src/dash/theme.ts.

| Purpose | Reference value |
| --- | --- |
| Page black | #080a10 |
| Raised surface | #101827 |
| Border | #293346 |
| Blue action | #618cff |
| Primary text | #edf4ff |
| Helper text | #a2aec3 |
| Spacing | 4, 8, 12, 16, 24, 32px |

High contrast uses stronger text/border values. Profile customization remains user-controlled; semantic provider logos and earned badge artwork retain their own colors. A color in user content must not be rewritten by a product-theme migration. Real destructive actions need clear labels and confirmation, independent of hue.
