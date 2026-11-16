# Dashboard improvement pass

**Follow-up:** The user requested removal of the editor toolbar, presets and reset controls. The current layout preview uses a stable placement canvas; profile sizing and surface corrections are recorded in `layout-corrections.md`. The table below describes the earlier pass where noted.

The original 60 suggestions included features the project already had. This pass extends those features rather than adding competing editors. “Retained” below means the existing implementation supplies that capability; it does not mean a new feature was added.

| # | Recommendation | Result |
|---|---|---|
| 1 | Prioritize frequently used navigation | Content editors now precede appearance and asset management. |
| 2 | Group customization | Content, Appearance, Assets and Account groups; effects and audio remain appearance subtabs. |
| 3 | Remove repeated settings | Shared toolbar, preview, history and reset controls; existing workspace routes reuse their owning editors. |
| 4 | Combine related sections | Retained workspace/subtab model; no parallel copies of editors. |
| 5 | Consistent spacing | Shared toolbar, collection tools, mobile spacing and card action wrapping. |
| 6 | Scannable sidebar | Reordered groups, collapsible headings and direct search results. |
| 7 | Collapsible advanced controls | Retained advanced layout/audio panels; navigation groups also collapse and remember their state. |
| 8 | Persistent Save/Preview | The shared toolbar was subsequently removed at the user’s request. |
| 9 | Mobile settings | Wrapping toolbars/actions, bounded dialogs, mobile save-bar clearance. |
| 10 | Search settings | Search now opens matching subtabs, with Ctrl/Cmd+K and an empty state. |
| 11 | Asset sorting | Existing date/name/type sorts retained; download sort added. |
| 12 | Asset filters | Existing type/effect categories retained; upload search and favorite filters added. |
| 13 | Duplicate uploads | Prevent identical URL/type uploads; review existing duplicates before removal. Audio and processed images are compared by exact stored content. |
| 14 | Duplicate presets/options | Refuse duplicate personal preset names or identical snapshots; shared template sorting remains intact. Similar-looking assets are not automatically deleted. |
| 15 | Consistent naming | Content/Appearance groups and shared toolbar language. |
| 16 | Unused assets | Review library files not referenced by the current profile draft. Deletion requires reviewing the selected copies. This does not scan or delete repository files. |
| 17 | Shared components | EditorTools, PreviewFrame, appearance helpers and preference hook. |
| 18 | Favorites | Persistent upload and effect favorites. |
| 19 | Remember filters/sorts | Upload type/sort, effect sorts, template sort, catalogue sort and ranking metric. |
| 20 | Bulk asset actions | Select filtered uploads, clear selection and review/delete selected library copies. |
| 21 | Consistent palette | Theme tokens retained; removed the final hardcoded red selected-tab override. |
| 22 | Custom accent preview | Live custom console accent with a reset to the selected theme. |
| 23 | Text contrast | Live text/card contrast guidance; existing opacity/dim controls retained. Custom accent buttons choose a contrasting foreground. |
| 24 | Borders/corners | Shared token-based toolbar/dialog/collection controls; existing profile radius and border sliders retained. |
| 25 | Icon consistency | Shared Icon component reused throughout new controls. |
| 26 | Primary/secondary buttons | Shared button variants, disabled styling, primary contrast and persistent Save action. |
| 27 | Reduce visual competition | Collapsible sidebar groups, focused effect previews and shared editor actions. |
| 28 | Theme presets | Five existing console palettes retained alongside the custom accent. |
| 29 | Typography hierarchy | Existing heading/body tokens retained; new metadata uses shared subdued text styling. |
| 30 | Interaction states | Selected theme-aware tabs, favorite pressed states, disabled actions and keyboard focus. |
| 31 | Tab transitions | Short page entrance animation with reduced-motion override. |
| 32 | Dropdown motion | Short menu entrance animation; existing controlled dismissal retained. |
| 33 | Card feedback | Asset border hover feedback; existing interactive-card feedback retained. |
| 34 | Reordering motion | Existing pointer section reordering, drop indicators and up/down controls retained. |
| 35 | Save feedback | Publish outcome events and notifications remain; the toolbar indicator was removed with the shared toolbar. |
| 36 | Entrance speed | Existing entry animation-duration control retained. |
| 37 | Effect intensity | Existing background/overlay/text/card intensity and speed controls retained. |
| 38 | Individual previews | Background and overlay canvases activate on hover or keyboard focus; other tiles stay static. |
| 39 | Reduced motion | Canvas effects stop after a static frame; dashboard transitions/animations respect reduced motion. |
| 40 | Effect cost | Mobile/low-core canvas FPS cap, existing offscreen/hidden pausing, lazy posters and focused previews. |
| 41 | Profile section ordering | Existing drag-and-drop and move up/down controls retained. |
| 42 | Device previews | The separate preview toolbar was removed; Layout now has a stable placement canvas. |
| 43 | Undo/redo | Shared bounded history for all four profile stores; typing/slider updates coalesce; keyboard shortcuts included. |
| 44 | Named presets | Personal preset UI was subsequently removed at the user’s request. |
| 45 | Section resets | Shared reset UI was subsequently removed at the user’s request. |
| 46 | Unsaved warning | Before-unload warning covers pending or retrying publication, in addition to dirty editor state. |
| 47 | Background framing | Horizontal/vertical position and cover/contain, normalized and rendered on public profiles. |
| 48 | Background readability | Existing brightness/dim/blur/opacity controls plus contrast guidance. |
| 49 | Badge placement | Existing badge placement/offset and gap/padding controls retained; badge styling can now reset independently. |
| 50 | Consistent audio controls | Existing shared AudioPlayer retained in profiles and its editor; preview remains silent. |
| 51 | Empty states | Upload search/favorites, effects, templates, sidebar search and loaded ranking searches. |
| 52 | Useful errors | Explicit file type/size/storage failures and catalogue/ranking retries. |
| 53 | Upload progress | FileReader progress for local audio; indeterminate image processing; existing chunked profile-audio progress retained. |
| 54 | Loading states | Editor page skeletons replace blank Suspense fallback; existing catalogue/ranking skeletons retained. |
| 55 | Keyboard navigation | Dialog focus trapping/restoration, Escape, select arrows, tab arrows, skip link and editor shortcuts. |
| 56 | Setting explanations | Preset/reset scope, preview behavior, image fit, storage scope and contrast hints. |
| 57 | Analytics clarity | Explicit UTC range and daily average; comparison of equal windows of complete UTC days when history permits. |
| 58 | Leaderboard tools | Views/likes ranking, search within loaded profiles, preserved rank labels, own-row jump and retries. No rank is invented when the account's row is not loaded. |
| 59 | Marketplace previews | Existing consistent thumbnail grid retained. Product inventory, prices and ownership remain server-controlled. |
| 60 | Media/loading optimization | Existing lazy route/media loading retained; duplicate catalogue results removed, upload images lazy decoded, effect workloads capped. |

## Validation

- TypeScript check and Vite production build.
- `node tests/editor-polish.mjs`: mocked account/API browser coverage of search, keyboard undo/redo, toolbar removal, library selection/deletion review, favorite effects, quota errors, framing normalization, styling-only snapshots and static reduced-motion canvases.
- Broader Node suite: 36 passed, four Discord automation tests failed in untouched backend behavior (role lookup/mock expectations).
- Existing `frontend-regressions.mjs` stopped at the homepage artwork fixture; `layout-upgrade.mjs` stopped at its existing widget-row geometry assertion. These suites did not complete, so they are not reported as passing.

Presets and the reusable upload library are browser-local and are not cross-device storage. Duplicate review detects exact stored files, not perceptual similarity. Ranking search explicitly covers loaded pages. This pass does not invent shared-library stock, alter checkout ownership, or delete source assets based on speculative usage.
