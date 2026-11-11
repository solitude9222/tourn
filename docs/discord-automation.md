# Discord role badges and connection

Admin → Discord bot contains server-backed automation controls. Choose an actual
server the bot has joined, then add Discord role → profile badge rules. Role
names, colours, icons and IDs come from Discord. Save rules to PostgreSQL and
use **Sync linked accounts now** to apply them immediately.

Each rule can be enabled separately. **Auto-equip** displays the managed badge
on the profile automatically; otherwise it is available in the badge picker.
Only the site owner can create or change Owner/Staff badge mappings. These are
visual badges; they do not change account admin flags or paid entitlements.

The backend uses the Discord ID verified through account sign-in. A Discord
widget's editable ID is never used to award account badges. Sync runs once a
minute and when profiles load, with a short member cache. Role removal revokes
managed awards; manually granted badges remain independent. Discord outages
retain previously verified awards instead of deleting them.

## Bot setup and checks

- Set `DISCORD_BOT_TOKEN` on the backend. Never put the token in a VITE variable.
- The bot maintains a persistent Gateway connection with the Guilds intent.
- Add the bot to your server using its real bot application's invite link in
  Admin, then refresh. Select the server if the bot belongs to several servers.
- `DISCORD_GUILD_ID` can set the initial server; the saved Admin server selection
  takes precedence.
- Admin shows token validation, Gateway online status, server access, current
  roles, the last sync time and the number of linked accounts checked.
- `/api/health` exposes only connection booleans, not the token or server roles.

Managed awards live in `discord_badge_awards`, and rules live in `site_settings`.
Both are included in the full database JSON export/import.

API references: [Discord guild/member/role endpoints](https://github.com/discord/discord-api-docs/blob/main/developers/resources/guild.mdx),
[Discord Gateway](https://github.com/discord/discord-api-docs/blob/main/developers/events/gateway.mdx),
and [discord.js Guilds intent](https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/main-file.md).
