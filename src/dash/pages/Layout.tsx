/* ---------------------------------------------------------------------------
   Customize > Layout — pick a card arrangement, then drag the widgets to the
   positions the public page supports.
   --------------------------------------------------------------------------- */

import { useState } from "react";
import { useDash } from "../context";
import { Button, Card, CardHead, Chip, Icon, type IconName } from "../ui";

type Mode = "card" | "left" | "centered";

type WidgetKey = "view" | "location" | "join" | "audio";
type ZoneKey = "top-right" | "upper-right" | "in-card" | "bottom";

const WIDGETS: { key: WidgetKey; label: string; icon: IconName }[] = [
  { key: "view", label: "Profile Views", icon: "eye" },
  { key: "location", label: "Location", icon: "pin" },
  { key: "join", label: "Join Date", icon: "calendar" },
  { key: "audio", label: "Audio Player", icon: "music" },
];

const ZONES: { key: ZoneKey; label: string; hint: string }[] = [
  { key: "top-right", label: "Top right", hint: "Beside the card" },
  { key: "upper-right", label: "Upper right", hint: "Above the card" },
  { key: "in-card", label: "In card", hint: "Inside the card" },
  { key: "bottom", label: "Screen bottom", hint: "Pinned to the page" },
];

const LAYOUTS: { id: Mode; name: string; hint: string; thumb: React.ReactNode }[] = [
  {
    id: "card",
    name: "Card Layout",
    hint: "Stacked card design",
    thumb: (
      <div className="tw-layout-wire">
        <i />
        <i style={{ width: 52 }} />
        <i style={{ width: 38 }} />
      </div>
    ),
  },
  {
    id: "left",
    name: "Left Layout",
    hint: "Horizontal design",
    thumb: (
      <div className="tw-layout-wire" style={{ flexDirection: "row", alignItems: "center" }}>
        <i />
        <div style={{ display: "grid", gap: 4, flex: 1 }}>
          <i style={{ width: "80%" }} />
          <i style={{ width: "55%" }} />
        </div>
      </div>
    ),
  },
  {
    id: "centered",
    name: "Centered Layout",
    hint: "Centered elements",
    thumb: (
      <div className="tw-layout-wire" style={{ alignItems: "center" }}>
        <i />
        <i style={{ width: 48 }} />
        <i style={{ width: 30 }} />
      </div>
    ),
  },
];

export function LayoutPage() {
  const { about, setAbout, notify } = useDash();
  const design = about.design;
  const [dragging, setDragging] = useState<WidgetKey | null>(null);
  const [over, setOver] = useState<ZoneKey | null>(null);

  const mode: Mode =
    design.layout === "modern" ? "left" : design.cardStyle === "compact" ? "centered" : "card";

  const applyMode = (next: Mode) => {
    setAbout((current) => ({
      ...current,
      design: {
        ...current.design,
        layout: next === "left" ? "modern" : "classic",
        cardStyle: next === "centered" ? "compact" : next === "card" ? "default" : current.design.cardStyle,
      },
    }));
  };

  const positions: Record<WidgetKey, { zone: ZoneKey; label: string }> = {
    view: {
      zone: design.viewPosition === "footer" ? "bottom" : design.viewPosition === "hidden" ? "in-card" : "top-right",
      label:
        design.viewPosition === "footer"
          ? "Screen bottom"
          : design.viewPosition === "hidden"
            ? "Hidden"
            : "Top right",
    },
    location: {
      zone:
        design.locationPosition === "top"
          ? "upper-right"
          : design.locationPosition === "footer"
            ? "bottom"
            : design.locationPosition === "hidden"
              ? "in-card"
              : "in-card",
      label:
        design.locationPosition === "top"
          ? "Upper right"
          : design.locationPosition === "footer"
            ? "Screen bottom"
            : design.locationPosition === "hidden"
              ? "Hidden"
              : "In card",
    },
    join: {
      zone:
        design.joinPosition === "under-name"
          ? "upper-right"
          : design.joinPosition === "hidden"
            ? "top-right"
            : "in-card",
      label:
        design.joinPosition === "under-name"
          ? "Upper right"
          : design.joinPosition === "hidden"
            ? "Hidden"
            : "In card",
    },
    audio: { zone: "bottom", label: "Screen bottom" },
  };

  const drop = (zone: ZoneKey) => {
    const widget = dragging;
    setOver(null);
    setDragging(null);
    if (!widget) return;

    if (widget === "audio") {
      notify("Audio Player", "The player always sits at the bottom of the page.");
      return;
    }

    setAbout((current) => {
      const next = { ...current.design };
      if (widget === "view") {
        next.viewPosition = zone === "in-card" ? "top-right" : zone === "bottom" ? "footer" : "top-right";
      }
      if (widget === "location") {
        next.locationPosition =
          zone === "upper-right" ? "top" : zone === "bottom" ? "footer" : "under-name";
      }
      if (widget === "join") {
        next.joinPosition =
          zone === "upper-right" ? "under-name" : zone === "bottom" ? "footer" : "footer";
      }
      return { ...current, design: next };
    });

    notify("Layout Customization", "Position updated — save to publish it.");
  };

  return (
    <>
      <div className="tw-layout-cards">
        {LAYOUTS.map((layout) => (
          <button
            key={layout.id}
            type="button"
            className={`tw-layout-card${mode === layout.id ? " is-active" : ""}`}
            onClick={() => applyMode(layout.id)}
          >
            <div className="tw-layout-thumb">{layout.thumb}</div>
            <b>{layout.name}</b>
            <small>{layout.hint}</small>
          </button>
        ))}
      </div>

      <Card>
        <CardHead
          icon="grid"
          title="Layout Preview"
          subtitle="Drag the actual profile widgets inside the preview."
        />

        <div className="tw-row" style={{ gap: 8 }}>
          <Chip tone="muted">
            <span className="tw-dot" />
            Visible widget
          </Chip>
          <Chip tone="amber">
            <Icon name="lock" size={11} />
            Disabled in settings, position only
          </Chip>
        </div>

        <div className="tw-layout-canvas">
          <div className="tw-widget-tray">
            {WIDGETS.map((widget) => (
              <span
                key={widget.key}
                className="tw-zone"
                draggable
                onDragStart={() => setDragging(widget.key)}
                onDragEnd={() => setDragging(null)}
                style={{ position: "static", cursor: "grab" }}
              >
                <Icon name={widget.icon} size={12} />
                {widget.label}
              </span>
            ))}
          </div>

          {ZONES.map((zone) => (
            <div
              key={zone.key}
              className={`tw-dropzone tw-dropzone--${zone.key}${over === zone.key ? " is-over" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setOver(zone.key);
              }}
              onDragLeave={() => setOver((current) => (current === zone.key ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                drop(zone.key);
              }}
              data-zone={zone.key}
            >
              {zone.label}
            </div>
          ))}

          <div className="tw-profile-preview">
            <span className="tw-style-avatar" style={{ margin: "0 auto" }} />
            <h4>{about.displayName.trim() || "your name"}</h4>
            <small>Joined 13 days ago</small>
            <div className="tw-profile-preview-body">
              <span>
                <Icon name="discord" size={12} />
                Discord
              </span>
              <span>
                <Icon name="music" size={12} />
                Spotify
              </span>
            </div>
            <div className="tw-profile-preview-foot">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="eye" size={11} /> {positions.view.label}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="pin" size={11} /> {positions.location.label}
              </span>
            </div>
          </div>
        </div>

        <div className="tw-zone-grid">
          {WIDGETS.map((widget) => (
            <div className="tw-zone-tile" key={widget.key}>
              <small>{widget.label}</small>
              <b>{positions[widget.key].label}</b>
            </div>
          ))}
        </div>

        <div className="tw-row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          <Button
            icon="refresh"
            onClick={() =>
              setAbout((current) => ({
                ...current,
                design: {
                  ...current.design,
                  viewPosition: "top-right",
                  locationPosition: "under-name",
                  joinPosition: "footer",
                },
              }))
            }
          >
            Reset positions
          </Button>
        </div>
      </Card>
    </>
  );
}
