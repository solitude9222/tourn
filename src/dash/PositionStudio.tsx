import type { AboutLayout, MetadataPosition } from "../lib/about";
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

const ZONES: { id: MetadataPosition; label: string }[] = [
  { id: "above-name", label: "Above name" },
  { id: "beside-avatar", label: "By avatar" },
  { id: "next-to-name", label: "Next to name" },
  { id: "next-to-handle", label: "Next to handle" },
  { id: "under-name", label: "Under name" },
  { id: "below-bio", label: "Below bio" },
  { id: "top", label: "Card top" },
  { id: "top-right", label: "Card top-right" },
  { id: "inside-top-left", label: "Inside TL" },
  { id: "inside-top-right", label: "Inside TR" },
  { id: "inside-bottom-left", label: "Inside BL" },
  { id: "inside-bottom-right", label: "Inside BR" },
  { id: "outside-above", label: "Above" },
  { id: "outside-below", label: "Below" },
  { id: "outside-left", label: "Left" },
  { id: "outside-right", label: "Right" },
  { id: "outside-top-left", label: "Top left" },
  { id: "outside-top-right", label: "Top right" },
  { id: "outside-bottom-left", label: "Bottom left" },
  { id: "outside-bottom-right", label: "Bottom right" },
  { id: "footer", label: "Footer" },
  { id: "side", label: "Side rail" },
  { id: "hidden", label: "Hidden" },
];

export function PositionStudio({
  viewPosition,
  locationPosition,
  joinPosition,
  layout,
  onChange,
}: {
  viewPosition: MetadataPosition;
  locationPosition: MetadataPosition;
  joinPosition: MetadataPosition;
  layout: AboutLayout;
  onChange: (patch: PositionPatch) => void;
}) {
  // The side rail only exists on the Left layout; everywhere else that value
  // is drawn in the footer, so the dropdown must show where it really lands.
  const shown = (position: MetadataPosition): MetadataPosition =>
    position === "side" && layout !== "left" ? "footer" : position;

  const positionOf = (field: FieldId): MetadataPosition =>
    shown(field === "views" ? viewPosition : field === "location" ? locationPosition : joinPosition);

  const place = (field: FieldId, position: MetadataPosition) => {
    const patch: PositionPatch =
      field === "views"
        ? { viewPosition: position }
        : field === "location"
          ? { locationPosition: position }
          : { joinPosition: position };
    onChange(patch);
  };

  return (
    <div className="pos-studio">
      <div className="tw-form-grid">
        {FIELDS.map((field) => (
          <Field key={field.id} label={field.label}>
            <Select
              value={positionOf(field.id)}
              options={ZONES.map((entry) => ({ value: entry.id, label: entry.label }))}
              onChange={(value) => place(field.id, value as MetadataPosition)}
            />
          </Field>
        ))}
      </div>
      <p className="tw-foot-note">Hidden takes that detail off your card.</p>
    </div>
  );
}
