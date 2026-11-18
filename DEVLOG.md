# Tourn.lol Devlog

## November 2026 — A cleaner profile, a stronger portfolio, a calmer dashboard

This update is all about making your page feel less like a settings screen and more like a place you actually want to share. We tightened the profile header, gave project cards a proper layout system, made custom artwork easier to use, and softened the visual effects so the person behind the profile stays the focus.

### A profile header that lines up

Small alignment problems add up. The display name now sits on the exact vertical centre of your profile picture, so the identity block reads as one balanced unit instead of two elements stacked near each other. The badge rail uses the same height as the name, and badge artwork scales with the name rather than staying pinned at one fixed size. That means the name and badges feel like they belong together at every card width.

We also made the identity area wider and more compact. There is less wasted space between the picture and the text, long names have room to breathe, and badges wrap cleanly instead of pushing the layout out of shape. On narrow screens the header stays centred and readable rather than squeezing everything into a thin column.

### Project cards, now with real layout controls

The About section can finally show more than one project at a time. Project cards sit side by side instead of stacking into a long shelf, and the new Project cards controls let you decide how that grid behaves:

- Choose one, two, or three columns.
- Set the gap between cards.
- Place artwork on the left, top, or right.
- Adjust the artwork width.
- Clamp long descriptions to a tidy number of lines.
- Show or hide status, metadata, stack tags, and links.

Every setting is saved with your design, so your portfolio keeps the same rhythm when you publish or come back later. Cards now keep their gaps, borders, rounded corners, and spacing no matter which options you choose.

### Custom artwork for the things you care about

Interests are more personal than a catalogue image can capture. You can now upload your own poster for an interest and reset it back to the original artwork whenever you want. The upload flow is built for real images, not just a preview: choose a file, see it in place, and keep the layout intact.

### A design system that stays readable

The design tools are more expressive, but they no longer fight the content.

- Background effects have calmer defaults, with softer snow, stars, and depth.
- A stray blue meteor effect no longer overrides your chosen palette.
- Surfaces start from a neutral white base instead of carrying a blue tint.
- Cursor trails are closer to the pointer, with a cleaner hotspot and a softer glow.
- Custom link icons stay white, while seeded icons fall back to their brand colours instead of turning grey.
- The favicon has been redrawn as a rounded mark and regenerated at every required size, so browsers pick up the new icon reliably.

The goal is simple: effects should add atmosphere, not make text harder to read or make your links look disabled.

### A dashboard with more room to work

The left navigation is wider and its rows are shorter, so more of your tools are visible without turning the rail into a tall stack. The dashboard keeps its compact feel while giving page titles, controls, and previews more room to breathe.

Editing is also calmer. Project layout controls and custom artwork update in place, so you can see the result before you save. The live surface stays close to the controls, which makes it easier to compare options instead of guessing and refreshing.

### The small details

A lot of this update is invisible until something feels wrong:

- Cards keep their borders, radius, and spacing when the layout changes.
- Long names and descriptions wrap instead of overflowing.
- Badge rows stay aligned when you add or remove badges.
- Media and sidebar previews refresh without leaving stale artwork behind.
- Hover and focus states remain consistent across links, badges, and controls.
- Motion is reduced automatically when your device asks for it.

### Brand artwork

The refreshed brand set includes a clean logo, a wide banner, and a wave-gradient background with subtle repeats of the mark. All three are built from the blue Tourn mark and sized for sharing, headers, and cover images.

### Discord, in blue

Leaderboard, welcome, direct-message and support embeds now use the site blue instead of red, so every card the bot posts matches the rest of Tourn.lol.

### What comes next

We are continuing to tighten the editing experience: clearer previews, fewer layout surprises, and more ways to make a page feel personal without touching code. If something looks off on your profile, tell us what device and browser you are using and, if you can, share a screenshot. Specific reports are the fastest way to get a fix into the next update.

Thanks for building on Tourn.lol.
