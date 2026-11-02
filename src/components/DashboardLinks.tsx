import { useMemo, useState, type CSSProperties, type DragEvent } from "react";
import { createPortal } from "react-dom";
import type { Account } from "../lib/auth";
import {
  CARD_STYLES as LINK_CARD_STYLES,
  ICON_STYLES,
  TOOLTIP_STYLES,
  DISPLAY_MODES,
  LINK_FOLDS,
  LINK_PRESETS,
  createLink,
  type LinkDesign,
  type LinkIconStyle,
  type LinkInstance,
  type LinkStore,
} from "../lib/links";
import {
  PLATFORMS,
  CATEGORIES,
  PLATFORM_CATEGORIES,
  QUICK_PRESETS,
  getPlatform,
  detectPlatformFromUrl,
  placeholderFor,
  type Platform,
  type PlatformCategoryId,
} from "../lib/linkPlatforms";
import { ColorField } from "./ColorPicker";
import { ImageUpload } from "./ImageUpload";
import { ProfileLinks } from "./ProfileLinks";
import { CheckIcon, CloseIcon, EditIcon, GripIcon, SearchIcon, TrashIcon } from "./Icons";
import "../assets.css";
import "../about.css";

function LinkSlider({
  label, value, min, max, step, unit = "", onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="lp-slider">
      <span className="lp-slider-head">
        <span>{label}</span><b>{value}{unit}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value}
        style={{ "--slider-fill": `${fill}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/* ── one row in the "Connected links" list ───────────────────────────── */

function iconShapeClass(iconStyle: LinkIconStyle): string {
  return iconStyle === "none" ? "default" : iconStyle;
}

function ConnectedLinkRow({
  link,
  design,
  dragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggleVisible,
  onEdit,
  onRemove,
}: {
  link: LinkInstance;
  design: LinkDesign;
  dragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onToggleVisible: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const platform = getPlatform(link.platform);
  const color = link.color || platform?.color || "#8b939b";
  const shape = iconShapeClass(design.iconStyle);

  return (
    <div
      className={`lnk-item${link.visible ? "" : " is-hidden"}${dragging ? " is-dragging" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <span className="lnk-item-grip" aria-hidden="true">
        <GripIcon size={13} />
      </span>
      <span className={`lnk-item-icon lnk-item-icon--${shape}`} style={{ "--lnk-color": color } as CSSProperties}>
        {link.iconUrl ? (
          <img src={link.iconUrl} alt="" />
        ) : platform ? (
          <platform.Icon size={13} />
        ) : null}
      </span>
      <span className="lnk-item-meta">
        <span className="lnk-item-meta-text">
          <b>{link.label || platform?.name || "Link"}</b>
          <small>{link.url || "No URL set"}</small>
        </span>
        {link.mode === "icon" ? <span className="lnk-item-tag">Icon</span> : null}
      </span>
      <span className="lnk-item-actions">
        <button
          type="button"
          role="switch"
          aria-checked={link.visible}
          aria-label={link.visible ? "Hide this link" : "Show this link"}
          className={`switch${link.visible ? " is-on" : ""}`}
          onClick={onToggleVisible}
        >
          <span />
        </button>
        <button type="button" className="lnk-item-edit" onClick={onEdit} title="Edit" aria-label="Edit link">
          <EditIcon size={12} />
        </button>
        <button type="button" className="lnk-item-del" onClick={onRemove} title="Delete" aria-label="Delete link">
          <TrashIcon size={12} />
        </button>
      </span>
    </div>
  );
}

/* ── "Browse all platforms" — categorised, searchable directory ─────── */

function BrowseAllModal({
  initialCategory = "all",
  onClose,
  onPick,
}: {
  initialCategory?: PlatformCategoryId;
  onClose: () => void;
  onPick: (platformId: string) => void;
}) {
  const [category, setCategory] = useState<PlatformCategoryId>(initialCategory);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const ids = PLATFORM_CATEGORIES[category] ?? [];
    let pool = PLATFORMS.filter((p) => ids.includes(p.id));
    const q = query.trim().toLowerCase();
    if (q) pool = pool.filter((p) => p.name.toLowerCase().includes(q) || p.id.includes(q));
    return pool;
  }, [category, query]);

  return createPortal(
    <div
      className="asset-modal-layer"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="asset-modal lnk-browse-modal" role="dialog" aria-modal="true" aria-labelledby="lnk-browse-title">
        <header className="asset-modal-head">
          <div>
            <span className="asset-kicker">Browse all platforms</span>
            <h2 id="lnk-browse-title">{PLATFORMS.length} supported platforms</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon size={15} />
          </button>
        </header>

        <div className="lnk-browse-body">
          <div className="lnk-browse-controls">
            <span className="lnk-search">
              <SearchIcon size={13} />
              <input
                type="search"
                placeholder={`Search ${PLATFORMS.length} platforms…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </span>
            <div className="lnk-option-row">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  className={`lnk-style-btn lnk-style-btn--sm${category === cat.id ? " is-active" : ""}`}
                  onClick={() => setCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lnk-browse-grid-scroll">
            <div className="lnk-browse-grid">
              {results.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="lnk-browse-tile"
                  style={{ "--lnk-color": p.color } as CSSProperties}
                  onClick={() => onPick(p.id)}
                >
                  <span className="lnk-browse-tile-icon">
                    <p.Icon size={16} />
                  </span>
                  <span className="lnk-browse-tile-name">{p.name}</span>
                  {p.isCrypto ? <span className="lnk-browse-tile-crypto">Crypto</span> : null}
                </button>
              ))}
              {results.length === 0 ? <div className="lnk-browse-empty">No platforms match your search.</div> : null}
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

/* ── full link editor — platform, fields, display style, colours ────── */

function LinkEditorModal({
  isNew,
  initial,
  design,
  onCancel,
  onSave,
  onDelete,
}: {
  isNew: boolean;
  initial: LinkInstance;
  design: LinkDesign;
  onCancel: () => void;
  onSave: (link: LinkInstance) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<LinkInstance>(initial);
  const [platformQuery, setPlatformQuery] = useState("");

  const patch = (p: Partial<LinkInstance>) => setDraft((d) => ({ ...d, ...p }));

  const platform = getPlatform(draft.platform);
  const accent = draft.color || platform?.color || "#8b939b";
  const shape = iconShapeClass(design.iconStyle);

  const filteredPlatforms = useMemo(() => {
    const q = platformQuery.trim().toLowerCase();
    if (!q) return PLATFORMS;
    return PLATFORMS.filter((p) => p.name.toLowerCase().includes(q) || p.id.includes(q));
  }, [platformQuery]);

  const selectPlatform = (p: Platform) => {
    setDraft((d) => {
      const prevMeta = getPlatform(d.platform);
      const labelIsDefault = !d.label || d.label === prevMeta?.name;
      return { ...d, platform: p.id, label: labelIsDefault ? p.name : d.label };
    });
  };

  const handleUrlChange = (value: string) => {
    const nextDetected = detectPlatformFromUrl(value);
    if (nextDetected && nextDetected !== draft.platform) {
      const p = getPlatform(nextDetected);
      const prevMeta = getPlatform(draft.platform);
      const labelIsDefault = !draft.label || draft.label === prevMeta?.name;
      setDraft((d) => ({
        ...d,
        url: value,
        platform: nextDetected,
        label: labelIsDefault && p ? p.name : d.label,
      }));
    } else {
      patch({ url: value });
    }
  };

  const detected = detectPlatformFromUrl(draft.url);
  const hasDescription = draft.description.trim().length > 0;
  const iconNode = draft.iconUrl ? (
    <img src={draft.iconUrl} alt="" />
  ) : platform ? (
    <platform.Icon size={18} />
  ) : null;

  return createPortal(
    <div
      className="asset-modal-layer"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <section className="asset-modal lnk-edit-modal" role="dialog" aria-modal="true" aria-labelledby="lnk-edit-title">
        <header className="asset-modal-head">
          <div className="lnk-edit-title">
            <span className={`lnk-item-icon lnk-item-icon--lg lnk-item-icon--${shape}`} style={{ "--lnk-color": accent } as CSSProperties}>
              {iconNode}
            </span>
            <div>
              <span className="asset-kicker">{isNew ? "Add a link" : "Edit link"}</span>
              <h2 id="lnk-edit-title">{draft.label || platform?.name || "Untitled link"}</h2>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label="Close">
            <CloseIcon size={15} />
          </button>
        </header>

        <div className="asset-modal-preview asset-modal-preview--link">
          <span className="asset-kicker lnk-edit-preview-kicker">Live preview</span>
          <span className="lnk-edit-preview-hint">
            {LINK_CARD_STYLES.find((s) => s.id === design.cardStyle)?.name} card
          </span>
          {/* Real ProfileLinks rendering, fed the live draft, so this is pixel-for-pixel
              what the link will look like on the public profile — hover still works
              (e.g. "reveal on hover" descriptions) but clicking is swallowed so the
              draft never gets abandoned by an accidental navigation. */}
          <div aria-hidden="true" onClick={(e) => e.preventDefault()}>
            <ProfileLinks
              links={[{ ...draft, visible: true, url: draft.url.trim() || "#" }]}
              design={design}
              className="lnk-edit-preview-row"
            />
          </div>
        </div>

        <div className="lnk-edit-body">
          {/* platform picker */}
          <div className="lnk-edit-section">
            <label className="lnk-field">
              <span>Platform</span>
              <input
                type="search"
                placeholder={`Search ${PLATFORMS.length} platforms…`}
                value={platformQuery}
                onChange={(e) => setPlatformQuery(e.target.value)}
              />
            </label>
            <div className="lnk-platform-grid-scroll">
              <div className="lnk-icon-grid">
                {filteredPlatforms.map((p) => {
                  const selected = draft.platform === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      className={`lnk-icon-tile${selected ? " is-active" : ""}`}
                      title={p.name}
                      onClick={() => selectPlatform(p)}
                    >
                      <p.Icon size={18} style={{ color: selected ? "#ffffff" : p.color }} />
                      <small>{p.name}</small>
                      {selected ? (
                        <span className="lnk-icon-tile-check">
                          <CheckIcon size={8} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {filteredPlatforms.length === 0 ? <div className="lnk-browse-empty">No platform found.</div> : null}
              </div>
            </div>
          </div>

          {/* label + url */}
          <div className="lnk-field-row2">
            <label className="lnk-field">
              <span>Label</span>
              <input
                value={draft.label}
                maxLength={60}
                placeholder="e.g. Discord"
                onChange={(e) => patch({ label: e.target.value })}
              />
            </label>
            <label className="lnk-field">
              <div className="lnk-field-head">
                <span>URL or handle</span>
                {detected ? (
                  <span className="lnk-detect-hint">
                    <CheckIcon size={9} />
                    Detected {getPlatform(detected)?.name}
                  </span>
                ) : null}
              </div>
              <input
                value={draft.url}
                maxLength={500}
                placeholder={placeholderFor(draft.platform)}
                onChange={(e) => handleUrlChange(e.target.value)}
              />
            </label>
          </div>

          {/* display style */}
          <div className="lnk-edit-section">
            <div className="lnk-option-group">
              <span className="lnk-option-label">Show as</span>
              <div className="lnk-option-row">
                {DISPLAY_MODES.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    className={`lnk-style-btn lnk-style-btn--sm${draft.mode === m.id ? " is-active" : ""}`}
                    onClick={() => patch({ mode: m.id })}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
            <label className="lnk-toggle">
              <span>Glow effect</span>
              <button
                type="button"
                role="switch"
                aria-checked={draft.glowOn}
                className={`switch${draft.glowOn ? " is-on" : ""}`}
                onClick={() => patch({ glowOn: !draft.glowOn })}
              >
                <span />
              </button>
            </label>
            <label className="lnk-toggle">
              <span>Visible on profile</span>
              <button
                type="button"
                role="switch"
                aria-checked={draft.visible}
                className={`switch${draft.visible ? " is-on" : ""}`}
                onClick={() => patch({ visible: !draft.visible })}
              >
                <span />
              </button>
            </label>
          </div>

          {/* custom icon, description, tooltip */}
          <div className="lnk-edit-section">
            <div className="lnk-icon-row">
              <span className={`lnk-current-icon lnk-item-icon--${shape}`} style={{ "--lnk-color": accent } as CSSProperties}>
                {iconNode}
              </span>
              <div className="lnk-icon-row-actions">
                <ImageUpload
                  label="icon"
                  value={draft.iconUrl}
                  onChange={(v) => patch({ iconUrl: v })}
                  hint="Overrides the platform icon."
                  variant="compact"
                  maxWidth={128}
                  maxHeight={128}
                />
              </div>
            </div>

            <label className="lnk-field">
              <span>Description (optional)</span>
              <input
                value={draft.description}
                maxLength={160}
                placeholder="Brief subtitle shown under the label"
                onChange={(e) => patch({ description: e.target.value })}
              />
            </label>

            {hasDescription ? (
              <div className="lnk-option-group">
                <span className="lnk-option-label">Description behaviour</span>
                <div className="lnk-option-row">
                  {LINK_FOLDS.map((f) => (
                    <button
                      type="button"
                      key={f.id || "always"}
                      className={`lnk-style-btn lnk-style-btn--sm${draft.fold === f.id ? " is-active" : ""}`}
                      onClick={() => patch({ fold: f.id })}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="lnk-field">
              <span>Hover tooltip (optional)</span>
              <input
                value={draft.tooltip}
                maxLength={120}
                placeholder="Shown on hover — empty uses the label"
                onChange={(e) => patch({ tooltip: e.target.value })}
              />
            </label>
          </div>

          {/* colours */}
          <div className="lnk-field-row2">
            <ColorField
              label="Custom colour"
              value={accent}
              onChange={(v) => patch({ color: v })}
              compact
            />
            <ColorField
              label="Custom glow"
              value={draft.glowColor || design.glowColor}
              onChange={(v) => patch({ glowColor: v })}
              compact
            />
          </div>
        </div>

        <footer className="asset-modal-foot">
          {!isNew ? (
            <button type="button" className="lnk-del-btn" onClick={onDelete}>
              <TrashIcon size={12} />
              Delete link
            </button>
          ) : (
            <span />
          )}
          <div className="lnk-edit-foot-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onSave(draft)}>
              {isNew ? "Add link" : "Save changes"}
              <CheckIcon size={12} />
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

/* ── page ─────────────────────────────────────────────────────────────── */

export function DashboardLinks({
  user,
  links,
  isPremium,
  onChange,
}: {
  user: Account;
  links: LinkStore;
  isPremium: boolean;
  onChange: (store: LinkStore) => void;
}) {
  const [draft, setDraftState] = useState<{ isNew: boolean; link: LinkInstance } | null>(null);
  const [showBrowseAll, setShowBrowseAll] = useState(false);
  const [browseCategory, setBrowseCategory] = useState<PlatformCategoryId>("all");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [myLinksFilter, setMyLinksFilter] = useState("");

  const design = links.design;

  const updateDesign = (patch: Partial<LinkDesign>) => {
    onChange({ ...links, design: { ...design, ...patch } });
  };

  const openAdd = (platformId: string) => {
    setDraftState({ isNew: true, link: createLink(platformId) });
  };

  const openEdit = (id: string) => {
    const found = links.links.find((l) => l.id === id);
    if (found) setDraftState({ isNew: false, link: { ...found } });
  };

  const saveDraft = (link: LinkInstance) => {
    if (!draft) return;
    if (draft.isNew) {
      onChange({ ...links, links: [...links.links, link] });
    } else {
      onChange({ ...links, links: links.links.map((l) => (l.id === link.id ? link : l)) });
    }
    setDraftState(null);
  };

  const deleteDraft = () => {
    if (!draft) return;
    onChange({ ...links, links: links.links.filter((l) => l.id !== draft.link.id) });
    setDraftState(null);
  };

  const toggleVisible = (id: string) => {
    onChange({ ...links, links: links.links.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)) });
  };

  const removeLink = (id: string) => {
    onChange({ ...links, links: links.links.filter((l) => l.id !== id) });
  };

  const moveLink = (from: number | null, to: number) => {
    if (from === null || from === to || to < 0 || to >= links.links.length) return;
    const next = [...links.links];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange({ ...links, links: next });
  };

  const filteredLinks = useMemo(() => {
    const q = myLinksFilter.trim().toLowerCase();
    if (!q) return links.links;
    return links.links.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.platform.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q),
    );
  }, [links.links, myLinksFilter]);

  return (
    <div className="lnk-page lnk-page--full">
      <div className="lnk-settings-col">
        {/* ── Add a link ──────────────────────────────────── */}
        <section className="dash-panel lnk-panel" data-reveal>
          <header className="lnk-section-head">
            <div>
              <h2>Add a link</h2>
              <p>Pick a popular platform below, or browse the full directory of {PLATFORMS.length} platforms.</p>
            </div>
          </header>

          <div className="lnk-presets">
            {QUICK_PRESETS.map((id) => {
              const p = getPlatform(id);
              if (!p) return null;
              return (
                <button
                  type="button"
                  key={id}
                  className="lnk-preset"
                  style={{ "--lnk-color": p.color } as CSSProperties}
                  onClick={() => openAdd(id)}
                >
                  <span className="lnk-preset-icon">
                    <p.Icon size={17} />
                  </span>
                  <span className="lnk-preset-name">{p.name}</span>
                </button>
              );
            })}
          </div>

          <div className="lnk-category-row">
            {CATEGORIES.filter((cat) => cat.id !== "all" && cat.id !== "popular").map((cat) => (
              <button
                type="button"
                key={cat.id}
                className="lnk-category-chip"
                onClick={() => {
                  setBrowseCategory(cat.id);
                  setShowBrowseAll(true);
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="lnk-section-foot">
            <span className="lnk-count">
              {links.links.length} link{links.links.length !== 1 ? "s" : ""} connected
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setBrowseCategory("all");
                setShowBrowseAll(true);
              }}
            >
              Browse all platforms
            </button>
          </div>
        </section>

        {/* ── Connected links ─────────────────────────────── */}
        <section className="dash-panel lnk-panel" data-reveal data-reveal-delay="40">
          <header className="lnk-section-head">
            <div>
              <h2>Connected links</h2>
              <p>Drag the grip to reorder. Click the pencil to edit everything about a link.</p>
            </div>
            {links.links.length > 3 ? (
              <span className="lnk-search">
                <SearchIcon size={12} />
                <input
                  type="search"
                  placeholder="Filter…"
                  value={myLinksFilter}
                  onChange={(e) => setMyLinksFilter(e.target.value)}
                />
              </span>
            ) : null}
          </header>

          {filteredLinks.length ? (
            <div className="lnk-list">
              {filteredLinks.map((link) => {
                const index = links.links.findIndex((l) => l.id === link.id);
                // While a link is open in the editor, the row behind it shows
                // the live draft (not yet saved) so icon/colour/label edits
                // are visible immediately instead of only after "Save".
                const displayLink = draft && !draft.isNew && draft.link.id === link.id ? draft.link : link;
                return (
                  <ConnectedLinkRow
                    key={link.id}
                    link={displayLink}
                    design={design}
                    dragging={dragIndex === index}
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      moveLink(dragIndex, index);
                      setDragIndex(null);
                    }}
                    onDragEnd={() => setDragIndex(null)}
                    onToggleVisible={() => toggleVisible(link.id)}
                    onEdit={() => openEdit(link.id)}
                    onRemove={() => removeLink(link.id)}
                  />
                );
              })}
            </div>
          ) : links.links.length ? (
            <div className="lnk-empty">No links match “{myLinksFilter}”.</div>
          ) : (
            <div className="lnk-empty">Pick a platform above to add your first link.</div>
          )}
        </section>

        {/* ── Link card style (applies to every link) ─────── */}
        <section className="dash-panel lnk-panel" data-reveal data-reveal-delay="60">
          <header className="lnk-section-head">
            <div>
              <h2>Link card style</h2>
              <p>How link cards look on your profile by default. Individual links can still show as icon-only.</p>
            </div>
          </header>

          <div className="lnk-style-grid">
            <div className="lnk-option-group">
              <span className="lnk-option-label">Quick looks</span>
              <div className="lnk-option-row">
                {LINK_PRESETS.map((preset) => {
                  const active = Object.entries(preset.patch).every(
                    ([key, value]) => design[key as keyof LinkDesign] === value,
                  );
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`lnk-style-btn${active ? " is-active" : ""}`}
                      onClick={() => updateDesign(preset.patch)}
                    >
                      <b>{preset.name}</b>
                      <small>{preset.hint}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lnk-option-group">
              <span className="lnk-option-label">Card style</span>
              <div className="lnk-option-row">
                {LINK_CARD_STYLES.map((s) => (
                  <button key={s.id} type="button"
                    className={`lnk-style-btn${design.cardStyle === s.id ? " is-active" : ""}`}
                    onClick={() => updateDesign({ cardStyle: s.id })}>
                    <b>{s.name}</b><small>{s.hint}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="lnk-option-group">
              <span className="lnk-option-label">Icon shape</span>
              <div className="lnk-option-row">
                {ICON_STYLES.map((s) => (
                  <button key={s.id} type="button"
                    className={`lnk-style-btn lnk-style-btn--sm${design.iconStyle === s.id ? " is-active" : ""}`}
                    onClick={() => updateDesign({ iconStyle: s.id })}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="lnk-toggles">
              <label className="lnk-toggle">
                <span>Show background</span>
                <button type="button" role="switch" aria-checked={design.showBackground}
                  className={`switch${design.showBackground ? " is-on" : ""}`}
                  onClick={() => updateDesign({ showBackground: !design.showBackground })}>
                  <span />
                </button>
              </label>
              <label className="lnk-toggle">
                <span>Show icons</span>
                <button type="button" role="switch" aria-checked={design.showIcon}
                  className={`switch${design.showIcon ? " is-on" : ""}`}
                  onClick={() => updateDesign({ showIcon: !design.showIcon })}>
                  <span />
                </button>
              </label>
              <label className="lnk-toggle">
                <span>Icon-only row (hide labels)</span>
                <button type="button" role="switch" aria-checked={design.iconOnly}
                  className={`switch${design.iconOnly ? " is-on" : ""}`}
                  onClick={() => updateDesign({ iconOnly: !design.iconOnly })}>
                  <span />
                </button>
              </label>
              <label className="lnk-toggle">
                <span>Glow effect for all links</span>
                <button type="button" role="switch" aria-checked={design.showGlow}
                  className={`switch${design.showGlow ? " is-on" : ""}`}
                  onClick={() => updateDesign({ showGlow: !design.showGlow })}>
                  <span />
                </button>
              </label>
            </div>

            {design.showGlow ? (
              <ColorField label="Glow colour" value={design.glowColor}
                onChange={(v) => updateDesign({ glowColor: v })} compact />
            ) : null}

            <div className="lnk-slider-row">
              <LinkSlider label="Corner radius" value={design.borderRadius} min={0} max={24} step={1} unit="px"
                onChange={(v) => updateDesign({ borderRadius: v })} />
              <LinkSlider label="Gap" value={design.gap} min={4} max={16} step={1} unit="px"
                onChange={(v) => updateDesign({ gap: v })} />
            </div>

            <div className="lnk-slider-row">
              <LinkSlider
                label="Background opacity"
                value={Math.round(design.backgroundOpacity * 100)}
                min={0}
                max={60}
                step={1}
                unit="%"
                onChange={(v) => updateDesign({ backgroundOpacity: v / 100 })}
              />
              <LinkSlider
                label="Background blur"
                value={design.backgroundBlur}
                min={0}
                max={24}
                step={1}
                unit="px"
                onChange={(v) => updateDesign({ backgroundBlur: v })}
              />
            </div>

            <div className="lnk-option-group">
              <span className="lnk-option-label">Tooltip style</span>
              <div className="lnk-option-row">
                {TOOLTIP_STYLES.map((s) => (
                  <button key={s.id} type="button"
                    className={`lnk-style-btn lnk-style-btn--sm${design.tooltipStyle === s.id ? " is-active" : ""}`}
                    onClick={() => updateDesign({ tooltipStyle: s.id })}>
                    {s.name}
                  </button>
                ))}
              </div>
              <label className="lnk-toggle" style={{ marginTop: 8 }}>
                <span>Enable tooltips</span>
                <button type="button" role="switch" aria-checked={design.tooltipEnabled}
                  className={`switch${design.tooltipEnabled ? " is-on" : ""}`}
                  onClick={() => updateDesign({ tooltipEnabled: !design.tooltipEnabled })}>
                  <span />
                </button>
              </label>
            </div>
          </div>
        </section>
      </div>

      {showBrowseAll ? (
        <BrowseAllModal
          initialCategory={browseCategory}
          onClose={() => setShowBrowseAll(false)}
          onPick={(id) => {
            setShowBrowseAll(false);
            openAdd(id);
          }}
        />
      ) : null}

      {draft ? (
        <LinkEditorModal
          isNew={draft.isNew}
          initial={draft.link}
          design={design}
          onCancel={() => setDraftState(null)}
          onSave={saveDraft}
          onDelete={deleteDraft}
        />
      ) : null}
    </div>
  );
}
