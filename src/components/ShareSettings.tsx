import { useState } from "react";
import { useDash } from "../dash/context";
import { copyText, imageToDataUrl, uploadImageDataUrl, uploadShareImage } from "../dash/files";
import { renderShareCard } from "../lib/shareCard";
import {
  Button,
  Card,
  CardHead,
  ColorField,
  Field,
  FileUpload,
  Select,
  Slider,
  TextInput,
  Textarea,
  Toggle,
} from "../dash/ui";
import type { TabAnimation } from "../lib/about";

export function PageMetadataSettings() {
  const { about, user, setAbout, notify } = useDash();
  const metadata = about.metadata;
  const [shareUploading, setShareUploading] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);
  const update = (patch: Partial<typeof metadata>) =>
    setAbout((current) => ({ ...current, metadata: { ...current.metadata, ...patch } }));

  const handle = user.alias?.trim() || user.username;
  const pageUrl = `${window.location.origin}/${handle}`;
  const displayName = about.displayName.trim() || user.alias?.trim() || user.username;
  const previewTitle = metadata.shareTitle.trim();
  const previewDescription = metadata.shareDescription.trim();
  const authorAvatar = about.assets.avatarUrl.trim() || user.avatarUrl || "/brand/tourn-logo-generated.png";
  const previewImage = metadata.shareImageUrl.trim() || `/api/profile/${encodeURIComponent(handle)}/embed-image`;
  const favicon = metadata.faviconUrl.trim() || about.assets.avatarUrl.trim() || user.avatarUrl || "/brand/tourn-mark.svg";

  const uploadAvatarOrFavicon = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2_000_000) {
      notify("Image not added", "Choose a PNG, JPG, WebP or GIF under 2 MB.");
      return;
    }
    try {
      update({ faviconUrl: await imageToDataUrl(file, 128, 128, 0.9) });
    } catch {
      notify("Image not added", "That file could not be read. Try another image.");
    }
  };

  const uploadPreviewImage = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8_000_000) {
      notify("Preview image not added", "Choose a PNG, JPG, WebP or GIF under 8 MB.");
      return;
    }
    setShareUploading(true);
    try {
      update({ shareImageUrl: await uploadShareImage(file) });
      notify("Preview image uploaded", "Discord can fetch this image. Use a fresh link to refresh its cache.");
    } catch (error) {
      notify("Preview image not added", error instanceof Error ? error.message : "The upload failed. Try again.");
    } finally {
      setShareUploading(false);
    }
  };

  const generateCard = async () => {
    setCardBusy(true);
    try {
      const dataUrl = await renderShareCard({
        style: metadata.shareStyle,
        title: metadata.shareTitle.trim(),
        description: metadata.shareDescription.trim(),
        name: displayName,
        handle,
        accent: metadata.themeColor,
        avatarUrl: authorAvatar,
        backgroundUrl: about.assets.background.imageUrl,
        backgroundStyle: about.assets.background.style,
        backgroundFrom: about.assets.background.from,
        backgroundTo: about.assets.background.to,
      });
      update({ shareImageUrl: await uploadImageDataUrl(dataUrl) });
      notify("Styled card generated", "The new image is live. Use a fresh link to refresh Discord's cache.");
    } catch (error) {
      notify("Card not generated", error instanceof Error ? error.message : "Try another image or upload one directly.");
    } finally {
      setCardBusy(false);
    }
  };

  const copyLink = () =>
    void copyText(pageUrl).then((ok) =>
      notify(
        ok ? "Page link copied" : "Couldn't copy the link",
        ok ? "Paste it wherever you want the embed to appear." : "Select the address shown beside the preview instead.",
      ),
    );

  return (
    <Card className="tw-meta-card">
      <CardHead
        icon="share"
        title="Discord & X embed"
        subtitle="Set the title, description and large image Discord shows when your profile link is shared."
        actions={<Button icon="copy" onClick={copyLink}>Copy page link</Button>}
      />
      <div className="tw-meta-layout">
        <div className="tw-meta-form">
          <section className="tw-meta-section">
            <div className="tw-meta-section-head">
              <b>Embed text</b>
              <small>Both fields are optional. Leave them blank if you only want the image.</small>
            </div>
            <div className="tw-form-grid">
              <Field label="Title" hint={`${metadata.shareTitle.length}/100 · optional`}>
                <TextInput
                  value={metadata.shareTitle}
                  maxLength={100}
                  placeholder={displayName}
                  onChange={(event) => update({ shareTitle: event.target.value })}
                />
              </Field>
              <Field label="Accent color" hint="The thin line beside the embed.">
                <ColorField value={metadata.themeColor} onChange={(themeColor) => update({ themeColor })} />
              </Field>
              <Field label="Description" hint={`${metadata.shareDescription.length}/300 · optional`} className="tw-span-2">
                <Textarea
                  rows={3}
                  value={metadata.shareDescription}
                  maxLength={300}
                  placeholder="A short line under the title."
                  onChange={(event) => update({ shareDescription: event.target.value })}
                />
              </Field>
            </div>
          </section>

          <section className="tw-meta-section">
            <div className="tw-meta-section-head">
              <b>Card style</b>
              <small>Generate a styled 1200×630 image from your profile. Discord shows images, not custom CSS.</small>
            </div>
            <div className="tw-form-grid">
              <Field label="Layout" hint="Generate again after changing the style or text.">
                <Select
                  ariaLabel="Share card style"
                  value={metadata.shareStyle}
                  options={[
                    { value: "hero", label: "Wide profile — background + centered pfp" },
                    { value: "text", label: "Text box — small centered card" },
                  ]}
                  onChange={(shareStyle) => update({ shareStyle: shareStyle as "hero" | "text" })}
                />
              </Field>
              <Field label="Build image" hint={cardBusy ? "Rendering and uploading…" : "Uses your background, or your pfp when the background is a video."}>
                <Button disabled={cardBusy || shareUploading} onClick={() => void generateCard()}>
                  {cardBusy ? "Generating…" : "Generate styled image"}
                </Button>
              </Field>
            </div>
          </section>

          <section className="tw-meta-section">
            <div className="tw-meta-section-head">
              <b>Large image</b>
              <small>Use a wide 1200×630 image. Discord controls the final crop.</small>
            </div>
            <div className="tw-form-grid">
              <Field label="Image URL" hint="Must be public HTTPS. Leave blank to use your profile avatar." className="tw-span-2">
                <TextInput
                  value={metadata.shareImageUrl.startsWith("data:") ? "" : metadata.shareImageUrl}
                  placeholder="https://…/embed.jpg"
                  onChange={(event) => update({ shareImageUrl: event.target.value })}
                />
              </Field>
              <Field label="Upload image" hint={shareUploading ? "Uploading…" : "PNG, JPG, WebP or GIF. Stored publicly for Discord."}>
                <FileUpload
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={shareUploading}
                  onChange={(event) => {
                    void uploadPreviewImage(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </Field>
              <div className="tw-inline-toggle tw-share-image-actions">
                <span><b>Use profile avatar</b><small>Clear the custom image and fall back to your avatar.</small></span>
                <Button disabled={!metadata.shareImageUrl || shareUploading} onClick={() => update({ shareImageUrl: user.avatarUrl || "" })}>
                  Use avatar
                </Button>
              </div>
            </div>
          </section>

          <section className="tw-meta-section">
            <div className="tw-meta-section-head">
              <b>Favicon</b>
              <small>The icon in the browser tab, bookmarks and history.</small>
            </div>
            <div className="tw-favicon-row">
              <span className="tw-favicon-preview"><img src={favicon} alt="Current favicon preview" /></span>
              <div className="tw-favicon-copy">
                <b>{metadata.faviconUrl ? "Custom favicon" : "Profile picture"}</b>
                <small>{metadata.faviconUrl ? "Your uploaded icon is used on the public page." : "The avatar is used until you choose something else."}</small>
              </div>
              <div className="tw-row">
                <FileUpload
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => {
                    void uploadAvatarOrFavicon(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <Button disabled={!metadata.faviconUrl} onClick={() => update({ faviconUrl: "" })}>Use avatar</Button>
              </div>
            </div>
            <Field label="Favicon URL" hint="Optional. A square PNG, ICO, SVG or WebP works best.">
              <TextInput
                value={metadata.faviconUrl.startsWith("data:") ? "" : metadata.faviconUrl}
                placeholder="https://…/icon.png"
                onChange={(event) => update({ faviconUrl: event.target.value })}
              />
            </Field>
          </section>

          <details className="tw-advanced tw-share-browser-settings">
            <summary>
              Browser tab and search
              <small>Optional tab title, animation and search visibility.</small>
            </summary>
            <div className="tw-form-grid">
              <Field label="Custom tab title">
                <TextInput
                  icon="at"
                  value={metadata.title}
                  maxLength={60}
                  placeholder={`${displayName} · tourn.lol`}
                  onChange={(event) => update({ title: event.target.value })}
                />
              </Field>
              <Field label="Animation">
                <Select
                  ariaLabel="Tab title animation"
                  value={metadata.animation}
                  options={[
                    { value: "none", label: "None" },
                    { value: "cycle", label: "Cycle titles" },
                    { value: "typewriter", label: "Typewriter" },
                    { value: "marquee", label: "Marquee" },
                  ]}
                  onChange={(animation) => update({ animation: animation as TabAnimation })}
                />
              </Field>
              {metadata.animation !== "none" ? (
                <>
                  <Field label="Additional tab titles" hint="One per line, up to 8.">
                    <Textarea
                      rows={3}
                      value={metadata.messages.join("\n")}
                      onChange={(event) => update({ messages: event.target.value.split("\n").slice(0, 8).map((value) => value.slice(0, 60)) })}
                    />
                  </Field>
                  <Slider
                    label="Pause between titles"
                    value={metadata.interval}
                    min={2}
                    max={30}
                    suffix="s"
                    onChange={(interval) => update({ interval })}
                  />
                </>
              ) : null}
              <div className="tw-inline-toggle tw-span-2">
                <span><b>Keep out of search engines</b><small>Adds noindex to your public page.</small></span>
                <Toggle
                  label="Keep page out of search engines"
                  checked={metadata.noIndex}
                  onChange={(noIndex) => update({ noIndex })}
                />
              </div>
            </div>
          </details>
        </div>

        <aside className="tw-meta-preview" aria-label="Shared link preview">
          <div className="tw-meta-preview-head"><b>Share preview</b><small>Discord / X</small></div>
          <div className="tw-discord-preview tw-share-preview">
            <div className="tw-discord-preview-label">Discord / X</div>
            <div className="tw-discord-message">
              <span className="tw-discord-avatar"><img src={authorAvatar} alt="" /></span>
              <div className="tw-discord-message-body">
                <div className="tw-discord-message-head"><b>tourn.lol</b><span>shared link</span></div>
                <div className="tw-discord-embed" style={{ borderLeftColor: metadata.themeColor }}>
                  {previewTitle ? <b>{previewTitle}</b> : null}
                  {previewDescription ? <p>{previewDescription}</p> : null}
                  {previewImage ? <div className="tw-discord-image"><img src={previewImage} alt="" /></div> : null}
                  <div className="tw-discord-footer"><span>{pageUrl.replace(/^https?:\/\//, "")}</span></div>
                </div>
              </div>
            </div>
          </div>
          <div className="tw-meta-identity">
            <span><small>Public link</small><code>{pageUrl.replace(/^https?:\/\//, "")}</code></span>
            <span><small>Account ID</small><code>{user.id.slice(0, 8)}</code></span>
          </div>
          <p className="tw-foot-note">
            Discord and X choose their own final crop. Title and description can be left empty for an image-only card.
            Use a public image URL or upload one here so their crawlers can fetch it.
          </p>
        </aside>
      </div>
    </Card>
  );
}
