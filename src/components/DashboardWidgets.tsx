import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Account } from "../lib/auth";
import {
  DEFAULT_WIDGET_DESIGN,
  WIDGET_PLATFORM_BY_ID,
  WIDGET_PLATFORMS,
  createWidgetInstance,
  defaultWidgetOptions,
  type WidgetBackground,
  type WidgetDesign,
  type WidgetInstance,
  type WidgetPlatform,
  type WidgetStore,
} from "../lib/widgets";
import { widgetSupportsLive } from "../lib/widgetLive";
import { PlatformIcon } from "./PlatformIcons";
import { ColorField } from "./ColorPicker";
import { Select } from "./Select";
import { WidgetCard, WidgetCardPreview } from "./WidgetCard";
import {
  ArrowRight,
  CheckIcon,
  CloseIcon,
  PlusIcon,
  TrashIcon,
} from "./Icons";
import "../widgets.css";

type Modal = "catalog" | "settings" | null;

const WIDGET_BACKGROUNDS: { id: WidgetBackground; name: string; hint: string }[] = [
  { id: "frosted", name: "Frosted", hint: "Translucent glass" },
  { id: "gradient", name: "Gradient", hint: "Two colours" },
  { id: "rgb", name: "RGB", hint: "Animated wash" },
  { id: "solid", name: "Colour", hint: "One colour" },
  { id: "art", name: "Artwork", hint: "Profile image" },
];

function WidgetSlider({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const display = step < 1 ? value.toFixed(2) : value.toString();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="wg-slider">
      <span className="wg-slider-head">
        <span>{label}</span>
        <b>
          {display}
          {unit}
        </b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--slider-fill": `${fill}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function DashboardWidgets({
  user,
  store,
  onChange,
}: {
  user: Account;
  store: WidgetStore;
  onChange: (store: WidgetStore) => void;
}) {
  const [modal, setModal] = useState<Modal>(null);
  const [platform, setPlatform] = useState<WidgetPlatform | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [draftOptions, setDraftOptions] = useState<Record<string, boolean | string>>({});

  const widgetCount = store.widgets.length;

  useEffect(() => {
    if (!modal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModal(null);
        setPlatform(null);
        setEditingId(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [modal]);

  const openCatalog = () => {
    setPlatform(null);
    setEditingId(null);
    setModal("catalog");
  };

  const choosePlatform = (next: WidgetPlatform) => {
    setPlatform(next);
    setEditingId(null);
    setDraftContent("");
    setDraftOptions(defaultWidgetOptions(next));
    setModal("settings");
  };

  const editWidget = (widget: WidgetInstance) => {
    const definition = WIDGET_PLATFORM_BY_ID.get(widget.platform);
    if (!definition) return;
    setPlatform(definition);
    setEditingId(widget.id);
    setDraftContent(widget.content);
    setDraftOptions({ ...defaultWidgetOptions(definition), ...widget.options });
    setModal("settings");
  };

  const closeModal = () => {
    setModal(null);
    setPlatform(null);
    setEditingId(null);
  };

  const updateDesign = (patch: Partial<WidgetDesign>) => {
    onChange({ ...store, design: { ...store.design, ...patch } });
  };

  const resetDesign = () => {
    onChange({ ...store, design: { ...DEFAULT_WIDGET_DESIGN } });
  };

  const saveWidget = () => {
    if (!platform) return;
    const options = { ...draftOptions };
    if (editingId) {
      onChange({
        ...store,
        widgets: store.widgets.map((widget) =>
          widget.id === editingId
            ? { ...widget, content: draftContent.trim(), options }
            : widget,
        ),
      });
    } else {
      const created = createWidgetInstance(platform);
      onChange({
        ...store,
        widgets: [
          ...store.widgets,
          { ...created, content: draftContent.trim(), options },
        ],
      });
    }
    closeModal();
  };

  const removeWidget = (widget: WidgetInstance) => {
    onChange({ ...store, widgets: store.widgets.filter((item) => item.id !== widget.id) });
  };

  return (
    <div className="widgets-page">
      {/* ── Platform gallery at the top ──────────────────── */}
      <section className="dash-panel widgets-catalog-inline" data-reveal>
        <header className="widgets-catalog-head">
          <div>
            <h2>Add a widget</h2>
            <p>Pick a platform to add to your profile. Each one has its own content and display options.</p>
          </div>
          <span className="widgets-count">{widgetCount} added</span>
        </header>
        <div className="widgets-catalog-grid">
          {WIDGET_PLATFORMS.map((item) => (
            <button
              type="button"
              className="platform-card"
              key={item.id}
              onClick={() => choosePlatform(item)}
              style={{ "--platform-color": item.color } as CSSProperties}
            >
              <span className="platform-card-watermark" aria-hidden="true">
                <PlatformIcon id={item.id} size={92} />
              </span>
              <span className="platform-card-icon">
                <PlatformIcon id={item.id} size={20} />
              </span>
              <span className="platform-card-copy">
                <b>{item.name}</b>
                <span>{item.description}</span>
                <span className={`platform-card-live${widgetSupportsLive(item.id) ? " is-live" : ""}`}>
                  {widgetSupportsLive(item.id)
                    ? "Live data from the public API"
                    : `Profile card — opens your ${item.name} profile`}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="dash-panel widgets-shell" data-reveal data-reveal-delay="60">
        <div className="widgets-workspace">
          <section className="widgets-customization">
            <div className="widgets-custom-head">
              <div>
                <h2>Widget Card Customization</h2>
                <p>
                  Adjust the shared design of your profile widgets. Pick one background treatment
                  for the whole stack, then tune the colours and spacing.
                </p>
              </div>
              <div className="widgets-head-actions">
                <button type="button" className="widgets-reset" onClick={resetDesign}>
                  Reset to Defaults
                </button>
              </div>
            </div>

            <div className="widgets-controls">
              <div className="wg-backgrounds">
                <div className="wg-backgrounds-head">
                  <span>Background</span>
                  <p>
                    Artwork uses each profile's own image — a Discord banner, Roblox bodyshot or
                    Spotify cover.
                  </p>
                </div>
                <div className="wg-background-options" role="group" aria-label="Widget background style">
                  {WIDGET_BACKGROUNDS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`wg-background${
                        store.design.backgroundStyle === option.id ? " is-active" : ""
                      }`}
                      aria-pressed={store.design.backgroundStyle === option.id}
                      onClick={() => updateDesign({ backgroundStyle: option.id })}
                      title={option.hint}
                    >
                      <span className={`wg-background-swatch is-${option.id}`} aria-hidden="true" />
                      <b>{option.name}</b>
                      <small>{option.hint}</small>
                    </button>
                  ))}
                </div>
              </div>

              {store.design.backgroundStyle === "gradient" ||
              store.design.backgroundStyle === "rgb" ? (
                <div className="wg-color-grid">
                  <ColorField
                    label="Gradient from"
                    value={store.design.gradientFrom}
                    onChange={(value) => updateDesign({ gradientFrom: value })}
                    compact
                  />
                  <ColorField
                    label="Gradient to"
                    value={store.design.gradientTo}
                    onChange={(value) => updateDesign({ gradientTo: value })}
                    compact
                  />
                </div>
              ) : null}

              <div className="wg-slider-grid">
                <WidgetSlider
                  label="Border Width"
                  value={store.design.borderWidth}
                  min={0}
                  max={8}
                  step={1}
                  unit="px"
                  onChange={(value) => updateDesign({ borderWidth: value })}
                />
                <WidgetSlider
                  label="Border Opacity"
                  value={store.design.borderOpacity}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(value) => updateDesign({ borderOpacity: value })}
                />
                <WidgetSlider
                  label="Background Opacity"
                  value={store.design.backgroundOpacity}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(value) => updateDesign({ backgroundOpacity: value })}
                />
                <WidgetSlider
                  label="Background Blur"
                  value={store.design.backgroundBlur}
                  min={0}
                  max={30}
                  step={1}
                  unit="px"
                  onChange={(value) => updateDesign({ backgroundBlur: value })}
                />
                <WidgetSlider
                  label="Corner Radius"
                  value={store.design.radius}
                  min={0}
                  max={28}
                  step={1}
                  unit="px"
                  onChange={(value) => updateDesign({ radius: value })}
                />
              </div>

              <div className="wg-color-grid">
                <ColorField
                  label="Border Color"
                  value={store.design.borderColor}
                  onChange={(value) => updateDesign({ borderColor: value })}
                  compact
                />
                <ColorField
                  label="Background Color"
                  value={store.design.backgroundColor}
                  onChange={(value) => updateDesign({ backgroundColor: value })}
                  compact
                />
              </div>
            </div>
          </section>

          <aside className="widgets-side" aria-label="Your widgets">
            <div className="widgets-side-head">
              <div>
                <h2>Your widgets</h2>
                <p>tourn.lol/{user.username}</p>
              </div>
              <span className="widgets-count">{widgetCount}</span>
            </div>

            {widgetCount ? (
              <div className="widgets-scroll">
                {store.widgets.map((widget) => (
                  <WidgetCard
                    key={widget.id}
                    widget={widget}
                    design={store.design}
                    onConfigure={editWidget}
                    onRemove={removeWidget}
                  />
                ))}
              </div>
            ) : (
              <div className="widgets-empty">
                <span className="widgets-empty-icon">
                  <PlusIcon size={18} />
                </span>
                <b>No widgets yet</b>
                <p>Pick a platform from the gallery above.</p>
              </div>
            )}

            <div className="widgets-preview-box">
              <span className="widgets-preview-label">Preview</span>
              <WidgetCardPreview design={store.design} username={user.username} />
            </div>
          </aside>
        </div>
      </section>

      {modal ? (
        createPortal(
          <div
            className="widgets-modal-layer"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            {modal === "catalog" ? (
              <section className="widgets-modal widgets-modal--wide" role="dialog" aria-modal="true" aria-labelledby="widget-catalog-title">
                <header className="widgets-modal-head">
                  <div>
                    <h2 id="widget-catalog-title">Add a widget</h2>
                    <p>Choose a platform. Each one has its own content and display options.</p>
                  </div>
                  <button type="button" className="icon-btn" onClick={closeModal} aria-label="Close widget catalog">
                    <CloseIcon size={16} />
                  </button>
                </header>
                <div className="widgets-modal-body">
                  <div className="platform-grid">
                    {WIDGET_PLATFORMS.map((item) => (
                      <button
                        type="button"
                        className="platform-card"
                        key={item.id}
                        onClick={() => choosePlatform(item)}
                        style={{ "--platform-color": item.color } as CSSProperties}
                      >
                        <span className="platform-card-watermark" aria-hidden="true">
                          <PlatformIcon id={item.id} size={92} />
                        </span>
                        <span className="platform-card-icon">
                          <PlatformIcon id={item.id} size={20} />
                        </span>
                        <span className="platform-card-copy">
                          <b>{item.name}</b>
                          <span>{item.description}</span>
                          <span className={`platform-card-live${widgetSupportsLive(item.id) ? " is-live" : ""}`}>
                            {widgetSupportsLive(item.id)
                              ? "Live data from the public API"
                              : `Profile card — opens your ${item.name} profile`}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            ) : platform ? (
              <section className="widgets-modal" role="dialog" aria-modal="true" aria-labelledby="widget-settings-title">
                <header className="widgets-modal-head">
                  <div className="widgets-platform-title">
                    <span className="platform-card-icon" style={{ "--platform-color": platform.color } as CSSProperties}>
                      <PlatformIcon id={platform.id} size={19} />
                    </span>
                    <div>
                      <h2 id="widget-settings-title">
                        {editingId ? "Edit" : "Add"} {platform.name} Profile
                      </h2>
                    </div>
                  </div>
                  <button type="button" className="icon-btn" onClick={closeModal} aria-label="Close widget settings">
                    <CloseIcon size={16} />
                  </button>
                </header>

                <div className="widgets-modal-body">
                  <div className="widget-tip">
                    <span>Did you know?</span>
                    <p>{platform.didYouKnow}</p>
                  </div>

                  <label className="about-field widgets-content-field">
                    <span>Content</span>
                    <input
                      value={draftContent}
                      onChange={(event) => setDraftContent(event.target.value)}
                      placeholder={platform.contentPlaceholder}
                      aria-label={platform.contentLabel}
                      spellCheck={false}
                    />
                  </label>

                  <div className="widget-options">
                    <div className="widget-options-head">
                      <span>Options</span>
                    </div>

                    {platform.options.map((option) => (
                      <div className="widget-option" key={option.key}>
                        <div>
                          <b>{option.label}</b>
                          <p>{option.hint}</p>
                        </div>

                        {option.type === "toggle" ? (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={draftOptions[option.key] === true}
                            aria-label={option.label}
                            className={`switch${draftOptions[option.key] === true ? " is-on" : ""}`}
                            onClick={() =>
                              setDraftOptions((current) => ({
                                ...current,
                                [option.key]: current[option.key] !== true,
                              }))
                            }
                          >
                            <span />
                          </button>
                        ) : (
                          <Select
                            className="widget-option-select"
                            ariaLabel={option.label}
                            value={String(draftOptions[option.key] ?? option.default)}
                            options={(option.choices ?? []).map((choice) => ({
                              value: choice.value,
                              label: choice.label,
                            }))}
                            onChange={(value) =>
                              setDraftOptions((current) => ({ ...current, [option.key]: value }))
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <footer className="widgets-modal-foot">
                  {!editingId ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setModal("catalog");
                        setPlatform(null);
                      }}
                    >
                      Back
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="widgets-delete-widget"
                      onClick={() => {
                        const target = store.widgets.find((widget) => widget.id === editingId);
                        if (target) removeWidget(target);
                        closeModal();
                      }}
                    >
                      <TrashIcon size={12} />
                      Remove widget
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!draftContent.trim()}
                    onClick={saveWidget}
                  >
                    {editingId ? "Save widget" : "Add widget"}
                    <CheckIcon size={12} />
                  </button>
                </footer>
              </section>
            ) : null}
          </div>,
          document.body,
        )
      ) : null}
    </div>
  );
}
