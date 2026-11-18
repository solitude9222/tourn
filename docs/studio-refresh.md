# Studio refresh

## Editing flows

- Avatar opens a Profile / Decorations dialog. Crop zoom and rotation stay with the avatar.
- Background opens Media / Color. Solid and gradient colors, uploads, saved media, dim, blur, image adjustments, banner and video sound are managed together.
- Audio opens Tracks / Playback / Appearance / Lyrics. Upload inputs remain mounted across tabs.
- Badges has All badges / Your badges / Design. Search, categories, unlock requirements, equip/remove and arrow ordering preserve existing IDs and backend-owned unlocks. Icon size is fixed at 24px; hidden/minimized legacy rows migrate to the standard visible layout.
- Avatar decoration browsing lives in the avatar dialog. Text, atmosphere, overlays, card lighting and pointer effects stay in Decorations. Emoji Rain and Character Rain are removed, including their legacy aliases and renderer branches.

## Responsiveness

Picker and slider gestures update local control state. Global profile normalization and persistence happen at release (or after keyboard entry settles). The controls handle pointer cancellation, capture loss, blur, keyboard input and unmount cleanup. Picker popups are portaled outside scrolling/animated panels and constrained to the viewport. Background and cursor preview canvases pause during a gesture. Cursor particles are bounded at 160, new emission has a per-frame budget, and constellation links are limited to 60 points. Idle noncontinuous cursors stop scheduling frames. Page-entry fades were removed. Card-selection feedback paints before queued profile persistence.

The measured stress test used 180 drag samples beside an animated TV canvas and simulated an 8,000,000-byte persistence workload. It committed exactly twice (once per completed drag), with a median frame interval of 6.9ms and a 95th percentile of 7.1ms. Card selection feedback measured 21.2ms. These are local headless Chromium measurements; timing depends on hardware and concurrent work. Full data: [editor-performance.json](editor-performance.json).

## Assets

The new Tourn mark is deployed as a small, crisp [SVG](../public/brand/tourn-mark.svg), with the [generated PNG source](../public/brand/tourn-logo-generated.png) available for sharing. Site, authentication, profile fallbacks, favicon and webhook/share fallbacks use the new identity. The existing root logo file is preserved.

All 33 Tourn badges use [Lucide 0.468.0](https://github.com/lucide-icons/lucide/tree/0.468.0) geometry. The included [ISC license](../public/badges/v2/LICENSE) and [source notes](../public/badges/v2/SOURCES.md) cover redistribution. Animated variants use staggered SVG stroke drawing, not a whole-icon CSS spin or a painted illustration. Still variants are used for reduced motion and idle catalog entries. Rebuild with `node scripts/build-badge-icons.mjs`.

## Dimensions and checks

Avatar dialog: 940px desktop; Background: 900px; Audio: 1040px. All are constrained by the viewport. Dialog padding is 24px desktop / 18px mobile; avatar preview 240px / 160px; background preview 220px high. Badge catalog: 3 / 2 / 1 columns, 84px minimum row height, 42px symbol wells, 28px catalog art and 24px public badges. Exact sampled dialog bounds: [studio-modal-sizing.json](studio-modal-sizing.json). Full dashboard inventory: [dashboard-sizing.json](dashboard-sizing.json).

Verified: typecheck, production build, 81 dashboard route/viewport combinations, modal flows, pointer and keyboard gestures, final-value persistence, real SVG stroke motion, reduced-motion switching, badge equip/order, editor undo/redo, public profile loading/FPS, and 96 widget/audio placement/layout combinations.
