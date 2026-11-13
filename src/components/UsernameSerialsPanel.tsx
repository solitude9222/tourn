import { useState } from "react";
import { api } from "../lib/backend";

/* Turns a list of single characters into one redeem code each, so a SellAuth
   serial product can hand them out and the buyer claims the name in Billing. */

type Serial = { handle: string; code: string };
type Skipped = { handle: string; reason: string };

export function UsernameSerialsPanel() {
  const [raw, setRaw] = useState("abcdefghijklmnopqrstuvwxyz0123456789");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ serials: Serial[]; skipped: Skipped[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const [claim, setClaim] = useState("");
  const [claimNote, setClaimNote] = useState("");
  const [claiming, setClaiming] = useState(false);

  const claimHandle = async () => {
    const handle = claim.trim().toLowerCase();
    if (!handle) return;
    setClaiming(true);
    setClaimNote("");
    const response = await api<{ ok: boolean; handle: string }>("/api/admin/usernames/claim", {
      method: "POST",
      body: JSON.stringify({ handle }),
    });
    setClaiming(false);
    if (!response.ok) {
      setClaimNote(response.error);
      return;
    }
    setClaimNote(`@${response.data.handle} is in your inventory.`);
    setClaim("");
  };

  const generate = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    setCopied(false);
    const handles = raw.split(/[^0-9a-z\p{S}]+/u).filter(Boolean);
    const response = await api<{ serials: Serial[]; skipped: Skipped[] }>("/api/admin/commerce/serials", {
      method: "POST",
      body: JSON.stringify({ handles }),
    });
    setBusy(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setResult(response.data);
  };

  const serialText = result ? result.serials.map((serial) => serial.code).join("\n") : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(serialText);
      setCopied(true);
    } catch {
      setError("Couldn't copy — select the list and copy it by hand.");
    }
  };

  return (
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2>Username serials</h2>
        <span className="adm-hint">
          One code per character. Paste them into a SellAuth serial product; the buyer redeems theirs in Dashboard → Billing.
        </span>
      </div>

      <div className="adm-serial-row">
        <input
          className="adm-claim-input"
          value={claim}
          maxLength={2}
          placeholder="k"
          aria-label="Username to claim"
          onChange={(event) => {
            setClaim(event.target.value);
            setClaimNote("");
          }}
        />
        <button type="button" className="adm-action" disabled={claiming || !claim.trim()} onClick={() => void claimHandle()}>
          {claiming ? "Claiming…" : "Claim for me, free"}
        </button>
        <span className="adm-hint">
          Takes the character out of stock and puts it in your inventory. If it was never stocked, it is added as yours.
        </span>
      </div>
      {claimNote ? <p className="adm-hint">{claimNote}</p> : null}

      <label className="adm-field">
        Characters
        <textarea
          className="adm-serial-box"
          rows={3}
          value={raw}
          spellCheck={false}
          onChange={(event) => setRaw(event.target.value)}
        />
      </label>

      <div className="adm-serial-row">
        <button type="button" className="adm-action" disabled={busy} onClick={() => void generate()}>
          {busy ? "Generating…" : "Generate codes"}
        </button>
        <span className="adm-hint">Letters, numbers or one symbol each — anything else is ignored.</span>
      </div>

      {error ? <p className="adm-serial-error">{error}</p> : null}

      {result ? (
        <div className="adm-serial-result">
          <p className="adm-hint">
            {result.serials.length} code{result.serials.length === 1 ? "" : "s"} ready
            {result.skipped.length ? ` · ${result.skipped.length} skipped` : ""}
          </p>
          <textarea className="adm-serial-box adm-serial-box--out" rows={10} readOnly value={serialText} />
          <div className="adm-serial-row">
            <button type="button" className="adm-action" onClick={() => void copy()} disabled={!serialText}>
              {copied ? "Copied" : "Copy all codes"}
            </button>
            <span className="adm-hint">Each line is one serial. Stock in SellAuth equals the number of lines.</span>
          </div>
          {result.skipped.length ? (
            <ul className="adm-serial-skipped">
              {result.skipped.map((item) => (
                <li key={item.handle}>
                  @{item.handle} — {item.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
