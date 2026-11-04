/* ---------------------------------------------------------------------------
   Assets — Asset Browser and Templates.

   The community library needs a backend tourn.lol doesn't have yet, so that
   tab is an honest empty state. Uploads are real: they land in the per-account
   library and can be applied to the profile immediately.
   --------------------------------------------------------------------------- */

import { useMemo, useRef, useState } from "react";
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
  const [mode, setMode] = useState("library");
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
              { value: "library", label: "Asset Library" },
              { value: "uploads", label: "My Uploads" },
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
              Upload Asset
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHead
          icon="image"
          title={mode === "library" ? "Asset Library" : "My Uploads"}
          subtitle={
            mode === "library"
              ? "Community uploads appear here once the shared library is connected."
              : `${library.length} upload${library.length === 1 ? "" : "s"} stored on this account.`
          }
        />

        {mode === "library" ? (
          <EmptyState
            icon="image"
            title="Nothing in the community library yet"
            message="Upload your own avatar, background, cursor or audio — My Uploads works right now."
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
        title="Upload Asset"
        subtitle="Files stay on this device. Images are resized before saving."
        onClose={() => setUploadOpen(false)}
        footer={
          <>
            <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              icon="upload"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
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
              <Button variant="primary" icon="check" onClick={() => { apply(viewing); setViewing(null); }}>
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

export function TemplatesPage() {
  const { setAbout, notify } = useDash();
  const templates = [
    {
      id: "classic",
      name: "Classic",
      hint: "Centered card · 22px radius",
      apply: { cardStyle: "default" as const, cardRadius: 22, layout: "classic" as const },
    },
    {
      id: "banner",
      name: "Banner",
      hint: "Wide image strip · 18px radius",
      apply: { cardStyle: "banner" as const, cardRadius: 18, layout: "classic" as const },
    },
    {
      id: "compact",
      name: "Compact",
      hint: "Tight spacing · 14px radius",
      apply: { cardStyle: "compact" as const, cardRadius: 14, layout: "classic" as const },
    },
    {
      id: "minimal",
      name: "Minimal",
      hint: "No card surface · 0px radius",
      apply: { cardStyle: "minimal" as const, cardRadius: 0, layout: "classic" as const },
    },
  ];

  return (
    <Card>
      <CardHead
        icon="grid"
        title="Templates"
        subtitle="Start from a saved arrangement, then fine-tune it in Customize."
      />
      <div className="tw-template-grid">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className="tw-template-card"
            onClick={() => {
              setAbout((current) => ({
                ...current,
                design: { ...current.design, ...template.apply },
              }));
              notify("Template applied", `${template.name} is ready — save to publish.`);
            }}
          >
            <span className="tw-template-thumb" data-kind={template.id} />
            <b>{template.name}</b>
            <small>{template.hint}</small>
          </button>
        ))}
      </div>
      <p className="tw-foot-note">Templates change layout and radius only. Your colours, links and widgets stay.</p>
    </Card>
  );
}

