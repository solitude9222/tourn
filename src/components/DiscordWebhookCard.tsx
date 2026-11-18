import { useEffect, useState } from "react";
import { Button, Card, CardHead, Chip, ColorField, Field, Icon, Select, Textarea, TextInput, Toggle } from "../dash/ui";
import { useDash } from "../dash/context";
import { api } from "../lib/backend";

type WebhookEmbedConfig = {
  format: "discord" | "raw";
  username: string;
  avatarUrl: string;
  content: string;
  embed: boolean;
  title: string;
  description: string;
  color: string;
  image: "background" | "banner" | "avatar" | "share" | "none";
  thumbnail: "avatar" | "share" | "favicon" | "none";
  footer: string;
  footerIcon: "avatar" | "logo" | "none";
  timestamp: boolean;
  fields: boolean;
  buttons: { label: string; url: string }[];
};

type WebhookConfig = {
  url: string;
  enabled: boolean;
  config: WebhookEmbedConfig;
  lastStatus: number | null;
  lastError: string | null;
  lastSentAt: string | null;
  updatedAt: string | null;
};

const DEFAULT_CONFIG: WebhookEmbedConfig = {
  format: "discord",
  username: "",
  avatarUrl: "",
  content: "",
  embed: true,
  title: "",
  description: "",
  color: "#3b82f6",
  image: "background",
  thumbnail: "avatar",
  footer: "",
  footerIcon: "avatar",
  timestamp: true,
  fields: true,
  buttons: [],
};

const IMAGE_OPTIONS = [
  { value: "background", label: "Profile background" },
  { value: "banner", label: "Profile banner" },
  { value: "avatar", label: "Profile picture" },
  { value: "share", label: "Share image" },
  { value: "none", label: "No image" },
];

const THUMB_OPTIONS = [
  { value: "avatar", label: "Profile picture" },
  { value: "share", label: "Share image" },
  { value: "favicon", label: "Favicon" },
  { value: "none", label: "No thumbnail" },
];

const FOOTER_ICON_OPTIONS = [
  { value: "avatar", label: "Profile picture" },
  { value: "logo", label: "tourn.lol logo" },
  { value: "none", label: "No icon" },
];

function mergeConfig(input: Partial<WebhookEmbedConfig> | null | undefined): WebhookEmbedConfig {
  return {
    ...DEFAULT_CONFIG,
    ...(input ?? {}),
    buttons: Array.isArray(input?.buttons)
      ? input.buttons.slice(0, 5).map((button) => ({ label: button?.label ?? "", url: button?.url ?? "" }))
      : [],
  };
}

function chosenImage(
  kind: WebhookEmbedConfig["image"],
  about: ReturnType<typeof useDash>["about"],
  user: ReturnType<typeof useDash>["user"],
) {
  if (kind === "background") return about.assets.background.imageUrl || "";
  if (kind === "banner") return about.assets.banner.imageUrl || "";
  if (kind === "avatar") return about.assets.avatarUrl || user.avatarUrl || "";
  if (kind === "share") return about.metadata.shareImageUrl || "";
  return "";
}

function chosenThumb(
  kind: WebhookEmbedConfig["thumbnail"],
  about: ReturnType<typeof useDash>["about"],
  user: ReturnType<typeof useDash>["user"],
) {
  if (kind === "avatar") return about.assets.avatarUrl || user.avatarUrl || "";
  if (kind === "share") return about.metadata.shareImageUrl || "";
  if (kind === "favicon") return about.metadata.faviconUrl || about.assets.avatarUrl || user.avatarUrl || "";
  return "";
}

function DiscordWebhookPreview({
  config,
  about,
  user,
}: {
  config: WebhookEmbedConfig;
  about: ReturnType<typeof useDash>["about"];
  user: ReturnType<typeof useDash>["user"];
}) {
  const name = about.displayName.trim() || user.alias?.trim() || user.username;
  const image = chosenImage(config.image, about, user);
  const thumb = chosenThumb(config.thumbnail, about, user);
  const avatar = about.assets.avatarUrl || user.avatarUrl || "/brand/tourn-logo-generated.png";
  const title = config.title.trim() || name;
  const description = config.description.trim() || about.bio.trim() || `Check out ${name} on tourn.lol.`;
  const footer = config.footer.trim() || "tourn.lol";
  return (
    <div className="tw-discord-preview">
      <div className="tw-discord-preview-label">Discord preview</div>
      <div className="tw-discord-message">
        <span className="tw-discord-avatar">
          <img src={config.avatarUrl || avatar} alt="" />
        </span>
        <div className="tw-discord-message-body">
          <div className="tw-discord-message-head">
            <b>{config.username || "tourn.lol"}</b>
            <span>Today at 12:00</span>
          </div>
          {config.content ? <p className="tw-discord-content">{config.content}</p> : null}
          {config.embed ? (
            <div className="tw-discord-embed" style={{ borderLeftColor: config.color }}>
              <div className="tw-discord-embed-top">
                <div>
                  <b>{title}</b>
                  <p>{description}</p>
                </div>
                {thumb ? (
                  <span className="tw-discord-thumb">
                    <img src={thumb} alt="" />
                  </span>
                ) : null}
              </div>
              {config.fields ? (
                <div className="tw-discord-fields">
                  <span><small>Profile</small><b>tourn.lol/{user.alias || user.username}</b></span>
                  <span><small>Member since</small><b>Joined tourn.lol</b></span>
                </div>
              ) : null}
              {image ? (
                <div className="tw-discord-image">
                  <img src={image} alt="" />
                </div>
              ) : null}
              <div className="tw-discord-footer">
                {config.footerIcon !== "none" ? <img src={config.footerIcon === "logo" ? "/brand/tourn-logo-generated.png" : avatar} alt="" /> : null}
                <span>{footer}</span>
                {config.timestamp ? <span>· Today at 12:00</span> : null}
              </div>
            </div>
          ) : null}
          {config.buttons.length ? (
            <div className="tw-discord-buttons">
              {config.buttons.map((button, index) => (
                <span key={`${button.label}-${index}`}>{button.label || "Button"}</span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function DiscordWebhookCard() {
  const { about, user } = useDash();
  const [hook, setHook] = useState<WebhookConfig | null>(null);
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [config, setConfig] = useState<WebhookEmbedConfig>(DEFAULT_CONFIG);
  const [busy, setBusy] = useState<"load" | "save" | "test" | "remove" | null>("load");
  const [message, setMessage] = useState<string | null>(null);

  const apply = (next: WebhookConfig | null) => {
    const merged = next
      ? { ...next, config: mergeConfig(next.config) }
      : null;
    setHook(merged);
    setUrl(merged?.url ?? "");
    setEnabled(merged?.enabled ?? true);
    setConfig(merged?.config ?? DEFAULT_CONFIG);
  };

  useEffect(() => {
    let active = true;
    void api<{ webhook: WebhookConfig | null }>("/api/settings/webhook").then((result) => {
      if (!active) return;
      setBusy(null);
      if (result.ok) apply(result.data.webhook);
      else setMessage(result.error);
    });
    return () => {
      active = false;
    };
  }, []);

  const updateConfig = (patch: Partial<WebhookEmbedConfig>) =>
    setConfig((current) => ({ ...current, ...patch }));

  const save = async () => {
    setBusy("save");
    setMessage(null);
    const result = await api<{ webhook: WebhookConfig | null }>("/api/settings/webhook", {
      method: "PUT",
      body: JSON.stringify({ url, enabled, config }),
    });
    setBusy(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    apply(result.data.webhook);
    setMessage("Discord webhook saved. New saves will be delivered there.");
  };

  const test = async () => {
    setBusy("test");
    setMessage(null);
    const result = await api<{ ok: boolean; status: number; webhook: WebhookConfig | null }>(
      "/api/settings/webhook/test",
      { method: "POST" },
    );
    setBusy(null);
    if (result.ok) {
      apply(result.data.webhook);
      setMessage(`Test delivered — Discord answered HTTP ${result.data.status}.`);
    } else {
      if (result.data?.webhook) apply(result.data.webhook);
      setMessage(result.error);
    }
  };

  const remove = async () => {
    setBusy("remove");
    setMessage(null);
    const result = await api<{ webhook: null }>("/api/settings/webhook", { method: "DELETE" });
    setBusy(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    apply(null);
    setMessage("Webhook removed.");
  };

  const savedConfig = hook ? mergeConfig(hook.config) : DEFAULT_CONFIG;
  const dirty =
    url.trim() !== (hook?.url ?? "") ||
    enabled !== (hook?.enabled ?? true) ||
    JSON.stringify(config) !== JSON.stringify(savedConfig);
  const lastSent = hook?.lastSentAt ? new Date(hook.lastSentAt).toLocaleString() : null;

  return (
    <Card className="tw-webhook-card">
      <CardHead
        icon="code"
        title="Discord webhook"
        subtitle="Send a formatted embed with buttons after every successful profile save."
      />
      <Field
        label="Webhook URL"
        hint="Paste a Discord webhook URL. Delivery happens after a save and never blocks it."
      >
        <TextInput
          type="url"
          value={url}
          placeholder="https://discord.com/api/webhooks/…"
          autoComplete="url"
          spellCheck={false}
          disabled={busy === "load"}
          onChange={(event) => setUrl(event.target.value)}
        />
      </Field>
      <div className="tw-form-grid">
        <Field label="Payload format" hint="Discord sends a native embed. Raw JSON keeps the full profile payload.">
          <Select
            value={config.format}
            options={[
              { value: "discord", label: "Discord embed" },
              { value: "raw", label: "Raw JSON" },
            ]}
            onChange={(format) => updateConfig({ format: format as WebhookEmbedConfig["format"] })}
          />
        </Field>
        <div className="tw-inline-toggle tw-webhook-delivery-toggle">
          <span>
            <b>Deliver profile updates</b>
            <small>Turn off to keep the endpoint saved without sending saves.</small>
          </span>
          <Toggle label="Deliver profile updates" checked={enabled} onChange={setEnabled} />
        </div>
      </div>

      {config.format === "discord" ? (
        <>
          <div className="tw-webhook-subhead">Message</div>
          <div className="tw-form-grid">
            <Field label="Webhook name" hint="Optional. Overrides the name above the message.">
              <TextInput value={config.username} maxLength={80} placeholder="tourn.lol" onChange={(event) => updateConfig({ username: event.target.value })} />
            </Field>
            <Field label="Webhook avatar URL" hint="Optional HTTPS image for the message avatar.">
              <TextInput type="url" value={config.avatarUrl} placeholder="https://…/avatar.png" onChange={(event) => updateConfig({ avatarUrl: event.target.value })} />
            </Field>
            <Field label="Message content" className="tw-span-2" hint="The plain message outside the embed. Leave empty for an embed-only message.">
              <Textarea rows={2} value={config.content} maxLength={2000} placeholder="New profile update…" onChange={(event) => updateConfig({ content: event.target.value })} />
            </Field>
          </div>

          <div className="tw-inline-toggle">
            <span>
              <b>Send as an embed</b>
              <small>Turn off to send only the message content and buttons.</small>
            </span>
            <Toggle label="Send as an embed" checked={config.embed} onChange={(embed) => updateConfig({ embed })} />
          </div>

          {config.embed ? (
            <>
              <div className="tw-webhook-subhead">Embed settings</div>
              <div className="tw-form-grid">
                <Field label="Embed title" hint="Empty uses your display name.">
                  <TextInput value={config.title} maxLength={256} placeholder="Your name" onChange={(event) => updateConfig({ title: event.target.value })} />
                </Field>
                <Field label="Accent colour">
                  <ColorField value={config.color} onChange={(color) => updateConfig({ color })} />
                </Field>
                <Field label="Embed description" className="tw-span-2" hint="Empty uses your profile bio.">
                  <Textarea rows={3} value={config.description} maxLength={2000} placeholder="A line about you…" onChange={(event) => updateConfig({ description: event.target.value })} />
                </Field>
                <Field label="Large image">
                  <Select value={config.image} options={IMAGE_OPTIONS} onChange={(image) => updateConfig({ image: image as WebhookEmbedConfig["image"] })} />
                </Field>
                <Field label="Thumbnail">
                  <Select value={config.thumbnail} options={THUMB_OPTIONS} onChange={(thumbnail) => updateConfig({ thumbnail: thumbnail as WebhookEmbedConfig["thumbnail"] })} />
                </Field>
                <Field label="Footer text" hint="Empty uses tourn.lol.">
                  <TextInput value={config.footer} maxLength={2048} placeholder="tourn.lol" onChange={(event) => updateConfig({ footer: event.target.value })} />
                </Field>
                <Field label="Footer icon">
                  <Select value={config.footerIcon} options={FOOTER_ICON_OPTIONS} onChange={(footerIcon) => updateConfig({ footerIcon: footerIcon as WebhookEmbedConfig["footerIcon"] })} />
                </Field>
              </div>
              <div className="tw-webhook-toggles">
                <div className="tw-inline-toggle">
                  <span><b>Timestamp</b><small>Shows when the profile was sent.</small></span>
                  <Toggle label="Timestamp" checked={config.timestamp} onChange={(timestamp) => updateConfig({ timestamp })} />
                </div>
                <div className="tw-inline-toggle">
                  <span><b>Profile details</b><small>Adds the link, join date and revision.</small></span>
                  <Toggle label="Profile details" checked={config.fields} onChange={(fields) => updateConfig({ fields })} />
                </div>
              </div>
            </>
          ) : null}

          <div className="tw-webhook-subhead tw-webhook-subhead--row">
            <span>Link buttons</span>
            <Button
              type="button"
              icon="plus"
              disabled={config.buttons.length >= 5}
              onClick={() => updateConfig({ buttons: [...config.buttons, { label: "", url: "" }] })}
            >
              Add button
            </Button>
          </div>
          {config.buttons.map((button, index) => (
            <div className="tw-webhook-button-row" key={index}>
              <TextInput
                value={button.label}
                maxLength={80}
                placeholder="Button label"
                aria-label={`Button ${index + 1} label`}
                onChange={(event) => updateConfig({
                  buttons: config.buttons.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item),
                })}
              />
              <TextInput
                type="url"
                value={button.url}
                placeholder="https://…"
                aria-label={`Button ${index + 1} URL`}
                onChange={(event) => updateConfig({
                  buttons: config.buttons.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item),
                })}
              />
              <button
                type="button"
                className="tw-webhook-remove"
                aria-label={`Remove button ${index + 1}`}
                onClick={() => updateConfig({ buttons: config.buttons.filter((_, itemIndex) => itemIndex !== index) })}
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
          {config.buttons.length ? <p className="tw-set-note">Up to five link buttons. Discord shows the first row under the embed.</p> : null}
          <DiscordWebhookPreview config={config} about={about} user={user} />
        </>
      ) : (
        <p className="tw-set-note tw-webhook-raw-note">
          Raw JSON sends the same complete payload as before: account, revision, profile and settings. Choose Discord embed to use the composer above.
        </p>
      )}

      <div className="tw-row tw-webhook-actions">
        <Button type="button" variant="primary" disabled={busy !== null || !url.trim()} onClick={() => void save()}>
          {busy === "save" ? "Saving…" : hook ? "Save webhook" : "Add webhook"}
        </Button>
        <Button type="button" disabled={busy !== null || !hook || dirty} onClick={() => void test()}>
          {busy === "test" ? "Sending…" : "Send test"}
        </Button>
        <Button type="button" icon="trash" disabled={busy !== null || !hook} onClick={() => void remove()}>
          {busy === "remove" ? "Removing…" : "Remove"}
        </Button>
      </div>
      {message ? <p className="tw-set-note">{message}</p> : null}
      {hook ? (
        <p className="tw-set-note tw-webhook-status">
          {hook.lastStatus && hook.lastStatus >= 200 && hook.lastStatus < 300 ? (
            <Chip tone="success">HTTP {hook.lastStatus}</Chip>
          ) : hook.lastStatus ? (
            <Chip tone="amber">HTTP {hook.lastStatus}</Chip>
          ) : null}
          {hook.lastError ? <span>{hook.lastError}</span> : null}
          {lastSent ? <span>Last attempt {lastSent}.</span> : <span>No delivery attempted yet.</span>}
        </p>
      ) : null}
    </Card>
  );
}
