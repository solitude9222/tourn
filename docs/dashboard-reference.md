# Dashboard reference layout

The dashboard uses six main sidebar entries: Home, Customize, Premium, Assets, Image Host, and Account. Categories open a dedicated submenu with a back button; page tabs and searchable settings remain available. Admin navigation remains restricted to administrators.

Home presents real account values for username, alias, user ID, and lifetime profile views. Profile Quickstart measures six tasks: avatar, description, background, Discord connection, social links, and ten profile views. Quick Actions open existing editors, account connections, the Tourn setup guide, Premium, and the public profile. Analytics and community rankings remain below the setup area.

Desktop sizing: 280px sidebar, 44px navigation rows, four account columns with 16px gaps, 144px minimum account-card height, 16px card corners, and a 2:1 setup/action grid. The layout collapses to two stat columns and a single setup column on narrower screens; task rows stack on phones. Submenu transitions respect reduced motion.

Validation: TypeScript, Vite production build, dashboard-reference.mjs interaction checks, and dashboard-studio.mjs across 27 routes at 1920px, 1440px, and 390px widths. Exact measured dimensions are recorded in dashboard-sizing.json. Browser checks use mocked accounts and do not modify live user data.
