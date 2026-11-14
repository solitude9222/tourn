/* ---------------------------------------------------------------------------
   Upload presentation settings.

   Two cards that decide what a copied upload link looks like: the Discord
   embed Discord builds from it, and the exact text the upload tool copies.
   Both are stored locally on this device, so the preview is always the same
   shape the rest of the dashboard uses.
   --------------------------------------------------------------------------- */

import { useState } from "react";
import {
  Card,
  CardHead,
  ColorField,
  Field,
  SectionLabel,
  TextInput,
  Textarea,
  Toggle,
} from "../dash/ui";

type EmbedSettings = {
  rich: boolean;
  title: string;
  accent: string;
  description: string;
  siteName: string;
  siteLink: string;
  showTime: boolean;
};

type ResponseSettings = {
  custom: boolean;
  format: string;
};

const EMBED_KEY = "tourn.uploadEmbed";
const RESPONSE_KEY = "tourn.uploadResponse";

const DEFAULT_EMBED: EmbedSettings = {
  rich: true,
  title: "{file.name} by {user.username}",
  accent: "#587fee",
  description: "{file.size} / {upload.views} views",
  siteName: "tourn.lol",
  siteLink: "https://tourn.lol",
  showTime: false,
};

const DEFAULT_RESPONSE: ResponseSettings = { custom: false, format: "{url}" };

/** Example values, so a variable-filled field previews as something real. */
const SAMPLE: Record<string, string> = {
  "file.name": "abc123.png",
  "file.extension": "png",
  "file.size": "1.4 MB",
  "file.type": "image/png",
  "upload.date": "14 Nov 2026",
  "upload.time": "02:30 PM",
  "upload.views": "1,204",
  "user.username": "koni",
  "user.displayname": "Koni",
  "user.totalStorage": "412 MB",
  "user.totalFiles": "128",
  "user.totalViews": "24.6k",
  "user.storageToday": "3.2 MB",
  "user.viewsToday": "48",
  "user.uploadsToday": "6",
};

const SAMPLE_URL = "https://tourn.lol/uploads/abc123.png";

const VARIABLE_GROUPS: [string, string[]][] = [
  ["File", ["file.name", "file.extension", "file.size", "file.type"]],
  ["Upload", ["upload.date", "upload.time", "upload.views"]],
  [
    "You",
    [
      "user.username",
      "user.displayname",
      "user.totalStorage",
      "user.totalFiles",
      "user.totalViews",
      "user.storageToday",
      "user.viewsToday",
      "user.uploadsToday",
    ],
  ],
];

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

/** Replace every {variable} with its example value. */
function fill(template: string): string {
  return template.replace(/\{([a-z]+\.[a-zA-Z]+)\}/g, (match, key: string) => SAMPLE[key] ?? match);
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

export function UploadEmbedCard() {
  const [embed, setEmbed] = useState<EmbedSettings>(() => readStored(EMBED_KEY, DEFAULT_EMBED));
  const { copied, copy } = useCopied();

  const update = (patch: Partial<EmbedSettings>) => {
    setEmbed((current) => {
      const next = { ...current, ...patch };
      store(EMBED_KEY, next);
      return next;
    });
  };

  return (
    <Card>
      <CardHead
        icon="discord"
        title="Discord Embed"
        subtitle="What Discord shows when you paste a link."
      />

      <div className="tw-set-toggle">
        <span className="tw-set-toggle-copy">
          <b>Rich embed</b>
          <small>Show title, description and color around the preview.</small>
        </span>
        <Toggle checked={embed.rich} onChange={(rich) => update({ rich })} label="Rich embed" />
      </div>

      <div className="tw-set-grid">
        <Field label="Title">
          <TextInput
            value={embed.title}
            onChange={(event) => update({ title: event.target.value })}
            spellCheck={false}
          />
        </Field>
        <ColorField
          label="Accent color"
          value={embed.accent}
          onChange={(accent) => update({ accent })}
        />
      </div>

      <Field label="Description">
        <Textarea
          rows={2}
          value={embed.description}
          onChange={(event) => update({ description: event.target.value })}
          spellCheck={false}
        />
      </Field>

      <div className="tw-set-grid">
        <Field label="Site name">
          <TextInput
            value={embed.siteName}
            onChange={(event) => update({ siteName: event.target.value })}
          />
        </Field>
        <Field label="Site link">
          <TextInput
            value={embed.siteLink}
            onChange={(event) => update({ siteLink: event.target.value })}
            spellCheck={false}
          />
        </Field>
      </div>

      <div className="tw-set-toggle">
        <span className="tw-set-toggle-copy">
          <b>Show upload time</b>
          <small>Adds the upload time under the embed.</small>
        </span>
        <Toggle
          checked={embed.showTime}
          onChange={(showTime) => update({ showTime })}
          label="Show upload time"
        />
      </div>

      <SectionLabel hint="Variables use example values here.">Preview</SectionLabel>

      <div className="tw-embed-preview">
        <div className="tw-embed-msg">
          <span className="tw-embed-avatar" aria-hidden="true">
            K
          </span>
          <div className="tw-embed-body">
            <div className="tw-embed-meta">
              <b>{SAMPLE["user.username"]}</b>
              <span>Today at 02:30 PM</span>
            </div>
            <span className="tw-embed-link">{SAMPLE_URL}</span>
            {embed.rich ? (
              <div className="tw-embed-card" style={{ borderLeftColor: embed.accent }}>
                <b>{fill(embed.title)}</b>
                {embed.description ? <p>{fill(embed.description)}</p> : null}
                <div className="tw-embed-foot">
                  {embed.siteName ? <span>{embed.siteName}</span> : null}
                  {embed.showTime ? <i>Today at 02:30 PM</i> : null}
                </div>
              </div>
            ) : (
              <span className="tw-embed-plain">{SAMPLE_URL}</span>
            )}
          </div>
        </div>
      </div>

      <SectionLabel hint="Click a variable to copy it, then paste it into any embed field.">
        Variables
      </SectionLabel>

      <div className="tw-var-groups">
        {VARIABLE_GROUPS.map(([group, keys]) => (
          <div className="tw-var-group" key={group}>
            <span className="tw-var-title">{group}</span>
            <div className="tw-var-row">
              {keys.map((key) => {
                const token = `{${key}}`;
                return (
                  <button
                    type="button"
                    key={key}
                    className={`tw-var${copied === token ? " is-copied" : ""}`}
                    onClick={() => copy(token)}
                  >
                    {token}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
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
