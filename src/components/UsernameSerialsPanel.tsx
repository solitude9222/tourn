import { useState } from "react";
import { api } from "../lib/backend";

/* Admin usernames: claim a character for free, or mint one redeem code per
   character for a SellAuth serial product. */

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
  const [claimFailed, setClaimFailed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const claimHandle = async () => {
    const handle = claim.trim().toLowerCase();
    if (!handle) return;
    setClaiming(true);
    setClaimNote("");
    setClaimFailed(false);
    const response = await api<{ ok: boolean; handle: string }>("/api/admin/usernames/claim", {
      method: "POST",
      body: JSON.stringify({ handle }),
    });
    setClaiming(false);
    if (!response.ok) {
      setClaimFailed(true);
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
    <section className="adm-panel adm-users-panel">
      <div className="adm-panel-head">
        <h2>Usernames</h2>
        <span className="adm-hint">Stock, free admin claims and serial codes.</span>
      </div>

      <div className="adm-block">
        <div className="adm-block-head">
          <b>Claim a username</b>
          <small>
            Takes the character out of stock and puts it in your inventory. A name that was never stocked is created
            as yours.
          </small>
        </div>
        <div className="adm-claim-row">
          <input
            className="adm-claim-input"
            value={claim}
            maxLength={2}
            placeholder="a"
            aria-label="Username to claim"
            onChange={(event) => {
              setClaim(event.target.value);
              setClaimNote("");
              setClaimFailed(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void claimHandle();
              }
            }}
          />
          <button
            type="button"
            className="adm-action adm-action--primary"
            disabled={claiming || !claim.trim()}
            onClick={() => void claimHandle()}
          >
            {claiming ? "Claiming…" : "Claim for free"}
          </button>
          <span className="adm-note-slot">
            {claimNote ? <p className={`adm-note${claimFailed ? " is-error" : " is-ok"}`}>{claimNote}</p> : null}
          </span>
        </div>
      </div>

      <div className="adm-block">
        <div className="adm-block-head">
          <b>Serial codes</b>
          <small>One code per character. Paste them into a SellAuth serial product; buyers redeem theirs in Billing.</small>
        </div>

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
      </div>
    </section>
  );
}
