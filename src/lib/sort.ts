/* ---------------------------------------------------------------------------
   One sorting toolkit for every list on the site.

   Before this each list wrote its own `.sort()` with plain `localeCompare`, so
   "Badge 10" landed before "Badge 2", accents and case shuffled names, and
   ties flipped order between renders. Everything now goes through the same
   natural, case-insensitive, stable comparison.
   --------------------------------------------------------------------------- */

const collator =
  typeof Intl !== "undefined"
    ? new Intl.Collator(undefined, { numeric: true, sensitivity: "base", ignorePunctuation: false })
    : null;

/** Natural order: 2 < 10, "a" = "A" = "á", blanks last. */
export function naturalCompare(a: string | null | undefined, b: string | null | undefined): number {
  const left = (a ?? "").trim();
  const right = (b ?? "").trim();
  if (!left && right) return 1;
  if (left && !right) return -1;
  return collator ? collator.compare(left, right) : left.localeCompare(right);
}

/** Numbers descending-friendly: missing values always sink to the bottom. */
export function numberCompare(a: number | null | undefined, b: number | null | undefined, dir: "asc" | "desc" = "asc"): number {
  const aMissing = a == null || Number.isNaN(a);
  const bMissing = b == null || Number.isNaN(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return dir === "asc" ? a - b : b - a;
}

/** Date-ish values (ms number or ISO string); unparseable ones sink. */
export function timeOf(value: number | string | Date | null | undefined): number | null {
  if (value == null) return null;
  const time = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

type Comparator<T> = (a: T, b: T) => number;

/** Chains comparators: the first that disagrees wins. */
export function chain<T>(...comparators: Comparator<T>[]): Comparator<T> {
  return (a, b) => {
    for (const compare of comparators) {
      const result = compare(a, b);
      if (result) return result;
    }
    return 0;
  };
}

/** Returns a sorted copy. Array.prototype.sort is stable, and `index` is the
 *  final tiebreaker anyway so equal rows never swap on re-render. */
export function sorted<T>(list: readonly T[], compare: Comparator<T>): T[] {
  return list
    .map((item, index) => ({ item, index }))
    .sort((x, y) => compare(x.item, y.item) || x.index - y.index)
    .map((entry) => entry.item);
}

export type SortOption = { value: string; label: string };

/** Standard labels so every dropdown reads the same. */
export const SORT_LABELS = {
  featured: "Featured",
  az: "Name A–Z",
  za: "Name Z–A",
  newest: "Newest first",
  oldest: "Oldest first",
  popular: "Most popular",
  views: "Most views",
  unlocked: "Unlocked first",
  locked: "Locked first",
} as const;
