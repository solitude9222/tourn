# Motion and profile polish

- The mute rail has an explicit Web Animations reveal (minimum 300ms), plus its slide/fade and reverse-corner handling. Reduced-motion preferences disable it.
- Header and dashboard account menus share restrained blue-black surfaces and short opening animations. The header account control is one coherent menu button. Sidebar category headings cannot collapse; old collapsed preferences are ignored.
- Metadata glyphs use consistent 14px boxes and baseline alignment: blue views, cyan location and light calendar. Social-link management tiles use dark surfaces and real platform colors instead of white tiles.
- Scattered uses a locally served Doto variable font across all profile text, widgets, sections, skills and tooltips, while retaining the animated dot canvas for the username. The font's OFL license is bundled under `public/fonts/doto`.
- Background editing includes three restrained scene presets and persisted video start time, playback delay, fade-in duration and entry gating. Playback readiness starts the fade. Video remains paused while waiting for entry; timers/listeners are cleaned up on source changes or unmount.
- Entry motion uses opacity and small transforms rather than full-screen animated blur/perspective. Entry variants retain distinct small movements, and a clear enter affordance is shown. Long skills lists wrap and grow without clipping.
- SVG, PNG and ICO favicons are transparent. Default profile metadata uses the transparent mark, while explicitly configured custom favicons are retained. `scripts/build-favicons.mjs` regenerates the raster/ICO variants from the vector source.
- Remaining warm-red interface literals were replaced with cool colors without recoloring uploaded profile media or platform brand art.

Validation: `tests/motion-polish.mjs` covers persisted badge motion, fixed categories, menu motion, background controls and delayed playback with entry gating, start offset/fade, dotted text, desktop/mobile skill containment and favicon alpha. `tests/identity-controls.mjs` also passed; it checks actual mute reveal interpolation, icon bounds, identity layout and reduced motion. TypeScript and production build pass.
