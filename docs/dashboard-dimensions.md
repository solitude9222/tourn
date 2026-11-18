# Dashboard and profile dimensions

All dimensions are CSS pixels. Measured in Chromium at 1920×1080, 1440×1000 and 390×900 with a premium fixture account. Content-dependent heights (names, text, media, number of widgets) grow naturally. Custom profile settings remain configurable.

The complete element inventory contains 2145 measured entries across 81 route/viewport combinations, including legacy routes. Each entry includes exact floating-point width, height, x/y position, font size, line height, padding, gap, border and radius. See [dashboard-sizing.json](dashboard-sizing.json) and [profile-sizing.json](profile-sizing.json).

## Shell and home

| Element | 1920×1080 | 1440×1000 | 390×900 |
|---|---:|---:|---:|
| Main frame | 1632 × 1016 | 1152 × 936 | 374 × 836 |
| Top bar | 1632 × 56 | 1152 × 56 | 382 × 56 |
| Welcome panel | 1524 × 236 | 1044 × 236 | 334 × 400.5 |
| Metric tile | 369 × 138 | 249 × 138 | 162 × 126 |

Desktop sidebar: **280px**. Mobile drawer: **260px**. Top bar: **56px**. Desktop main inset: **48px horizontally**, **30px at top**; frame radius **20px**. Small-screen horizontal inset: **14px**, frame radius **16px**. Standard text controls: **42px** high. Card padding: **20px desktop**, **16px mobile**, card radius **16px**. Major content gap: **18–22px**, depending on section. Effect browser: **4 columns desktop**, **2 on narrow layouts**, **8 results per page**.

## Profile reference fixture

Fixture: 720px configured card width, 32px configured padding, two fixed widgets. The responsive profile renderer scales avatar, type and padding relative to its reference width, so rendered floating-point sizes can differ slightly from their configured values. The card is centered horizontally; its height follows its content.

| Element | Measured width × height | Position x, y |
|---|---:|---:|
| card | 720 × 327.5 | 600, 383.221 |
| avatar | 117.016 × 117.016 | 632.734, 415.955 |
| name | 521.516 × 36.406 | 765.75, 457.252 |
| bio | 654.531 × 27 | 632.734, 548.971 |
| Each widget | **320 × 88** | Two side by side when space permits |

Audio player wrapper remains **360px wide**, constrained by the available viewport. Widgets wrap on small screens; their desktop dimensions do not change when switching card layouts or audio positions.

## Route inventory

First main card per route at 1920×1080 (some routes intentionally render a different primary component). All other cards, buttons, fields, galleries and tabs appear in the JSON inventory.

| Route | Primary card width × height |
|---|---:|
| home | 890.109 × 371 |
| leaderboard | 1524 × 1019.813 |
| effects | 1524 × 856.594 |
| appearance | 1524 × 419 |
| profile-main | 1524 × 428 |
| profile-appearance | 1523.105 × 581.471 |
| profile-experience | 1524 × 2099.359 |
| profile-integrations | 1524 × 765 |
| profile-switches | 1524 × 181 |
| layout | 1523.421 × 320.972 |
| portfolio-general | 1524 × 419 |
| portfolio-about | 1524 × 1133 |
| portfolio-projects | 1523.951 × 266.804 |
| portfolio-gallery | 1524 × 576 |
| portfolio-audio | 1524 × 2300.625 |
| portfolio-interests | 1523.759 × 479.737 |
| portfolio-design | 1523.804 × 581.738 |
| assets | 1524 × 88 |
| links | See component inventory |
| widgets | 1524 × 765 |
| templates | 1524 × 168 |
| badges | 1524 × 329.313 |
| aliases | See component inventory |
| settings | 1524 × 108 |
| theme | 1524 × 283.781 |
| billing | 1524 × 224 |
| support | 1524 × 413 |

## Categories and duplicate removal

- Overview: Home, Analytics, Leaderboard.
- Profile: Details/Card/Entry screen/Visibility, Media & fonts, Decorations, Layout, Audio player.
- Content: Portfolio (General/About/Projects/Gallery/Interests), Social links, Widgets.
- Library: Uploads, Templates, Inventory (Owned items/Badge styling).
- Account: Settings, Premium, Support.

Media and Decorations now have separate destinations; audio and badge styling each have one navigation home. Profile typography lives in Media & fonts, profile colors in Card, portfolio-wide switches in Portfolio → General, and Oneko in Profile → Visibility. Old integrations, card-design, audio and profile links resolve to their canonical destination. The omitted Background Filters dropdown remains absent; overlays stay in Decorations.

## Default palette

Page/rail `#080a0e`; cards `#101318`; inset surface `#151a22`; border `#252c37`; primary blue `#3b82f6`; bright accent `#60a5fa`; muted blue fill `#122440`; primary text `#f4f7fc`; secondary text `#a5afbe`. Existing saved custom themes and profile colors remain supported.
