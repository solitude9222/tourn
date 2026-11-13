import "../../pages.css";
import { useCallback, useEffect, useState } from "react";
import { api, post } from "../../lib/backend";
import { useAuth } from "../../lib/auth";
import { Button, Card, CardHead, Chip, EmptyState } from "../ui";

type Inventory = { items: { handle: string; acquired_at: string }[]; primary: string; username: string; alias2: string | null };

export function AliasesPage() {
  const { retryAuth } = useAuth();
  const [data, setData] = useState<Inventory | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [gift, setGift] = useState("");
  const [recipient, setRecipient] = useState("");
  const [confirm, setConfirm] = useState("");

  const load = useCallback(async () => {
    const result = await api<Inventory>("/api/account/aliases");
    if (result.ok) setData(result.data);
    else setMessage(result.error);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
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
    setMessage(path.endsWith("gift") ? "Username transferred. The recipient can activate it in their inventory." : "Your profile address is now active.");
    setGift("");
    setRecipient("");
    setConfirm("");
    await Promise.all([load(), retryAuth()]);
  };

  const active = data?.primary || "";
  const original = data?.username || "";

  return (
    <>
      <Card>
        <CardHead
          icon="link"
          title="Your addresses"
          subtitle="The name visitors see on your profile."
          actions={<Chip tone="muted">{data?.items.length ?? 0} owned</Chip>}
        />
        <div className="addr-list">
          <div className="addr-row">
            <span className="addr-label">Original</span>
            <span className="addr-value">
              tourn.lol/<b>{original || "…"}</b>
            </span>
            <Chip>Permanent</Chip>
          </div>
          <div className="addr-row">
            <span className="addr-label">Active</span>
            <span className="addr-value">
              tourn.lol/<b>{active || "…"}</b>
            </span>
            <Chip tone="success">On your profile</Chip>
          </div>
        </div>
        <div className="addr-actions">
          <a className="tw-btn tw-btn--ghost" href={active || original ? `#/profile/${encodeURIComponent(active || original)}` : "#/dashboard/profile"}>
            View profile
          </a>
          <a className="tw-btn tw-btn--primary" href="#/shop">
            Get a shorter name
          </a>
        </div>
      </Card>

      {new URLSearchParams(window.location.search).get("username_checkout") === "success" ? (
        <Card>
          <p className="dash-note" role="status">
            Your checkout went through. Purchased names appear here once the payment is verified.
          </p>
        </Card>
      ) : null}

      {message ? (
        <Card>
          <p className="dash-note" role="status">
            {message}
          </p>
        </Card>
      ) : null}

      <Card>
        <CardHead icon="layers" title="Owned usernames" subtitle="Use one on your profile or transfer it to another member." />
        {data && data.items.length === 0 ? (
          <EmptyState
            icon="link"
            title="No usernames yet"
            message="Names you buy or receive land here, ready to put on your profile."
            action={
              <a className="tw-btn tw-btn--primary" href="#/shop">
                Browse names
              </a>
            }
          />
        ) : (
          <div className="owned-list">
            {data?.items.map((item) => (
              <div className="owned-row" key={item.handle}>
                <span className="owned-mark" aria-hidden="true">
                  {item.handle.slice(0, 1)}
                </span>
                <span className="owned-copy">
                  <b>@{item.handle}</b>
                  <small>
                    {data.primary === item.handle ? "Active on your profile" : "Ready to use"} · added{" "}
                    {new Date(item.acquired_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </small>
                </span>
                <span className="owned-actions">
                  <Button
                    variant={data.primary === item.handle ? "ghost" : "primary"}
                    disabled={busy || data.primary === item.handle}
                    onClick={() => void action("/api/account/aliases/activate", { handle: item.handle })}
                  >
                    {data.primary === item.handle ? "In use" : "Use on profile"}
                  </Button>
                  <Button disabled={busy} onClick={() => { setGift(item.handle === gift ? "" : item.handle); setRecipient(""); setConfirm(""); }}>
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
        )}
      </Card>
    </>
  );
}
