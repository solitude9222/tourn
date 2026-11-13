import { SkillPicker } from "./SkillPicker";
import { useState } from "react";
import { type ProfileSection, type ProfileSectionKind } from "../lib/about";
import { imageToDataUrl } from "./files";
import { Button, Field, FileUpload, TextInput, Textarea } from "./ui";
import { MediaLibrary } from "./MediaLibrary";
import { useDash } from "./context";
import "./sections.css";

const KINDS: { id: ProfileSectionKind; label: string; hint: string }[] = [
  { id: "project", label: "Project", hint: "Something you built" },
  { id: "interest", label: "Interests", hint: "One section, many animes" },
];

const PICK_LIMIT = 12;

export function SectionEditor({
  section,
  index,
  onChange,
  onRemove,
  onMoveUp,
}: {
  section: ProfileSection;
  index: number;
  onChange: (patch: Partial<ProfileSection>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
}) {
  const { notify } = useDash();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const project = section.kind === "project";
  const picks = Array.isArray(section.items) ? section.items : [];

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Artwork", "Choose an image or GIF.");
      return;
    }
    // Phone photos are several megabytes; downscale instead of refusing them.
    try {
      onChange({ image: await imageToDataUrl(file, 1400, 1400, 0.86) });
    } catch {
      notify("Artwork", "That image could not be read. Try a PNG, JPG or WebP.");
    }
  };

  const addPick = (pick: Omit<ProfileSection["items"][number], "id">) => {
    if (picks.length >= PICK_LIMIT) {
      notify("Interests", `${PICK_LIMIT} picks is the limit for one section.`);
      return;
    }
    onChange({
      items: [
        ...picks,
        {
          ...pick,
          id: globalThis.crypto?.randomUUID?.() ?? `pick-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        },
      ],
    });
  };

  return (
    <div className={`tw-section-editor tw-section-editor--${section.kind}`}>
      <div className="tw-section-editor-head">
        <span className="tw-section-number">{String(index + 1).padStart(2, "0")}</span>
        <span className="tw-section-editor-title">
          <b>{section.title || (project ? "Untitled project" : `${picks.length || ""} interest${picks.length === 1 ? "" : "s"}`.trim() || "Interests")}</b>
          <small>{KINDS.find((kind) => kind.id === section.kind)?.label} section</small>
        </span>
        <span className="tw-section-editor-actions">
          {index > 0 ? (
            <Button onClick={onMoveUp} aria-label="Move section up">
              Move up
            </Button>
          ) : null}
          <Button variant="danger" icon="trash" onClick={onRemove}>
            Remove
          </Button>
        </span>
      </div>

      <div className="tw-section-kind-row">
        {KINDS.map((kind) => (
          <button
            key={kind.id}
            type="button"
            className="tw-section-kind"
            aria-pressed={section.kind === kind.id}
            onClick={() => onChange({ kind: kind.id })}
          >
            <span className={`tw-section-kind-dot tw-section-kind-dot--${kind.id}`} aria-hidden="true" />
            <span>
              <b>{kind.label}</b>
              <small>{kind.hint}</small>
            </span>
          </button>
        ))}
      </div>

      {project ? (
        <div className="tw-form-grid">
          <Field label="Project name">
            <TextInput
              value={section.title}
              maxLength={100}
              placeholder="Project name"
              onChange={(event) => onChange({ title: event.target.value })}
            />
          </Field>
          <Field label="One-line summary" hint="Shown under the title.">
            <TextInput
              value={section.subtitle}
              maxLength={180}
              placeholder="A Discord bot for tournament servers"
              onChange={(event) => onChange({ subtitle: event.target.value })}
            />
          </Field>
          <Field label="Status badge" hint="Live, In progress, Archived…">
            <TextInput value={section.status} maxLength={28} placeholder="Live" onChange={(event) => onChange({ status: event.target.value })} />
          </Field>
          <Field label="Project meta" hint="Year, role or platform.">
            <TextInput value={section.meta} maxLength={80} placeholder="2026 · Solo build" onChange={(event) => onChange({ meta: event.target.value })} />
          </Field>
          <Field label="Description" className="tw-span-2">
            <Textarea
              rows={3}
              value={section.text}
              maxLength={4000}
              placeholder="What is it, what did you build, why does it matter?"
              onChange={(event) => onChange({ text: event.target.value })}
            />
          </Field>
          <Field label="Tech stack" hint="Choose languages, frameworks and tools." className="tw-span-2">
            <SkillPicker value={section.stack} onChange={(stack) => onChange({ stack })} />
          </Field>
          <Field label="Project URL" hint="Used by the card's main button.">
            <TextInput value={section.url} placeholder="https://…" onChange={(event) => onChange({ url: event.target.value })} />
          </Field>

          <details className="tw-section-more tw-span-2">
            <summary>Artwork and extra links</summary>
            <div className="tw-form-grid">
              <Field label="Artwork URL">
                <TextInput value={section.image.startsWith("data:") ? "" : section.image} placeholder="https://…/cover.jpg" onChange={(event) => onChange({ image: event.target.value })} />
              </Field>
              <Field label="Artwork upload" hint="Any image — large photos are resized automatically.">
                <FileUpload aria-label={`Section ${index + 1} artwork upload`} accept="image/*" onChange={(event) => void upload(event.target.files?.[0])} />
              </Field>
              <Field label="Extra links" hint="GitHub, demo, docs — up to six." className="tw-span-2">
                <div className="tw-section-links">
                  {section.links.map((link, linkIndex) => (
                    <div className="tw-section-link-row" key={linkIndex}>
                      <TextInput
                        value={link.label}
                        maxLength={40}
                        placeholder="Label"
                        onChange={(event) => {
                          const links = [...section.links];
                          links[linkIndex] = { ...link, label: event.target.value };
                          onChange({ links });
                        }}
                      />
                      <TextInput
                        value={link.url}
                        placeholder="https://…"
                        onChange={(event) => {
                          const links = [...section.links];
                          links[linkIndex] = { ...link, url: event.target.value };
                          onChange({ links });
                        }}
                      />
                      <Button
                        variant="danger"
                        onClick={() => onChange({ links: section.links.filter((_, position) => position !== linkIndex) })}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    icon="plus"
                    disabled={section.links.length >= 6}
                    onClick={() => onChange({ links: [...section.links, { label: "", url: "" }] })}
                  >
                    Add link
                  </Button>
                </div>
              </Field>
            </div>
          </details>
        </div>
      ) : (
        <div className="tw-form-grid">
          <Field label="Section heading" hint="Optional — e.g. “Anime I like”.">
            <TextInput
              value={section.title}
              maxLength={100}
              placeholder="Interests"
              onChange={(event) => onChange({ title: event.target.value })}
            />
          </Field>
          <Field label="Library" hint="Add as many animes as you like to this one section.">
            <div className="tw-section-library">
              <Button icon="plus" onClick={() => setLibraryOpen(true)}>
                Add anime
              </Button>
              <span className="tw-section-library-meta">
                {picks.length} / {PICK_LIMIT} picked
              </span>
            </div>
          </Field>

          {picks.length ? (
            <div className="tw-section-picks tw-span-2">
              {picks.map((pick) => (
                <div className="tw-section-pick" key={pick.id}>
                  <span className="tw-section-pick-art">
                    {pick.image ? <img src={pick.image} alt="" loading="lazy" /> : null}
                  </span>
                  <span className="tw-section-pick-copy">
                    <b>{pick.title || "Untitled"}</b>
                    <small>{pick.meta || pick.subtitle || "Anime"}</small>
                  </span>
                  <button
                    type="button"
                    className="tw-section-pick-remove"
                    aria-label={`Remove ${pick.title || "pick"}`}
                    onClick={() => onChange({ items: picks.filter((item) => item.id !== pick.id) })}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="tw-empty-note tw-span-2">Nothing picked yet — “Add anime” opens the library.</p>
          )}

          <Field label="Note" hint="Optional line under the picks." className="tw-span-2">
            <Textarea
              rows={2}
              value={section.text}
              maxLength={4000}
              placeholder="Why these?"
              onChange={(event) => onChange({ text: event.target.value })}
            />
          </Field>
        </div>
      )}

      <MediaLibrary
        open={libraryOpen}
        kind="anime"
        onClose={() => setLibraryOpen(false)}
        onPick={(item) =>
          addPick({
            title: item.title,
            subtitle: item.subtitle,
            image: item.image,
            meta: item.meta,
            url: item.url,
          })
        }
      />
    </div>
  );
}
