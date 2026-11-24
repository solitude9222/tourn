# 220 website improvements to consider

These are proposed follow-up improvements, not 220 confirmed bugs or a claim that they are implemented. Prioritize observed failures, accessibility and performance before adding more visual effects. Keep existing saved profiles compatible. This request’s shipped work is documented separately in `marketplace-and-single-alias.md`.

## Identity and onboarding

1. Check alias availability while typing with a short debounce.
2. Offer available alias suggestions after a collision.
3. Explain alias length and character rules beside the field.
4. Preview the exact public address before confirming an alias change.
5. Show the next eligible alias-change date consistently.
6. Add a user-controlled pronunciation field to the identity preview.
7. Explain the difference between account username and display name.
8. Let users restart the setup walkthrough at any time.
9. Remember the last completed walkthrough step per account.
10. Add an optional privacy-first onboarding path with fewer visible details.

## Dashboard navigation

11. Allow personal ordering of sidebar categories.
12. Allow personal ordering of settings within a category.
13. Provide a reset action for custom navigation order.
14. Add pinned destinations for frequently used controls.
15. Make search results show their full settings path.
16. Highlight the matching setting after navigation from search.
17. Add keyboard shortcuts for recent destinations.
18. Keep scroll position separately for each dashboard page.
19. Show an accessible breadcrumb on narrow screens.
20. Add a compact navigation density preference.

## Spacing and layout

21. Audit shared button-to-label spacing at every breakpoint.
22. Standardize icon-to-label gaps across all control variants.
23. Add minimum widths to mixed input/action rows.
24. Wrap long translated labels without hiding controls.
25. Standardize modal content padding across managers.
26. Audit sticky headers against tall content.
27. Reserve consistent space for inline validation messages.
28. Check nested scrolling for bottom-of-page clipping.
29. Make destructive action groups visually distinct without red theme accents.
30. Document the spacing scale in reusable design tokens.

## Color and theme

31. Audit Admin, public and dashboard accents with screenshot comparisons.
32. Add saved user color palettes.
33. Show text contrast estimates beside color controls.
34. Offer a high-contrast blue dashboard theme.
35. Add a clear opacity checkerboard to transparent color swatches.
36. Let users copy and paste entire color palettes.
37. Add per-section color reset actions.
38. Keep theme colors separate from user profile colors.
39. Add a neutral monochrome profile starting preset.
40. Publish a small shared palette for all product surfaces.

## Profile composition

41. Add side-by-side identity layout presets.
42. Allow safe text-width limits independently of card width.
43. Preview exceptionally long names before publishing.
44. Offer independent phone and desktop bio alignment.
45. Add optional line clamping with a readable expansion action.
46. Provide an exact pixel measurement overlay in Layout.
47. Add avatar crop focal-point controls.
48. Offer balanced two-column widget layout presets.
49. Let users lock widget dimensions during reordering.
50. Add safe-area guides for profile corner metadata.

## Drag and drop

51. Profile the sorter with many visible widgets.
52. Add keyboard reorder controls to every sortable list.
53. Keep the dragged item’s original dimensions throughout a drag.
54. Limit expensive preview updates during pointer movement.
55. Add a clear insertion marker between items.
56. Improve edge auto-scroll for long lists.
57. Provide a cancel-drag shortcut with Escape.
58. Add undo for an accidental reorder.
59. Announce reordered positions to screen readers.
60. Add touch drag handles large enough for fingers.

## Color pickers and sliders

61. Measure input-to-paint latency while animated previews are running.
62. Update slider labels without rerendering unrelated editors.
63. Commit expensive color computations after the interaction ends.
64. Support precise keyboard increments on every slider.
65. Add direct numeric entry beside range controls.
66. Make slider units visible and consistent.
67. Add a recent-colors strip scoped to the active account.
68. Keep picker popovers inside the visible viewport.
69. Ensure pickers escape ancestor clipping containers.
70. Test pointer capture when dragging outside a slider rail.

## Media management

71. Show upload dimensions and file size before saving.
72. Add local avatar crop previews.
73. Add separate media replacement and deletion actions.
74. Show failed upload retries beside the failed file.
75. Detect unsupported video codecs before publishing.
76. Warn about unusually large profile background videos.
77. Add optional automatically generated video poster frames.
78. Show upload progress as actual transferred bytes.
79. Offer reusable media folders with clear ownership.
80. Add an unused-assets review before deleting files.

## Backgrounds and overlays

81. Preview video delay and fade timing on a short timeline.
82. Provide a poster-first option on slow connections.
83. Add an obvious background-video pause control.
84. Keep overlay intensity independent of background brightness.
85. Add effect presets with clear performance estimates.
86. Test transparent overlays on both light and dark media.
87. Allow separate reduced-motion overlay choices.
88. Pause off-screen background animations.
89. Add a maximum background-video resolution setting.
90. Provide a simple before/after effect preview.

## Pointer effects

91. Add a gallery of restrained cursor presets.
92. Preview the custom cursor hotspot before saving.
93. Add a cursor reset control beside the upload field.
94. Disable decorative trails on touch-only devices.
95. Pool trail particles instead of allocating per pointer event.
96. Cap trail density on high-polling-rate mice.
97. Add a separate click-effect preview area.
98. Keep custom cursors visible over nested dialogs.
99. Add a cursor image size warning for inaccessible tiny artwork.
100. Preserve a clear text-selection pointer in editable fields.

## Badges

101. Create a coherent hand-designed SVG badge family.
102. Add per-badge motion previews before equipping.
103. Provide a master badge-animation toggle.
104. Add independent glow color and strength controls.
105. Make glow settings available without forcing monochrome badges.
106. Add a reduced-motion badge preview mode.
107. Show exact unlock requirements in badge tooltips.
108. Add a badge shelf reorder action with keyboard support.
109. Keep donation amounts exclusively in tooltips where requested.
110. Show owned, equipped and unavailable badges as separate states.

## Audio controls

111. Compare volume-slider entrance and exit timing across styles.
112. Preserve focus while the volume rail expands.
113. Add keyboard volume steps and mute shortcuts.
114. Show a clear reason when autoplay is blocked.
115. Improve track drag handles in the audio manager.
116. Add track duration and file-size metadata.
117. Add an optional crossfade between playlist tracks.
118. Preview mute-button glow and opacity in the manager.
119. Offer explicit hover, click and always-visible rail behavior.
120. Keep audio player dimensions stable while metadata loads.

## Social links and widgets

121. Normalize custom social artwork into the same icon box.
122. Remove unnecessary white plates from transparent platform artwork.
123. Show invalid links before publication.
124. Add per-link accessible labels.
125. Preview external-link targets clearly in the editor.
126. Add per-widget loading skeletons with fixed dimensions.
127. Show recoverable provider errors inside the affected widget.
128. Add provider refresh timestamps where useful.
129. Cache repeated provider lookups on the backend.
130. Test widget widths with unusually long server names.

## Interests and portfolio

131. Render anime search results in a portal above the editor.
132. Add keyboard navigation to interest search results.
133. Keep selected interests visible while searching for more.
134. Prevent duplicate interests by provider ID.
135. Add configurable poster ratios for interest cards.
136. Support a readable horizontal interest carousel on phones.
137. Add project image focal points.
138. Improve skill-chip wrapping for long technology names.
139. Add optional project status labels.
140. Provide accessible next/previous controls on galleries.

## Entry experience and animation

141. Add entry animation presets that avoid layout shifts.
142. Preview entry transitions without starting real audio.
143. Keep the entry action usable before background media loads.
144. Add a skip-animation action for long entrances.
145. Apply reduced-motion preferences across all entry layers.
146. Audit entrance and exit animations for interrupted interactions.
147. Use consistent motion durations for menus and popovers.
148. Animate empty-to-loaded states without moving nearby controls.
149. Pause expensive animation loops in background tabs.
150. Add visual regression captures of key animation frames.

## Mobile experience

151. Audit 320px-wide dashboard pages for horizontal overflow.
152. Keep bottom actions clear of phone safe areas.
153. Make long forms use one column at narrow widths.
154. Test dialogs with the virtual keyboard visible.
155. Add a mobile navigation search shortcut.
156. Keep footer links visible without oversized empty space.
157. Make small icon-only actions at least finger-sized.
158. Test landscape phone layouts.
159. Make media previews respect limited viewport height.
160. Add mobile-specific drag instructions only when needed.

## Accessibility

161. Audit all icon-only buttons for meaningful accessible names.
162. Restore focus to the trigger after closing every dialog.
163. Trap focus consistently in modal managers.
164. Add visible keyboard focus to custom effect cards.
165. Respect reduced motion in all third-party decorations.
166. Announce upload and save failures without stealing focus.
167. Verify text contrast for muted helper copy.
168. Add descriptive alternatives for meaningful portfolio images.
169. Test the dashboard using only a keyboard.
170. Run a screen-reader walkthrough of signup and profile editing.

## Performance and reliability

171. Record real input responsiveness on low-powered phones.
172. Track route loading time separately from backend latency.
173. Add performance budgets for animated profile presets.
174. Avoid loading unused effect galleries on first dashboard paint.
175. Deduplicate concurrent requests for the same resource.
176. Add timeouts and retry actions for stalled provider requests.
177. Use image dimensions to prevent cumulative layout shifts.
178. Check memory use after repeatedly opening media managers.
179. Abort obsolete searches when the query changes.
180. Add slow-network regression runs for public pages.

## Saves, recovery and data

181. Show the exact time of the last successful save.
182. Compare conflicting drafts before overwriting either version.
183. Add per-section reset with an immediate undo.
184. Explain which settings are draft-only versus already saved.
185. Make account switching preserve each account’s own draft.
186. Add downloadable user-owned profile backups.
187. Validate imported settings before replacing a profile.
188. Add a recovery view for failed media references.
189. Document schema migrations and backward compatibility.
190. Test leaving a page during an in-flight save.

## Marketplace and Admin

191. Add product ordering controls in Admin.
192. Add product search and publication filters.
193. Show a product preview before publishing it.
194. Add an Admin audit trail for catalog edits.
195. Integrate authenticated provider price reconciliation.
196. Add provider-stock synchronization rather than manual matching.
197. Add invoice lookup for support without exposing payment details.
198. Add scheduled product publication with a visible timezone.
199. Add a read-only fulfillment health panel.
200. Add an owner-only review step for changes to store integration.

## Public pages and community

201. Add leaderboard period filters backed by real historical data.
202. Add accessible ranking-change indicators when historical data exists.
203. Preserve leaderboard filters in shareable URLs.
204. Add a clear empty state for new leaderboard periods.
205. Improve contact forms with delivery confirmation and retries.
206. Keep legal-page typography consistent with public navigation.
207. Add verified community links with consistent logo treatment.
208. Add public-page loading and error states to every route.
209. Review footer content ordering with phone users.
210. Add share-image previews generated from the actual profile.

## Quality and maintenance

211. Create shared stories for every input and button variant.
212. Capture desktop, tablet and mobile screenshots in CI.
213. Test dialogs near all four viewport edges.
214. Add regression cases for long names and missing artwork.
215. Add a theme-token check for unintended old accent colors.
216. Track JavaScript errors by route and release without collecting profile content.
217. Add deployment smoke tests for public, dashboard and Admin routes.
218. Maintain a documented inventory of external provider dependencies.
219. Add migration tests using representative older profile documents.
220. Publish a short changelog that distinguishes fixes from new features.
