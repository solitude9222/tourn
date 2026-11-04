/* ---------------------------------------------------------------------------
   Community — your uploads, the leaderboard and shared looks.

   Uploads stay on this account (there is no shared asset backend yet). Looks
   travel as portable codes, so a template can be handed to someone else
   without a server: free accounts keep two, premium ten, and premium-only
   pieces are stripped for anyone who cannot use them.
   --------------------------------------------------------------------------- */

import { useEffect, useMemo, useRef, useState } from "react";
import { useDash } from "../context";
import {
  fileToDataUrl,
  imageToDataUrl,
  loadLibrary,
  newAsset,
  saveLibrary,
  timeAgo,
  type LibraryAsset,
  type LibraryAssetType,
} from "../files";
import { EMPTY_ABOUT, type About } from "../../lib/about";
import { LinkerPreview } from "../../components/LinkerPreview";
import {
  TEMPLATE_PART_META,
  builtinTemplates,
  decodeTemplate,
  encodeTemplate,
  loadReceived,
  loadShares,
  mergeTemplate,
  premiumParts,
  saveReceived,
  saveShares,
  shareLimit,
  snapshotFrom,
  templateNameFrom,
  templateParts,
  type TemplatePart,
  type TemplateShare,
  type TemplateSnapshot,
} from "../../lib/templates";
import { fetchLeaderboard, type LeaderboardEntry } from "../../lib/leaderboard";
import {
  Button,
  Card,
  CardHead,
  Chip,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Modal,
  Segmented,
  Select,
  TextInput,
} from "../ui";

const TYPES: LibraryAssetType[] = ["Avatar", "Audio", "Background", "Cursor"];

function iconFor(asset: LibraryAsset) {
  if (asset.type === "Audio") return <Icon name="music" size={30} />;
  if (asset.type === "Cursor") return <Icon name="move" size={28} />;
  return null;
}

export function AssetBrowserPage() {
  const { user, about, setAbout, notify } = useDash();
  const [library, setLibrary] = useState<LibraryAsset[]>(() => loadLibrary(user.id));
  const [mode, setMode] = useState("uploads");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("newest");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<LibraryAssetType>("Avatar");
  const [viewing, setViewing] = useState<LibraryAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const persist = (next: LibraryAsset[]) => {
    setLibrary(next);
    saveLibrary(user.id, next);
  };

  const shown = useMemo(() => {
    const list = library.filter((asset) => type === "all" || asset.type === type);
    return [...list].sort((a, b) => {
      if (sort === "oldest") return a.createdAt - b.createdAt;
      if (sort === "name") return a.name.localeCompare(b.name);
      return b.createdAt - a.createdAt;
    });
  }, [library, type, sort]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const type: LibraryAssetType = file.type.startsWith("audio/")
        ? "Audio"
        : file.type.startsWith("image/")
          ? uploadType
          : uploadType;
      const url = type === "Audio" ? await fileToDataUrl(file) : await imageToDataUrl(file, 1400, 1400);
      const asset = newAsset(type, file.name.replace(/\.[^.]+$/, ""), url);
      persist([asset, ...library]);
      setUploadOpen(false);
      setMode("uploads");
      notify("Asset uploaded", `${asset.name} is in My Uploads.`);
    } catch {
      notify("Upload failed", "That file could not be read.");
    } finally {
      setBusy(false);
    }
  };

  const apply = (asset: LibraryAsset) => {
    if (asset.type === "Avatar") {
      setAbout((current) => ({
        ...current,
        assets: { ...current.assets, avatarUrl: asset.url },
      }));
    } else if (asset.type === "Background") {
      setAbout((current) => ({
        ...current,
        assets: {
          ...current.assets,
          background: { ...current.assets.background, style: "image", imageUrl: asset.url },
        },
      }));
    } else if (asset.type === "Cursor") {
      setAbout((current) => ({
        ...current,
        assets: { ...current.assets, cursor: { ...current.assets.cursor, imageUrl: asset.url } },
      }));
    } else {
      setAbout((current) => ({
        ...current,
        assets: {
          ...current.assets,
          audio: {
            ...current.assets.audio,
            style: "compact",
            fileUrl: asset.url,
            title: current.assets.audio.title || asset.name,
          },
        },
      }));
    }
    notify("Asset applied", "Save your changes to publish it.");
  };

  const download = (asset: LibraryAsset) => {
    const anchor = document.createElement("a");
    anchor.href = asset.url;
    anchor.download = asset.name || "tourn-asset";
    anchor.click();
    persist(
      library.map((entry) =>
        entry.id === asset.id ? { ...entry, downloads: entry.downloads + 1 } : entry,
      ),
    );
  };

  const remove = (asset: LibraryAsset) => {
    persist(library.filter((entry) => entry.id !== asset.id));
    setViewing(null);
    notify("Asset deleted", `${asset.name} was removed from My Uploads.`);
  };

  const grid = (assets: LibraryAsset[]) => (
    <div className="tw-asset-grid">
      {assets.map((asset) => (
        <article className="tw-asset-card" key={asset.id}>
          <div className="tw-asset-preview">
            {asset.type === "Avatar" || asset.type === "Background" ? (
              <img src={asset.url} alt={asset.name} />
            ) : (
              iconFor(asset)
            )}
            <span className="tw-asset-type">{asset.type}</span>
          </div>
          <div className="tw-asset-meta">
            <div className="tw-asset-line">
              <span className="tw-asset-user">
                <Icon name="upload" size={11} /> {asset.name}
              </span>
              <span className="tw-asset-age">{timeAgo(asset.createdAt)}</span>
            </div>
            <div className="tw-asset-stats">
              <span>
                <Icon name="download" size={11} /> {asset.downloads}
              </span>
              <span>
                <Icon name="like" size={11} /> {asset.likes}
              </span>
            </div>
          </div>
          <div className="tw-asset-actions">
            <IconButton label="Preview asset" icon="expand" onClick={() => setViewing(asset)} />
            <IconButton
              label="Use on profile"
              icon="check"
              variant="primary"
              onClick={() => apply(asset)}
            />
            <IconButton label="Download asset" icon="download" onClick={() => download(asset)} />
          </div>
        </article>
      ))}
    </div>
  );

  return (
    <>
      <Card>
        <div className="tw-toolbar">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: "uploads", label: "My Uploads" },
              { value: "library", label: "Shared Library" },
            ]}
          />
          <div className="tw-toolbar-group">
            <span className="tw-select-compact tw-control tw-select" style={{ minWidth: 150 }}>
              <Icon name="grid" size={14} className="tw-control-icon" />
              <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter assets">
                <option value="all">All Assets</option>
                {TYPES.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" size={14} className="tw-select-chevron" />
            </span>

            <span className="tw-select-compact tw-control tw-select" style={{ minWidth: 150 }}>
              <Icon name="sort" size={14} className="tw-control-icon" />
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort assets">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name (A–Z)</option>
              </select>
              <Icon name="chevron-down" size={14} className="tw-select-chevron" />
            </span>

            <Button variant="primary" icon="upload" onClick={() => setUploadOpen(true)}>
              Upload
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHead
          icon="image"
          title={mode === "library" ? "Shared library" : "My uploads"}
          subtitle={
            mode === "library"
              ? "Community uploads appear here once the shared library is connected."
              : `${library.length} upload${library.length === 1 ? "" : "s"} stored on this account.`
          }
        />

        {mode === "library" ? (
          <EmptyState
            icon="image"
            title="Nothing in the shared library yet"
            message="Your own uploads work right now — avatars, backgrounds, cursors and audio."
            action={
              <Button variant="primary" icon="upload" onClick={() => setUploadOpen(true)}>
                Upload an asset
              </Button>
            }
            dashed
          />
        ) : shown.length ? (
          grid(shown)
        ) : (
          <EmptyState
            icon="upload"
            title="No uploads yet"
            message="Upload an avatar, background, cursor or audio file to reuse it later."
            action={
              <Button variant="primary" icon="upload" onClick={() => setUploadOpen(true)}>
                Upload your first asset
              </Button>
            }
            dashed
          />
        )}
      </Card>

      <Modal
        open={uploadOpen}
        title="Upload asset"
        subtitle="Files stay on this device. Images are resized before saving."
        onClose={() => setUploadOpen(false)}
        footer={
          <>
            <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button variant="primary" icon="upload" disabled={busy} onClick={() => fileInput.current?.click()}>
              {busy ? "Uploading…" : "Choose file"}
            </Button>
          </>
        }
      >
        <Field label="Asset type">
          <Select
            icon="grid"
            value={uploadType}
            options={TYPES.map((entry) => ({ value: entry, label: entry }))}
            onChange={(value) => setUploadType(value as LibraryAssetType)}
          />
        </Field>
        <p className="tw-foot-note">
          Audio files apply to the profile player. Avatars are cropped to a square by the profile card.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,audio/*"
          hidden
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </Modal>

      <Modal
        open={Boolean(viewing)}
        title={viewing?.name ?? "Asset"}
        subtitle={viewing ? `${viewing.type} · added ${timeAgo(viewing.createdAt)}` : undefined}
        onClose={() => setViewing(null)}
        footer={
          viewing ? (
            <>
              <Button variant="danger" icon="trash" onClick={() => remove(viewing)}>
                Delete
              </Button>
              <Button
                variant="primary"
                icon="check"
                onClick={() => {
                  apply(viewing);
                  setViewing(null);
                }}
              >
                Use on profile
              </Button>
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="tw-asset-view">
            {viewing.type === "Audio" ? (
              <audio controls src={viewing.url} style={{ width: "100%" }} />
            ) : (
              <img src={viewing.url} alt={viewing.name} />
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}

/* ── leaderboard ─────────────────────────────────────────────── */

export function LeaderboardPage() {
  const { user, profileViews } = useDash();
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchLeaderboard()
      .then((entries) => {
        if (!alive) return;
        setRows(entries);
        setFailed(false);
      })
      .catch(() => {
        if (!alive) return;
        setRows([]);
        setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const max = rows?.reduce((top, row) => Math.max(top, row.views), 0) ?? 0;

  return (
    <Card>
      <CardHead
        icon="chart"
        title="Leaderboard"
        subtitle="Most viewed profiles on tourn.lol."
        actions={<Chip>{rows ? `${rows.length} profiles` : "Loading…"}</Chip>}
      />

      {failed ? (
        <EmptyState
          icon="chart"
          title="Leaderboard unavailable"
          message="The rankings are read from the live site; they will show once the backend answers."
          dashed
        />
      ) : rows === null ? (
        <div className="tw-stack">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="tw-lb-row is-skeleton" key={index} />
          ))}
        </div>
      ) : rows.length ? (
        <div className="tw-lb">
          {rows.map((row, index) => (
            <a
              key={row.username}
              className={`tw-lb-row${row.username === user.username ? " is-you" : ""}`}
              href={`#/${row.username}`}
            >
              <span className="tw-lb-rank">{index + 1}</span>
              <span className="tw-lb-avatar">
                {row.avatarUrl ? <img src={row.avatarUrl} alt="" /> : <Icon name="user" size={15} />}
              </span>
              <span className="tw-lb-copy">
                <b>{row.displayName || row.username}</b>
                <small>@{row.username}</small>
              </span>
              <span className="tw-lb-bar" aria-hidden="true">
                <span style={{ width: `${max ? Math.max(4, (row.views / max) * 100) : 0}%` }} />
              </span>
              <span className="tw-lb-views">
                {row.views.toLocaleString()} <small>views</small>
              </span>
            </a>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="chart"
          title="No views recorded yet"
          message="Profiles appear here as soon as they start getting visitors."
          dashed
        />
      )}

      <p className="tw-foot-note">
        Your profile has {profileViews === null ? "no" : profileViews.toLocaleString()} views
        {profileViews ? " — keep sharing your link." : "."}
      </p>
    </Card>
  );
}

/* ── templates ───────────────────────────────────────────────── */

function TemplateStage({ snapshot }: { snapshot: TemplateSnapshot }) {
  const { user } = useDash();
  const about: About = {
    ...EMPTY_ABOUT,
    design: snapshot.design,
    assets: snapshot.assets,
  };
  return (
    <div className="tw-template-stage">
      <div className="tw-template-stage-inner">
        <LinkerPreview
          user={{ id: user.id, username: user.username, avatarUrl: snapshot.assets.avatarUrl || user.avatarUrl }}
          about={about}
          widgets={snapshot.widgets}
          badges={snapshot.badges}
          links={snapshot.links}
          showEntry={false}
          showMetadata={false}
          interactive={false}
        />
      </div>
    </div>
  );
}

function PartPicker({
  snapshot,
  isPremium,
  selected,
  onToggle,
}: {
  snapshot: TemplateSnapshot;
  isPremium: boolean;
  selected: TemplatePart[];
  onToggle: (part: TemplatePart, checked: boolean) => void;
}) {
  const available = templateParts(snapshot);
  const locked = premiumParts(snapshot);

  return (
    <div className="tw-part-list">
      {TEMPLATE_PART_META.map((part) => {
        const present = available.includes(part.id);
        const premium = locked.includes(part.id);
        const disabled = !present || (premium && !isPremium);
        return (
          <label className={`tw-part${disabled ? " is-disabled" : ""}`} key={part.id}>
            <input
              type="checkbox"
              checked={present && selected.includes(part.id) && !(premium && !isPremium)}
              disabled={disabled}
              onChange={(event) => onToggle(part.id, event.target.checked)}
            />
            <span className="tw-part-copy">
              <b>
                {part.label}
                {premium ? <Chip tone="amber">Premium</Chip> : null}
              </b>
              <small>{present ? part.hint : "Not part of this look"}</small>
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function TemplatesPage() {
  const { user, about, links, widgets, badges, setAbout, setLinks, setWidgets, setBadges, isPremium, notify, go } =
    useDash();

  const builtins = useMemo(() => builtinTemplates(), []);
  const [shares, setShares] = useState<TemplateShare[]>(() => loadShares(user.id));
  const [received, setReceived] = useState<TemplateShare[]>(() => loadReceived(user.id));
  const [preview, setPreview] = useState<{ name: string; snapshot: TemplateSnapshot } | null>(null);
  const [applying, setApplying] = useState<{ name: string; snapshot: TemplateSnapshot } | null>(null);
  const [pickedParts, setPickedParts] = useState<TemplatePart[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareName, setShareName] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [importError, setImportError] = useState("");

  const limit = shareLimit(isPremium);
  const liveSnapshot = () => snapshotFrom(about, links, widgets, badges);

  const startApply = (name: string, snapshot: TemplateSnapshot) => {
    const parts = templateParts(snapshot);
    const locked = isPremium ? [] : premiumParts(snapshot);
    setPickedParts(parts.filter((part) => !locked.includes(part)));
    setApplying({ name, snapshot });
  };

  const applyNow = () => {
    if (!applying) return;
    const result = mergeTemplate({ about, links, widgets, badges }, applying.snapshot, pickedParts, isPremium);
    setAbout(() => result.about);
    setLinks(() => result.links);
    setWidgets(() => result.widgets);
    setBadges(() => result.badges);
    setApplying(null);
    notify(
      "Template applied",
      result.stripped.length
        ? `${applying.name} applied — ${result.stripped.join(", ")} needs premium and was skipped.`
        : `${applying.name} applied. Save to publish.`,
    );
  };

  const createShare = () => {
    if (shares.length >= limit) {
      notify(
        "Share limit reached",
        isPremium ? "Premium looks can keep ten shares." : "Free looks can keep two shares — premium keeps ten.",
      );
      return;
    }
    const snapshot = liveSnapshot();
    const name = shareName.trim() || "My look";
    const code = encodeTemplate(snapshot, name, shareNote);
    const share: TemplateShare = {
      id: `share-${Date.now()}`,
      name,
      note: shareNote.trim(),
      createdAt: Date.now(),
      code,
      parts: templateParts(snapshot),
      premiumParts: premiumParts(snapshot),
    };
    const next = [share, ...shares];
    setShares(next);
    saveShares(user.id, next);
    setShareCode(code);
    setShareOpen(false);
    setShareName("");
    setShareNote("");
    notify("Look shared", "Copy the code and send it to anyone.");
  };

  const importShare = () => {
    const snapshot = decodeTemplate(importCode);
    if (!snapshot) {
      setImportError("That code is not a tourn.lol template.");
      return;
    }
    const name = templateNameFrom(importCode);
    const next = [
      {
        id: `received-${Date.now()}`,
        name,
        note: "",
        createdAt: Date.now(),
        code: importCode.trim(),
        parts: templateParts(snapshot),
        premiumParts: premiumParts(snapshot),
      },
      ...received,
    ];
    setReceived(next);
    saveReceived(user.id, next);
    setImportCode("");
    setImportError("");
    setImportOpen(false);
    notify("Template imported", `${name} is in Shared with you.`);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      notify("Code copied", "Paste it into Import on another account.");
    } catch {
      notify("Copy failed", "Select the code and copy it manually.");
    }
  };

  const gallery = (items: { id: string; name: string; note: string; snapshot: TemplateSnapshot }[]) => (
    <div className="tw-template-grid">
      {items.map((item) => {
        const locked = isPremium ? [] : premiumParts(item.snapshot);
        return (
          <article className="tw-template-card" key={item.id}>
            <button type="button" className="tw-template-shot" onClick={() => setPreview({ name: item.name, snapshot: item.snapshot })}>
              <TemplateStage snapshot={item.snapshot} />
              <span className="tw-template-shot-hover">
                <Icon name="expand" size={16} /> Preview
              </span>
            </button>
            <div className="tw-template-copy">
              <b>{item.name}</b>
              <small>{item.note}</small>
            </div>
            <div className="tw-template-foot">
              {locked.length ? <Chip tone="amber">Premium parts</Chip> : <Chip>Free</Chip>}
              <Button variant="primary" icon="check" onClick={() => startApply(item.name, item.snapshot)}>
                Use
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );

  return (
    <>
      <Card>
        <CardHead
          icon="grid"
          title="Templates"
          subtitle="Start from a look, or share your own. Pick exactly which parts come across."
          actions={
            <div className="tw-row">
              <Button icon="download" onClick={() => setImportOpen(true)}>
                Import code
              </Button>
              <Button variant="primary" icon="share" onClick={() => setShareOpen(true)}>
                Share my look
              </Button>
            </div>
          }
        />
        {gallery(builtins)}
      </Card>

      <Card>
        <CardHead
          icon="layers"
          title="Your shared looks"
          subtitle={`${shares.length} of ${limit} used${isPremium ? "" : " — premium keeps ten"}`}
          actions={
            isPremium ? null : (
              <Button icon="crown" onClick={() => go("premium")}>
                More slots
              </Button>
            )
          }
        />
        {shares.length ? (
          <div className="tw-share-list">
            {shares.map((share) => (
              <div className="tw-share-row" key={share.id}>
                <span className="tw-share-thumb">
                  {(() => {
                    const snapshot = decodeTemplate(share.code);
                    return snapshot ? <TemplateStage snapshot={snapshot} /> : <Icon name="grid" size={18} />;
                  })()}
                </span>
                <span className="tw-share-copy">
                  <b>{share.name}</b>
                  <small>
                    {share.note || "No note"} · {timeAgo(share.createdAt)} · {share.parts.length} parts
                    {share.premiumParts.length ? " · premium" : ""}
                  </small>
                </span>
                <div className="tw-row">
                  <Button icon="copy" onClick={() => void copyCode(share.code)}>
                    Copy code
                  </Button>
                  <IconButton
                    label={`Delete ${share.name}`}
                    icon="trash"
                    variant="danger"
                    onClick={() => {
                      const next = shares.filter((entry) => entry.id !== share.id);
                      setShares(next);
                      saveShares(user.id, next);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="share"
            title="You have not shared a look yet"
            message={`Share your current card as a code — free accounts keep ${shareLimit(false)}, premium keeps ${shareLimit(true)}.`}
            action={
              <Button variant="primary" icon="share" onClick={() => setShareOpen(true)}>
                Share my look
              </Button>
            }
            dashed
          />
        )}
      </Card>

      <Card>
        <CardHead
          icon="download"
          title="Shared with you"
          subtitle="Codes you imported from someone else."
          actions={
            <Button icon="plus" onClick={() => setImportOpen(true)}>
              Import
            </Button>
          }
        />
        {received.length ? (
          <div className="tw-share-list">
            {received.map((share) => {
              const snapshot = decodeTemplate(share.code);
              return (
                <div className="tw-share-row" key={share.id}>
                  <span className="tw-share-thumb">
                    {snapshot ? <TemplateStage snapshot={snapshot} /> : <Icon name="grid" size={18} />}
                  </span>
                  <span className="tw-share-copy">
                    <b>{share.name}</b>
                    <small>
                      Imported {timeAgo(share.createdAt)}
                      {share.premiumParts.length ? " · has premium parts" : ""}
                    </small>
                  </span>
                  <div className="tw-row">
                    <Button onClick={() => void copyCode(share.code)} icon="copy">
                      Copy
                    </Button>
                    <Button
                      variant="primary"
                      icon="check"
                      disabled={!snapshot}
                      onClick={() => snapshot && startApply(share.name, snapshot)}
                    >
                      Use
                    </Button>
                    <IconButton
                      label={`Remove ${share.name}`}
                      icon="trash"
                      variant="danger"
                      onClick={() => {
                        const next = received.filter((entry) => entry.id !== share.id);
                        setReceived(next);
                        saveReceived(user.id, next);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="download"
            title="Nothing imported yet"
            message="Paste a template code to add someone else's look here."
            dashed
          />
        )}
      </Card>

      {shareCode ? (
        <Modal
          open
          title="Template code"
          subtitle="Anyone with this code can import the look."
          onClose={() => setShareCode("")}
          footer={
            <>
              <Button onClick={() => setShareCode("")}>Done</Button>
              <Button variant="primary" icon="copy" onClick={() => void copyCode(shareCode)}>
                Copy code
              </Button>
            </>
          }
        >
          <textarea className="tw-code" readOnly value={shareCode} rows={6} />
        </Modal>
      ) : null}

      <Modal
        open={shareOpen}
        title="Share my look"
        subtitle={`Your card, colours, effects, widgets and links — never your name, bio or uploads. ${shares.length}/${limit} slots used.`}
        onClose={() => setShareOpen(false)}
        footer={
          <>
            <Button onClick={() => setShareOpen(false)}>Cancel</Button>
            <Button variant="primary" icon="share" onClick={createShare} disabled={shares.length >= limit}>
              Create code
            </Button>
          </>
        }
      >
        <div className="tw-stack">
          <Field label="Name">
            <TextInput value={shareName} placeholder="Midnight glass" onChange={(event) => setShareName(event.target.value)} />
          </Field>
          <Field label="Note" hint="Optional — one line about the look.">
            <TextInput value={shareNote} placeholder="Dark, quiet, no glow" onChange={(event) => setShareNote(event.target.value)} />
          </Field>
          <div className="tw-part-list">
            {templateParts(liveSnapshot()).map((part) => (
              <div className="tw-part" key={part}>
                <span className="tw-part-copy">
                  <b>
                    {TEMPLATE_PART_META.find((entry) => entry.id === part)?.label}
                    {premiumParts(liveSnapshot()).includes(part) ? <Chip tone="amber">Premium</Chip> : null}
                  </b>
                </span>
              </div>
            ))}
          </div>
          {shares.length >= limit ? (
            <p className="tw-foot-note">
              Share limit reached. {isPremium ? "Delete one to free a slot." : "Premium keeps ten shares."}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={importOpen}
        title="Import a template"
        subtitle="Paste a code someone sent you."
        onClose={() => setImportOpen(false)}
        footer={
          <>
            <Button onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button variant="primary" icon="download" onClick={importShare}>
              Import
            </Button>
          </>
        }
      >
        <Field label="Template code" hint="Starts with TRN1.">
          <textarea
            className="tw-code"
            rows={5}
            value={importCode}
            placeholder="TRN1.…"
            onChange={(event) => {
              setImportCode(event.target.value);
              setImportError("");
            }}
          />
        </Field>
        {importError ? <p className="tw-foot-note">{importError}</p> : null}
      </Modal>

      <Modal
        open={Boolean(preview)}
        title={preview?.name ?? "Preview"}
        subtitle="A real render of this look on your account."
        onClose={() => setPreview(null)}
        footer={
          preview ? (
            <>
              <Button onClick={() => setPreview(null)}>Close</Button>
              <Button
                variant="primary"
                icon="check"
                onClick={() => {
                  startApply(preview.name, preview.snapshot);
                  setPreview(null);
                }}
              >
                Use this look
              </Button>
            </>
          ) : null
        }
      >
        {preview ? (
          <div className="tw-template-full">
            <TemplateStage snapshot={preview.snapshot} />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(applying)}
        title={applying ? `Apply ${applying.name}` : "Apply template"}
        subtitle="Choose what comes across. Anything you leave unticked stays exactly as it is."
        onClose={() => setApplying(null)}
        footer={
          <>
            <Button onClick={() => setApplying(null)}>Cancel</Button>
            <Button variant="primary" icon="check" onClick={applyNow} disabled={!pickedParts.length}>
              Apply {pickedParts.length} part{pickedParts.length === 1 ? "" : "s"}
            </Button>
          </>
        }
      >
        {applying ? (
          <div className="tw-stack">
            <PartPicker
              snapshot={applying.snapshot}
              isPremium={isPremium}
              selected={pickedParts}
              onToggle={(part, checked) =>
                setPickedParts((current) =>
                  checked ? [...current, part] : current.filter((entry) => entry !== part),
                )
              }
            />
            {!isPremium && premiumParts(applying.snapshot).length ? (
              <p className="tw-foot-note">
                Locked parts need premium. They are skipped instead of applied, so nothing silently changes.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
