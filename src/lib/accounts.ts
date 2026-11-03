import { post } from "./backend";

/** One saved account on this device. The ticket is a 30-day session pass. */
export type StoredAccount = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  ticket: string;
};

const KEY = "tourn.lol/accounts/v1";
const LIMIT = 5;

export function loadAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredAccount =>
        Boolean(item) &&
        typeof item.id === "string" &&
        typeof item.username === "string" &&
        typeof item.ticket === "string",
    );
  } catch {
    return [];
  }
}

function save(list: StoredAccount[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked — the session still works, just not the switch */
  }
}

export function upsertAccount(entry: StoredAccount): StoredAccount[] {
  const next = [entry, ...loadAccounts().filter((item) => item.id !== entry.id)].slice(0, LIMIT);
  save(next);
  return next;
}

export function forgetAccount(id: string): StoredAccount[] {
  const next = loadAccounts().filter((item) => item.id !== id);
  save(next);
  return next;
}

export async function requestAccountTicket(): Promise<string | null> {
  const result = await post<{ ticket: string }>("/api/auth/ticket");
  return result.ok ? result.data.ticket : null;
}

export async function switchSession(ticket: string) {
  return post<{ account: unknown }>("/api/auth/switch", { ticket });
}
