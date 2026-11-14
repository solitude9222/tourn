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
import { naturalCompare, numberCompare, sorted } from "../../lib/sort";
import { fetchLeaderboard, type LeaderboardEntry } from "../../lib/leaderboard";
import "../../leaderboard.css";
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
  const [visible, setVisible] = useState(15);
  const fileInput = useRef<HTMLInputElement>(null);

  const persist = (next: LibraryAsset[]) => {
    setLibrary(next);
    saveLibrary(user.id, next);
  };

  const shown = useMemo(() => {
    const list = library.filter((asset) => type === "all" || asset.type === type);
    return sorted(list, (a, b) => {
      if (sort === "oldest") return numberCompare(a.createdAt, b.createdAt, "asc");
      if (sort === "name") return naturalCompare(a.name, b.name);
      if (sort === "name-desc") return naturalCompare(b.name, a.name);
      if (sort === "type") return naturalCompare(a.type, b.type) || naturalCompare(a.name, b.name);
      return numberCompare(a.createdAt, b.createdAt, "desc");
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
      {assets.slice(0, visible).map((asset) => (
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
      {assets.length > visible ? (
        <button type="button" className="btn btn-ghost" onClick={() => setVisible((count) => count + 15)}>
          Load 15 more
        </button>
      ) : null}
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
                <option value="name-desc">Name (Z–A)</option>
                <option value="type">Type</option>
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

const boardHref = (handle: string) => `#/profile/${encodeURIComponent(handle)}`;

export function LeaderboardPage() {
  const { user, profileViews } = useDash();
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(18);

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
  const podium = rows?.slice(0, 3) ?? [];
  const listed = rows?.slice(3, shown) ?? [];

  return (
    <Card>
      <CardHead
        icon="chart"
        title="Leaderboard"
        subtitle="Most viewed profiles on tourn.lol. Open a row to visit the page."
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
        <>
          <div className="tw-lb-podium">
            {podium.map((row, index) => (
              <a
                key={row.username}
                className={`tw-lb-podium-card is-${index + 1}${row.username === user.username ? " is-you" : ""}`}
                href={boardHref(row.username)}
                aria-label={`Rank ${index + 1}, @${row.username}`}
              >
                <span className="tw-lb-podium-rank">
                  {index === 0 ? "Champion" : index === 1 ? "Runner-up" : "Third"}
                </span>
                <span className="tw-lb-podium-avatar">
                  {row.avatarUrl ? <img src={row.avatarUrl} alt="" /> : <Icon name="user" size={18} />}
                </span>
                <span className="tw-lb-podium-copy">
                  <b>{row.displayName || row.username}</b>
                  <small>@{row.username}</small>
                </span>
                <span className="tw-lb-podium-views">
                  {row.views.toLocaleString()} <small>views</small>
                </span>
                <span className="tw-lb-podium-bar" aria-hidden="true">
                  <span style={{ width: `${max ? Math.max(4, (row.views / max) * 100) : 0}%` }} />
                </span>
                <span className="tw-lb-podium-open">
                  View profile
                  <Icon name="arrow-right" size={12} />
                </span>
              </a>
            ))}
          </div>

          <div className="tw-lb">
            {listed.map((row, index) => (
              <a
                key={row.username}
                className={`tw-lb-row${row.username === user.username ? " is-you" : ""}`}
                href={boardHref(row.username)}
                aria-label={`Rank ${index + 4}, @${row.username}`}
              >
                <span className="tw-lb-rank">{index + 4}</span>
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
                <Icon name="chevron-right" size={14} className="tw-lb-chev" />
              </a>
            ))}
            {rows.length > shown ? (
              <button type="button" className="btn btn-ghost" onClick={() => setShown((count) => count + 15)}>
                Load 15 more
              </button>
            ) : null}
          </div>
        </>
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
