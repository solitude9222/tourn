# Profile identity and control polish

- The claimed username stays in the main identity row. Profile → Details → Display name appears on a separate line below it; blank hides that line.
- Default badges sit beside the username. Alternate badge placements remain available. Icons stay 24px and wrap when space is limited.
- Custom social images and brand SVGs share a centered, bounded glyph slot, with object-fit containment for wide and portrait artwork. Existing icon glow and interaction effects also target that slot.
- The mute volume pill slides and expands when revealed, mirrors its origin in right corners, and fades/slides shut. Reduced motion disables the transitions.

Verified by `tests/identity-controls.mjs` (saved display name, default badge placement, wide/portrait icon geometry on desktop and mobile, real reveal/close interpolation, reduced motion), `tests/mute-name-settings.mjs`, and the 36-case compact reference suite. TypeScript and production build pass.
