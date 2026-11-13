import { useCallback, useEffect, useState } from "react";
import { api, post } from "../lib/backend";
import { useAuth } from "../lib/auth";
import { badgeDef } from "../lib/badges";
import { decryptMessage, encryptMessage, myPublicKey } from "../lib/e2ee";
import { Button, Icon, Modal, TextInput } from "./ui";

/* ---------------------------------------------------------------------------
   Trades: the send dialog (from inventory) and the thread (from notifications).

   Both sides put items up; the recipient accepts. The account name can never be
   offered, so a member always keeps at least one username. Chat is E2EE — see
   lib/e2ee.ts — and the server only stores ciphertext.
   --------------------------------------------------------------------------- */

type Person = { username: string; avatar_url: string | null };
type Assets = { usernames: { handle: string }[]; badges: string[] };
type TradeItem = { id: string; from_user: string; kind: "username" | "badge"; ref: string; from_username: string };
type TradeRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  message: string | null;
  sender_username: string;
  recipient_username: string;
  item_count: number;
};

const itemLabel = (item: { kind: "username" | "badge"; ref: string }) =>
  item.kind === "username" ? `@${item.ref}` : badgeDef(item.ref)?.name ?? item.ref;

export function TradeDialog({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  onSent?: (message: string) => void;
}) {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [recipient, setRecipient] = useState<Person | null>(null);
  const [assets, setAssets] = useState<Assets>({ usernames: [], badges: [] });
  const [picked, setPicked] = useState<Record<string, { kind: "username" | "badge"; ref: string }>>({});
  const [message, setMessage] = useState("");
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setRecipient(null);
    setPicked({});
    setMessage("");
    setSure(false);
    setError("");
    void api<Assets>("/api/trades/assets").then((result) => {
      if (result.ok) setAssets(result.data);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void api<{ people: Person[] }>(`/api/trades/people?q=${encodeURIComponent(query)}`).then((result) => {
        if (result.ok) setPeople(result.data.people);
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  const pickedList = Object.values(picked);
  const toggle = (kind: "username" | "badge", ref: string) => {
    const key = `${kind}:${ref}`;
    setPicked((current) => {
      const next = { ...current };
      if (next[key]) delete next[key];
      else next[key] = { kind, ref };
      return next;
    });
  };

  const send = async () => {
    if (!recipient || !pickedList.length || !sure) return;
    setBusy(true);
    setError("");
    const result = await post<{ ok: boolean; id: string }>("/api/trades", {
      recipient: recipient.username,
      message,
      items: pickedList,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSent?.(`Trade sent to @${recipient.username}. They answer it from their notifications.`);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Trade"
      subtitle="Offer a username or badge. Nothing moves until they accept."
      onClose={onClose}
      width={620}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy || !recipient || !pickedList.length || !sure} onClick={() => void send()}>
            {busy ? "Sending…" : "Send trade"}
          </Button>
        </>
      }
    >
      <div className="trade-form">
        {recipient ? (
          <div className="trade-peer">
            <span className="trade-peer-avatar">{(recipient.username[0] || "?").toUpperCase()}</span>
            <span>
              <b>@{recipient.username}</b>
              <small>They will accept or decline from notifications.</small>
            </span>
            <Button onClick={() => setRecipient(null)}>Change</Button>
          </div>
        ) : (
          <div className="trade-people">
            <TextInput
              placeholder="Search members"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
            <div className="trade-people-list">
              {people.map((person) => (
                <button key={person.username} type="button" className="trade-person" onClick={() => setRecipient(person)}>
                  <span className="trade-peer-avatar">{(person.username[0] || "?").toUpperCase()}</span>
                  <b>@{person.username}</b>
                  <span className="trade-person-go">Trade</span>
                </button>
              ))}
              {!people.length ? <p className="trade-empty">No members match that search.</p> : null}
            </div>
          </div>
        )}

        <div className="trade-group">
          <span className="trade-group-label">Your usernames</span>
          <div className="trade-chips">
            {assets.usernames.length ? (
              assets.usernames.map((item) => {
                const on = Boolean(picked[`username:${item.handle}`]);
                return (
                  <button
                    key={item.handle}
                    type="button"
                    className={`trade-chip${on ? " is-on" : ""}`}
                    onClick={() => toggle("username", item.handle)}
                  >
                    @{item.handle}
                    {on ? <Icon name="check" size={12} /> : null}
                  </button>
                );
              })
            ) : (
              <p className="trade-empty">You have no bought usernames to trade yet.</p>
            )}
          </div>
          <small className="trade-hint">Your account name is never tradable, so you always keep a username.</small>
        </div>

        <div className="trade-group">
          <span className="trade-group-label">Your badges</span>
          <div className="trade-chips">
            {assets.badges.length ? (
              assets.badges.map((id) => {
                const badge = badgeDef(id);
                if (!badge) return null;
                const on = Boolean(picked[`badge:${id}`]);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`trade-chip trade-chip--badge${on ? " is-on" : ""}`}
                    onClick={() => toggle("badge", id)}
                  >
                    <img src={badge.art} alt="" width={18} height={18} />
                    {badge.name}
                    {on ? <Icon name="check" size={12} /> : null}
                  </button>
                );
              })
            ) : (
              <p className="trade-empty">Badges you own from the store or staff can be traded.</p>
            )}
          </div>
        </div>

        <label className="trade-field">
          Note (optional)
          <textarea
            value={message}
            maxLength={500}
            rows={3}
            placeholder="Say what you are after."
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>

        <label className="trade-sure">
          <input type="checkbox" checked={sure} onChange={(event) => setSure(event.target.checked)} />
          <span>
            Are you sure? Accepted trades are final — usernames and badges move instantly and cannot be undone.
          </span>
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

export function TradeThread({
  tradeId,
  open,
  onClose,
  onChanged,
}: {
  tradeId: string | null;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const [data, setData] = useState<{ trade: TradeRow; items: TradeItem[]; sender: Person; recipient: Person } | null>(null);
  const [messages, setMessages] = useState<{ id: string; sender_id: string; cipher: string; iv: string; public_key: JsonWebKey | null; created_at: string }[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [peerKey, setPeerKey] = useState<JsonWebKey | null>(null);
  const [draft, setDraft] = useState("");
  const [assets, setAssets] = useState<Assets>({ usernames: [], badges: [] });
  const [add, setAdd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!tradeId) return;
    const result = await api<{ trade: TradeRow; items: TradeItem[]; sender: Person; recipient: Person }>(`/api/trades/${tradeId}`);
    if (result.ok) setData(result.data);
    const chat = await api<{ messages: typeof messages }>(`/api/trades/${tradeId}/messages`);
    if (chat.ok) setMessages(chat.data.messages);
    const mine = await api<Assets>("/api/trades/assets");
    if (mine.ok) setAssets(mine.data);
  }, [tradeId]);

  useEffect(() => {
    if (!open || !tradeId) return;
    setData(null);
    setTexts({});
    setPeerKey(null);
    setError("");
    void load();
  }, [open, tradeId, load]);

  // Publish this device's public key, then read theirs. Both sides only ever
  // exchange public keys — the private half never leaves this browser.
  useEffect(() => {
    if (!open || !tradeId || !user) return;
    let cancelled = false;
    void (async () => {
      const publicKey = await myPublicKey(user.id);
      await post(`/api/trades/${tradeId}/key`, { publicKey });
      const result = await api<{ peerKey: JsonWebKey | null }>(`/api/trades/${tradeId}/key`);
      if (!cancelled && result.ok) setPeerKey(result.data.peerKey);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tradeId, user]);

  useEffect(() => {
    if (!user || !peerKey) return;
    let cancelled = false;
    void (async () => {
      const decoded: Record<string, string> = {};
      for (const message of messages) {
        try {
          decoded[message.id] = await decryptMessage(user.id, peerKey, message.cipher, message.iv);
        } catch {
          decoded[message.id] = "🔒 Locked on this device";
        }
      }
      if (!cancelled) setTexts(decoded);
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, peerKey, user]);

  const respond = async (accept: boolean) => {
    if (!tradeId) return;
    setBusy(true);
    const result = await post<{ ok: boolean }>(`/api/trades/${tradeId}/respond`, { accept });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
    onChanged?.();
  };

  const cancelTrade = async () => {
    if (!tradeId) return;
    const result = await post<{ ok: boolean }>(`/api/trades/${tradeId}/cancel`);
    if (!result.ok) setError(result.error);
    await load();
    onChanged?.();
  };

  const sendMessage = async () => {
    if (!tradeId || !user || !peerKey || !draft.trim()) return;
    setBusy(true);
    try {
      const publicKey = await myPublicKey(user.id);
      const { cipher, iv } = await encryptMessage(user.id, peerKey, draft.trim());
      const result = await post(`/api/trades/${tradeId}/messages`, { cipher, iv, publicKey });
      if (!result.ok) setError(result.error);
      else setDraft("");
      await load();
    } catch {
      setError("This device could not encrypt that message.");
    } finally {
      setBusy(false);
    }
  };

  const addItem = async () => {
    if (!tradeId || !add) return;
    const [kind, ref] = add.split(":", 2) as ["username" | "badge", string];
    const result = await post(`/api/trades/${tradeId}/items`, { kind, ref });
    if (!result.ok) setError(result.error);
    setAdd("");
    await load();
    onChanged?.();
  };

  const mine = (item: TradeItem) => item.from_user === user?.id;
  const canAnswer = data?.trade.status === "pending" && data.trade.recipient_id === user?.id;
  const canCancel = data?.trade.status === "pending" && data.trade.sender_id === user?.id;
  const offered = new Set(data?.items.map((item) => `${item.kind}:${item.ref}`) ?? []);
  const addable = [
    ...assets.usernames.map((item) => ({ key: `username:${item.handle}`, label: `@${item.handle}` })),
    ...assets.badges.map((id) => ({ key: `badge:${id}`, label: badgeDef(id)?.name ?? id })),
  ].filter((item) => !offered.has(item.key));

  return (
    <Modal
      open={open}
      title={data ? `Trade with @${data.trade.sender_id === user?.id ? data.recipient?.username : data.sender?.username}` : "Trade"}
      subtitle={data ? `${data.trade.status} · chat is end-to-end encrypted` : "Loading…"}
      onClose={onClose}
      width={620}
      footer={
        canAnswer ? (
          <>
            <Button variant="primary" disabled={busy} onClick={() => void respond(true)}>
              Accept trade
            </Button>
            <Button disabled={busy} onClick={() => void respond(false)}>
              Decline
            </Button>
          </>
        ) : canCancel ? (
          <Button disabled={busy} onClick={() => void cancelTrade()}>
            Cancel trade
          </Button>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      <div className="trade-form">
        {data ? (
          <>
            <div className="trade-items">
              {data.items.map((item) => (
                <span className={`trade-item${mine(item) ? " is-mine" : ""}`} key={item.id}>
                  {item.kind === "username" ? <Icon name="at" size={13} /> : <Icon name="shield" size={13} />}
                  {itemLabel(item)}
                  <small>{mine(item) ? "you give" : "they give"}</small>
                </span>
              ))}
              {!data.items.length ? <p className="trade-empty">Nothing offered yet.</p> : null}
            </div>

            {data.trade.message ? <p className="trade-note">“{data.trade.message}”</p> : null}

            {data.trade.status === "pending" && addable.length ? (
              <div className="trade-add">
                <span className="trade-group-label">Add to the trade</span>
                <div className="trade-chips">
                  {addable.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`trade-chip${add === item.key ? " is-on" : ""}`}
                      onClick={() => setAdd(add === item.key ? "" : item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <Button disabled={!add || busy} onClick={() => void addItem()}>
                  Add to trade
                </Button>
              </div>
            ) : null}

            <div className="trade-chat">
              <div className="trade-chat-log">
                {messages.map((message) => (
                  <div key={message.id} className={`trade-msg${message.sender_id === user?.id ? " is-mine" : ""}`}>
                    <small>{message.sender_id === user?.id ? "You" : "Them"}</small>
                    <p>{texts[message.id] ?? "…"}</p>
                  </div>
                ))}
                {!messages.length ? <p className="trade-empty">No messages yet. Agree the details here.</p> : null}
              </div>
              {peerKey ? (
                <div className="trade-chat-send">
                  <TextInput
                    value={draft}
                    placeholder="Message…"
                    maxLength={800}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                  <Button variant="primary" disabled={busy || !draft.trim()} onClick={() => void sendMessage()}>
                    Send
                  </Button>
                </div>
              ) : (
                <p className="trade-hint">
                  {messages.length
                    ? "Waiting for their device key — the first message they send unlocks this chat."
                    : "Send the first message to open the encrypted chat."}
                </p>
              )}
            </div>
          </>
        ) : null}
        {error ? (
          <p className="trade-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
