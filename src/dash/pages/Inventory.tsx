import "../../pages.css";
import { useCallback, useEffect, useState } from "react";
import { api, post } from "../../lib/backend";
import { useAuth } from "../../lib/auth";
import { BADGE_CATALOGUE } from "../../lib/badges";
import { useDash } from "../context";
import { Button, Card, CardHead, Chip, EmptyState, Segmented } from "../ui";

type InventoryTab = "usernames" | "badges" | "collectables";

type OwnedNames = {
  items: { handle: string; acquired_at: string }[];
  primary: string;
  username: string;
  alias2: string | null;
};

const TABS: { value: InventoryTab; label: string }[] = [
  { value: "usernames", label: "Usernames" },
  { value: "badges", label: "Badges" },
  { value: "collectables", label: "Collectables" },
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
    setMessage(path.endsWith("gift") ? "Transfer complete. The name is in their inventory now." : "That name is now on your profile.");
    setGift("");
    setRecipient("");
    setConfirm("");
    await Promise.all([load(), retryAuth()]);
  };

  const owned = new Set([...earned, ...badges.equipped.map((badge) => badge.id)]);
  const active = names?.primary || "";
  const original = names?.username || "";
  const nameCount = names?.items.length ?? 0;
  const shown = active || original;

  // The account's own name always belongs on the list, even before any purchase.
  const rows: { handle: string; account: boolean; acquired: string | null }[] = names
    ? [
        { handle: original, account: true, acquired: null },
        ...names.items
          .filter((item) => item.handle !== original)
          .map((item) => ({ handle: item.handle, account: false, acquired: item.acquired_at })),
      ]
    : [];

  return (
    <Card>
      <div className="inv-hero">
        <span className="inv-avatar" aria-hidden="true">
          {(shown || "?").slice(0, 1).toUpperCase()}
        </span>
        <div className="inv-hero-copy">
          <small>Profile address</small>
          <b>tourn.lol/{shown || "…"}</b>
          <span className="inv-hero-meta">
            <Chip tone={isPremiumUser ? "accent" : "muted"}>{isPremiumUser ? "Premium" : "Free"}</Chip>
            {isPremiumUser ? <Chip tone="muted">swats.bio works too</Chip> : null}
            <span className="inv-hero-count">
              {nameCount} name{nameCount === 1 ? "" : "s"} · {owned.size} badge{owned.size === 1 ? "" : "s"}
            </span>
          </span>
        </div>
        <div className="inv-hero-actions">
          <a className="tw-btn tw-btn--ghost" href={shown ? `#/profile/${encodeURIComponent(shown)}` : "#/dashboard/profile"}>
            View profile
          </a>
          <a className="tw-btn tw-btn--primary" href="#/shop">
            Get a name
          </a>
        </div>
      </div>

      <div className="inv-stats">
        <div className="inv-stat">
          <b>{nameCount}</b>
          <small>Usernames</small>
        </div>
        <div className="inv-stat">
          <b>{owned.size}</b>
          <small>Badges</small>
        </div>
        <div className="inv-stat">
          <b>{isPremiumUser ? "Active" : "None"}</b>
          <small>Premium</small>
        </div>
      </div>

      <Segmented value={tab} options={TABS} onChange={(value) => setTab(value as InventoryTab)} />

      {message ? (
        <p className="inv-note" role="status">
          {message}
        </p>
      ) : null}

      {tab === "usernames" ? (
        <>
          {names && nameCount === 0 ? (
            <EmptyState
              icon="link"
              title="No bought names yet"
              message="Your account name is below. Single-character names you buy land here too, ready to put on your profile."
              action={
                <a className="tw-btn tw-btn--primary" href="#/shop">
                  Browse names
                </a>
              }
            />
          ) : null}

          <div className="inv-list">
            {rows.map((row) => {
              const inUse = active === row.handle;
              return (
                <div className={`inv-name${inUse ? " is-active" : ""}`} key={`${row.handle}-${row.account ? "account" : "owned"}`}>
                  <span className="inv-name-mark" aria-hidden="true">
                    {row.handle.slice(0, 1)}
                  </span>
                  <span className="inv-name-copy">
                    <span className="inv-name-line">
                      <b>@{row.handle}</b>
                      {row.account ? <Chip tone="muted">Account</Chip> : null}
                      {inUse ? <Chip tone="success">In use</Chip> : null}
                    </span>
                    <small>
                      {row.account ? "Your original account name — always yours." : `Bought · added ${row.acquired ? day(row.acquired) : "recently"}`}
                    </small>
                  </span>
                  <span className="inv-name-actions">
                    {inUse ? null : (
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
                  </span>
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
                          Transfer ownership
                        </Button>
                        <Button type="button" disabled={busy} onClick={() => setGift("")}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {tab === "badges" ? (
        <>
          <CardHead icon="star" title="Badges" subtitle="Everything in the catalogue — owned ones first." />
          <div className="inv-badge-grid">
            {[...BADGE_CATALOGUE].sort((a, b) => Number(owned.has(b.id)) - Number(owned.has(a.id))).map((badge) => {
              const has = owned.has(badge.id);
              return (
                <div className={`inv-badge${has ? " is-owned" : ""}`} key={badge.id}>
                  <span className="inv-badge-art">
                    <img src={badge.art} alt="" width={32} height={32} loading="lazy" />
                  </span>
                  <span className="inv-badge-copy">
                    <b>{badge.name}</b>
                    <small>{has ? badge.description : badge.requirement}</small>
                  </span>
                  <Chip tone={has ? "success" : "muted"}>{has ? "Owned" : "Locked"}</Chip>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {tab === "collectables" ? (
        <>
          <CardHead icon="layers" title="Collectables" subtitle="Trading cards, animated items and numbered drops." actions={<Chip tone="amber">COMING SOON</Chip>} />
          <div className="inv-collect">
            <span className="inv-collect-tile">
              <b>?</b>
            </span>
            <div className="inv-collect-copy">
              <b>Nothing to collect yet</b>
              <small>A shelf for limited items is being built. Seasonal drops will show up here when they go live.</small>
            </div>
          </div>
        </>
      ) : null}
    </Card>
  );
}
