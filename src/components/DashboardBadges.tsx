import { useState, type CSSProperties } from "react";
import type { Account } from "../lib/auth";
import {
  BADGE_ANIMATIONS,
  BADGE_CATALOGUE,
  DEFAULT_BADGE_STYLE,
  badgeDef,
  type BadgeInstance,
  type BadgeStore,
  type BadgeStyle,
} from "../lib/badges";
import { BadgeChip, BadgeRow } from "./BadgeRow";
import { ColorField } from "./ColorPicker";
import { CheckIcon, GripIcon, PlusIcon, TrashIcon } from "./Icons";
import "../about.css";

function BadgeSlider({
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
  onChange: (v: number) => void;
}) {
  const display = step < 1 ? value.toFixed(0) : value.toString();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="lp-slider">
      <span className="lp-slider-head">
        <span>{label}</span>
        <b>{display}{unit}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--slider-fill": `${fill}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function BadgeToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="bdg-toggle">
      <div>
        <b>{label}</b>
        <p>{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch${checked ? " is-on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

const GROUPS = [
  { key: "platform", label: "tourn.lol" },
  { key: "seasonal", label: "Seasonal" },
  { key: "discord", label: "Discord" },
] as const;

export function DashboardBadges({
  user,
  badges,
  earned,
  onChange,
}: {
  user: Account;
  badges: BadgeStore;
  /** Badge ids the backend has verified for this account. */
  earned: string[];
  onChange: (store: BadgeStore) => void;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const style = badges.style;
  const earnedSet = new Set(earned);

  const updateStyle = (patch: Partial<BadgeStyle>) => {
    onChange({ ...badges, style: { ...style, ...patch } });
  };

  const equip = (id: string) => {
    // Badges are earned, so only verified ids can be equipped.
    if (!earnedSet.has(id)) return;
    if (badges.equipped.some((b) => b.id === id)) return;
    onChange({ ...badges, equipped: [...badges.equipped, { id, visible: true }] });
  };

  const unequip = (id: string) => {
    onChange({ ...badges, equipped: badges.equipped.filter((b) => b.id !== id) });
  };

  const toggleVisible = (id: string) => {
    onChange({
      ...badges,
      equipped: badges.equipped.map((b) =>
        b.id === id ? { ...b, visible: !b.visible } : b,
      ),
    });
  };

  /** Drop `fromId` where `toId` sits, keeping every other badge in place. */
  const reorderEquipped = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const next = [...badges.equipped];
    const from = next.findIndex((b) => b.id === fromId);
    const to = next.findIndex((b) => b.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange({ ...badges, equipped: next });
  };

  const catalogue = filter === "all"
    ? BADGE_CATALOGUE
    : BADGE_CATALOGUE.filter((b) => b.group === filter);

  const equippedIds = new Set(badges.equipped.map((b) => b.id));

  const ownedEquipped = badges.equipped.filter((b) => earnedSet.has(b.id));
  const previewBadges: BadgeInstance[] = ownedEquipped.length
    ? ownedEquipped
    : BADGE_CATALOGUE.filter((def) => earnedSet.has(def.id))
        .slice(0, 5)
        .map((d) => ({ id: d.id, visible: true }));

  return (
    <div className="bdg-page">
      {/* ── Live preview ───────────────────────────────────── */}
      <section className="dash-panel bdg-panel bdg-preview-panel" data-reveal>
        <header className="bdg-section-head">
          <h2>Preview</h2>
          <p>How your badge row looks with the current style applied.</p>
        </header>
        <div className="bdg-preview-stage">
          <span className="bdg-preview-name">{user.username}</span>
          <BadgeRow badges={previewBadges} style={style} className="bdg-preview-row" />
          {!ownedEquipped.length ? (
            <small className="bdg-preview-hint">
              {earned.length ? "Equip a badge below to put it on your card." : "No badges earned yet — the catalogue shows what unlocks each one."}
            </small>
          ) : null}
        </div>
      </section>

      {/* ── Equipped badges ────────────────────────────────── */}
      <section className="dash-panel bdg-panel" data-reveal data-reveal-delay="20">
        <header className="bdg-section-head">
          <h2>Your badges</h2>
          <p>
            You've earned {earned.length} badge{earned.length === 1 ? "" : "s"}. Drag a badge to reorder
            it — the circle toggles visibility, the bin removes it.
          </p>
        </header>

        {ownedEquipped.length ? (
          <div className="bdg-equipped">
            {ownedEquipped.map((inst) => {
              const def = badgeDef(inst.id);
              if (!def) return null;
              return (
                <div
                  className={`bdg-equipped-item${inst.visible ? "" : " is-hidden"}${
                    dragId === inst.id ? " is-dragging" : ""
                  }${overId === inst.id && dragId !== inst.id ? " is-drop-target" : ""}`}
                  key={inst.id}
                  draggable
                  title="Drag to reorder"
                  onDragStart={(event) => {
                    setDragId(inst.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", inst.id);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (overId !== inst.id) setOverId(inst.id);
                  }}
                  onDragLeave={() => setOverId((id) => (id === inst.id ? null : id))}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from = event.dataTransfer.getData("text/plain") || dragId;
                    if (from) reorderEquipped(from, inst.id);
                    setDragId(null);
                    setOverId(null);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                >
                  <span className="bdg-drag" aria-hidden="true">
                    <GripIcon size={12} />
                  </span>
                  <BadgeChip badge={inst} style={style} />
                  <div className="bdg-equipped-meta">
                    <b>{def.name}</b>
                    <small>{def.description}</small>
                  </div>
                  <div className="bdg-equipped-actions">
                    <button
                      type="button"
                      className={`bdg-vis-btn${inst.visible ? " is-on" : ""}`}
                      title={inst.visible ? "Hide" : "Show"}
                      onClick={() => toggleVisible(inst.id)}
                    >
                      {inst.visible ? <CheckIcon size={10} /> : "○"}
                    </button>
                    <button
                      type="button"
                      className="bdg-remove-btn"
                      title="Remove"
                      onClick={() => unequip(inst.id)}
                    >
                      <TrashIcon size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bdg-empty">
            <span>No badges equipped yet. Pick some from the catalogue below.</span>
          </div>
        )}
      </section>

      {/* ── Badge style ────────────────────────────────────── */}
      <section className="dash-panel bdg-panel" data-reveal data-reveal-delay="60">
        <header className="bdg-section-head">
          <h2>Badge customisation</h2>
          <p>Glow, monochrome and colour overlay applied to all your badges.</p>
        </header>

        <div className="bdg-style-grid">
          <BadgeToggle
            label="Glow"
            hint="Drop-shadow halo around each badge."
            checked={style.glow}
            onChange={(v) => updateStyle({ glow: v })}
          />
          {style.glow ? (
            <div className="bdg-style-row">
              <ColorField
                label="Glow colour"
                value={style.glowColor}
                onChange={(v) => updateStyle({ glowColor: v })}
                compact
              />
              <BadgeSlider
                label="Glow intensity"
                value={style.glowIntensity}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(v) => updateStyle({ glowIntensity: v })}
              />
            </div>
          ) : null}
          {style.glow ? (
            <BadgeToggle
              label="Pulsing glow"
              hint="Glow breathes in and out instead of staying static."
              checked={style.glowPulse}
              onChange={(v) => updateStyle({ glowPulse: v })}
            />
          ) : null}

          <BadgeToggle
            label="Monochrome"
            hint="Desaturate badges and tint them one colour."
            checked={style.monochrome}
            onChange={(v) => updateStyle({ monochrome: v })}
          />
          {style.monochrome ? (
            <ColorField
              label="Mono colour"
              value={style.monoColor}
              onChange={(v) => updateStyle({ monoColor: v })}
              compact
            />
          ) : null}

          <BadgeToggle
            label="Colour overlay"
            hint="Paint a colour over badge art using mask blending."
            checked={style.overlay}
            onChange={(v) => updateStyle({ overlay: v })}
          />
          {style.overlay ? (
            <div className="bdg-style-row">
              <ColorField
                label="Overlay colour"
                value={style.overlayColor}
                onChange={(v) => updateStyle({ overlayColor: v })}
                compact
              />
              <BadgeSlider
                label="Overlay strength"
                value={style.overlayStrength}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(v) => updateStyle({ overlayStrength: v })}
              />
            </div>
          ) : null}

          <BadgeSlider
            label="Badge size"
            value={style.size}
            min={14}
            max={32}
            step={1}
            unit="px"
            onChange={(v) => updateStyle({ size: v })}
          />

          <div className="bdg-anim-group">
            <span className="bdg-anim-label">Animation</span>
            <div className="bdg-anim-row">
              {BADGE_ANIMATIONS.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  className={`bdg-anim-btn${style.animation === a.id ? " is-active" : ""}`}
                  onClick={() => updateStyle({ animation: a.id })}
                  title={a.hint}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Catalogue ──────────────────────────────────────── */}
      <section className="dash-panel bdg-panel" data-reveal data-reveal-delay="80">
        <header className="bdg-section-head">
          <h2>Badge catalogue</h2>
          <p>
            Every badge is earned by the backend — equip the ones you own. Locked tiles show exactly
            what unlocks them.
          </p>
        </header>

        <div className="bdg-filters">
          {[{ key: "all", label: "All" }, ...GROUPS].map((g) => (
            <button
              type="button"
              key={g.key}
              className={`bdg-filter${filter === g.key ? " is-active" : ""}`}
              onClick={() => setFilter(g.key)}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="bdg-catalogue">
          {catalogue.map((def) => {
            const equipped = equippedIds.has(def.id);
            const owned = earnedSet.has(def.id);
            return (
              <button
                type="button"
                key={def.id}
                className={`bdg-cat-tile${equipped ? " is-equipped" : ""}${owned ? "" : " is-locked"}`}
                title={`${def.name} — ${owned ? def.description : def.requirement}`}
                aria-disabled={!owned}
                onClick={() => (equipped ? unequip(def.id) : equip(def.id))}
              >
                {def.art ? (
                  <img
                    src={def.art}
                    alt=""
                    className="bdg-cat-art"
                    width={28}
                    height={28}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                  />
                ) : (
                  <span className="bdg-cat-art bdg-cat-art--monogram" aria-hidden="true">
                    {def.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="bdg-cat-name">{def.name}</span>
                <span className="bdg-cat-req">{def.requirement}</span>
                {equipped ? (
                  <span className="bdg-cat-check"><CheckIcon size={8} /></span>
                ) : owned ? (
                  <span className="bdg-cat-add"><PlusIcon size={10} /></span>
                ) : (
                  <span className="bdg-cat-lock">Locked</span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
