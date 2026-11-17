/* Discord usernames are not tourn.lol handles.
 *
 * A primary alias must never be reserved automatically from Discord. This
 * module releases only aliases that exactly match the account's own Discord
 * username, gives the account a temporary `user_xxxxxxxx` handle, and marks the
 * account as needing a real alias. The second (swats.bio) claim is deliberately
 * untouched, as are all custom primary aliases.
 */
import crypto from "node:crypto";

const CLEANUP_KEY = "discord_alias_cleanup_v1";
const TEMP_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";

export function normalizeAlias(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function aliasMatchesDiscord(alias, discordUsername) {
  const clean = normalizeAlias(alias);
  return Boolean(clean) && clean === normalizeAlias(discordUsername);
}

export function makeTemporaryAlias() {
  let suffix = "";
  for (let index = 0; index < 8; index += 1) {
    suffix += TEMP_CHARS[crypto.randomInt(0, TEMP_CHARS.length)];
  }
  return `user_${suffix}`;
}

async function uniqueTemporaryAlias(pool) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = makeTemporaryAlias();
    const { rows } = await pool.query(
      `select 1 from users where username = $1 or alias = $1 or alias2 = $1
       union all
       select 1 from username_inventory where handle = $1
       limit 1`,
      [candidate],
    );
    if (!rows.length) return candidate;
  }
  return `user_${crypto.randomBytes(6).toString("hex")}`;
}

export async function releaseDiscordUsernameAlias(
  user,
  discordUsername,
  { pool, sendDirectMessage },
) {
  if (!user?.id || !user.alias || !aliasMatchesDiscord(user.alias, discordUsername)) return user;
  const replacement = await uniqueTemporaryAlias(pool);
  const { rows } = await pool.query(
    `update users
     set alias = $1, alias_required = true, alias_reset_at = now(), alias_updated_at = null
     where id = $2 and alias = $3
     returning *`,
    [replacement, user.id, user.alias],
  );
  const updated = rows[0];
  if (!updated) return user;
  if (sendDirectMessage) {
    await sendDirectMessage(
      updated.discord_id,
      `Your tourn.lol handle was set to your Discord username, so it has been released. Your temporary handle is @${replacement}. Choose your own alias here: https://tourn.lol/#/dashboard/settings — your swats.bio alias and everything else are unchanged.`,
    ).catch(() => false);
  }
  return updated;
}

/**
 * One-time repair for aliases created before Discord usernames were released.
 * Runs under an advisory lock so two backend instances cannot race, and only
 * marks the cleanup complete when every Discord lookup succeeded.
 */
export async function resetDiscordDerivedAliases({
  pool,
  readSetting,
  writeSetting,
  getDiscordUser,
  sendDirectMessage,
  log = (...args) => console.log(...args),
  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const done = await readSetting(CLEANUP_KEY, "");
  if (done) return { skipped: true, reason: "already complete" };

  const lock = await pool.query("select pg_try_advisory_lock(hashtext($1)) as locked", [CLEANUP_KEY]);
  if (!lock.rows[0]?.locked) return { skipped: true, reason: "another instance is running" };

  try {
    const { rows } = await pool.query(
      `select id, alias, discord_id, discord_username
       from users
       where alias is not null and discord_id is not null
       order by created_at asc`,
    );
    let changed = 0;
    let failed = 0;
    let dmFailed = 0;

    for (const row of rows) {
      let discordUsername = row.discord_username || "";
      try {
        const found = await getDiscordUser(row.discord_id);
        if (found?.username) {
          discordUsername = found.username;
          await pool.query("update users set discord_username = $1 where id = $2", [
            discordUsername,
            row.id,
          ]);
        }
      } catch {
        // A stale stored username is still useful; without one, retry next boot.
        if (!discordUsername) failed += 1;
      }
      if (delay) await delay(120);
      if (!aliasMatchesDiscord(row.alias, discordUsername)) continue;

      const replacement = await uniqueTemporaryAlias(pool);
      const updated = await pool.query(
        `update users
         set alias = $1, alias_required = true, alias_reset_at = now(), alias_updated_at = null
         where id = $2 and alias = $3
         returning id`,
        [replacement, row.id, row.alias],
      );
      if (!updated.rowCount) continue;
      changed += 1;
      const sent = sendDirectMessage
        ? await sendDirectMessage(
            row.discord_id,
            `Your tourn.lol handle was set to your Discord username, so it has been released. Your temporary handle is @${replacement}. Choose your own alias here: https://tourn.lol/#/dashboard/settings — your swats.bio alias and everything else are unchanged.`,
          ).catch(() => false)
        : false;
      if (!sent) dmFailed += 1;
    }

    if (failed === 0) await writeSetting(CLEANUP_KEY, new Date().toISOString());
    log(
      `[tourn] Discord username aliases released: ${changed} changed, ${failed} lookup failures, ${dmFailed} DM failures.`,
    );
    return { changed, failed, dmFailed, skipped: false };
  } finally {
    await pool
      .query("select pg_advisory_unlock(hashtext($1))", [CLEANUP_KEY])
      .catch(() => undefined);
  }
}
