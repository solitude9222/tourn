/* ---------------------------------------------------------------------------
   Community — your uploads, the leaderboard and shared looks.

   Uploads stay on this account (there is no shared asset backend yet). Looks
   travel as portable codes, so a template can be handed to someone else
   without a server: free accounts keep two, premium ten, and premium-only
   pieces are stripped for anyone who cannot use them.
   --------------------------------------------------------------------------- */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePreference } from "../preferences";
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
  const [type, setType] = usePreference(`asset-type/${user.id}`, "all");
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<LibraryAsset[]>([]);
  const [progress, setProgress] = useState(0);
  const [sort, setSort] = usePreference(`asset-sort/${user.id}`, "newest");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<LibraryAssetType>("Avatar");
  const [viewing, setViewing] = useState<LibraryAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(15);
  const fileInput = useRef<HTMLInputElement>(null);
  const libraryRef = useRef(library); libraryRef.current = library;

  const persist = (next: LibraryAsset[]) => {
    if (!saveLibrary(user.id, next)) { notify("Library not saved", "Browser storage is full or unavailable. Download important files, then remove older uploads and retry. Maximum 60 assets."); return false; }
    setLibrary(next); return true;
  };

  const shown = useMemo(() => {
    const list = library.filter((asset) => (type === "all" || asset.type === type) && (!favoritesOnly || asset.favorite) && asset.name.toLowerCase().includes(query.trim().toLowerCase()));
    return sorted(list, (a, b) => {
      if (sort === "popular") return numberCompare(a.downloads, b.downloads, "desc");
      if (sort === "oldest") return numberCompare(a.createdAt, b.createdAt, "asc");
      if (sort === "name") return naturalCompare(a.name, b.name);
      if (sort === "name-desc") return naturalCompare(b.name, a.name);
      if (sort === "type") return naturalCompare(a.type, b.type) || naturalCompare(a.name, b.name);
      return numberCompare(a.createdAt, b.createdAt, "desc");
    });
  }, [library, type, sort, query, favoritesOnly]);
  useEffect(() => setVisible(15), [type, sort, query, favoritesOnly]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setProgress(0);
    try {
      if (!file.type.startsWith("audio/") && !file.type.startsWith("image/")) throw new Error("Choose an image or audio file.");
      if (file.size > 12_000_000) throw new Error("Choose a file under 12 MB. Trim audio or resize the image first.");
      if (file.type.startsWith("image/") && uploadType === "Audio") throw new Error("Choose Avatar, Background or Cursor for an image file.");
      const type: LibraryAssetType = file.type.startsWith("audio/")
        ? "Audio"
        : file.type.startsWith("image/")
          ? uploadType
          : uploadType;
      const url = type === "Audio" ? await fileToDataUrl(file, setProgress) : await imageToDataUrl(file, 1400, 1400);
      const asset = newAsset(type, file.name.replace(/\.[^.]+$/, ""), url);
      if (libraryRef.current.some(entry => entry.type === asset.type && entry.url === asset.url)) { notify("Already in your library", "This file is already saved under the same asset type."); return; }
      if (!persist([asset, ...libraryRef.current])) return;
      setProgress(100);
      setUploadOpen(false);
      setMode("uploads");
      notify("Asset uploaded", `${asset.name} is in My Uploads.`);
    } catch (error) {
      notify("Upload failed", error instanceof Error ? error.message : "That file could not be read. Try a different image or audio file.");
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
        assets: { ...current.assets, cursor: { ...current.assets.cursor, style: "custom", imageUrl: asset.url,hotspotX:0,hotspotY:0 } },
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
    setDeleting([asset]);
  };

  const grid = (assets: LibraryAsset[]) => (
    <div className="tw-asset-grid">
      {assets.slice(0, visible).map((asset) => (
        <article className="tw-asset-card" key={asset.id}>
          <div className="tw-asset-preview">
            {asset.type === "Avatar" || asset.type === "Background" ? (
              <img src={asset.url} alt={asset.name} loading="lazy" decoding="async" />
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
            <input type="checkbox" aria-label={`Select ${asset.name}`} checked={selected.includes(asset.id)} onChange={event => setSelected(current => event.target.checked ? [...current, asset.id] : current.filter(id => id !== asset.id))} />
            <button type="button" className="tw-favorite" aria-label={`Favorite ${asset.name}`} aria-pressed={Boolean(asset.favorite)} onClick={() => persist(library.map(item => item.id === asset.id ? { ...item, favorite: !item.favorite } : item))}><Icon name="star" size={15} /></button>
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
          <TextInput aria-label="Search uploads" placeholder="Search uploads…" value={query} onChange={e => setQuery(e.target.value)} />
          <TextInput aria-label="Search uploads" placeholder="Search uploads…" value={query} onChange={e => setQuery(e.target.value)} />
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
                <option value="popular">Most downloaded</option>
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
        <div className="tw-toolbar tw-library-tools">
          <Button onClick={() => setFavoritesOnly(value => !value)} aria-pressed={favoritesOnly}>Favorites {favoritesOnly ? "only" : ""}</Button>
          <Button onClick={() => setSelected(shown.map(asset => asset.id))}>Select filtered ({shown.length})</Button>
          <Button disabled={!selected.length} onClick={() => setSelected([])}>Clear selection</Button>
          <Button variant="danger" disabled={!selected.length} onClick={() => setDeleting(library.filter(asset => selected.includes(asset.id)))}>Delete selected ({selected.length})</Button>
          <Button onClick={() => { const profile = JSON.stringify(about); const unused = library.filter(asset => !profile.includes(JSON.stringify(asset.url).slice(1, -1))); if (unused.length) setDeleting(unused); else notify("All assets are in use", "Every library file is referenced by your current profile draft."); }}>Review unused</Button>
          <Button onClick={() => { const seen = new Set<string>(); const duplicates = library.filter(asset => { const key = asset.type + ":" + asset.url; if (seen.has(key)) return true; seen.add(key); return false; }); if (duplicates.length) setDeleting(duplicates); else notify("No duplicates found", "No identical files of the same type are saved twice."); }}>Review duplicates</Button>
        </div>
        <CardHead
          icon="image"
          title={mode === "library" ? "Shared library" : "My uploads"}
          subtitle={
            mode === "library"
              ? "Community uploads appear here once the shared library is connected."
              : `${shown.length} of ${library.length} uploads · stored on this browser for this account.`
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
            title={library.length ? "No matching uploads" : "No uploads yet"}
            message={library.length ? "Try another search, type, or turn off Favorites only." : "Upload an avatar, background, cursor or audio file to reuse it later."}
            action={
              <Button variant="primary" icon="upload" onClick={() => setUploadOpen(true)}>
                Upload your first asset
              </Button>
            }
            dashed
          />
        )}
      </Card>

      <Modal open={deleting.length > 0} title={`Delete ${deleting.length} asset(s)?`} subtitle="This removes library copies from this browser. Files already applied to your profile stay in place." onClose={() => setDeleting([])} footer={<><Button onClick={() => setDeleting([])}>Cancel</Button><Button variant="danger" onClick={() => { const ids = new Set(deleting.map(asset => asset.id)); if (persist(library.filter(asset => !ids.has(asset.id)))) { setDeleting([]); setSelected([]); setViewing(null); notify("Assets deleted", "The selected library copies were removed."); } }}>Delete library copies</Button></>}><ul>{deleting.map(asset => <li key={asset.id}>{asset.name} · {asset.type}</li>)}</ul></Modal>
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
        {busy ? <progress max={100} value={progress || undefined} aria-label="Processing upload" /> : null}
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
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [sort, setSort] = usePreference<"views" | "likes">("leaderboard-sort", "views");
  const [moreError, setMoreError] = useState("");
  const boardRequest = useRef(0);

  useEffect(() => {
    let alive = true;
    ++boardRequest.current; setLoadingMore(false);
    setRows(null); setFailed(false); setMoreError("");
    fetchLeaderboard(sort)
      .then((result) => {
        if (!alive) return;
        setRows(result.entries);
        setTotal(result.total);
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
  }, [sort, attempt]);

  const loadMore = async () => {
    if (!rows || loadingMore) return;
    const request = boardRequest.current;
    setLoadingMore(true); setMoreError("");
    try {
      const result = await fetchLeaderboard(sort, 25, rows.length);
      if (request !== boardRequest.current) return;
      setTotal(result.total);
      setRows((current) => {
        if (!current) return result.entries;
        const seen = new Set(current.map((row) => row.username));
        return [...current, ...result.entries.filter((row) => !seen.has(row.username))];
      });
    } catch {
      if (request === boardRequest.current) setMoreError("Could not load the next rankings. Try Load more again.");
    } finally {
      if (request === boardRequest.current) setLoadingMore(false);
    }
  };

  const metric = (row: LeaderboardEntry) => row[sort];
  const max = rows?.reduce((top, row) => Math.max(top, metric(row)), 0) ?? 0;
  const ownRank = rows?.findIndex(row => row.username === user.username) ?? -1;
  const match = (row: LeaderboardEntry) => `${row.username} ${row.handle} ${row.displayName || ""}`.toLowerCase().includes(query.trim().toLowerCase());
  const podium = rows?.slice(0, 3) ?? [];
  const listed = rows?.slice(3) ?? [];

  return (
    <Card>
      <CardHead
        icon="chart"
        title="Leaderboard"
        subtitle="Live profile rankings. Open a row to visit the page."
        actions={<Button icon="refresh" disabled={rows===null} onClick={()=>setAttempt(value=>value+1)}>Refresh rankings</Button>}
      />

      <div className="tw-board-summary"><div><small>Community profiles</small><b>{rows===null?"—":total.toLocaleString()}</b></div><div><small>Leading {sort}</small><b>{rows?.length?metric(rows[0]).toLocaleString():"—"}</b></div><div><small>Your loaded rank</small><b>{ownRank>=0?"#"+(ownRank+1):"Not loaded"}</b></div><span>Lifetime rankings · refresh for the latest counts</span></div>
      <div className="tw-toolbar"><TextInput aria-label="Search loaded rankings" value={query} placeholder="Search loaded rankings…" onChange={event => setQuery(event.target.value)} /><Select ariaLabel="Rank profiles by" value={sort} onChange={value => setSort(value as "views" | "likes")} options={[{ value: "views", label: "Most views" }, { value: "likes", label: "Most likes" }]} /><Button disabled={ownRank < 0} onClick={() => { setQuery(""); requestAnimationFrame(() => { const row = document.getElementById("tw-own-rank"); row?.scrollIntoView({ block: "center", behavior: "smooth" }); row?.focus({ preventScroll: true }); }); }}>Your rank{ownRank >= 0 ? ` · #${ownRank + 1}` : " not loaded"}</Button></div>
      {query && rows ? <p className="tw-foot-note">Searching {rows.length} loaded profiles. Original ranks are preserved; load more to search further.</p> : null}
      {failed ? (
        <EmptyState
          icon="chart"
          title="Leaderboard unavailable"
          message="The rankings could not be loaded. Check your connection and try again."
          action={<Button onClick={() => setAttempt(value => value + 1)}>Retry rankings</Button>}
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
            {podium.map((row, index) => match(row) ? (
              <a
                key={row.username}
                id={row.username === user.username ? "tw-own-rank" : undefined}
                className={`tw-lb-podium-card is-${index + 1}${row.username === user.username ? " is-you" : ""}`}
                href={boardHref(row.handle)}
                aria-label={`Rank ${index + 1}, ${row.displayName || row.username}`}
              >
                <span className="tw-lb-podium-rank">
                  {index === 0 ? "Champion" : index === 1 ? "Runner-up" : "Third"}
                </span>
                <span className="tw-lb-podium-avatar">
                  {row.avatarUrl ? <img src={row.avatarUrl} alt="" loading="lazy" decoding="async" /> : <Icon name="user" size={18} />}
                </span>
                <span className="tw-lb-podium-copy">
                  <b>{row.displayName || row.handle}</b><small>@{row.handle}</small>
                </span>
                <span className="tw-lb-podium-views">
                  {metric(row).toLocaleString()} <small>{sort}</small>
                </span>
                <span className="tw-lb-podium-bar" aria-hidden="true">
                  <span style={{ width: `${max ? Math.max(4, (metric(row) / max) * 100) : 0}%` }} />
                </span>
                <span className="tw-lb-podium-open">
                  View profile
                  <Icon name="arrow-right" size={12} />
                </span>
              </a>
            ) : null)}
          </div>

          <div className="tw-lb">
            {listed.map((row, index) => match(row) ? (
              <a
                key={row.username}
                id={row.username === user.username ? "tw-own-rank" : undefined}
                className={`tw-lb-row${row.username === user.username ? " is-you" : ""}`}
                href={boardHref(row.handle)}
                aria-label={`Rank ${index + 4}, ${row.displayName || row.username}`}
              >
                <span className="tw-lb-rank">{index + 4}</span>
                <span className="tw-lb-avatar">
                  {row.avatarUrl ? <img src={row.avatarUrl} alt="" loading="lazy" decoding="async" /> : <Icon name="user" size={15} />}
                </span>
                <span className="tw-lb-copy">
                  <b>{row.displayName || row.username}</b>
                </span>
                <span className="tw-lb-bar" aria-hidden="true">
                  <span style={{ width: `${max ? Math.max(4, (metric(row) / max) * 100) : 0}%` }} />
                </span>
                <span className="tw-lb-views">
                  {metric(row).toLocaleString()} <small>{sort}</small>
                </span>
                <Icon name="chevron-right" size={14} className="tw-lb-chev" />
              </a>
            ) : null)}
            {rows.length < total ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : `Load more (${total - rows.length} left)`}
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

      {moreError ? <p role="alert" className="tw-foot-note">{moreError}</p> : null}
      {rows?.length && !rows.some(match) ? <p role="status" className="tw-foot-note">No loaded profiles match that search.</p> : null}
      <p className="tw-foot-note">
        Your profile has {profileViews === null ? "no" : profileViews.toLocaleString()} views
        {profileViews ? " — keep sharing your link." : "."}
      </p>
    </Card>
  );
}
