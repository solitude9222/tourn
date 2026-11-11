import { useState } from "react";
import type { MetadataPosition } from "../lib/about";
import { Field, Select } from "./ui";
import "./positionStudio.css";

type FieldId = "views" | "location" | "join";

type PositionPatch = {
  viewPosition?: MetadataPosition;
  locationPosition?: MetadataPosition;
  joinPosition?: MetadataPosition;
};

const FIELDS: { id: FieldId; label: string }[] = [
  { id: "views", label: "Views" },
  { id: "location", label: "Location" },
  { id: "join", label: "Joined" },
];

const ZONES: { id: MetadataPosition; label: string; group: "outside" | "inside" | "inline" | "card" | "hidden" }[] = [
  { id: "outside-top-left", label: "Outside TL", group: "outside" },
  { id: "outside-top-right", label: "Outside TR", group: "outside" },
  { id: "outside-bottom-left", label: "Outside BL", group: "outside" },
  { id: "outside-bottom-right", label: "Outside BR", group: "outside" },
  { id: "outside-above", label: "Above card", group: "outside" },
  { id: "outside-below", label: "Below card", group: "outside" },
  { id: "outside-left", label: "Left of card", group: "outside" },
  { id: "outside-right", label: "Right of card", group: "outside" },
  { id: "inside-top-left", label: "Inside TL", group: "inside" },
  { id: "inside-top-right", label: "Inside TR", group: "inside" },
  { id: "inside-bottom-left", label: "Inside BL", group: "inside" },
  { id: "inside-bottom-right", label: "Inside BR", group: "inside" },
  { id: "next-to-name", label: "Next to name", group: "inline" },
  { id: "next-to-handle", label: "Next to handle", group: "inline" },
  { id: "beside-avatar", label: "By avatar", group: "inline" },
  { id: "above-name", label: "Above name", group: "inline" },
  { id: "below-bio", label: "Below bio", group: "inline" },
  { id: "top", label: "Card top", group: "card" },
  { id: "top-right", label: "Card top-right", group: "card" },
  { id: "under-name", label: "Under name", group: "card" },
  { id: "footer", label: "Card footer", group: "card" },
  { id: "side", label: "Side rail", group: "card" },
  { id: "hidden", label: "Hidden", group: "hidden" },
];

const PRESETS: { id: string; name: string; patch: PositionPatch }[] = [
  {
    id: "reference",
    name: "Reference",
    patch: { viewPosition: "footer", locationPosition: "under-name", joinPosition: "under-name" },
  },
  {
    id: "corners",
    name: "Corners",
    patch: { viewPosition: "inside-bottom-right", locationPosition: "inside-top-left", joinPosition: "inside-bottom-left" },
  },
  {
    id: "outside",
    name: "Outside",
    patch: { viewPosition: "outside-top-right", locationPosition: "outside-top-left", joinPosition: "outside-bottom-left" },
  },
  {
    id: "inline",
    name: "Inline",
    patch: { viewPosition: "next-to-handle", locationPosition: "next-to-name", joinPosition: "below-bio" },
  },
  {
    id: "hidden",
    name: "Hidden",
    patch: { viewPosition: "hidden", locationPosition: "hidden", joinPosition: "hidden" },
  },
];

export function PositionStudio({
  viewPosition,
  locationPosition,
  joinPosition,
  onChange,
}: {
  viewPosition: MetadataPosition;
  locationPosition: MetadataPosition;
  joinPosition: MetadataPosition;
  onChange: (patch: PositionPatch) => void;
}) {
  const [mode, setMode] = useState<"preview" | "dropdowns">("preview");
  const [active, setActive] = useState<FieldId | null>(null);
  const [dragging, setDragging] = useState<FieldId | null>(null);

  const positionOf = (field: FieldId): MetadataPosition =>
    field === "views" ? viewPosition : field === "location" ? locationPosition : joinPosition;

  const place = (field: FieldId, position: MetadataPosition) => {
    const patch: PositionPatch =
      field === "views"
        ? { viewPosition: position }
        : field === "location"
          ? { locationPosition: position }
          : { joinPosition: position };
    onChange(patch);
    setActive(null);
    setDragging(null);
  };

  const chip = (field: { id: FieldId; label: string }) => (
    <span
      key={field.id}
      className={`pos-chip${active === field.id ? " is-active" : ""}${dragging === field.id ? " is-dragging" : ""}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", field.id);
        event.dataTransfer.effectAllowed = "move";
        setDragging(field.id);
        setActive(field.id);
      }}
      onDragEnd={() => setDragging(null)}
      onClick={(event) => {
        event.stopPropagation();
        setActive(active === field.id ? null : field.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setActive(active === field.id ? null : field.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={active === field.id}
    >
      {field.label}
      <button
        type="button"
        className="pos-chip-hide"
        aria-label={`Hide ${field.label}`}
        onClick={(event) => {
          event.stopPropagation();
          place(field.id, "hidden");
        }}
      >
        ×
      </button>
    </span>
  );

  return (
    <div className="pos-studio">
      <div className="pos-studio-head">
        <span className="pos-studio-copy">
          <b>Position preview</b>
          <small>Drag each detail into a slot, or start from a preset.</small>
        </span>
        <div className="pos-studio-modes" role="group" aria-label="Position editor mode">
          <button
            type="button"
            aria-pressed={mode === "preview"}
            className={mode === "preview" ? "is-active" : ""}
            onClick={() => setMode("preview")}
          >
            Preview
          </button>
          <button
            type="button"
            aria-pressed={mode === "dropdowns"}
            className={mode === "dropdowns" ? "is-active" : ""}
            onClick={() => setMode("dropdowns")}
          >
            Dropdowns
          </button>
        </div>
      </div>

      {mode === "preview" ? (
        <>
          <div className="pos-studio-presets" role="group" aria-label="Position presets">
            {PRESETS.map((preset) => (
              <button key={preset.id} type="button" onClick={() => onChange(preset.patch)}>
                {preset.name}
              </button>
            ))}
          </div>

          <div className={`pos-studio-canvas${dragging ? " is-dragging" : ""}`}>
            <div className="pos-studio-card" aria-hidden="true">
              <span className="pos-studio-avatar" />
              <span className="pos-studio-lines">
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className="pos-studio-zones">
              {ZONES.map((zone) => (
                <div
                  key={zone.id}
                  className={`pos-zone pos-zone--${zone.group}`}
                  data-position={zone.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Place detail in ${zone.label}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const field = (event.dataTransfer.getData("text/plain") || dragging) as FieldId;
                    if (FIELDS.some((item) => item.id === field)) place(field, zone.id);
                  }}
                  onClick={() => {
                    if (active) place(active, zone.id);
                  }}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && active) {
                      event.preventDefault();
                      place(active, zone.id);
                    }
                  }}
                >
                  <span className="pos-zone-label">{zone.label}</span>
                  <span className="pos-zone-chips">
                    {FIELDS.filter((field) => positionOf(field.id) === zone.id).map(chip)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="pos-studio-hint">Click a detail and then a slot, or drag it. Hidden takes it off the card.</p>
        </>
      ) : (
        <div className="tw-form-grid">
          {FIELDS.map((field) => (
            <Field key={field.id} label={field.label}>
              <Select
                value={positionOf(field.id)}
                options={ZONES.map((zone) => ({ value: zone.id, label: zone.label === "Hidden" ? "Hidden" : zone.label }))}
                onChange={(value) => place(field.id, value as MetadataPosition)}
              />
            </Field>
          ))}
        </div>
      )}
    </div>
  );
}
