/* ---------------------------------------------------------------------------
   Account — public profile details, affiliates and analytics.
   --------------------------------------------------------------------------- */

import { useRef, useState } from "react";
import { formatJoined } from "../../lib/format";
import decorations from "../../lib/decorations.json";
import { useDash } from "../context";
import { copyText, imageToDataUrl } from "../files";
import {
  Button,
  Card,
  CardHead,
  Chip,
  ColorField,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Modal,
  Select,
  Slider,
  TextInput,
  Textarea,
  Toggle,
} from "../ui";
import { AnalyticsPanel } from "../Analytics";

const BIO_LIMIT = 800;
/** Presets mount a page at a time: the full set is ~200 animated PNGs. */
const DECO_PAGE = 36;

export function AccountProfilePage() {
  const { user, about, setAbout, notify, go } = useDash();
  const avatarInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [decoOpen, setDecoOpen] = useState(false);
  const [decoQuery, setDecoQuery] = useState("");
  const [decoLimit, setDecoLimit] = useState(DECO_PAGE);

  const avatarUrl = about.assets.avatarUrl || user.avatarUrl || "";
  const joined = formatJoined(new Date(user.joinedAt));

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await imageToDataUrl(file, 512, 512, 0.9);
      setAbout((current) => ({
        ...current,
        assets: { ...current.assets, avatarUrl: url },
      }));
      notify("Profile picture", "Your new picture is ready to save.");
    } catch {
      notify("Upload failed", "That file could not be read.");
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = async () => {
    const ok = await copyText(`https://tourn.lol/${user.username}`);
    notify("Profile link", ok ? "Copied to your clipboard." : `tourn.lol/${user.username}`);
  };

  const assets = about.assets;
  const updateAssets = (patch: Partial<typeof assets>) =>
    setAbout((current) => ({ ...current, assets: { ...current.assets, ...patch } }));

  // Decoration carousel: index 0 is "none", the rest are Discord's presets.
  const decoOptions = [
    { id: "none", label: "No decoration", url: "" },
    ...decorations.map((entry) => ({ id: entry.id, label: entry.label, url: entry.url })),
  ];
  const decoIndex = Math.max(
    0,
    decoOptions.findIndex((entry) => entry.url === assets.decoration.discordUrl),
  );
  const activeDeco = decoOptions[decoIndex] ?? decoOptions[0];
  const pickDeco = (index: number) => {
    const next = decoOptions[(index + decoOptions.length) % decoOptions.length];
    if (!next) return;
    updateAssets({ decoration: { ...assets.decoration, discordUrl: next.url } });
  };
  // "None" always stays in the grid so removing a decoration never needs a
  // second trip; the search only narrows the presets.
  const decoResults = decoQuery.trim()
    ? [
        decoOptions[0],
        ...decoOptions
          .slice(1)
          .filter((entry) => entry.label.toLowerCase().includes(decoQuery.trim().toLowerCase())),
      ]
    : decoOptions;
  const decoVisible = decoResults.slice(0, decoLimit);

  const picker = useRef<HTMLInputElement>(null);
  const pickHandler = useRef<((file: File) => Promise<void>) | null>(null);
  const [accept, setAccept] = useState("image/*");

  const pick = (nextAccept: string, handler: (file: File) => Promise<void>) => {
    pickHandler.current = handler;
    setAccept(nextAccept);
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
    const url = await imageToDataUrl(file, 128, 128);
    updateAssets({ cursor: { ...assets.cursor, style: "custom", imageUrl: url } });
    notify("Cursor", "Cursor image updated — save to publish.");
  };

  return (
    <>
      <Card>
        <CardHead
          icon="user"
          title="Profile Details"
          subtitle="The name, picture and description visitors see on your page."
        />

        <div className="tw-avatar-row">
          <span className="tw-avatar tw-avatar--lg">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : (about.displayName || user.username).slice(0, 1).toUpperCase()}
          </span>
          <div className="tw-avatar-copy">
            <b>Profile picture</b>
            <small>Square image, at least 256 × 256. PNG, JPG or GIF.</small>
            <div className="tw-row" style={{ marginTop: 8 }}>
              <Button
                icon="upload"
                onClick={() => avatarInput.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Upload picture"}
              </Button>
              {about.assets.avatarUrl ? (
                <Button
                  icon="trash"
                  variant="danger"
                  onClick={() =>
                    setAbout((current) => ({
                      ...current,
                      assets: { ...current.assets, avatarUrl: "" },
                    }))
                  }
                >
                  Remove
                </Button>
              ) : null}
              <Button
                icon="sparkles"
                onClick={() => {
                  setDecoLimit(DECO_PAGE);
                  setDecoOpen(true);
                }}
              >
                {about.assets.decoration.discordUrl ? "Change decoration" : "Add decoration"}
              </Button>
            </div>
          </div>
          <input
            ref={avatarInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              void uploadAvatar(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>

        <Modal
          open={decoOpen}
          title="Avatar decoration"
          subtitle="Decorate the picture that shows on your profile."
          onClose={() => setDecoOpen(false)}
          footer={
            <Button variant="primary" onClick={() => setDecoOpen(false)}>
              Done
            </Button>
          }
        >
          <div className="tw-deco-stage">
            <span className="tw-deco-preview">
              <span className="tw-deco-preview-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" />
                ) : (
                  (about.displayName || user.username).slice(0, 1).toUpperCase()
                )}
              </span>
              {activeDeco.url ? (
                <img
                  className="tw-deco-preview-overlay"
                  src={activeDeco.url.replace(/size=\d+/, "size=160")}
                  alt=""
                  draggable={false}
                />
              ) : null}
            </span>
            <div className="tw-deco-side">
              <b>{activeDeco.label}</b>
              <small>
                {activeDeco.url
                  ? "Discord avatar decoration"
                  : "Your picture, with no frame around it."}
              </small>
              <div className="tw-row" style={{ marginTop: 10 }}>
                <Button
                  icon="sparkles"
                  onClick={() =>
                    pickDeco(Math.floor(Math.random() * Math.max(1, decoOptions.length - 1)) + 1)
                  }
                >
                  Surprise me
                </Button>
                {activeDeco.url ? (
                  <Button
                    icon="trash"
                    variant="danger"
                    onClick={() =>
                      updateAssets({ decoration: { ...assets.decoration, discordUrl: "" } })
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="tw-deco-search">
            <TextInput
              icon="search"
              placeholder="Search decorations"
              value={decoQuery}
              onChange={(event) => {
                setDecoLimit(DECO_PAGE);
                setDecoQuery(event.target.value);
              }}
            />
            <span className="tw-deco-count">
              {decoOptions.length - 1} decorations
              {decoQuery.trim() ? ` · ${decoResults.length - 1} match` : ""}
            </span>
          </div>

          <div className="tw-deco-grid">
            {decoVisible.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`tw-deco${
                  entry.url === assets.decoration.discordUrl ? " is-active" : ""
                }${entry.url ? "" : " tw-deco--none"}`}
                title={entry.label}
                aria-label={entry.label}
                aria-pressed={entry.url === assets.decoration.discordUrl}
                onClick={() =>
                  updateAssets({ decoration: { ...assets.decoration, discordUrl: entry.url } })
                }
              >
                {entry.url ? (
                  <img
                    src={entry.url.replace(/size=\d+/, "size=64")}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  "None"
                )}
              </button>
            ))}
          </div>
          {decoResults.length > decoLimit ? (
            <div className="tw-deco-more">
              <Button onClick={() => setDecoLimit((value) => value + DECO_PAGE)}>
                Show more decorations
              </Button>
              <small>{decoResults.length - decoLimit} still hidden</small>
            </div>
          ) : null}
          {decoResults.length <= 1 ? (
            <p className="tw-deco-caption">Nothing matches “{decoQuery.trim()}”.</p>
          ) : null}

          <div className="tw-form-grid" style={{ marginTop: 18 }}>
            <Field label="Picture zoom">
              <Slider
                label="Zoom"
                value={Math.round((assets.decoration.zoom ?? 1) * 100)}
                min={60}
                max={200}
                suffix="%"
                onChange={(value) =>
                  updateAssets({ decoration: { ...assets.decoration, zoom: value / 100 } })
                }
              />
            </Field>
            <Field label="Picture rotation">
              <Slider
                label="Rotation"
                value={assets.decoration.rotate ?? 0}
                min={-180}
                max={180}
                suffix="°"
                onChange={(value) =>
                  updateAssets({ decoration: { ...assets.decoration, rotate: value } })
                }
              />
            </Field>
          </div>
        </Modal>

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
            <Button icon="external" onClick={() => window.open(`/${user.username}`, "_blank")}>
              Open page
            </Button>
          }
        />

        <div className="tw-copy-row">
          <span className="tw-copy-value">
            tourn.lol/<b>{user.username}</b>
          </span>
          <IconButton label="Copy profile link" icon="copy" onClick={() => void copyUrl()} />
        </div>

        <div className="tw-meta-grid">
          <div>
            <small>Joined</small>
            <b>{joined}</b>
          </div>
          <div>
            <small>Account</small>
            <b>@{user.username}</b>
          </div>
          <div>
            <small>Alias</small>
            <b>{user.alias?.trim() ? `swats.bio/${user.alias}` : "Not claimed"}</b>
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

      <Card>
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
            value={assets.background.dim}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) =>
              updateAssets({ background: { ...assets.background, dim: value } })
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
                    updateAssets({ cursor: { ...assets.cursor, imageUrl: "", style: "default" } })
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
            if (file && pickHandler.current) void pickHandler.current(file);
            event.target.value = "";
          }}
        />
      </Card>
    </>
  );
}

export function AffiliatesPage() {
  const { user, isPremium, notify, go } = useDash();
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
      value: `tourn.lol/${user.username}`,
      href: `https://tourn.lol/${user.username}`,
      locked: false,
    },
    {
      id: "alias",
      label: "swats.bio",
      value: isPremium
        ? `swats.bio/${user.alias2 || user.username}`
        : "Premium alias",
      href: `https://swats.bio/${user.alias2 || user.username}`,
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
            <Button icon="copy" onClick={() => void copy(`https://tourn.lol/${user.username}`, "main")}>
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
