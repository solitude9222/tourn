import {AliasAvailability} from "../components/AliasAvailability";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { useDash } from "./context";
import { Button, Icon } from "./ui";

/**
 * A hard stop for accounts whose Discord username used to be their handle.
 * The dashboard stays visible but blurred behind the card so the account can
 * see where it is, while the only action available is choosing a real alias.
 */
export function AliasRequiredGate() {
  const { user, setAlias } = useAuth();
  const { notify } = useDash();
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dialog=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!user?.aliasRequired)return;
    const previous=document.activeElement as HTMLElement|null;
    const trap=(event:KeyboardEvent)=>{
      if(event.key!=='Tab')return;
      const controls=Array.from(dialog.current?.querySelectorAll<HTMLElement>('input:not(:disabled),button:not(:disabled),a[href]')||[]);
      const first=controls[0],last=controls.at(-1);
      if(!first)return;
      if(event.shiftKey&&(document.activeElement===first||!dialog.current?.contains(document.activeElement))){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!dialog.current?.contains(document.activeElement))){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',trap,true);
    return()=>{document.removeEventListener('keydown',trap,true);previous?.focus();};
  },[user?.aliasRequired]);
  if (!user?.aliasRequired) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const result = await setAlias(draft);
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    notify("Alias set", `Your profile is now tourn.lol/${draft.trim().toLowerCase()}.`);
  };

  return (
    <div ref={dialog} className="tw-alias-gate" role="dialog" aria-modal="true" aria-labelledby="alias-gate-title">
      <form className="tw-alias-gate-card" onSubmit={submit}>
        <span className="tw-alias-gate-icon">
          <Icon name="at" size={20} />
        </span>
        <p className="tw-alias-gate-kicker">One thing before you continue</p>
        <h2 id="alias-gate-title">Set your alias</h2>
        <p className="tw-alias-gate-copy">
          {user.aliasResetAt
            ? "Your old handle was the same as your Discord username, so it has been released. Pick the name people will see on tourn.lol."
            : "Choose the handle people will see on your tourn.lol profile."}
        </p>
        {user.alias?.startsWith("user_") ? (
          <p className="tw-alias-gate-temp">
            Temporary handle: <b>@{user.alias}</b>
          </p>
        ) : null}
        <label className="tw-alias-gate-field">
          <span>tourn.lol/</span>
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 24))}
            placeholder="yourname"
            autoComplete="off"
            spellCheck={false}
            aria-label="Your new alias"
          />
        </label>
        <AliasAvailability value={draft} onChoose={setDraft}/>
        <Button type="submit" variant="primary" disabled={busy || draft.trim().length < 3}>
          {busy ? "Saving…" : "Set alias"}
        </Button>
        <p className="tw-alias-gate-note">
          This is your only alias. Your profile content and settings stay in place.
        </p>
        {message ? (
          <p className="tw-alias-gate-error" role="alert">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
