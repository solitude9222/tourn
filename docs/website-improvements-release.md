# Website improvements release

This release implements a substantial portion of the approved list. It does **not** complete all 220 recommendations. The item-by-item record is website-220-status.json; existing functionality is distinguished from newly implemented changes and incomplete verification.

## New features

- Workspace page: category/subcategory/field ordering, pinned destinations, recent keyboard shortcuts, per-page scroll positions, recovery checkpoints, selective imports, comparison, session diagnostics and image-reference recovery.
- Alias availability with debounced cancellation, real namespace collision checks, available suggestions, next-change date and lookup rate limiting.
- Account-scoped color history and importable palettes; high-contrast blue theme and density controls.
- Media inspection before upload, dimensions/size/duration, avatar focal point, explicit picture removal, real retry state, optional generated video poster, video entrance rehearsal and a maximum height check for new video uploads. Resolution checks do not transcode videos.
- Readable configurable interest widths/ratios, provider IDs for deduplication, project image focus, expanded biographies and independent mobile alignment.
- Optional two-deck crossfade playlist with real overlapping playback, shared mute/volume, finite ending and silent unloaded previews. Existing audio styles remain available. Uploaded track size/duration and rail trigger behavior are configurable.
- Marketplace ordering, filters, scheduled publication, previews, audit history, sanitized provider comparison/local synchronization, verified-delivery invoice lookup and fulfillment health.
- Leaderboard periods use actual recorded visits, preserve filters in URLs and show ranking changes only when sufficient history exists. Likes remain lifetime totals.

## Fixes

- Opening a new dashboard no longer publishes an initial empty document. Unsaved editor recovery uses a separate IndexedDB record and requires explicit Save now to publish.
- Sorters retain dimensions until release, support cancellation/keyboard movement, announce changes, mark insertion targets and isolate reorder undo boundaries.
- Custom cursors preserve native text selection in editable fields; trails are pooled/capped and disabled on touch/reduced-motion devices.
- Background videos pause offscreen/in background tabs; reduced motion produces static ambient scenes and configurable overlay fallback. Avatar removal and Discord-picture selection are separate operations.
- Compact save status keeps its exact timestamp in a tooltip; phone notifications show one item at a time. Appearance resets preserve content sections, skills and the About slide.

## Validation

Local validation includes TypeScript, production build and gzip budgets; 59 backend/model/service unit tests; browser checks for workspace controls at 320/390/768/1440px, draft recovery without publishing, one commit after 1,000 slider input events, real crossfade overlap/shared mute, marketplace/onboarding, footer/loading and cursor/account menu. studio-models.mjs checks representative older documents retain content and normalize new fields.

The synthetic slider event loop is not a real-device frame-rate or input-to-paint measurement. Browser API responses are mocked; they do not prove deployed provider credentials or live fulfillment. CI is configured to repeat the core tests and retain screenshots; a successful local run is not a claim that hosted CI has already run.

## Remaining work and rollout

- Finish deep setting-specific search across hidden subtabs, exhaustive spacing/focus/viewport-edge and interrupted-animation audits, shared control stories, animated-preset latency/memory budgets and slow-network coverage.
- Test actual phone virtual keyboards, a screen-reader walkthrough and real low-powered phones; emulated viewport screenshots cannot replace these.
- Curated restrained effect presets, a distinct skip-animation control, exhaustive before/after and static-overlay checks, and leaderboard rank-change indicators beyond the podium need further work or verification.
- Provider integration settings remain deployment-owned. Product environment mappings cannot be edited after creation, but a separate owner approval queue has not been implemented. Stock synchronization is an explicit reviewed operation, not scheduled polling.
- Deploy/restart the backend to apply new marketplace columns/audit tables and earlier single-alias migration. Configure each TOURN_PRODUCT_* mapping and SELLAUTH_API_KEY for provider comparisons; no credentials are stored in the browser. No live database migration or provider checkout was performed by these tests.
- Browser recovery depends on available IndexedDB/storage. Download portable backups for an independent copy.
- Session diagnostics are tab-local, bounded, and omit errors' messages/stacks and all profile content. Set VITE_RELEASE at build time for release identification; this is not remote monitoring.

Unrelated generated home-preview data, local assets and pre-existing sizing reports are intentionally excluded from this release.
