# Profile loading and frame pacing

## Original sorter restored

The layout editor again uses direct dragging onto the original ghost positions, without the replacement side inspector. Pointer capture keeps drags alive outside their starting element. Hit testing is scoped to the preview, hover work is coalesced to one animation frame, and the profile subtree is memoized so hovering drop targets does not rerender all widgets and audio. Escape, cancellation and release outside a target clear the drag. Smaller card targets adapt to the available width. Existing fixed widget/audio sizing remains in place.

## Profile first paint

- The HTML starts a same-origin public-profile read before the application bundle downloads/evaluates. The application consumes that request once; Retry bypasses it.
- A completed short-lived preload initializes the profile synchronously, avoiding a loading render on warmed navigation. Only verified network documents are used; no persistent stale public-profile snapshot was added.
- A ready published document can display while account and owner-draft checks are pending. Owner view counting still waits until identity is known.
- Both path links and `#/profile/handle` links warm the correct profile. Removed the second, conflicting hash parser and the permanent "already warmed" set.
- Marketing sections are in a separate chunk. Public profiles no longer start dashboard/marketplace preloads or unrelated homepage stats requests.
- Removed the automatic half-second reveal animation on profile sections. User-selected entry screens and text/card effects retain their behavior.

Cold pages still require the actual server response and media downloads; the changes remove application-added waiting rather than claiming zero network latency.

## Frame pacing

- Canvas layers follow native `requestAnimationFrame` refresh when no explicit cap is supplied. Removed forced 15/20/24/45 FPS caps and per-frame media-query work.
- Explicit caller caps are still supported; time-based particle movement remains independent of refresh rate.
- Effects paint immediately on mounting, pause while hidden/offscreen, and remain static for reduced motion. Blur is intentionally static.
- Pointer input throttling now supports high-refresh movement instead of sampling at 20 Hz.

## Checks

- `tests/profile-performance.mjs`: a public profile paints before deliberately delayed auth (1.6 seconds) and runtime env (2.4 seconds); verifies one bootstrap request, no hydration blank, warmed hash navigation and fresh Retry data.
- The same test exercises all 11 animated canvas effects at deterministic 60/120 Hz scheduling and checks real full-viewport frame delivery. One local headless Chromium run measured approximately 98–148 FPS across those effects. These are test-environment results, not a hardware-independent guarantee.
- `tests/profile-layout-stability.mjs`: 96 sizing/placement combinations, restored direct dragging, Escape cancellation and mobile overflow.
- `tests/editor-polish.mjs`, TypeScript and production build.
