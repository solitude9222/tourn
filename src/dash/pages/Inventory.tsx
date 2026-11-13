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
  const { retryAuth } = useAuth();
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

  return (
    <Card>
      <CardHead
        icon="layers"
        title="Inventory"
        subtitle="Everything your account owns, in one place."
        actions={
          <span className="tw-row">
            <Chip tone="muted">{nameCount} names</Chip>
            <Chip tone="muted">{owned.size} badges</Chip>
          </span>
        }
      />

      <Segmented value={tab} options={TABS} onChange={(value) => setTab(value as InventoryTab)} />

      {message ? (
        <p className="inv-note" role="status">
          {message}
        </p>
      ) : null}

      {tab === "usernames" ? (
        <>
          <div className="inv-address">
            <div className="inv-address-item">
              <small>Original</small>
              <b>tourn.lol/{original || "…"}</b>
              <Chip tone="muted">Permanent</Chip>
            </div>
            <div className="inv-address-item">
              <small>Active</small>
              <b>tourn.lol/{active || "…"}</b>
              <Chip tone="success">On your profile</Chip>
            </div>
          </div>

          {names && nameCount === 0 ? (
            <EmptyState
              icon="link"
              title="No usernames yet"
              message="Single-character names you buy land here, ready to put on your profile."
              action={
                <a className="tw-btn tw-btn--primary" href="#/shop">
                  Browse names
                </a>
              }
            />
          ) : null}

          <div className="owned-list">
            {names?.items.map((item) => (
              <div className="owned-row" key={item.handle}>
                <span className="owned-mark" aria-hidden="true">
                  {item.handle.slice(0, 1)}
                </span>
                <span className="owned-copy">
                  <b>@{item.handle}</b>
                  <small>
                    {names.primary === item.handle ? "Active on your profile" : "Ready to use"} · added {day(item.acquired_at)}
                  </small>
                </span>
                <span className="owned-actions">
                  <Button
                    variant={names.primary === item.handle ? "ghost" : "primary"}
                    disabled={busy || names.primary === item.handle}
                    onClick={() => void action("/api/account/aliases/activate", { handle: item.handle })}
                  >
                    {names.primary === item.handle ? "In use" : "Use on profile"}
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      setGift(item.handle === gift ? "" : item.handle);
                      setRecipient("");
                      setConfirm("");
                    }}
                  >
                    Gift
                  </Button>
                </span>
                {gift === item.handle ? (
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
            ))}
          </div>
        </>
      ) : null}

      {tab === "badges" ? (
        <div className="inv-list">
          {BADGE_CATALOGUE.map((badge) => {
            const has = owned.has(badge.id);
            return (
              <div className={`inv-row${has ? "" : " is-locked"}`} key={badge.id}>
                <img className="inv-art" src={badge.art} alt="" width={28} height={28} loading="lazy" />
                <span className="inv-copy">
                  <b>{badge.name}</b>
                  <small>{has ? badge.description : badge.requirement}</small>
                </span>
                <Chip tone={has ? "success" : "muted"}>{has ? "Owned" : "Not yet"}</Chip>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === "collectables" ? (
        <div className="inv-row">
          <span className="inv-copy">
            <b>Collectables</b>
            <small>Trading cards, animated items and numbered drops. Nothing to collect yet.</small>
          </span>
          <Chip tone="amber">Coming soon</Chip>
        </div>
      ) : null}
    </Card>
  );
}
