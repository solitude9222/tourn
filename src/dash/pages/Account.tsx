/* ---------------------------------------------------------------------------
   Account — public profile details, affiliates and analytics.
   --------------------------------------------------------------------------- */

import { useRef, useState } from "react";
import { formatJoined } from "../../lib/format";
import { ProfileMedia } from "../ProfileMedia";
import { DecorationsPanel } from "../DecorationsPanel";
import { useDash } from "../context";
import { copyText, cursorToDataUrl, imageToDataUrl, fileToDataUrl } from "../files";
import { VIDEO_MAX_BYTES, uploadVideoFile } from "../../lib/videoUpload";
import { FileUpload,
  Button,
  Card,
  CardHead,
  Chip,
  ColorField,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Select,
  Slider,
  TextInput,
  Textarea,
  Toggle,
} from "../ui";
import { AnalyticsPanel } from "../Analytics";

const BIO_LIMIT = 800;
/** Presets mount a page at a time: the full set is ~700 animated PNGs. */
const DECO_PAGE = 36;

export function AccountProfilePage({ section = "details" }: { section?: "details" | "artwork" } = {}) {
  const { user, about, setAbout, notify, go, isPremium } = useDash();
  const publicHandle = user.alias?.trim() || user.username;
  const joined = formatJoined(new Date(user.joinedAt));

  const copyUrl = async () => {
    const ok = await copyText(`https://tourn.lol/${publicHandle}`);
    notify("Profile link", ok ? "Copied to your clipboard." : `tourn.lol/${publicHandle}`);
  };

  const assets = about.assets;
  const updateAssets = (patch: Partial<typeof assets>) =>
    setAbout((current) => ({ ...current, assets: { ...current.assets, ...patch } }));

  const picker = useRef<HTMLInputElement>(null);
  const pickHandler = useRef<((file: File) => Promise<void>) | null>(null);
  const [accept, setAccept] = useState("image/*");

  const pick = (nextAccept: string, handler: (file: File) => Promise<void>) => {
    pickHandler.current = handler;
    setAccept(nextAccept);
    if (picker.current) picker.current.accept = nextAccept;
    picker.current?.click();
  };

  const uploadBackground = async (file: File) => {
    const url = await imageToDataUrl(file, 2000, 2000);
    updateAssets({
      background: { ...assets.background, style: "image", imageUrl: url },
    });
    notify("Background", "Background image updated — save to publish.");
  };

  const uploadBanner = async (file: File) => {
    const url = await imageToDataUrl(file, 2000, 900);
    updateAssets({ banner: { ...assets.banner, enabled: true, imageUrl: url } });
    notify("Banner", "Banner image updated — save to publish.");
  };

  const uploadCursor = async (file: File) => {
    const url = await cursorToDataUrl(file);
    updateAssets({ cursor: { ...assets.cursor, style: "custom", imageUrl: url, hotspotX: 0, hotspotY: 0 } });
    notify("Cursor", "Cursor image updated — save to publish.");
  };

  return (
    <>
      {section !== "artwork" ? <>
      <Card>
        <CardHead
          icon="user"
          title="Profile Details"
          subtitle="The name, picture and description visitors see on your page."
        />

        <div className="tw-form-grid" style={{ marginTop: 22 }}>
          <Field label="Display name" help>
            <TextInput
              icon="user"
              value={about.displayName}
              maxLength={32}
              placeholder={user.username}
              onChange={(event) =>
                setAbout((current) => ({ ...current, displayName: event.target.value.slice(0, 32) }))
              }
            />
          </Field>

          <Field label="Location" help>
            <TextInput
              icon="pin"
              value={about.location}
              maxLength={64}
              placeholder="My Location"
              onChange={(event) =>
                setAbout((current) => ({ ...current, location: event.target.value.slice(0, 64) }))
              }
            />
          </Field>

          <Field
            label="Description"
            help
            className="tw-span-2"
            hint={`${about.bio.length} / ${BIO_LIMIT}`}
          >
            <Textarea
              value={about.bio}
              maxLength={BIO_LIMIT}
              rows={5}
              placeholder="Tell everyone about yourself..."
              onChange={(event) =>
                setAbout((current) => ({ ...current, bio: event.target.value.slice(0, BIO_LIMIT) }))
              }
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHead
          icon="link"
          title="Public Page"
          subtitle="Your shareable address and the details attached to it."
          actions={
            <Button icon="external" onClick={() => window.open(`/${publicHandle}`, "_blank")}>
              Open page
            </Button>
          }
        />

        <div className="tw-copy-row">
          <span className="tw-copy-value">
            tourn.lol/<b>{publicHandle}</b>
          </span>
          <IconButton label="Copy profile link" icon="copy" onClick={() => void copyUrl()} />
        </div>

        <div className="tw-meta-grid">
          <div>
            <small>Joined</small>
            <b>{joined}</b>
          </div>
          <div>
            <small>Public name</small>
            <b>{user.alias?.trim() ? `@${user.alias}` : `@${user.username}`}</b>
          </div>
          <div>
            <small>Second claim</small>
            <b>{isPremium && user.alias2 ? `swats.bio/${user.alias2}` : "Premium only"}</b>
          </div>
        </div>

        <div className="tw-row" style={{ marginTop: 16 }}>
          <Button icon="settings" onClick={() => go("settings")}>
            Account settings
          </Button>
          {!user.alias?.trim() ? (
            <Button variant="soft" icon="sparkles" onClick={() => go("settings")}>
              Claim an alias
            </Button>
          ) : null}
        </div>
      </Card>

      </> : null}
      {section !== "details" ? <Card>
        <CardHead
          icon="palette"
          title="Artwork"
          subtitle="Background, banner and cursor."
        />

        <div className="tw-subhead" id="dash-section-background">Background</div>
        <div className="tw-form-grid">
          <Field label="Style">
            <Select
              value={assets.background.style}
              options={[
                { value: "solid", label: "Solid colour" },
                { value: "gradient", label: "Gradient" },
                { value: "image", label: "Image" },
                { value: "video", label: "Video" },
              ]}
              onChange={(value) =>
                updateAssets({
                  background: {
                    ...assets.background,
                    style: value as typeof assets.background.style,
                  },
                })
              }
            />
          </Field>

          {assets.background.style === "video" ? <div className="tw-stack">
            <Field
              label="Background video"
              hint={
                isPremium
                  ? "Up to 100 MB — uploaded in chunks, so long clips are fine."
                  : "Up to 4 MB on the free plan. Premium lifts the cap to 100 MB."
              }
            >
              <FileUpload
                aria-label="Background video file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (!file.type.startsWith("video/")) {
                    notify("Video", "Choose an MP4, WebM or MOV file.");
                    return;
                  }
                  if (!isPremium && file.size > 4_000_000) {
                    notify("Video", "Free accounts can upload up to 4 MB. Premium allows 100 MB.");
                    return;
                  }
                  if (isPremium && file.size > VIDEO_MAX_BYTES) {
                    notify("Video", "Videos up to 100 MB.");
                    return;
                  }
                  try {
                    const videoUrl = isPremium
                      ? await uploadVideoFile(file)
                      : await fileToDataUrl(file);
                    updateAssets({ background: { ...assets.background, videoUrl, style: "video" } });
                  } catch (error) {
                    notify("Video", error instanceof Error ? error.message : "That video could not be uploaded.");
                  }
                }}
              />
            </Field>
            <div className="tw-inline-toggle"><span><b>Video sound</b><small>Unmutes after the visitor clicks the page.</small></span><Toggle label="Video sound" checked={assets.background.videoAudio} onChange={(videoAudio) => updateAssets({ background: { ...assets.background, videoAudio } })} /></div>
            <Slider label="Video volume" value={Math.round(assets.background.videoVolume * 100)} min={0} max={100} suffix="%" onChange={(volume) => updateAssets({ background: { ...assets.background, videoVolume: volume / 100 } })} />
          </div> : null}
          {assets.background.style === "image" ? (
            <Field label="Background image">
              <div className="tw-row">
                <Button icon="upload" onClick={() => pick("image/*", uploadBackground)}>
                  {assets.background.imageUrl ? "Replace image" : "Upload image"}
                </Button>
                {assets.background.imageUrl ? (
                  <Button
                    variant="danger"
                    icon="trash"
                    onClick={() =>
                      updateAssets({
                        background: { ...assets.background, imageUrl: "", style: "solid" },
                      })
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </Field>
          ) : assets.background.style === "gradient" ? (
            <div className="tw-color-row">
              <ColorField
                label="From"
                value={assets.background.from}
                onChange={(value) =>
                  updateAssets({ background: { ...assets.background, from: value } })
                }
              />
              <ColorField
                label="To"
                value={assets.background.to}
                onChange={(value) =>
                  updateAssets({ background: { ...assets.background, to: value } })
                }
              />
            </div>
          ) : (
            <ColorField
              label="Colour"
              value={assets.background.color}
              onChange={(value) =>
                updateAssets({ background: { ...assets.background, color: value } })
              }
            />
          )}

          <Slider label="Background saturation" value={Math.round(assets.background.saturation * 100)} min={0} max={200} suffix="%" onChange={(value) => updateAssets({ background: { ...assets.background, saturation: value / 100 } })} />
          <Slider label="Background contrast" value={Math.round(assets.background.contrast * 100)} min={50} max={200} suffix="%" onChange={(value) => updateAssets({ background: { ...assets.background, contrast: value / 100 } })} />
          {assets.background.style === "image" ? <>
            <Field label="Image fit" hint="Cover fills the screen; Contain keeps the entire image visible."><Select value={assets.background.fit || "cover"} options={[{ value: "cover", label: "Cover" }, { value: "contain", label: "Contain" }]} onChange={fit => updateAssets({ background: { ...assets.background, fit: fit as "cover" | "contain" } })} /></Field>
            <Slider label="Image horizontal position" value={assets.background.positionX ?? 50} min={0} max={100} suffix="%" onChange={positionX => updateAssets({ background: { ...assets.background, positionX } })} />
            <Slider label="Image vertical position" value={assets.background.positionY ?? 50} min={0} max={100} suffix="%" onChange={positionY => updateAssets({ background: { ...assets.background, positionY } })} />
          </> : null}
          <Slider label="Background brightness" value={Math.round(assets.background.brightness * 100)} min={30} max={200} suffix="%" onChange={(value) => updateAssets({ background: { ...assets.background, brightness: value / 100 } })} />
          <Slider
            label="Background blur"
            value={assets.background.blur}
            min={0}
            max={40}
            suffix="px"
            onChange={(value) =>
              updateAssets({ background: { ...assets.background, blur: value } })
            }
          />
          <Slider
            label="Dim"
            value={Math.round(assets.background.dim * 100)}
            min={0}
            max={85}
            suffix="%"
            onChange={(value) =>
              updateAssets({ background: { ...assets.background, dim: value / 100 } })
            }
          />
        </div>

        <div className="tw-subhead">Banner</div>
        <div className="tw-inline-toggle">
          <span>
            <b>Show a banner</b>
            <small>A wide image strip behind your profile card.</small>
          </span>
          <Toggle
            checked={assets.banner.enabled}
            onChange={(checked) =>
              updateAssets({ banner: { ...assets.banner, enabled: checked } })
            }
            label="Show a banner"
          />
        </div>
        {assets.banner.enabled ? (
          <div className="tw-form-grid" style={{ marginTop: 14 }}>
            <Field label="Banner image">
              <div className="tw-row">
                <Button icon="upload" onClick={() => pick("image/*", uploadBanner)}>
                  {assets.banner.imageUrl ? "Replace banner" : "Upload banner"}
                </Button>
                {assets.banner.imageUrl ? (
                  <Button
                    variant="danger"
                    icon="trash"
                    onClick={() =>
                      updateAssets({ banner: { ...assets.banner, imageUrl: "" } })
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </Field>
            <Slider
              label="Height"
              value={assets.banner.height}
              min={40}
              max={260}
              suffix="px"
              onChange={(value) =>
                updateAssets({ banner: { ...assets.banner, height: value } })
              }
            />
            <Slider
              label="Opacity"
              value={assets.banner.opacity}
              min={0}
              max={1}
              step={0.01}
              format={(value) => value.toFixed(2)}
              onChange={(value) =>
                updateAssets({ banner: { ...assets.banner, opacity: value } })
              }
            />
          </div>
        ) : null}

        <div className="tw-subhead">Cursor</div>
        <div className="tw-form-grid">
          <Field label="Cursor image" hint="Upload an image to replace the pointer. Leave it empty to keep the normal cursor.">
            <div className="tw-row">
              <Button icon="upload" onClick={() => pick("image/*", uploadCursor)}>
                {assets.cursor.imageUrl ? "Replace cursor" : "Upload cursor"}
              </Button>
              {assets.cursor.imageUrl ? (
                <Button
                  variant="danger"
                  icon="trash"
                  onClick={() =>
                    updateAssets({ cursor: { ...assets.cursor, imageUrl: "", style: "system" } })
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </Field>
          <ColorField
            label="Cursor colour"
            value={assets.cursor.color}
            onChange={(value) => updateAssets({ cursor: { ...assets.cursor, color: value } })}
          />
        </div>

        <input
          ref={picker}
          type="file"
          accept={accept}
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file && pickHandler.current) void pickHandler.current(file).catch(error => notify("Upload failed", error instanceof Error ? error.message : "Try a different file."));
            event.target.value = "";
          }}
        />
      </Card> : null}
    </>
  );
}

export function AffiliatesPage() {
  const { user, isPremium, notify, go } = useDash();
  const publicHandle = user.alias?.trim() || user.username;
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (value: string, id: string) => {
    const ok = await copyText(value);
    if (ok) {
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1600);
      notify("Link copied", value);
    }
  };

  const links = [
    {
      id: "main",
      label: "tourn.lol",
      value: `tourn.lol/${publicHandle}`,
      href: `https://tourn.lol/${publicHandle}`,
      locked: false,
    },
    {
      id: "alias",
      label: "swats.bio",
      value: isPremium ? (user.alias2 ? `swats.bio/${user.alias2}` : "No second claim") : "Premium alias",
      href: isPremium && user.alias2 ? `https://swats.bio/${user.alias2}` : "#/dashboard/settings",
      locked: !isPremium,
    },
  ];

  return (
    <>
      <Card>
        <CardHead
          icon="link"
          title="Your Links"
          subtitle="Every address that points at your page."
        />

        <div className="tw-stack">
          {links.map((link) => (
            <div className="tw-copy-row" key={link.id}>
              <span className="tw-copy-domain">
                <Icon name={link.locked ? "lock" : "globe"} size={14} />
                {link.label}
              </span>
              <span className="tw-copy-value">{link.value}</span>
              {link.locked ? (
                <Button variant="soft" icon="crown" onClick={() => go("premium")}>
                  Unlock
                </Button>
              ) : (
                <IconButton
                  label={copied === link.id ? "Copied" : "Copy link"}
                  icon={copied === link.id ? "check" : "copy"}
                  onClick={() => void copy(link.href, link.id)}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHead
          icon="users"
          title="Affiliate Overview"
          subtitle="Accounts that joined from your link."
          actions={<Chip>0 REFERRALS</Chip>}
        />
        <EmptyState
          icon="users"
          title="No referrals yet"
          message="Share your tourn.lol link. New accounts that arrive from it will appear here."
          action={
            <Button icon="copy" onClick={() => void copy(`https://tourn.lol/${publicHandle}`, "main")}>
              Copy your link
            </Button>
          }
        />
      </Card>
    </>
  );
}

export function AnalyticsPage() {
  return <AnalyticsPanel />;
}
