/* ---------------------------------------------------------------------------
   Upload presentation settings.

   Controls the exact text the upload tool copies after an upload. Stored
   locally on this device so the preview is always the same shape the rest
   of the dashboard uses.
   --------------------------------------------------------------------------- */

import { useState } from "react";
import { Card, CardHead, Field, SectionLabel, TextInput, Toggle } from "../dash/ui";

type ResponseSettings = {
  custom: boolean;
  format: string;
};

const RESPONSE_KEY = "tourn.uploadResponse";

const DEFAULT_RESPONSE: ResponseSettings = { custom: false, format: "{url}" };

const SAMPLE_URL = "https://tourn.lol/uploads/abc123.png";

const QUICK_FORMATS = ["{url}", "[Image]({url})", "[img]{url}[/img]", '<img src="{url}" />', "||{url}||"];

function readStored<T extends object>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

function store(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private mode: the preview still works, it just will not be remembered. */
  }
}

function useCopied() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string) => {
    try {
      void navigator.clipboard?.writeText(text);
    } catch {
      /* No clipboard access: the click still highlights the token. */
    }
    setCopied(text);
    window.setTimeout(() => setCopied((current) => (current === text ? null : current)), 1400);
  };
  return { copied, copy };
}

export function UploadResponseCard() {
  const [response, setResponse] = useState<ResponseSettings>(() =>
    readStored(RESPONSE_KEY, DEFAULT_RESPONSE),
  );
  const { copied, copy } = useCopied();

  const update = (patch: Partial<ResponseSettings>) => {
    setResponse((current) => {
      const next = { ...current, ...patch };
      store(RESPONSE_KEY, next);
      return next;
    });
  };

  const format = response.custom ? response.format : "{url}";
  const result = format.split("{url}").join(SAMPLE_URL);

  return (
    <Card>
      <CardHead
        icon="link"
        title="Upload Response"
        subtitle="What your upload tool copies after an upload."
      />

      <div className="tw-set-toggle">
        <span className="tw-set-toggle-copy">
          <b>Custom format</b>
          <small>Wrap the link in Markdown, BBCode or anything else.</small>
        </span>
        <Toggle
          checked={response.custom}
          onChange={(custom) => update({ custom })}
          label="Custom format"
        />
      </div>

      <Field
        label="Format"
        hint="{url} is replaced with the link and must stay in the format."
      >
        <TextInput
          value={response.custom ? response.format : "{url}"}
          onChange={(event) => update({ format: event.target.value })}
          spellCheck={false}
          disabled={!response.custom}
        />
      </Field>

      <SectionLabel>Quick formats</SectionLabel>
      <div className="tw-var-row">
        {QUICK_FORMATS.map((option) => (
          <button
            type="button"
            key={option}
            className={`tw-var${format === option ? " is-active" : ""}`}
            onClick={() => update({ custom: true, format: option })}
          >
            {option}
          </button>
        ))}
      </div>

      <SectionLabel>Result</SectionLabel>
      <div className="tw-result">
        <code>{result}</code>
        <button
          type="button"
          className={`tw-var tw-result-copy${copied === result ? " is-copied" : ""}`}
          onClick={() => copy(result)}
        >
          Copy
        </button>
      </div>
    </Card>
  );
}
