import {SkillPicker} from "./SkillPicker";
import { useState } from "react";
import { type ProfileSection, type ProfileSectionKind } from "../lib/about";
import { fileToDataUrl } from "./files";
import { Button, Field, FileUpload, TextInput, Textarea } from "./ui";
import { MediaLibrary } from "./MediaLibrary";
import { useDash } from "./context";
import "./sections.css";

const KINDS: { id: ProfileSectionKind; label: string; hint: string }[] = [
  { id: "text", label: "Text", hint: "A title and paragraph" },
  { id: "project", label: "Project", hint: "Artwork, stack, links" },
  { id: "anime", label: "Anime", hint: "From the anime library" },
  { id: "game", label: "Game", hint: "From the game library" },
];

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


  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 500_000) {
      notify("Artwork", "Choose an image or GIF under 500 KB.");
      return;
    }
    onChange({ image: await fileToDataUrl(file) });
  };



  return (
    <div className={`tw-section-editor tw-section-editor--${section.kind}`}>
      <div className="tw-section-editor-head">
        <span className="tw-section-number">{String(index + 1).padStart(2, "0")}</span>
        <span className="tw-section-editor-title">
          <b>{section.title || `Untitled ${section.kind}`}</b>
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

      <div className="tw-form-grid">
        <Field label="Section title">
          <TextInput
            value={section.title}
            maxLength={100}
            placeholder={section.kind === "project" ? "Project name" : section.kind === "anime" ? "Anime title" : "Section title"}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </Field>

        {section.kind !== "text" ? (
          <Field label={section.kind === "project" ? "One-line summary" : "Subtitle"} hint="Shown under the title.">
            <TextInput
              value={section.subtitle}
              maxLength={180}
              placeholder={section.kind === "project" ? "A Discord bot for tournament servers" : "TV · 2024 · 12 eps"}
              onChange={(event) => onChange({ subtitle: event.target.value })}
            />
          </Field>
        ) : null}

        {section.kind === "project" ? (
          <>
            <Field label="Status badge" hint="Live, In progress, Archived…">
              <TextInput value={section.status} maxLength={28} placeholder="Live" onChange={(event) => onChange({ status: event.target.value })} />
            </Field>
            <Field label="Project meta" hint="Year, role or platform.">
              <TextInput value={section.meta} maxLength={80} placeholder="2026 · Solo build" onChange={(event) => onChange({ meta: event.target.value })} />
            </Field>
          </>
        ) : null}

        {section.kind === "anime" || section.kind === "game" ? (
          <>
            <Field label="Library" hint="Fill every field from a real public catalogue." className="tw-span-2">
              <div className="tw-section-library">
                <Button icon="search" onClick={() => setLibraryOpen(true)}>
                  Browse {section.kind === "anime" ? "500+ anime" : "400+ games"}
                </Button>
                {section.meta ? <span className="tw-section-library-meta">{section.meta}</span> : null}
              </div>
            </Field>
            <Field label="Rating / genre">
              <TextInput value={section.meta} maxLength={80} placeholder="★ 8.7 · Action, Fantasy" onChange={(event) => onChange({ meta: event.target.value })} />
            </Field>
          </>
        ) : null}

        <Field label="Description" className="tw-span-2">
          <Textarea rows={4} value={section.text} maxLength={4000} placeholder="What is it, what did you build, why does it matter?" onChange={(event) => onChange({ text: event.target.value })} />
        </Field>

        <Field label="Artwork URL">
          <TextInput value={section.image.startsWith("data:") ? "" : section.image} placeholder="https://…/cover.jpg" onChange={(event) => onChange({ image: event.target.value })} />
        </Field>
        <Field label="Artwork upload" hint="Image or animated GIF under 500 KB.">
          <FileUpload aria-label={`Section ${index + 1} artwork upload`} accept="image/*" onChange={(event) => void upload(event.target.files?.[0])} />
        </Field>

        {section.kind === "project" ? (
          <Field label="Tech stack" hint="Choose languages, frameworks and tools." className="tw-span-2">
            <SkillPicker value={section.stack} onChange={stack=>onChange({stack})}/>
          </Field>
        ) : null}

        <Field label={section.kind === "project" ? "Project URL" : "Main link"} hint="Used by the card's main button.">
          <TextInput value={section.url} placeholder="https://…" onChange={(event) => onChange({ url: event.target.value })} />
        </Field>

        {section.kind === "project" ? (
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
        ) : null}
      </div>

      <MediaLibrary
        open={libraryOpen}
        kind={section.kind === "game" ? "game" : "anime"}
        onClose={() => setLibraryOpen(false)}
        onPick={(item) =>
          onChange({
            title: item.title,
            subtitle: item.subtitle,
            image: item.image,
            meta: item.meta,
            url: item.url,
            kind: item.kind,
          })
        }
      />
    </div>
  );
}
