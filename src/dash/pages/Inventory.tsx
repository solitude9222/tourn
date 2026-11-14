import { useCallback, useEffect, useState } from "react";
import { naturalCompare, sorted } from "../../lib/sort";
import { api, post } from "../../lib/backend";
import { useAuth } from "../../lib/auth";
import { BADGE_CATALOGUE, BUYABLE_BADGES, EARNABLE_BADGES } from "../../lib/badges";
import { useDash } from "../context";
import { Button, Icon, Modal, TextInput } from "../ui";
import { TradeDialog } from "../Trades";

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
  const [tradeOpen, setTradeOpen] = useState(false);
  const [giftFor, setGiftFor] = useState<string | null>(null);

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
    setMessage("That name is now on your profile.");
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
                    <>
                      <Button disabled={busy} icon="move" onClick={() => setTradeOpen(true)}>
                        TRADE
                      </Button>
                      <Button disabled={busy} icon="gift" onClick={() => setGiftFor(row.handle)}>
                        GIFT
                      </Button>
                    </>
                  )}
                </div>
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
            if (!list.items.length) return null;
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
                  {sorted(list.items, (a, b) => Number(owned.has(b.id)) - Number(owned.has(a.id)) || naturalCompare(a.name, b.name))
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

      <TradeDialog open={tradeOpen} onClose={() => setTradeOpen(false)} onSent={setMessage} />
      <GiftDialog
        handle={giftFor}
        onClose={() => setGiftFor(null)}
        onSent={async (text) => {
          setMessage(text);
          await Promise.all([load(), retryAuth()]);
        }}
      />
    </>
  );
}

/* Gifts hand a bought username straight to another member. The server moves it
   in one transaction, drops it from this account's profile, and records it. */
function GiftDialog({
  handle,
  onClose,
  onSent,
}: {
  handle: string | null;
  onClose: () => void;
  onSent: (message: string) => Promise<void> | void;
}) {
  const [recipient, setRecipient] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!handle) return;
    setRecipient("");
    setConfirm("");
    setError("");
  }, [handle]);

  const send = async () => {
    if (!handle) return;
    setBusy(true);
    setError("");
    const result = await post<{ ok: boolean; recipient: string }>("/api/account/aliases/gift", {
      handle,
      recipient,
      confirmRecipient: confirm,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await onSent(`@${handle} was gifted to @${result.data.recipient}.`);
    onClose();
  };

  return (
    <Modal
      open={Boolean(handle)}
      title={handle ? `Gift @${handle}` : "Gift"}
      subtitle="They get the username instantly. It leaves your inventory, and gifts cannot be undone."
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy || !recipient.trim() || !confirm.trim()} onClick={() => void send()}>
            {busy ? "Gifting…" : "Gift username"}
          </Button>
        </>
      }
    >
      <div className="gift-form">
        <label className="tw-field">
          Their username
          <TextInput
            value={recipient}
            placeholder="@username"
            autoComplete="off"
            onChange={(event) => setRecipient(event.target.value)}
          />
        </label>
        <label className="tw-field">
          Type it again to confirm
          <TextInput
            value={confirm}
            placeholder="@username"
            autoComplete="off"
            onChange={(event) => setConfirm(event.target.value)}
          />
        </label>
        {error ? (
          <p className="trade-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
