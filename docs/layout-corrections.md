# Layout and dashboard corrections

- Removed the shared Undo/Redo/Preview/Presets/Reset toolbar and its unused components. Keyboard history remains available.
- Flat dashboard fields: one background on the field wrapper, transparent native input, neutral focus border, no inset glow or nested highlight. Section editors use neutral surfaces without accent strips.
- Restored the original direct drag-and-drop sorter and ghost positions at the user’s request. The preview uses a fixed 1120 × 900 canvas scaled as a whole to fit the panel and viewport height. Pointer capture, scoped hit testing, Escape/cancel, adaptive ghost widths, memoized profile rendering and one hover update per animation frame improve the original interaction. The replacement inspector was removed.
- Moving an element updates only its placement field. The preview disables tilt and slideshow navigation so these cannot move the drop targets during a drag.
- Public widgets use 320 × 88px cards with fixed avatar sizing. The grid wraps cards instead of stretching them to fill the row or stretching a lone card. Audio uses the same 360px container inside the card, below it and at page edges. Narrow screens still constrain content to available space to avoid horizontal overflow.
- Project and interest sections use a centered column up to 1280px. Interest posters are approximately 300 × 400px on wide screens and wrap to three/two columns at narrower widths. Removed the second enclosing panel around the cards.
- About uses a centered column up to 1024px, with heading, writing and tags aligned to the left. Existing custom About surface settings remain supported.

Validation: TypeScript, Vite build, `tests/editor-polish.mjs`, and `tests/profile-layout-stability.mjs`. The latter checks 96 layout/card-width/style/widget-placement/audio-placement combinations, actual drag/drop persistence, toolbar removal, flat fields, large posters, centered-left About content and mobile overflow.
