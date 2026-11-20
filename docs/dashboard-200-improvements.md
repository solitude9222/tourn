# Tourn dashboard: 200 fixes and improvement ideas

Items marked **Implemented** are addressed in this update. All other items are **Proposed** improvements or verification tasks, not claims of confirmed bugs. Existing capabilities may need refinement rather than a new implementation. This is a backlog, not a claim that 200 changes shipped.

The screenshot audit covers eight editor routes at 1440, 768 and 390 CSS pixels, including top and bottom scroll positions. Default fixture fields produced no measured label collisions; spacing safeguards also cover longer labels and smaller layouts. Screenshots are generated locally under .tmp by tests/spacing-audit.mjs.

## Spacing and alignment

1. **Implemented** — Give button icons a consistent 10px gap from their labels.
2. **Implemented** — Let long button labels wrap without collapsing adjacent actions.
3. **Implemented** — Keep button SVGs from shrinking beside text.
4. **Implemented** — Allow card actions to wrap below long headings.
5. **Implemented** — Give field labels more room above their controls.
6. **Implemented** — Keep slider values separate from wrapping labels.
7. **Implemented** — Reserve a 24px interaction row for range thumbs.
8. **Implemented** — Keep colour swatches and hexadecimal values on one row.
9. **Implemented** — Remove forced second-column placement from mobile audio colours.
10. **Implemented** — Reduce excessive dashboard side padding on phones.

## Profile proportions

11. **Implemented** — Increase the standard profile width from 648px to 760px.
12. **Implemented** — Migrate existing standard-width profiles to the larger width.
13. **Implemented** — Preserve deliberately customised profile widths.
14. **Implemented** — Make gallery sections follow the selected profile width.
15. **Implemented** — Make portfolio sections follow the selected profile width.
16. **Implemented** — Make the skills section follow the selected profile width.
17. **Proposed** — Offer named compact, comfortable and wide profile presets.
18. **Proposed** — Show desktop and phone profile widths together in the editor.
19. **Proposed** — Add an avatar-to-name spacing setting.
20. **Proposed** — Add a maximum biography line-length setting.

## Mute and audio controls

21. **Implemented** — Replace conflicting mute reveal rules with one open-state animation.
22. **Implemented** — Animate closing as well as opening the volume rail.
23. **Implemented** — Keep the rail open while dragging outside its bounds.
24. **Implemented** — Capture the range pointer during volume drags.
25. **Implemented** — Honour the selected reveal duration within safe limits.
26. **Implemented** — Make right-corner rails animate inward consistently.
27. **Implemented** — Close the volume rail with Escape.
28. **Implemented** — Disable rail movement when reduced motion is requested.
29. **Proposed** — Add a volume percentage tooltip while dragging.
30. **Proposed** — Offer a touch-friendly volume disclosure button.

## Colour editing

31. **Proposed** — Offer recently used colours across editors.
32. **Proposed** — Allow named colour palettes to be saved.
33. **Proposed** — Add a copy-hex action inside the colour popover.
34. **Proposed** — Add a paste-colour action with validation.
35. **Proposed** — Support a clear transparent-colour choice.
36. **Proposed** — Show contrast estimates against the current card surface.
37. **Proposed** — Offer keyboard nudges for saturation and brightness.
38. **Proposed** — Show an opacity checkerboard for transparent colours.
39. **Proposed** — Offer a before-and-after colour comparison.
40. **Proposed** — Add a reset action beside each colour override.

## Sliders and numerical inputs

41. **Proposed** — Add editable numerical values beside sliders.
42. **Proposed** — Support Shift plus arrow keys for larger increments.
43. **Proposed** — Offer a double-click reset to the default value.
44. **Proposed** — Show units consistently for pixels, seconds and percentages.
45. **Proposed** — Show useful named tick marks for common values.
46. **Proposed** — Add a reset-all action for each settings group.
47. **Proposed** — Offer a compact explanation for unusual value ranges.
48. **Proposed** — Allow selected slider values to be copied.
49. **Proposed** — Show a subtle changed-from-default marker.
50. **Proposed** — Add precision mode for very small opacity changes.

## Dashboard navigation

51. **Proposed** — Highlight the active submenu consistently after direct links.
52. **Proposed** — Keep the last visited child page for each category.
53. **Proposed** — Offer keyboard shortcuts for main categories.
54. **Proposed** — Show a breadcrumb link back to each category.
55. **Proposed** — Group search results by their parent category.
56. **Proposed** — Add spelling-tolerant settings search.
57. **Proposed** — Show a helpful explanation when search has no results.
58. **Proposed** — Offer recently visited settings in search.
59. **Proposed** — Allow frequently used settings to be pinned.
60. **Proposed** — Add browser-history checks for submenu navigation.

## Forms and saving

61. **Proposed** — Show which individual fields have unsaved changes.
62. **Proposed** — Offer a clear retry action after a failed save.
63. **Proposed** — Preserve edits when a network connection disappears.
64. **Proposed** — Explain conflicting edits from another browser tab.
65. **Proposed** — Add an explicit saved timestamp inside editor details.
66. **Proposed** — Show validation beside the field that caused it.
67. **Proposed** — Keep validation messages from shifting unrelated controls.
68. **Proposed** — Add keyboard-accessible undo for the current form.
69. **Proposed** — Offer a preview of changes before resetting a group.
70. **Proposed** — Warn before leaving an incomplete upload.

## Dialogs and menus

71. **Proposed** — Ensure every picker is portalled above its parent card.
72. **Proposed** — Keep popovers inside the viewport at all corners.
73. **Proposed** — Restore focus to the trigger after closing a dialog.
74. **Proposed** — Make every dialog dismissible with Escape.
75. **Proposed** — Keep mobile dialog actions visible above the keyboard.
76. **Proposed** — Use consistent dialog header spacing.
77. **Proposed** — Offer clear loading states inside data-driven dialogs.
78. **Proposed** — Keep nested pickers from dismissing their parent dialog.
79. **Proposed** — Add focus-visible styles to account-menu entries.
80. **Proposed** — Test dismissal when clicking outside long menus.

## Badges

81. **Proposed** — Add individually selectable animation previews.
82. **Proposed** — Offer motion speed controls for animated badges.
83. **Proposed** — Offer a reduced-motion badge alternative.
84. **Proposed** — Show glow previews on light and dark backgrounds.
85. **Proposed** — Make glow radius and glow strength independent settings.
86. **Proposed** — Offer a consistent badge icon size across shelves.
87. **Proposed** — Show donation amounts only in badge tooltips.
88. **Proposed** — Explain how each locked badge can actually be earned.
89. **Proposed** — Allow badge ordering with keyboard controls.
90. **Proposed** — Add a shelf preview with a long username.

## Social links

91. **Proposed** — Normalize custom icon bounds before rendering.
92. **Proposed** — Offer an explicit crop or contain choice for uploaded icons.
93. **Proposed** — Show an upload transparency preview.
94. **Proposed** — Offer bulk colour changes with a preview.
95. **Proposed** — Warn about duplicate destinations before adding them.
96. **Proposed** — Validate unsupported URL protocols clearly.
97. **Proposed** — Show a fallback icon when an image fails.
98. **Proposed** — Offer keyboard reordering for social links.
99. **Proposed** — Show full destinations in accessible tooltips.
100. **Proposed** — Add an optional label underneath icon-only links.

## Widgets

101. **Proposed** — Preview each widget at its actual public width.
102. **Proposed** — Keep loading placeholders the same size as loaded widgets.
103. **Proposed** — Show a retry control for failed external data.
104. **Proposed** — Separate appearance settings from connection settings.
105. **Proposed** — Explain widget limits before an add action is blocked.
106. **Proposed** — Offer duplicate-widget detection.
107. **Proposed** — Add a keyboard alternative to drag sorting.
108. **Proposed** — Show a drag placeholder that preserves card dimensions.
109. **Proposed** — Keep platform labels aligned across widget types.
110. **Proposed** — Add a long-name and missing-avatar preview mode.

## Interests and media cards

111. **Proposed** — Offer larger interest-card presets.
112. **Proposed** — Show search loading and empty states separately.
113. **Proposed** — Keep interest pickers above surrounding sections.
114. **Proposed** — Offer filters for games, anime and other interests.
115. **Proposed** — Add keyboard movement through search results.
116. **Proposed** — Show poster fallbacks when artwork is unavailable.
117. **Proposed** — Offer manual artwork replacement.
118. **Proposed** — Allow a compact list view for large collections.
119. **Proposed** — Add accessible carousel previous and next labels.
120. **Proposed** — Remember the collection scroll position after editing.

## Backgrounds and entry

121. **Proposed** — Preview video start-delay settings in the editor.
122. **Proposed** — Offer a visible fade-in duration preview.
123. **Proposed** — Show a poster before background video playback begins.
124. **Proposed** — Fall back to the poster when autoplay is unavailable.
125. **Proposed** — Offer separate mobile media and focus settings.
126. **Proposed** — Show video duration before choosing a start offset.
127. **Proposed** — Validate offsets against the actual media duration.
128. **Proposed** — Offer a simple entry-screen animation preview.
129. **Proposed** — Keep entry buttons large enough for touch.
130. **Proposed** — Respect reduced motion on entry-screen transitions.

## Effects and performance

131. **Proposed** — Pause offscreen effect preview animations.
132. **Proposed** — Stop decorative loops while the browser tab is hidden.
133. **Proposed** — Offer a low-power effects preset.
134. **Proposed** — Add a particle-count budget across simultaneous effects.
135. **Proposed** — Avoid recreating canvases during colour drags.
136. **Proposed** — Measure slow frames in a local performance diagnostics panel.
137. **Proposed** — Use device-pixel-ratio caps for background canvases.
138. **Proposed** — Offer a static fallback for expensive pointer effects.
139. **Proposed** — Prevent duplicate animation loops after page navigation.
140. **Proposed** — Add stress tests for several active effects at once.

## Typography

141. **Proposed** — Show a long-username preview beside font controls.
142. **Proposed** — Offer a readable minimum mobile text size.
143. **Proposed** — Separate username size from display-name size.
144. **Proposed** — Offer biography line-height controls.
145. **Proposed** — Show a font-loading placeholder without layout jumps.
146. **Proposed** — Offer a fallback font preview for failed custom fonts.
147. **Proposed** — Keep text effects from expanding layout boxes.
148. **Proposed** — Offer consistent heading sizes across dashboard pages.
149. **Proposed** — Add a maximum width for long tooltip text.
150. **Proposed** — Test mixed emoji and accented characters in profile names.

## Accessibility

151. **Proposed** — Give every icon-only action an accessible name.
152. **Proposed** — Show keyboard focus clearly on colour swatches.
153. **Proposed** — Check contrast for inactive navigation labels.
154. **Proposed** — Keep all switches operable with Space.
155. **Proposed** — Announce save errors without repeatedly interrupting typing.
156. **Proposed** — Label every drag handle with its item name.
157. **Proposed** — Offer skip-to-content navigation.
158. **Proposed** — Support 200 percent zoom without losing actions.
159. **Proposed** — Use semantic headings in long settings pages.
160. **Proposed** — Test controls using a screen reader.

## Home and analytics

161. **Proposed** — Explain lifetime views versus period views.
162. **Proposed** — Show a useful analytics empty state for new profiles.
163. **Proposed** — Offer a direct action for each unfinished setup task.
164. **Proposed** — Show analytics refresh time and timezone together.
165. **Proposed** — Offer date-range presets with clear boundaries.
166. **Proposed** — Make leaderboard loading placeholders stable.
167. **Proposed** — Show a retry state when rankings are unavailable.
168. **Proposed** — Explain leaderboard ranking criteria.
169. **Proposed** — Offer a compact account-summary layout.
170. **Proposed** — Allow the setup checklist to be reopened after completion.

## Uploads and media management

171. **Proposed** — Show upload progress with transferred bytes.
172. **Proposed** — Offer retry for interrupted media uploads.
173. **Proposed** — Validate image dimensions before uploading.
174. **Proposed** — Show supported formats beside upload actions.
175. **Proposed** — Offer a media-library search by filename.
176. **Proposed** — Show file sizes and dimensions in the media library.
177. **Proposed** — Warn before removing media still used by a profile.
178. **Proposed** — Offer distinct avatar, banner and background upload previews.
179. **Proposed** — Add audio-track metadata editing.
180. **Proposed** — Offer drag reordering inside the audio manager.

## Responsive testing

181. **Proposed** — Test narrow 320px phones.
182. **Proposed** — Test landscape phone layouts.
183. **Proposed** — Test tablet split-screen widths.
184. **Proposed** — Test browser zoom with long navigation labels.
185. **Proposed** — Test the dashboard with the mobile keyboard open.
186. **Proposed** — Test dialogs against safe-area insets.
187. **Proposed** — Test long translated button labels.
188. **Proposed** — Test profiles containing the maximum number of widgets.
189. **Proposed** — Test badge shelves with many visible badges.
190. **Proposed** — Keep screenshot comparisons for critical pages.

## Reliability and polish

191. **Proposed** — Add a clear offline indicator with a retry path.
192. **Proposed** — Handle expired sessions without discarding local edits.
193. **Proposed** — Avoid duplicate save requests while sliders are dragged.
194. **Proposed** — Add error boundaries around external widget previews.
195. **Proposed** — Keep account switching from showing stale profile content.
196. **Proposed** — Provide useful error messages when media decoding fails.
197. **Proposed** — Avoid loading the same font more than once.
198. **Proposed** — Check that event listeners are removed on page changes.
199. **Proposed** — Keep public profile metadata consistent with saved settings.
200. **Proposed** — Publish a small changelog of verified fixes.
