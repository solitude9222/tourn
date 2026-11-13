import "../../pages.css";
import { useCallback, useEffect, useState } from "react";
import { api, post } from "../../lib/backend";
import { useAuth } from "../../lib/auth";
import { BADGE_CATALOGUE, BUYABLE_BADGES, EARNABLE_BADGES } from "../../lib/badges";
import { useDash } from "../context";
import { Button, Icon } from "../ui";

type InventoryTab = "usernames" | "badges" | "collectables";

type OwnedNames = {
  items: { handle: string; acquired_at: string }[];
  primary: string;
  username: string;
  alias2: string | null;
};

const TABS: { id: InventoryTab; label: string }[] = [
  { id: "usernames", label: "Usernames" },
  { id: "badges", label: "Badges" },
  { id: "collectables", label: "Collectables" },
];

const day = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function InventoryPage() {
  const { retryAuth, isPremiumUser } = useAuth();
  const { earned, badges } = useDash();
  const [tab, setTab] = useState<InventoryTab>("usernames");
  const [names, setNames] = useState<OwnedNames | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [gift, setGift] = useState("");
  const [recipient, setRecipient] = useState("");
  const [confirm, setConfirm] = useState("");

  const load = useCallback(async () => {
    const result = await api<OwnedNames>("/api/account/aliases");
    if (result.ok) setNames(result.data);
    else setMessage(result.error);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const action = async (path: string, body: object) => {
    setBusy(true);
    setMessage("");
    const result = await post<{ ok: boolean }>(path, body);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(path.endsWith("gift") ? "Gift sent. The name is in their inventory now." : "That name is now on your profile.");
    setGift("");
    setRecipient("");
    setConfirm("");
    await Promise.all([load(), retryAuth()]);
  };

  const owned = new Set([...earned, ...badges.equipped.map((badge) => badge.id)]);
  const ownedBadges = BADGE_CATALOGUE.filter((badge) => owned.has(badge.id));
  const active = names?.primary || "";
  const original = names?.username || "";
  const shown = active || original;

  const rows: { handle: string; account: boolean; acquired: string | null }[] = names
    ? [
        { handle: original, account: true, acquired: null },
        ...names.items
          .filter((item) => item.handle !== original)
          .map((item) => ({ handle: item.handle, account: false, acquired: item.acquired_at })),
      ]
    : [];

  const counts: Record<InventoryTab, number> = {
    usernames: rows.length,
    badges: ownedBadges.length,
    collectables: 0,
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://tourn.lol/${shown}`);
      setMessage("Link copied.");
    } catch {
      setMessage(`tourn.lol/${shown}`);
    }
  };

  return (
    <>
      <section className="invt-hero">
        <div className="invt-addr">
          <small>Profile address</small>
          <div className="invt-url">
            <h2>
              <span>tourn.lol/</span>
              <b>{shown || "…"}</b>
            </h2>
            <button type="button" className="invt-copy" aria-label="Copy profile link" onClick={() => void copyLink()}>
              <Icon name="copy" size={14} />
            </button>
            <span className={`invt-chip${isPremiumUser ? " is-prem" : ""}`}>{isPremiumUser ? "✦ Premium" : "Free"}</span>
            {isPremiumUser && (names?.alias2 || shown) ? <span className="invt-chip">swats.bio works too</span> : null}
          </div>
        </div>
        <div className="invt-cta">
          <a className="invt-btn" href={shown ? `#/profile/${encodeURIComponent(shown)}` : "#/dashboard/profile"}>
            View profile
          </a>
          <a className="invt-btn is-pri" href="#/shop">
            Get a name
          </a>
        </div>
        <div className="invt-stats">
          <div className="invt-stat">
            <span className="invt-stat-icon">
              <Icon name="layers" size={16} />
            </span>
            <div>
              <b>{rows.length}</b>
              <small>Usernames</small>
            </div>
          </div>
          <div className="invt-stat">
            <span className="invt-stat-icon">
              <Icon name="shield" size={16} />
            </span>
            <div>
              <b>{ownedBadges.length}</b>
              <small>Badges</small>
            </div>
          </div>
          <div className={`invt-stat${isPremiumUser ? " is-ok" : ""}`}>
            <span className="invt-stat-icon">
              <Icon name="crown" size={16} />
            </span>
            <div>
              <b>{isPremiumUser ? "Active" : "Inactive"}</b>
              <small>Premium</small>
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <p className="invt-note" role="status">
          {message}
        </p>
      ) : null}

      <div className="invt-tabs" role="tablist" aria-label="Inventory sections">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            className={tab === entry.id ? "is-on" : ""}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
            <em>{counts[entry.id]}</em>
          </button>
        ))}
      </div>

      {tab === "usernames" ? (
        <div className="invt-grid">
          {rows.map((row) => {
            const inUse = active === row.handle;
            return (
              <article className={`invt-name${inUse ? " is-active" : ""}`} key={`${row.handle}-${row.account ? "account" : "owned"}`}>
                <div className="invt-name-row">
                  <div className="invt-name-copy">
                    <div className="invt-handle">
                      <span>@</span>
                      {row.handle}
                    </div>
                    <p>{row.account ? "Your original account name — always yours." : `Bought · added ${row.acquired ? day(row.acquired) : "recently"}`}</p>
                  </div>
                  <div className="invt-chips">
                    {row.account ? <span className="invt-chip">Account</span> : null}
                    {inUse ? <span className="invt-chip is-use">● In use</span> : null}
                  </div>
                </div>
                <div className="invt-name-actions">
                  {inUse ? (
                    <button type="button" className="invt-btn" disabled>
                      Currently on profile
                    </button>
                  ) : (
                    <Button variant="primary" disabled={busy} onClick={() => void action("/api/account/aliases/activate", { handle: row.handle })}>
                      Use on profile
                    </Button>
                  )}
                  {row.account ? null : (
                    <Button
                      disabled={busy}
                      onClick={() => {
                        setGift(row.handle === gift ? "" : row.handle);
                        setRecipient("");
                        setConfirm("");
                      }}
                    >
                      Gift
                    </Button>
                  )}
                </div>
                {gift === row.handle ? (
                  <form
                    className="owned-gift"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void action("/api/account/aliases/gift", { handle: gift, recipient, confirmRecipient: confirm });
                    }}
                  >
                    <span>
                      <b>Give @{gift} to another member</b>
                      <small>Ownership transfers and the name leaves your account.</small>
                    </span>
                    <label>
                      Their original username
                      <input required value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="username" autoComplete="off" />
                    </label>
                    <label>
                      Type it again to confirm
                      <input required value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="username" autoComplete="off" />
                    </label>
                    <div className="tw-row">
                      <Button type="submit" variant="primary" disabled={busy || !recipient || recipient !== confirm}>
                        Send gift
                      </Button>
                      <Button type="button" disabled={busy} onClick={() => setGift("")}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
              </article>
            );
          })}

          <a className="invt-ghost" href="#/shop">
            <span className="invt-ghost-icon">
              <Icon name="plus" size={16} />
            </span>
            <b>Get a name</b>
            <small>Claim another short username</small>
          </a>
        </div>
      ) : null}

      {tab === "badges" ? (
        <>
          {[
            { id: "earnable", label: "Earnable", hint: "Unlocked by activity, dates or staff", items: EARNABLE_BADGES },
            { id: "buyable", label: "Buyable", hint: "Bought from the store and granted on delivery", items: BUYABLE_BADGES },
          ].map((list) => {
            const unlocked = list.items.filter((badge) => owned.has(badge.id)).length;
            return (
              <section className="invt-block" key={list.id}>
                <header className="invt-block-head">
                  <span>
                    <h3>{list.label}</h3>
                    <small>{list.hint}</small>
                  </span>
                  <span className="invt-chip">{unlocked}/{list.items.length}</span>
                </header>
                <div className="invt-badges">
                  {[...list.items]
                    .sort((a, b) => Number(owned.has(b.id)) - Number(owned.has(a.id)))
                    .map((badge) => {
                      const has = owned.has(badge.id);
                      return (
                        <article className={`invt-badge${has ? " is-owned" : ""}`} key={badge.id} style={{ ["--c" as string]: badge.color }}>
                          <span className="invt-badge-icon">
                            <img src={badge.art} alt="" width={30} height={30} loading="lazy" />
                          </span>
                          <b>{badge.name}</b>
                          <small>{has ? badge.description : badge.requirement}</small>
                          <span className="invt-badge-dot" aria-hidden="true" />
                          {badge.buyable && !has ? (
                            <a className="invt-badge-buy" href="#/shop">
                              Buy
                            </a>
                          ) : null}
                        </article>
                      );
                    })}
                </div>
              </section>
            );
          })}
        </>
      ) : null}

      {tab === "collectables" ? (
        <div className="invt-empty">
          <span className="invt-empty-icon">
            <Icon name="layers" size={22} />
          </span>
          <b>No collectables yet</b>
          <p>Limited drops will show up here when they release. Trading cards and animated items are on the way.</p>
          <span className="invt-chip is-soon">COMING SOON</span>
        </div>
      ) : null}
    </>
  );
}
