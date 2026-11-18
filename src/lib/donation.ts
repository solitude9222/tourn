/* ---------------------------------------------------------------------------
   The first account's donor badge carries a running total. It starts at $237
   and gains $1 at each UTC midnight. Keeping the base and epoch here means the
   badge, its tooltip and any future donation surface always agree.
   --------------------------------------------------------------------------- */

const DAY_MS = 86_400_000;

/** The first day the badge read $237 (18 November 2026, 00:00 UTC). */
const DONATION_EPOCH = Date.UTC(2026, 10, 18);
const DONATION_BASE = 237;

/**
 * The total shown for the first account, or null for every other account.
 * `uid` is the sequential account number, so #1 is the first user. `isOwner`
 * is accepted as a fallback for accounts created before uids were assigned.
 */
export function donationTotalFor(
  user: { uid?: number | null; isOwner?: boolean },
  now = Date.now(),
): number | null {
  if (user.uid !== 1 && !user.isOwner) return null;
  const days = Math.floor((now - DONATION_EPOCH) / DAY_MS);
  return DONATION_BASE + Math.max(0, days);
}
