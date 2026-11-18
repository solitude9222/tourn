# Wide portfolio and working design controls

The identity card stays 648px wide. Slideshow content has its own wide canvas: projects, interests and gallery up to 1240px; writing and skills use wide readable columns. Interests render four real 3:4 posters per desktop row and two on mobile, with a functioning horizontal rail/catalog layout.

Donation totals are rendered only inside the Donor tooltip. The entry action is a real keyboard-accessible button within the entry dialog.

The dashboard account popup shows Your accounts, the current account, saved accounts, Add account, Share profile and Discord, plus existing account actions. Language and Reports are absent. It stays mounted briefly for its closing animation; opening and closing both respect reduced motion. The redundant Audio player sidebar item is removed; its popup remains in Media & fonts.

Badges → Design exposes artwork motion, wrapper motion, glow color/strength/radius/pulse, shelf shape/radius/padding/spacing/fill/blur/border and shadow controls. The badge row is the only shelf surface, so preview and public profiles honor those values.

Audio popup → Playback exposes independent button, rail and speaker opacity plus glow color/strength/radius. The reveal rail is positioned outside a fixed-size mute anchor and animates its clip, opacity and transform; right corners mirror it. Pointer focus no longer holds the rail open after leaving, while keyboard focus remains supported. Profile → Visibility also provides profile halo and details-glow settings.

Validation: `tests/portfolio-controls-polish.mjs` covers saved controls, actual shelf/glow/motion styles, tooltip-only money, wide slides/posters, entry action, account-menu in/out, missing Audio navigation, and an actual public-profile mute reveal without anchor resizing. `tests/identity-controls.mjs` covers the existing identity and icon behavior, reveal interpolation/closing and reduced motion. TypeScript and production build pass.
