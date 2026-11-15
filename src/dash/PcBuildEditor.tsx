import { useState } from "react";
import type { ProfileSection, SectionPick } from "../lib/about";
import { Button, Field, Select, TextInput } from "./ui";

const PART_CATEGORIES = [
  "Processor", "Graphics card", "Motherboard", "Memory", "Storage", "CPU cooler",
  "Case", "Power supply", "Case fans", "Monitor", "Keyboard", "Mouse", "Audio", "Other",
];
const EMPTY_PART = { title: "", subtitle: "", meta: "", category: "Processor", image: "", url: "" };

export function PcBuildEditor({ section, onChange }: { section: ProfileSection; onChange: (patch: Partial<ProfileSection>) => void }) {
  const [draft, setDraft] = useState(EMPTY_PART);
  const parts = section.items ?? [];
  const updatePart = (id: string, patch: Partial<SectionPick>) =>
    onChange({ items: parts.map((part) => part.id === id ? { ...part, ...patch } : part) });
  const addPart = () => {
    const title = draft.title.trim();
    if (!title || parts.length >= 150) return;
    onChange({ items: [...parts, { ...draft, title, id: globalThis.crypto?.randomUUID?.() ?? `part-${Date.now()}` }] });
    setDraft(EMPTY_PART);
  };
  return (
    <div className="tw-form-grid">
      <Field label="Build name">
        <TextInput value={section.title} maxLength={100} placeholder="My gaming PC" onChange={(event) => onChange({ title: event.target.value })} />
      </Field>
      <Field label="Build description">
        <TextInput value={section.subtitle} maxLength={180} placeholder="Quiet 4K gaming build" onChange={(event) => onChange({ subtitle: event.target.value })} />
      </Field>
      <Field label="Card style" hint="Stage uses a lightweight perspective preview; no 3D engine required.">
        <Select value={section.pcView ?? "grid"} options={[{ value: "grid", label: "Parts grid" }, { value: "list", label: "Parts list" }, { value: "stage", label: "3D stage" }]} onChange={(pcView) => onChange({ pcView: pcView as ProfileSection["pcView"] })} />
      </Field>
      <Field label="Visibility badge">
        <TextInput value={section.status} maxLength={28} placeholder="Daily driver" onChange={(event) => onChange({ status: event.target.value })} />
      </Field>

      <div className="tw-pc-builder tw-span-2">
        <div className="tw-pc-builder-head">
          <span><b>Components</b><small>Add up to 150 parts from any manufacturer.</small></span>
          <span className="tw-active-count">{parts.length} / 150</span>
        </div>
        <div className="tw-pc-add-grid">
          <Field label="Part type"><Select value={draft.category} options={PART_CATEGORIES.map((value) => ({ value, label: value }))} onChange={(category) => setDraft((current) => ({ ...current, category }))} /></Field>
          <Field label="Part name"><TextInput value={draft.title} maxLength={100} placeholder="GeForce RTX 4080 SUPER" onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></Field>
          <Field label="Brand"><TextInput value={draft.meta} maxLength={80} placeholder="ASUS" onChange={(event) => setDraft((current) => ({ ...current, meta: event.target.value }))} /></Field>
          <Field label="Specs"><TextInput value={draft.subtitle} maxLength={180} placeholder="16 GB · TUF Gaming OC" onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))} /></Field>
          <Field label="Product image URL"><TextInput value={draft.image} placeholder="https://…" onChange={(event) => setDraft((current) => ({ ...current, image: event.target.value }))} /></Field>
          <Field label="Product or review link"><TextInput value={draft.url} placeholder="https://…" onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} /></Field>
        </div>
        <div className="tw-row tw-pc-add-action"><Button icon="plus" disabled={!draft.title.trim() || parts.length >= 150} onClick={addPart}>Add component</Button></div>

        {parts.length ? <div className="tw-pc-parts-editor">
          {parts.map((part) => (
            <article className="tw-pc-part-editor" key={part.id}>
              <div className="tw-pc-part-top">
                <span className="tw-pc-part-image">{part.image ? <img src={part.image} alt="" loading="lazy" /> : <span aria-hidden="true">{part.category?.slice(0, 1) || "P"}</span>}</span>
                <span className="tw-pc-part-fields">
                  <Select aria-label={`Type for ${part.title}`} value={part.category ?? "Other"} options={PART_CATEGORIES.map((value) => ({ value, label: value }))} onChange={(category) => updatePart(part.id, { category })} />
                  <TextInput aria-label={`Part name for ${part.title}`} value={part.title} maxLength={100} onChange={(event) => updatePart(part.id, { title: event.target.value })} />
                  <TextInput aria-label={`Brand for ${part.title}`} value={part.meta} maxLength={80} placeholder="Brand" onChange={(event) => updatePart(part.id, { meta: event.target.value })} />
                  <TextInput aria-label={`Specifications for ${part.title}`} value={part.subtitle} maxLength={180} placeholder="Specifications" onChange={(event) => updatePart(part.id, { subtitle: event.target.value })} />
                </span>
                <span className="tw-pc-part-actions">
                  <TextInput aria-label={`Image URL for ${part.title}`} value={part.image.startsWith("data:") ? "" : part.image} placeholder="Image URL" onChange={(event) => updatePart(part.id, { image: event.target.value })} />
                  <TextInput aria-label={`Link for ${part.title}`} value={part.url} placeholder="Part link" onChange={(event) => updatePart(part.id, { url: event.target.value })} />
                  <Button variant="danger" onClick={() => onChange({ items: parts.filter((item) => item.id !== part.id) })}>Remove</Button>
                </span>
              </div>
            </article>
          ))}
        </div> : <p className="tw-empty-note">Add the components in your build. Use an image URL or upload a product photo to show a preview.</p>}
      </div>
    </div>
  );
}
