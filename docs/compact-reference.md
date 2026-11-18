# Compact profile sizing, version 6

The requested reference is now the default for new and previously saved profiles. Documents older than geometry version 6 migrate once to 648px width, 105px avatar, 38px name (including the scattered effect), 14px description, 30px card padding and 12px widget gaps. Text, imagery, colors, background opacity, badges and ownership are preserved. Subsequent saved size adjustments retain their values. Layout → Reset sizing also resets the scattered-name size.

Social cards measure 285 × 70px on desktop, with 12px gaps, 16px corners, 42px avatars and 12px padding. At narrow widths they form one column and fit the available space. Equipped badge shelves have a 58px minimum height and keep 24px artwork. Block spacing is 16px. Overall height follows content rather than clipping long bios, badges or widgets to a fixed 387px box.

The dot-name canvas now crops its sampled glyph bounds instead of reserving an oversized scratch area. Profile measurements use the untransformed layout width so an entrance animation cannot permanently shrink the avatar or text scale.

Validation: `tests/compact-reference.mjs` exercises 36 desktop/mobile combinations of stacked, left and centered layouts, plain/scattered names and slideshow settings; it also checks migration and subsequent custom-size retention. Exact observed dimensions are in `compact-reference-sizing.json`. The existing 96-case widget/audio stability suite passed. TypeScript and the production build also passed.
