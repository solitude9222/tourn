import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Account } from "../lib/auth";
import type { About } from "../lib/about";
import {
  AUDIO_STYLES,
  BACKGROUND_EFFECTS,
  CARD_EFFECTS,
  DEFAULT_PROFILE_ASSETS,
  OVERLAY_EFFECTS,
  TEXT_EFFECTS,
  TEXT_TARGETS,
  BACKGROUND_EFFECT_PARAM,
  OVERLAY_EFFECT_PARAM,
  TEXT_EFFECT_PARAM,
  defaultParamsFor,
  type AudioSettings,
  type AudioStyle,
  type BackgroundEffectSettings,
  type BackgroundSettings,
  type BannerSettings,
  type CardEffectSettings,
  type CursorSettings,
  type DecorationSettings,
  type EffectParamSpec,
  type EffectParams,
  type OverlayEffectSettings,
  type ProfileAssets,
  type TextEffectSettings,
  type TextEffectTarget,
} from "../lib/profileAssets";
import type { WidgetStore } from "../lib/widgets";
import { ColorField } from "./ColorPicker";
import { ImageUpload } from "./ImageUpload";
import { EffectText, BackgroundEffectLayer, OverlayEffectLayer } from "./ProfileEffects";
import { FontPicker } from "./FontPicker";
import { AudioPlayer } from "./AudioPlayer";
import { audioFileToDataUrl } from "../lib/audioUpload";
import { BoltIcon, CheckIcon, CloseIcon, EyeIcon, ImageIcon, PaletteIcon, SlidersIcon, SpotifyIcon, TrashIcon } from "./Icons";
import "../assets.css";
import "../about.css";

import DISCORD_DECORATIONS from "../lib/decorations.json";

type DiscordDecoration = { id: string; label: string; url: string };
const DECO_CATALOGUE: DiscordDecoration[] = (DISCORD_DECORATIONS as DiscordDecoration[]).filter(
  (d) => d && d.url && d.label,
);

function DecorationPicker({
  open,
  onClose,
  value,
  onChange,
  avatarUrl,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (url: string) => void;
  avatarUrl: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hue, setHue] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [draft, setDraft] = useState(value);
  const searchRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 30;

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
      setDraft(value);
      setPage(0);
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? DECO_CATALOGUE.filter((d) => d.label.toLowerCase().includes(q)) : DECO_CATALOGUE),
    [q],
  );
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = matches.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [q]);

  if (!open) return null;

  const confirm = () => {
    onChange(draft);
    onClose();
  };

  return createPortal(
    <div
      className="asset-modal-layer"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="asset-modal deco-modal" role="dialog" aria-modal="true" aria-labelledby="deco-title">
        <header className="asset-modal-head">
          <div>
            <span className="asset-kicker">Decorations</span>
            <h2 id="deco-title">Choose a decoration</h2>
            <p>{DECO_CATALOGUE.length} curated Discord avatar decoration presets.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon size={15} />
          </button>
        </header>

        <div className="deco-body">
          {/* ── Left: grid ─────────────────────────────────────── */}
          <div className="deco-left">
            <div className="deco-search-bar">
              <input
                ref={searchRef}
                type="search"
                placeholder="Search decorations…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <span className="deco-search-count">{matches.length} results</span>
            </div>

            <div className="deco-grid-scroll">
              <div className="deco-grid">
                {pageItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`deco-tile${draft === item.url ? " is-active" : ""}`}
                    title={item.label}
                    onClick={() => setDraft(item.url)}
                  >
                    <span className="deco-tile-avatar">
                      {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>U</span>}
                    </span>
                    <img className="deco-tile-overlay" src={item.url.replace(/size=\d+/, "size=160")} alt={item.label} loading="lazy" />
                    {draft === item.url ? (
                      <span className="deco-tile-check">
                        <CheckIcon size={9} />
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="deco-pagination">
              <button
                type="button"
                className="deco-page-btn"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-label="Previous page"
              >
                ‹
              </button>
              <span className="deco-page-label">{safePage + 1} / {totalPages}</span>
              <button
                type="button"
                className="deco-page-btn"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>

          {/* ── Right: preview ─────────────────────────────────── */}
          <div className="deco-right">
            <span className="deco-preview-label">Preview</span>
            <div className="deco-preview-stage">
              <span className="deco-preview-avatar">
                {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>U</span>}
              </span>
              {draft ? (
                <img
                  className="deco-preview-overlay"
                  src={draft}
                  alt=""
                  style={{
                    filter: hue ? `hue-rotate(${hue}deg)` : undefined,
                    animationDuration: `${Math.max(0.2, speed)}s`,
                  }}
                />
              ) : null}
            </div>
            <span className="deco-preview-name">
              {DECO_CATALOGUE.find((d) => d.url === draft)?.label ?? "No decoration"}
            </span>

            <div className="deco-sliders">
              <label className="deco-slider">
                <span className="deco-slider-head">
                  <span>Hue shift</span>
                  <b>{hue}°</b>
                </span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={hue}
                  className="deco-hue-range"
                  onChange={(e) => setHue(Number(e.target.value))}
                />
              </label>
              <label className="deco-slider">
                <span className="deco-slider-head">
                  <span>Animation speed</span>
                  <b>{speed.toFixed(1)}×</b>
                </span>
                <input
                  type="range"
                  min={0.2}
                  max={3}
                  step={0.1}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                />
              </label>
            </div>
          </div>
        </div>

        <footer className="asset-modal-foot">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setDraft(""); setHue(0); }}
          >
            Clear
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={confirm}>
            Confirm
            <CheckIcon size={12} />
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

type AssetModal = "effects" | "fonts" | "audio" | null;
type EffectsTab = "background" | "overlay" | "text" | "card";

const EFFECTS_TABS: { id: EffectsTab; name: string }[] = [
  { id: "background", name: "Background" },
  { id: "overlay", name: "Overlay" },
  { id: "text", name: "Text" },
  { id: "card", name: "Card" },
];

function AssetSlider({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const display = format ? format(value) : step < 1 ? value.toFixed(2) : value.toString();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="asset-slider">
      <span className="asset-slider-head">
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

function AssetToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="asset-toggle-row">
      <div>
        <b>{label}</b>
        <p>{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`switch${checked ? " is-on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

/** Renders the one extra control a given effect's schema asks for — a
 *  slider or a toggle — so every effect gets a genuinely different setting
 *  instead of all of them sharing the same four generic knobs. */
function EffectParamControl({
  spec,
  params,
  onChange,
}: {
  spec: EffectParamSpec | null;
  params: EffectParams;
  onChange: (params: EffectParams) => void;
}) {
  if (!spec) return null;

  if (spec.kind === "slider") {
    return (
      <AssetSlider
        label={spec.label}
        value={params.amount}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        unit={spec.unit ?? ""}
        onChange={(value) => onChange({ ...params, amount: value })}
      />
    );
  }

  return (
    <AssetToggle
      label={spec.label}
      hint="This effect's own extra control."
      checked={params.flag}
      onChange={(checked) => onChange({ ...params, flag: checked })}
    />
  );
}

function EffectPreviewCard({ user, about }: { user: Account; about: About }) {
  const assets = about.assets ?? DEFAULT_PROFILE_ASSETS;
  const avatar = assets.avatarUrl.trim() || user.avatarUrl || "";
  const name = about.displayName.trim() || user.username;
  const bio =
    about.bio
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/\{\{.*?\}\}/g, " ")
      .replace(/\{.*?\}/g, " ")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/[#*_~`>=]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 110) || "A short bio, a few widgets and every link in one place.";

  return (
    <div className="asset-effect-card">
      <div className="asset-effect-card-head">
        <span className="asset-effect-avatar">
          {avatar ? <img src={avatar} alt="" /> : name.slice(0, 1).toUpperCase()}
        </span>
        <span className="asset-effect-card-id">
          <b>{name}</b>
          <small>@{user.username}</small>
        </span>
        <span className="asset-effect-live">
          <i /> live
        </span>
      </div>
      <p>{bio}</p>
      <span className="asset-effect-widget">
        <i />
        Now playing · tourn.lol
      </span>
    </div>
  );
}

function AssetAvatar({
  avatar,
  assets,
  user,
}: {
  avatar: string;
  assets: ProfileAssets;
  user: Account;
}) {
  const decoration = assets.decoration;
  return (
    <span
      className="pv-avatar-wrap asset-avatar"
      style={
        {
          "--pv-zoom": decoration.zoom ?? 1,
          "--pv-rotate": `${decoration.rotate ?? 0}deg`,
        } as CSSProperties
      }
    >
      <span className="pv-avatar" style={{ "--pv-avatar": "78px" } as CSSProperties}>
        {avatar ? <img src={avatar} alt="" /> : <span>{user.username.slice(0, 1).toUpperCase()}</span>}
      </span>
      {decoration.discordUrl ? (
        <img className="pv-avatar-decoration" src={decoration.discordUrl} alt="" aria-hidden="true" />
      ) : null}
    </span>
  );
}

/** A small, distinct mockup per audio style so the picker shows what each
 *  one actually looks like instead of repeating the same Spotify logo. */
function AudioStyleThumb({ style }: { style: AudioStyle }) {
  if (style === "none") return <span className="effect-none-label">None</span>;
  if (style === "marquee") {
    return (
      <span className="audio-thumb audio-thumb--marquee" aria-hidden="true">
        <i />
        <b />
        <i />
      </span>
    );
  }
  if (style === "lyrics") {
    return (
      <span className="audio-thumb audio-thumb--lyrics" aria-hidden="true">
        <i />
        <b />
        <i />
      </span>
    );
  }
  if (style === "vinyl") {
    return (
      <span className="audio-thumb audio-thumb--vinyl" aria-hidden="true">
        <span className="audio-thumb-disc" />
      </span>
    );
  }
  return (
    <span className="audio-thumb audio-thumb--compact" aria-hidden="true">
      <span className="audio-thumb-cover" />
      <span className="audio-thumb-lines">
        <b />
        <i />
      </span>
      <span className="audio-thumb-dot" />
    </span>
  );
}

export function DashboardAssets({
  user,
  about,
  widgets,
  isPremium,
  onChange,
}: {
  user: Account;
  about: About;
  widgets: WidgetStore;
  isPremium: boolean;
  onChange: (about: About) => void;
}) {
  const assets = about.assets ?? DEFAULT_PROFILE_ASSETS;
  const [modal, setModal] = useState<AssetModal>(null);
  const [effectsTab, setEffectsTab] = useState<EffectsTab>("background");
  const [textTarget, setTextTarget] = useState<TextEffectTarget>("name");
  const [decoOpen, setDecoOpen] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState("");

  useEffect(() => {
    if (!modal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [modal]);

  const updateAssets = (patch: Partial<ProfileAssets>) => {
    onChange({ ...about, assets: { ...assets, ...patch } });
  };

  const updateDecoration = (patch: Partial<DecorationSettings>) => {
    updateAssets({ decoration: { ...assets.decoration, ...patch } });
  };

  const updateCursor = (patch: Partial<CursorSettings>) => {
    updateAssets({ cursor: { ...assets.cursor, ...patch } });
  };

  const updateBackground = (patch: Partial<BackgroundSettings>) => {
    updateAssets({ background: { ...assets.background, ...patch } });
  };

  const updateBanner = (patch: Partial<BannerSettings>) => {
    updateAssets({ banner: { ...assets.banner, ...patch } });
  };

  const updateCardEffect = (patch: Partial<CardEffectSettings>) => {
    updateAssets({ card: { ...assets.card, ...patch } });
  };

  const updateAudio = (patch: Partial<AudioSettings>) => {
    updateAssets({ audio: { ...assets.audio, ...patch } });
  };

  const handleAudioUpload = async (file: File | undefined) => {
    if (!file) return;
    setAudioBusy(true);
    setAudioError("");
    try {
      const dataUrl = await audioFileToDataUrl(file);
      updateAudio({ fileUrl: dataUrl });
    } catch (cause) {
      setAudioError(cause instanceof Error ? cause.message : "That file could not be uploaded.");
    } finally {
      setAudioBusy(false);
    }
  };

  const handleLyricsUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      updateAudio({ lyrics: text.slice(0, 40_000) });
    } catch {
      setAudioError("That lyrics file could not be read.");
    }
  };

  const updateBackgroundEffect = (patch: Partial<BackgroundEffectSettings>) => {
    updateAssets({
      effects: { ...assets.effects, background: { ...assets.effects.background, ...patch } },
    });
  };

  const updateOverlay = (patch: Partial<OverlayEffectSettings>) => {
    updateAssets({
      effects: { ...assets.effects, overlay: { ...assets.effects.overlay, ...patch } },
    });
  };

  const updateText = (target: TextEffectTarget, patch: Partial<TextEffectSettings>) => {
    updateAssets({
      effects: {
        ...assets.effects,
        text: { ...assets.effects.text, [target]: { ...assets.effects.text[target], ...patch } },
      },
    });
  };

  const avatar = assets.avatarUrl.trim() || user.avatarUrl || "";
  const cursorImage = assets.cursor.imageUrl.trim();
  const customCursor = cursorImage
    ? `url("${cursorImage.replace(/"/g, '\\"')}") 4 4, auto`
    : undefined;
  const background = assets.background;
  const banner = assets.banner;
  const bgStyle = {
    "--pv-accent": about.design.colors.accent,
    "--pv-bg": about.design.colors.background,
    "--lkr-bg-color": background.color,
    "--lkr-bg-from": background.from,
    "--lkr-bg-to": background.to,
    "--lkr-bg-blur": `${background.blur}px`,
    "--lkr-bg-dim": background.dim,
  } as CSSProperties;

  const backgroundEffect = assets.effects.background;
  const overlayEffect = assets.effects.overlay;
  const cardEffect = assets.card;
  const cardFxStyle = {
    "--pv-card-fx-color": cardEffect.color,
    "--pv-card-fx-strength": cardEffect.intensity / 100,
    "--pv-card-fx-speed": `${Math.max(1.5, cardEffect.speed)}s`,
    "--pv-accent": about.design.colors.accent,
    "--pv-text": about.design.colors.text,
  } as CSSProperties;
  const textSettings = assets.effects.text[textTarget];
  const textSample =
    textTarget === "alias"
      ? `@${user.username}`
      : textTarget === "bio"
        ? about.bio.trim().slice(0, 80) || "Your bio goes here"
        : about.displayName.trim() || user.username;

  const effectModal = modal
    ? createPortal(
        <div
          className="asset-modal-layer"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          {modal === "effects" ? (
            <section className="asset-modal" role="dialog" aria-modal="true" aria-labelledby="asset-effects-title">
              <header className="asset-modal-head">
                <div>
                  <span className="asset-kicker">Effects</span>
                  <h2 id="asset-effects-title">Motion, texture and type</h2>
                  <p>Background, overlay, text and card effects, all in one place. Switch tabs without losing your preview.</p>
                </div>
                <button type="button" className="icon-btn" onClick={() => setModal(null)} aria-label="Close">
                  <CloseIcon size={15} />
                </button>
              </header>

              <div className="asset-text-tabs" role="tablist" aria-label="Effect category">
                {EFFECTS_TABS.map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    role="tab"
                    aria-selected={effectsTab === tab.id}
                    className={`asset-text-tab${effectsTab === tab.id ? " is-active" : ""}`}
                    onClick={() => setEffectsTab(tab.id)}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>

              {effectsTab === "background" ? (
                <>
                  <div className="asset-modal-preview asset-modal-preview--effects" style={bgStyle}>
                    <BackgroundEffectLayer settings={backgroundEffect} />
                    <EffectPreviewCard user={user} about={about} />
                  </div>

                  <div className="asset-modal-body">
                    <div className="effect-choice-grid">
                      {BACKGROUND_EFFECTS.map((effect) => (
                        <button
                          type="button"
                          key={effect.id}
                          className={`effect-choice${backgroundEffect.id === effect.id ? " is-active" : ""}`}
                          aria-pressed={backgroundEffect.id === effect.id}
                          onClick={() =>
                            updateBackgroundEffect({ id: effect.id, params: defaultParamsFor(BACKGROUND_EFFECT_PARAM[effect.id]) })
                          }
                        >
                          <span className="effect-choice-preview">
                            {effect.id === "none" ? (
                              <span className="effect-none-label">None</span>
                            ) : (
                              <span className={`effect-thumb effect-thumb--${effect.id}`} aria-hidden="true" />
                            )}
                          </span>
                          <span className="effect-choice-copy">
                            <b>{effect.name}</b>
                            <small>{effect.hint}</small>
                          </span>
                          {backgroundEffect.id === effect.id ? <CheckIcon size={11} /> : null}
                        </button>
                      ))}
                    </div>

                    <div className="effect-settings">
                      <div className="effect-settings-head">
                        <span className="asset-kicker">Settings</span>
                        <h3>{BACKGROUND_EFFECTS.find((effect) => effect.id === backgroundEffect.id)?.name}</h3>
                      </div>
                      <EffectParamControl
                        spec={BACKGROUND_EFFECT_PARAM[backgroundEffect.id]}
                        params={backgroundEffect.params}
                        onChange={(params) => updateBackgroundEffect({ params })}
                      />
                      <AssetSlider
                        label="Intensity"
                        value={backgroundEffect.intensity}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(value) => updateBackgroundEffect({ intensity: value })}
                      />
                      <AssetSlider
                        label="Speed"
                        value={backgroundEffect.speed}
                        min={2}
                        max={24}
                        step={1}
                        unit="s"
                        onChange={(value) => updateBackgroundEffect({ speed: value })}
                      />
                      <ColorField
                        label="Effect colour"
                        value={backgroundEffect.color}
                        onChange={(value) => updateBackgroundEffect({ color: value })}
                        compact
                      />
                    </div>
                  </div>
                </>
              ) : effectsTab === "overlay" ? (
                <>
                  <div className="asset-modal-preview asset-modal-preview--overlay" style={bgStyle}>
                    <EffectPreviewCard user={user} about={about} />
                    <OverlayEffectLayer settings={overlayEffect} />
                  </div>

                  <div className="asset-modal-body">
                    <div className="effect-choice-grid">
                      {OVERLAY_EFFECTS.map((effect) => (
                        <button
                          type="button"
                          key={effect.id}
                          className={`effect-choice${overlayEffect.id === effect.id ? " is-active" : ""}`}
                          aria-pressed={overlayEffect.id === effect.id}
                          onClick={() =>
                            updateOverlay({ id: effect.id, params: defaultParamsFor(OVERLAY_EFFECT_PARAM[effect.id]) })
                          }
                        >
                          <span className="effect-choice-preview effect-choice-preview--overlay">
                            <span className="effect-choice-aa">Aa</span>
                            {effect.id !== "none" ? (
                              <span className={`effect-thumb effect-thumb--${effect.id}`} aria-hidden="true" />
                            ) : null}
                          </span>
                          <span className="effect-choice-copy">
                            <b>{effect.name}</b>
                            <small>{effect.hint}</small>
                          </span>
                          {overlayEffect.id === effect.id ? <CheckIcon size={11} /> : null}
                        </button>
                      ))}
                    </div>

                    <div className="effect-settings">
                      <div className="effect-settings-head">
                        <span className="asset-kicker">Settings</span>
                        <h3>{OVERLAY_EFFECTS.find((effect) => effect.id === overlayEffect.id)?.name}</h3>
                      </div>
                      <EffectParamControl
                        spec={OVERLAY_EFFECT_PARAM[overlayEffect.id]}
                        params={overlayEffect.params}
                        onChange={(params) => updateOverlay({ params })}
                      />
                      <AssetSlider
                        label="Layer opacity"
                        value={overlayEffect.opacity}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(value) => updateOverlay({ opacity: value })}
                      />
                      <AssetSlider
                        label="Intensity"
                        value={overlayEffect.intensity}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(value) => updateOverlay({ intensity: value })}
                      />
                      <AssetSlider
                        label="Speed"
                        value={overlayEffect.speed}
                        min={2}
                        max={24}
                        step={1}
                        unit="s"
                        onChange={(value) => updateOverlay({ speed: value })}
                      />
                      <ColorField
                        label="Effect colour"
                        value={overlayEffect.color}
                        onChange={(value) => updateOverlay({ color: value })}
                        compact
                      />
                    </div>
                  </div>
                </>
              ) : effectsTab === "card" ? (
                <>
                  <div className="asset-modal-preview asset-modal-preview--effects" style={bgStyle}>
                    <span className="asset-card-fx-stage" style={cardFxStyle}>
                      <EffectPreviewCard user={user} about={about} />
                      <span className={`pv-card-fx pv-card-fx--${cardEffect.id}`} aria-hidden="true" />
                    </span>
                  </div>

                  <div className="asset-modal-body">
                    <div className="effect-choice-grid effect-choice-grid--text">
                      {CARD_EFFECTS.map((effect) => (
                        <button
                          type="button"
                          key={effect.id}
                          className={`effect-choice${cardEffect.id === effect.id ? " is-active" : ""}`}
                          aria-pressed={cardEffect.id === effect.id}
                          onClick={() => updateCardEffect({ id: effect.id })}
                        >
                          <span className="effect-choice-preview">
                            {effect.id === "none" ? (
                              <span className="effect-none-label">None</span>
                            ) : (
                              <span
                                className={`card-fx-thumb card-fx-thumb--${effect.id}`}
                                style={cardFxStyle}
                                aria-hidden="true"
                              />
                            )}
                          </span>
                          <span className="effect-choice-copy">
                            <b>{effect.name}</b>
                            <small>{effect.hint}</small>
                          </span>
                          {cardEffect.id === effect.id ? <CheckIcon size={11} /> : null}
                        </button>
                      ))}
                    </div>

                    <div className="effect-settings">
                      <div className="effect-settings-head">
                        <span className="asset-kicker">Settings</span>
                        <h3>{CARD_EFFECTS.find((effect) => effect.id === cardEffect.id)?.name}</h3>
                      </div>
                      <ColorField
                        label="Light colour"
                        value={cardEffect.color}
                        onChange={(value) => updateCardEffect({ color: value })}
                        compact
                      />
                      <AssetSlider
                        label="Intensity"
                        value={cardEffect.intensity}
                        min={0}
                        max={100}
                        step={1}
                        unit="%"
                        onChange={(value) => updateCardEffect({ intensity: value })}
                      />
                      <AssetSlider
                        label="Speed"
                        value={cardEffect.speed}
                        min={1.5}
                        max={20}
                        step={0.5}
                        unit="s"
                        onChange={(value) => updateCardEffect({ speed: value })}
                      />
                      <p className="asset-hint">
                        Light-only treatments for the card surface — no scanlines, glitch or fake HUD overlays.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="asset-text-tabs asset-text-tabs--sub" role="tablist" aria-label="Text effect target">
                    {TEXT_TARGETS.map((target) => (
                      <button
                        type="button"
                        key={target.id}
                        role="tab"
                        aria-selected={textTarget === target.id}
                        className={`asset-text-tab asset-text-tab--sub${textTarget === target.id ? " is-active" : ""}`}
                        onClick={() => setTextTarget(target.id)}
                      >
                        {target.name}
                      </button>
                    ))}
                  </div>

                  <div className="asset-modal-preview asset-modal-preview--text" style={bgStyle}>
                    <span className="asset-text-preview">
                      <EffectText text={textSample} settings={textSettings} />
                    </span>
                    <span className="asset-preview-sub">
                      {TEXT_TARGETS.find((target) => target.id === textTarget)?.name} preview
                    </span>
                  </div>

                  <div className="asset-modal-body">
                    <div className="effect-choice-grid effect-choice-grid--text">
                      {TEXT_EFFECTS.map((effect) => (
                        <button
                          type="button"
                          key={effect.id}
                          className={`effect-choice${textSettings.effect === effect.id ? " is-active" : ""}`}
                          aria-pressed={textSettings.effect === effect.id}
                          onClick={() =>
                            updateText(textTarget, { effect: effect.id, params: defaultParamsFor(TEXT_EFFECT_PARAM[effect.id]) })
                          }
                        >
                          <span className="effect-choice-preview effect-choice-preview--text">
                            <EffectText text="Aa" settings={{ ...textSettings, effect: effect.id }} />
                          </span>
                          <span className="effect-choice-copy">
                            <b>{effect.name}</b>
                            <small>{effect.hint}</small>
                          </span>
                          {textSettings.effect === effect.id ? <CheckIcon size={11} /> : null}
                        </button>
                      ))}
                    </div>

                    <div className="effect-settings">
                      <div className="effect-settings-head">
                        <span className="asset-kicker">Settings</span>
                        <h3>{TEXT_EFFECTS.find((effect) => effect.id === textSettings.effect)?.name}</h3>
                      </div>
                      <FontPicker
                        label="Font"
                        value={textSettings.font}
                        onChange={(family) => updateText(textTarget, { font: family })}
                      />
                      <ColorField
                        label="Colour A"
                        value={textSettings.colorA}
                        onChange={(value) => updateText(textTarget, { colorA: value })}
                        compact
                      />
                      <ColorField
                        label="Colour B"
                        value={textSettings.colorB}
                        onChange={(value) => updateText(textTarget, { colorB: value })}
                        compact
                      />
                      <AssetSlider
                        label="Speed"
                        value={textSettings.speed}
                        min={0.5}
                        max={12}
                        step={0.5}
                        unit="s"
                        onChange={(value) => updateText(textTarget, { speed: value })}
                      />
                      <AssetSlider
                        label="Strength"
                        value={textSettings.strength}
                        min={0.2}
                        max={3}
                        step={0.1}
                        onChange={(value) => updateText(textTarget, { strength: value })}
                      />
                      <EffectParamControl
                        spec={TEXT_EFFECT_PARAM[textSettings.effect]}
                        params={textSettings.params}
                        onChange={(params) => updateText(textTarget, { params })}
                      />
                    </div>
                  </div>
                </>
              )}

              <footer className="asset-modal-foot">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal(null)}>
                  Done
                  <CheckIcon size={12} />
                </button>
              </footer>
            </section>
          ) : modal === "fonts" ? (
            <section className="asset-modal font-modal" role="dialog" aria-modal="true" aria-labelledby="asset-font-title">
              <header className="asset-modal-head">
                <div>
                  <span className="asset-kicker">Fonts</span>
                  <h2 id="asset-font-title">Pick a typeface</h2>
                  <p>Alias, display name and bio can each use a different font, across six style categories.</p>
                </div>
                <button type="button" className="icon-btn" onClick={() => setModal(null)} aria-label="Close">
                  <CloseIcon size={15} />
                </button>
              </header>

              <div className="asset-text-tabs" role="tablist" aria-label="Font target">
                {TEXT_TARGETS.map((target) => (
                  <button
                    type="button"
                    key={target.id}
                    role="tab"
                    aria-selected={textTarget === target.id}
                    className={`asset-text-tab${textTarget === target.id ? " is-active" : ""}`}
                    onClick={() => setTextTarget(target.id)}
                  >
                    {target.name}
                  </button>
                ))}
              </div>

              <div className="asset-modal-preview asset-modal-preview--text" style={bgStyle}>
                <span className="asset-text-preview" style={{ fontFamily: textSettings.font || undefined }}>
                  {textSample}
                </span>
                <span className="asset-preview-sub">
                  {TEXT_TARGETS.find((target) => target.id === textTarget)?.name} · {textSettings.font || "Theme font"}
                </span>
              </div>

              <div className="font-modal-body">
                <FontPicker
                  label={`Font for ${TEXT_TARGETS.find((target) => target.id === textTarget)?.name.toLowerCase()}`}
                  value={textSettings.font}
                  onChange={(family) => updateText(textTarget, { font: family })}
                />
                <p className="font-modal-hint">
                  This only changes the typeface. Colour, glow and motion still come from Text effects.
                </p>
              </div>

              <footer className="asset-modal-foot">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal(null)}>
                  Done
                  <CheckIcon size={12} />
                </button>
              </footer>
            </section>
          ) : (
            <section className="asset-modal" role="dialog" aria-modal="true" aria-labelledby="asset-audio-title">
              <header className="asset-modal-head">
                <div>
                  <span className="asset-kicker">Audio player</span>
                  <h2 id="asset-audio-title">Your track, your way</h2>
                  <p>
                    Upload an MP3 (or WAV/OGG/M4A) and it plays right on your page — your cover,
                    your title, your lyrics, real transport controls. No streaming embeds.
                  </p>
                </div>
                <button type="button" className="icon-btn" onClick={() => setModal(null)} aria-label="Close">
                  <CloseIcon size={15} />
                </button>
              </header>

              <div className="asset-modal-preview asset-modal-preview--audio" style={bgStyle}>
                {assets.audio.style !== "none" && assets.audio.fileUrl ? (
                  <AudioPlayer settings={assets.audio} />
                ) : (
                  <p className="ap-preview-empty">
                    {assets.audio.style === "none"
                      ? "Audio style is set to None."
                      : "Choose an audio file below to preview it."}
                  </p>
                )}
              </div>

              <div className="asset-modal-body asset-modal-body--single">
                <div className="audio-manager-grid">
                  <div className="audio-manager-col">
                    <div className="audio-manager-box">
                      <span className="audio-manager-box-title">Audio file</span>
                      <div className="audio-upload-row">
                        <label className="audio-upload-btn">
                          <ImageIcon size={12} />
                          {audioBusy ? "Uploading…" : assets.audio.fileUrl ? "Replace file" : "Choose file"}
                          <input
                            type="file"
                            accept="audio/*"
                            style={{ display: "none" }}
                            disabled={audioBusy}
                            onChange={(event) => void handleAudioUpload(event.target.files?.[0])}
                          />
                        </label>
                        {assets.audio.fileUrl ? (
                          <>
                            <span className="audio-upload-name">Audio file attached</span>
                            <button
                              type="button"
                              className="audio-upload-remove"
                              onClick={() => updateAudio({ fileUrl: "" })}
                              aria-label="Remove audio file"
                            >
                              <TrashIcon size={12} />
                            </button>
                          </>
                        ) : (
                          <span className="audio-upload-name">MP3, WAV, OGG or M4A — under 6&nbsp;MB</span>
                        )}
                      </div>
                      {audioError ? (
                        <small className="about-help" style={{ color: "#f87171" }}>
                          {audioError}
                        </small>
                      ) : null}
                    </div>

                    <div className="audio-manager-box">
                      <span className="audio-manager-box-title">Cover art</span>
                      <ImageUpload
                        value={assets.audio.coverUrl}
                        onChange={(value) => updateAudio({ coverUrl: value })}
                        label="cover art"
                        hint="Shown in the player. Square image, compressed automatically."
                        recommended="Square image · 600 × 600 recommended"
                      />
                    </div>
                  </div>

                  <div className="audio-manager-col">
                    <div className="audio-manager-box">
                      <span className="audio-manager-box-title">Track info</span>
                      <div className="lnk-field-row2">
                        <label className="lnk-field">
                          <span>Title</span>
                          <input
                            value={assets.audio.title}
                            onChange={(event) => updateAudio({ title: event.target.value })}
                            placeholder="Track title"
                          />
                        </label>
                        <label className="lnk-field">
                          <span>Artist</span>
                          <input
                            value={assets.audio.artist}
                            onChange={(event) => updateAudio({ artist: event.target.value })}
                            placeholder="Artist name"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="audio-manager-box">
                      <span className="audio-manager-box-title">Lyrics</span>
                      <textarea
                        className="audio-lyrics-input"
                        value={assets.audio.lyrics}
                        onChange={(event) => updateAudio({ lyrics: event.target.value })}
                        placeholder={"Plain lines, or LRC with timestamps for sync:\n[00:12.50] first line\n[00:16.80] second line"}
                        rows={5}
                        spellCheck={false}
                      />
                      <div className="audio-upload-row">
                        <label className="audio-upload-btn">
                          <ImageIcon size={12} />
                          Upload .lrc / .txt
                          <input
                            type="file"
                            accept=".lrc,.txt,text/plain"
                            style={{ display: "none" }}
                            onChange={(event) => void handleLyricsUpload(event.target.files?.[0])}
                          />
                        </label>
                        {assets.audio.lyrics ? (
                          <button
                            type="button"
                            className="audio-upload-remove"
                            onClick={() => updateAudio({ lyrics: "" })}
                            aria-label="Clear lyrics"
                          >
                            <TrashIcon size={12} />
                          </button>
                        ) : null}
                      </div>
                      <label className="lnk-toggle" style={{ marginTop: 8 }}>
                        <span>Auto-fetch lyrics when none are set above</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={assets.audio.autoLyrics}
                          className={`switch${assets.audio.autoLyrics ? " is-on" : ""}`}
                          onClick={() => updateAudio({ autoLyrics: !assets.audio.autoLyrics })}
                        >
                          <span />
                        </button>
                      </label>
                      <small className="about-help">
                        Paste plain lyrics or LRC with [mm:ss.xx] timestamps to sync lines to playback.
                      </small>
                    </div>
                  </div>
                </div>

                <div className="lnk-option-group">
                  <span className="lnk-option-label">Style</span>
                  <div className="effect-choice-grid">
                    {AUDIO_STYLES.map((style) => (
                      <button
                        type="button"
                        key={style.id}
                        className={`effect-choice${assets.audio.style === style.id ? " is-active" : ""}`}
                        aria-pressed={assets.audio.style === style.id}
                        onClick={() => updateAudio({ style: style.id })}
                      >
                        <span className="effect-choice-preview">
                          <AudioStyleThumb style={style.id} />
                        </span>
                        <span className="effect-choice-copy">
                          <b>{style.name}</b>
                          <small>{style.hint}</small>
                        </span>
                        {assets.audio.style === style.id ? <CheckIcon size={11} /> : null}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lnk-option-group">
                  <span className="lnk-option-label">Playback</span>
                  <AssetToggle
                    label="Autoplay"
                    hint="Starts as soon as the page opens; if the browser blocks it, it starts on the first click."
                    checked={assets.audio.autoplay}
                    onChange={(checked) => updateAudio({ autoplay: checked })}
                  />
                </div>

                <div className="lnk-option-group">
                  <span className="lnk-option-label">Card styling</span>
                  <AssetSlider
                    label="Background opacity"
                    value={assets.audio.cardOpacity}
                    min={0.1}
                    max={1}
                    step={0.01}
                    onChange={(value) => updateAudio({ cardOpacity: value })}
                  />
                  <ColorField
                    label="Accent colour"
                    value={assets.audio.accentColor}
                    onChange={(value) => updateAudio({ accentColor: value })}
                    compact
                  />
                </div>
              </div>

              <footer className="asset-modal-foot">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal(null)}>
                  Done
                  <CheckIcon size={12} />
                </button>
              </footer>
            </section>
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="assets-page">
      <section className="dash-panel assets-panel">
        <header className="assets-head" data-reveal>
          <div>
            <span className="asset-kicker">Profile assets</span>
            <h2>Build the frame around you</h2>
            <p>
              The avatar, cursor, page background and banner are shared across every card layout. Effects stack
              on top of them.
            </p>
          </div>
        </header>

        <div className="assets-grid assets-grid--quad">
          {/* ── Top-left: Profile picture ──────────────────────────── */}
          <section className="asset-card" data-reveal>
            <header className="asset-card-head">
              <span className="asset-card-icon">
                <ImageIcon size={14} />
              </span>
              <div>
                <h3>Profile picture</h3>
                <p>Upload a picture or keep the one from your account.</p>
              </div>
              <span className="asset-index">01</span>
            </header>

            <div className="asset-avatar-row">
              <AssetAvatar avatar={avatar} assets={assets} user={user} />
              <div className="asset-avatar-copy">
                <ImageUpload
                  label="profile picture"
                  value={assets.avatarUrl}
                  onChange={(value) => updateAssets({ avatarUrl: value })}
                  hint="Leave empty to use your account picture."
                  variant="compact"
                  maxWidth={512}
                  maxHeight={512}
                />
                {user.avatarUrl && user.avatarUrl !== assets.avatarUrl ? (
                  <div className="asset-inline-actions">
                    <button
                      type="button"
                      className="asset-mini-btn"
                      onClick={() => updateAssets({ avatarUrl: user.avatarUrl ?? "" })}
                    >
                      Use account picture
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              className="deco-open-btn"
              onClick={() => setDecoOpen(true)}
            >
              {assets.decoration.discordUrl ? (
                <img className="deco-open-preview" src={assets.decoration.discordUrl.replace(/size=\d+/, "size=160")} alt="" />
              ) : (
                <span className="deco-open-icon">✦</span>
              )}
              <span>
                <b>Decorations</b>
                <small>{assets.decoration.discordUrl ? "Custom decoration active" : "Choose a Discord decoration"}</small>
              </span>
            </button>

            <div className="asset-subhead">
              <span>Profile picture settings</span>
              <small>Zoom and rotation</small>
            </div>
            <div className="asset-controls">
              <AssetSlider
                label="Zoom"
                value={assets.decoration.zoom ?? 1}
                min={0.5}
                max={2}
                step={0.05}
                onChange={(value) => updateDecoration({ zoom: value })}
              />
              <AssetSlider
                label="Rotate"
                value={assets.decoration.rotate ?? 0}
                min={-180}
                max={180}
                step={1}
                unit="°"
                onChange={(value) => updateDecoration({ rotate: value })}
              />
            </div>
          </section>

          {/* ── Top-right: Cursor ──────────────────────────────────── */}
          <section className="asset-card" data-reveal data-reveal-delay="60">
            <header className="asset-card-head">
              <span className="asset-card-icon">
                <BoltIcon size={14} />
              </span>
              <div>
                <h3>Cursor</h3>
                <p>Upload your own pointer. It replaces the system cursor on your public card.</p>
              </div>
              <span className="asset-index">02</span>
            </header>

            <ImageUpload
              label="cursor image"
              value={assets.cursor.imageUrl}
              onChange={(value) =>
                updateCursor(
                  value
                    ? { imageUrl: value, style: "custom" }
                    : { imageUrl: "", style: "default" },
                )
              }
              hint="Use a small PNG or WebP with transparency for the sharpest result."
              recommended="32 × 32 or 64 × 64 with transparency"
              variant="cursor"
              maxWidth={64}
              maxHeight={64}
            />

            <div
              className={`asset-cursor-demo${cursorImage ? " has-cursor" : ""}`}
              style={{ cursor: customCursor } as CSSProperties}
            >
              {cursorImage ? (
                <img className="asset-cursor-image" src={cursorImage} alt="" />
              ) : null}
              <span>{cursorImage ? "Hover anywhere in this box to test it" : ""}</span>
            </div>
          </section>

          {/* ── Bottom-left: Background ────────────────────────────── */}
          <section className="asset-card" data-reveal data-reveal-delay="80">
            <header className="asset-card-head">
              <span className="asset-card-icon">
                <PaletteIcon size={14} />
              </span>
              <div>
                <h3>Background</h3>
                <p>A flat colour, a two-stop gradient or a full bleed image behind the card.</p>
              </div>
              <span className="asset-index">03</span>
            </header>

            <div className="asset-background-demo">
              <div className={`lkr-bg lkr-bg--${background.style}`} style={bgStyle} aria-hidden="true">
                {background.style === "image" && background.imageUrl ? (
                  <span className="lkr-bg-image" style={{ backgroundImage: `url("${background.imageUrl}")` }} />
                ) : null}
                <span className="lkr-bg-dim" />
              </div>
              <span className="asset-background-label">
                {`${background.style} background`}
              </span>
            </div>

            <div className="asset-options asset-options--background">
              {(["solid", "gradient", "image"] as const).map((style) => (
                <button
                  type="button"
                  key={style}
                  className={`asset-option${background.style === style ? " is-active" : ""}`}
                  aria-pressed={background.style === style}
                  onClick={() => updateBackground({ style })}
                >
                  <span className={`asset-option-swatch asset-option-swatch--bg-${style}`} />
                  <b>{style === "solid" ? "Colour" : style === "gradient" ? "Gradient" : "Image"}</b>
                  <small>
                    {style === "solid"
                      ? "One flat fill"
                      : style === "gradient"
                        ? "Two colour blend"
                        : "Photo backdrop"}
                  </small>
                </button>
              ))}
            </div>

            {background.style === "solid" ? (
              <ColorField
                label="Background colour"
                value={background.color}
                onChange={(value) => updateBackground({ color: value })}
                compact
              />
            ) : null}
            {background.style === "gradient" ? (
              <>
                <div className="asset-color-row">
                  <ColorField
                    label="Gradient from"
                    value={background.from}
                    onChange={(value) => updateBackground({ from: value })}
                    compact
                  />
                  <ColorField
                    label="Gradient to"
                    value={background.to}
                    onChange={(value) => updateBackground({ to: value })}
                    compact
                  />
                </div>

                <div className="asset-subhead">
                  <span>Gradient animation</span>
                  <small>Motion applied to the gradient</small>
                </div>
                <div className="asset-options asset-options--gradient-anim">
                  {(["none", "shift", "pulse", "aurora", "sweep"] as const).map((anim) => (
                    <button
                      type="button"
                      key={anim}
                      className={`asset-option${(background.gradientAnim ?? "none") === anim ? " is-active" : ""}`}
                      aria-pressed={(background.gradientAnim ?? "none") === anim}
                      onClick={() => updateBackground({ gradientAnim: anim })}
                    >
                      <span className={`asset-option-swatch asset-option-swatch--ga-${anim}`} />
                      <b>{anim === "none" ? "Static" : anim === "shift" ? "Shift" : anim === "pulse" ? "Pulse" : anim === "aurora" ? "Aurora" : "Sweep"}</b>
                      <small>
                        {anim === "none" ? "No motion" : anim === "shift" ? "Sliding colours" : anim === "pulse" ? "Breathing glow" : anim === "aurora" ? "Northern lights" : "Rotating angle"}
                      </small>
                    </button>
                  ))}
                </div>

                <AssetSlider
                  label="Gradient angle"
                  value={background.angle ?? 160}
                  min={0}
                  max={360}
                  step={1}
                  unit="°"
                  onChange={(value) => updateBackground({ angle: value })}
                />
              </>
            ) : null}
            {background.style === "image" ? (
              <>
                <ImageUpload
                  label="background image"
                  value={background.imageUrl}
                  onChange={(value) => updateBackground({ imageUrl: value })}
                  hint="Large images are resized and compressed automatically."
                  recommended="Wide image · 1600 × 1000 recommended"
                  variant="wide"
                  maxWidth={1600}
                  maxHeight={1200}
                />
                <div className="asset-controls">
                  <AssetSlider
                    label="Image blur"
                    value={background.blur}
                    min={0}
                    max={30}
                    step={1}
                    unit="px"
                    onChange={(value) => updateBackground({ blur: value })}
                  />
                  <AssetSlider
                    label="Image dim"
                    value={background.dim}
                    min={0}
                    max={0.85}
                    step={0.01}
                    onChange={(value) => updateBackground({ dim: value })}
                  />
                </div>
              </>
            ) : null}
          </section>

          {/* ── Bottom-right: Banner ───────────────────────────────── */}
          <section className="asset-card" data-reveal data-reveal-delay="100">
            <header className="asset-card-head">
              <span className="asset-card-icon">
                <SlidersIcon size={14} />
              </span>
              <div>
                <h3>Banner</h3>
                <p>The banner card gets its own image strip. Height and fade stay in your control.</p>
              </div>
              <span className="asset-index">04</span>
            </header>

            <div
              className={`asset-banner-demo${banner.enabled ? "" : " is-disabled"}`}
              style={
                {
                  height: `${Math.min(190, Math.max(110, banner.height))}px`,
                  opacity: banner.enabled ? banner.opacity : 0.28,
                  backgroundImage: banner.imageUrl ? `url("${banner.imageUrl}")` : undefined,
                } as CSSProperties
              }
            >
              <span>{banner.enabled ? (banner.imageUrl ? "Banner image" : "Theme banner") : "Banner off"}</span>
            </div>

            <ImageUpload
              label="banner image"
              value={banner.imageUrl}
              onChange={(value) => updateBanner({ imageUrl: value })}
              hint="Wide crops look best in the banner layout."
              recommended="Wide image · 1600 × 600 recommended"
              variant="banner"
              maxWidth={1600}
              maxHeight={800}
            />
            <AssetToggle
              label="Show banner"
              hint="Only visible on the banner card layout."
              checked={banner.enabled}
              onChange={(checked) => updateBanner({ enabled: checked })}
            />
            <div className="asset-controls">
              <AssetSlider
                label="Banner height"
                value={banner.height}
                min={110}
                max={260}
                step={1}
                unit="px"
                onChange={(value) => updateBanner({ height: value })}
              />
              <AssetSlider
                label="Banner opacity"
                value={banner.opacity}
                min={0}
                max={1}
                step={0.01}
                onChange={(value) => updateBanner({ opacity: value })}
              />
            </div>
          </section>
        </div>

        <section className="assets-effects" data-reveal data-reveal-delay="120">
          <header className="assets-effects-head">
            <div>
              <span className="asset-kicker">Effects</span>
              <h2>Motion, texture and type</h2>
              <p>These effects apply to the whole profile card. Open one to browse every option with a live preview.</p>
            </div>
            <span className="assets-effects-hint">Click a tile to open its library</span>
          </header>

          <div className="effect-launcher-grid">
            <button type="button" className="effect-launcher" onClick={() => setModal("effects")}>
              <span className="effect-launcher-preview effect-launcher-preview--text">
                <EffectText text="tourn.lol" settings={assets.effects.text.name} />
              </span>
              <span className="effect-launcher-copy">
                <span className="asset-kicker">Effects</span>
                <b>Background, overlay, text &amp; card</b>
                <small>Weather and light, soft sheens, card shimmer and type effects — one library, four tabs.</small>
              </span>
              <EyeIcon size={14} />
            </button>

            <button type="button" className="effect-launcher" onClick={() => setModal("fonts")}>
              <span className="effect-launcher-preview effect-launcher-preview--text">
                <span style={{ fontFamily: assets.effects.text.name.font || undefined }}>Aa</span>
              </span>
              <span className="effect-launcher-copy">
                <span className="asset-kicker">Fonts</span>
                <b>{assets.effects.text.name.font || "Theme font"}</b>
                <small>Pick a typeface for your alias, name and bio.</small>
              </span>
              <EyeIcon size={14} />
            </button>

            <button type="button" className="effect-launcher" onClick={() => setModal("audio")}>
              <span className="effect-launcher-preview">
                <SpotifyIcon size={20} style={{ color: "#1db954" }} />
              </span>
              <span className="effect-launcher-copy">
                <span className="asset-kicker">Audio player</span>
                <b>{AUDIO_STYLES.find((style) => style.id === assets.audio.style)?.name}</b>
                <small>Compact, Marquee, Lyrics or Vinyl — share your featured track.</small>
              </span>
              <EyeIcon size={14} />
            </button>
          </div>
        </section>
      </section>

      <DecorationPicker
        open={decoOpen}
        onClose={() => setDecoOpen(false)}
        value={assets.decoration.discordUrl ?? ""}
        onChange={(url) => updateDecoration({ discordUrl: url })}
        avatarUrl={avatar}
      />

      {effectModal}
    </div>
  );
}
