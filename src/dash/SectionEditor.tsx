import {usePointerSort} from "./Sortable";
import {StudioSettings} from "./StudioSettings";
import { SkillPicker } from "./SkillPicker";
import { useState, type ReactNode } from "react";
import { type ProfileSection, type ProfileSectionKind } from "../lib/about";
import { imageToDataUrl } from "./files";
import { Button, Field, FileUpload, TextInput, Textarea,Select,Slider } from "./ui";
import { MediaLibrary } from "./MediaLibrary";
import type { CatalogKind } from "../lib/mediaCatalog";
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
  handle,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  section: ProfileSection;
  index: number;
  /** Drag handle rendered in the header, owned by the list that reorders it. */
  handle?: ReactNode;
  onChange: (patch: Partial<ProfileSection>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown?: () => void;
}) {
  const { notify,about } = useDash();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryKind, setLibraryKind] = useState<CatalogKind>("anime");
  const project = section.kind === "project";
  const picks = Array.isArray(section.items) ? section.items : [];
  const reorder=(from:number,to:number)=>{const next=[...picks];const [pick]=next.splice(from,1);next.splice(to,0,pick);onChange({items:next});};
  const sortable=usePointerSort(picks,reorder);

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
    if(picks.some(item=>item.title.trim().toLowerCase()===pick.title.trim().toLowerCase() || Boolean(item.url&&pick.url&&item.url===pick.url))){notify("Already added","That interest is already in this section.");return;}
    if (picks.length >= PICK_LIMIT) {
      notify("Interests", `${PICK_LIMIT} picks is the limit for one section.`);
      return;
    }
    onChange({
      items: [
        ...picks,
        {
          ...pick,
          catalogImage: pick.catalogImage ?? pick.image,
          id: globalThis.crypto?.randomUUID?.() ?? `pick-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        },
      ],
    });
  };

  return (
    <details className={`tw-section-editor tw-section-editor--${section.kind}`}>
      <summary className="tw-section-editor-head">
        {handle}
        <span className="tw-section-number">{String(index + 1).padStart(2, "0")}</span>
        <span className="tw-section-editor-title">
          <b>{section.title || (project ? "Untitled project" : `${picks.length || ""} interest${picks.length === 1 ? "" : "s"}`.trim() || "Interests")}</b>
          <small>{KINDS.find((kind) => kind.id === section.kind)?.label} section</small>
        </span>
        <span className="tw-section-editor-actions" onClick={(event) => event.stopPropagation()}>
          {index > 0 ? (
            <Button onClick={onMoveUp} aria-label="Move section up">
              Move up
            </Button>
          ) : null}
          {onMoveDown ? (
            <Button onClick={onMoveDown} aria-label="Move section down">
              Move down
            </Button>
          ) : null}
          <Button variant="danger" icon="trash" onClick={onRemove}>
            Remove
          </Button>
        </span>
      </summary>

      <div className="tw-section-editor-body">
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
              <Field label="Artwork" hint="Any image — large photos are resized automatically." className="tw-span-2">
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
          <Field label="Library" hint="Add anime, games, music or films to this one section." className="tw-span-2">
            <div className="tw-section-library">
              {([
                ["anime", "Add anime"],
                ["game", "Add game"],
                ["artist", "Add artist"],
                ["song", "Add song"],
                ["movie", "Add film"],
              ] as [CatalogKind, string][]).map(([kind, label]) => (
                <Button key={kind} icon="plus" onClick={() => { setLibraryKind(kind); setLibraryOpen(true); }}>
                  {label}
                </Button>
              ))}
              <span className="tw-section-library-meta">
                {picks.length} / {PICK_LIMIT} picked
              </span>
            </div>
          </Field>

          {picks.length ? (
            <div className="tw-section-picks tw-span-2">
              {picks.map((pick,pickIndex) => (
                <div className="tw-section-pick" key={pick.id} ref={sortable.register(pick.id)}><Button aria-label={`Reorder ${pick.title}`} onPointerDown={event=>sortable.begin(event,pickIndex)} onKeyDown={event=>sortable.keyDown(event,pickIndex)}>↕</Button>
                  <span className="tw-section-pick-art">
                    {pick.image ? <img src={pick.image} alt="" loading="lazy" /> : null}
                  </span>
                  <span className="tw-section-pick-copy">
                    <TextInput
                      value={pick.title}
                      maxLength={100}
                      placeholder="Title"
                      aria-label={`Title for pick ${pick.title || "untitled"}`}
                      onChange={(event) =>
                        onChange({ items: picks.map((item) => (item.id === pick.id ? { ...item, title: event.target.value } : item)) })
                      }
                    />
                    <TextInput
                      value={pick.subtitle}
                      maxLength={180}
                      placeholder="Subtitle"
                      aria-label={`Subtitle for pick ${pick.title || "untitled"}`}
                      onChange={(event) =>
                        onChange({ items: picks.map((item) => (item.id === pick.id ? { ...item, subtitle: event.target.value } : item)) })
                      }
                    />
                  </span>
                  <details className="studio-pick-settings"><summary>Poster and personal details</summary><div className="tw-form-grid"><img className="studio-poster-preview" src={pick.image||"/brand/tourn-mark.svg"} alt={pick.title} style={{objectPosition:`${pick.cropX??50}% ${pick.cropY??50}%`,transform:`scale(${pick.zoom??1})`}}/><Field label="Category"><Select ariaLabel={`Category for ${pick.title}`} value={pick.category||'anime'} options={['anime','game','music','film'].map(value=>({value,label:value}))} onChange={category=>onChange({items:picks.map(item=>item.id===pick.id?{...item,category}:item)})}/></Field><Field label="Status"><Select ariaLabel={`Status for ${pick.title}`} value={pick.status||''} options={['','Watching','Playing','Completed','Planned','Favourite'].map(value=>({value,label:value||'None'}))} onChange={status=>onChange({items:picks.map(item=>item.id===pick.id?{...item,status}:item)})}/></Field><Slider label={`Rating for ${pick.title}`} value={pick.rating||0} min={0} max={10} step={.5} onChange={rating=>onChange({items:picks.map(item=>item.id===pick.id?{...item,rating}:item)})}/><Field label="Personal note"><Textarea rows={2} value={pick.notes||''} onChange={event=>onChange({items:picks.map(item=>item.id===pick.id?{...item,notes:event.target.value}:item)})}/></Field>{(['cropX','cropY','zoom'] as const).map(key=><Slider key={key} label={`${key==='zoom'?'Poster zoom':key==='cropX'?'Horizontal crop':'Vertical crop'} for ${pick.title}`} min={key==='zoom'?1:0} max={key==='zoom'?2:100} step={key==='zoom'?.05:1} value={pick[key]??(key==='zoom'?1:50)} onChange={value=>onChange({items:picks.map(item=>item.id===pick.id?{...item,[key]:value}:item)})}/>)}</div></details>
                  <span className="tw-section-pick-actions">
                    <label className="tw-section-pick-poster">
                      <input
                        type="file"
                        accept="image/*"
                        aria-label={`Upload poster for ${pick.title || "pick"}`}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (!file) return;
                          if (!file.type.startsWith("image/")) {
                            notify("Poster", "Choose a PNG, JPG, WebP or GIF image.");
                            return;
                          }
                          try {
                            const image = await imageToDataUrl(file, 900, 1200, 0.86);
                            onChange({
                              items: picks.map((item) =>
                                item.id === pick.id
                                  ? { ...item, image, catalogImage: item.catalogImage ?? pick.image }
                                  : item,
                              ),
                            });
                            notify("Poster updated", "The custom poster is used on your profile.");
                          } catch {
                            notify("Poster", "That image could not be read. Try a different file.");
                          }
                        }}
                      />
                      {pick.image && pick.image !== pick.catalogImage ? "Change poster" : "Upload poster"}
                    </label>
                    {pick.catalogImage && pick.image !== pick.catalogImage ? (
                      <button
                        type="button"
                        className="tw-section-pick-reset"
                        onClick={() =>
                          onChange({
                            items: picks.map((item) =>
                              item.id === pick.id ? { ...item, image: item.catalogImage ?? "" } : item,
                            ),
                          })
                        }
                      >
                        Reset art
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="tw-section-pick-remove"
                      aria-label={`Remove ${pick.title || "pick"}`}
                      onClick={() => onChange({ items: picks.filter((item) => item.id !== pick.id) })}
                    >
                      ×
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="tw-empty-note tw-span-2">Nothing picked yet — “Add anime”, “Add game”, “Add artist”, “Add song” or “Add film” opens the library.</p>
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

      {!project?<StudioSettings group="interests"/>:null}
      <MediaLibrary
        open={libraryOpen}
        kind={libraryKind}
        onClose={() => setLibraryOpen(false)}
        onPick={(item) =>
          addPick({
            category:libraryKind==="game"?"game":libraryKind==="movie"?"film":["song","artist"].includes(libraryKind)?"music":"anime",
            title: item.title,
            subtitle: item.subtitle,
            image: item.image,
            meta: item.meta,
            url: item.url,
          })
        }
      />
      </div>
    </details>
  );
}
