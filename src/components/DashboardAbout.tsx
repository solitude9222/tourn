import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { Account } from "../lib/auth";
import {
  DEFAULT_ABOUT_DESIGN,
  MAX_BIO_LENGTH,
  type About,
  type AboutDesign,
  type AboutMetadata,
  type ProfileColors,
  type TabAnimation,
} from "../lib/about";
import { ImageUpload } from "./ImageUpload";
import { Select } from "./Select";
import type { WidgetStore } from "../lib/widgets";
import { RichText } from "./RichText";
import {
  CalendarIcon,
  CheckIcon,
  ChevronIcon,
  ClockIcon,
  CodeIcon,
  LinkIcon,
  PaletteIcon,
  PinIcon,
  SlidersIcon,
  UserIcon,
} from "./Icons";
import "../about.css";

const LOCATION_POSITIONS = [
  { value: "under-name", label: "Under the username" },
  { value: "top", label: "Beside the avatar" },
  { value: "footer", label: "Card footer" },
  { value: "hidden", label: "Hidden" },
];

const JOIN_POSITIONS = [
  { value: "footer", label: "Bottom-left" },
  { value: "under-name", label: "Under the username" },
  { value: "hidden", label: "Hidden" },
];

export function DashboardAbout({
  user,
  about,
  widgets,
  onSave,
}: {
  user: Account;
  about: About;
  widgets: WidgetStore;
  onSave: (about: About) => void;
}) {
  const [draft, setDraft] = useState<About>(about);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(about);
  }, [about]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(about);
  const lineCount = draft.bio ? draft.bio.split("\n").length : 0;

  const update = (patch: Partial<About>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  const updateMetadata = (patch: Partial<AboutMetadata>) => {
    setDraft((current) => ({ ...current, metadata: { ...current.metadata, ...patch } }));
  };

  const updateDesign = (patch: Partial<AboutDesign>) => {
    setDraft((current) => ({ ...current, design: { ...current.design, ...patch } }));
    setSaved(false);
  };

  const applyMarkup = (before: string, after: string, placeholder: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = draft.bio.slice(start, end) || placeholder;
    const next = `${draft.bio.slice(0, start)}${before}${selected}${after}${draft.bio.slice(end)}`.slice(
      0,
      MAX_BIO_LENGTH,
    );
    update({ bio: next });
    window.requestAnimationFrame(() => {
      el.focus();
      const selectionStart = start + before.length;
      el.setSelectionRange(selectionStart, selectionStart + selected.length);
    });
  };

  const insertToken = (token: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = `${draft.bio.slice(0, start)}${token}${draft.bio.slice(end)}`.slice(0, MAX_BIO_LENGTH);
    update({ bio: next });
    window.requestAnimationFrame(() => {
      el.focus();
      const cursor = start + token.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const prefixLine = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = draft.bio.lastIndexOf("\n", start - 1) + 1;
    const existing = draft.bio.slice(lineStart).match(/^(#{1,3}|>|[-*])\s+/)?.[0] ?? "";
    const next = `${draft.bio.slice(0, lineStart)}${prefix}${draft.bio.slice(lineStart + existing.length)}`.slice(
      0,
      MAX_BIO_LENGTH,
    );
    update({ bio: next });
    window.requestAnimationFrame(() => {
      el.focus();
      const cursor = start - existing.length + prefix.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: About = {
      ...draft,
      displayName: draft.displayName.trim(),
      bio: draft.bio.slice(0, MAX_BIO_LENGTH),
      location: draft.location.trim(),
    };
    setDraft(next);
    onSave(next);
    setSaved(true);
  };

  return (
    <>
      <div className="about-page" key={user.id}>
        <form className="about-editor" id="about-form" onSubmit={submit}>
          <section className="dash-panel about-panel" data-reveal>
            <header className="about-panel-head">
              <div>
                <h2>Customization</h2>
                <p>Your name, description, location and where the location and join date sit. Card styling lives in Card/layout.</p>
              </div>
            </header>

            <div className="about-block">
              <span className="about-label">Display name</span>
              <div className="about-input-with-icon">
                <UserIcon size={13} />
                <input
                  value={draft.displayName}
                  onChange={(event) => update({ displayName: event.target.value.slice(0, 32) })}
                  placeholder={user.username}
                  maxLength={32}
                  autoComplete="nickname"
                />
              </div>
              <small className="about-help">
                Leave empty to use your account name. If that's empty too, your profile shows no name.
              </small>
            </div>

            <div className="about-block">
              <div className="about-block-head">
                <span className="about-label">Description</span>
                <span className="about-counter">
                  {lineCount}/10 lines · {draft.bio.length}/{MAX_BIO_LENGTH}
                </span>
              </div>

              <div className="about-rich">
                <div className="rich-toolbar" role="toolbar" aria-label="Description formatting">
                  <div className="rich-tool-group">
                    <button type="button" className="rich-tool" title="Bold — **text**" onClick={() => applyMarkup("**", "**", "bold text")}>
                      <b>B</b>
                    </button>
                    <button type="button" className="rich-tool" title="Italic — *text*" onClick={() => applyMarkup("*", "*", "italic text")}>
                      <i>I</i>
                    </button>
                    <button type="button" className="rich-tool" title="Underline — __text__" onClick={() => applyMarkup("__", "__", "underlined text")}>
                      <u>U</u>
                    </button>
                    <button type="button" className="rich-tool" title="Strikethrough — ~~text~~" onClick={() => applyMarkup("~~", "~~", "strikethrough")}>
                      <s>S</s>
                    </button>
                    <button type="button" className="rich-tool" title="Highlight — ==text==" onClick={() => applyMarkup("==", "==", "highlighted text")}>
                      <span className="rt-highlight">A</span>
                    </button>
                  </div>

                  <span className="rich-tool-sep" />

                  <div className="rich-tool-group">
                    <button type="button" className="rich-tool" title="Heading 1 — # Heading" onClick={() => prefixLine("# ")}>
                      <span className="rich-tool-h">H1</span>
                    </button>
                    <button type="button" className="rich-tool" title="Heading 2 — ## Heading" onClick={() => prefixLine("## ")}>
                      <span className="rich-tool-h">H2</span>
                    </button>
                    <button type="button" className="rich-tool" title="Quote — > text" onClick={() => prefixLine("> ")}>
                      <span className="rich-tool-quote">“</span>
                    </button>
                    <button type="button" className="rich-tool" title="Bullet list — - item" onClick={() => prefixLine("- ")}>
                      <span className="rich-tool-list">≡</span>
                    </button>
                  </div>

                  <span className="rich-tool-sep" />

                  <div className="rich-tool-group">
                    <button type="button" className="rich-tool" title="Inline code — `code`" onClick={() => applyMarkup("`", "`", "code")}>
                      <CodeIcon size={13} />
                    </button>
                    <button type="button" className="rich-tool" title="Code block — ```" onClick={() => applyMarkup("\n```\n", "\n```\n", "your code")}>
                      <span className="rich-tool-code">{"{ }"}</span>
                    </button>
                    <button type="button" className="rich-tool" title="Insert link — [label](https://…)" onClick={() => applyMarkup("[", "](https://example.com)", "link label")}>
                      <LinkIcon size={13} />
                    </button>
                    <button type="button" className="rich-tool" title="Spoiler — ||text||" onClick={() => applyMarkup("||", "||", "hidden text")}>
                      <span className="rich-tool-spoiler">spoiler</span>
                    </button>
                  </div>

                  <span className="rich-tool-sep" />

                  <div className="rich-tool-group rich-tool-group--live">
                    <button type="button" className="rich-tool" title="Insert live clock" onClick={() => insertToken("{{clock}}")}>
                      <ClockIcon size={12} />
                    </button>
                    <button type="button" className="rich-tool" title="Insert today's date" onClick={() => insertToken("{{date}}")}>
                      <CalendarIcon size={12} />
                    </button>
                    <button type="button" className="rich-tool rich-tool--text" title="Insert current timestamp" onClick={() => insertToken(`{{stamp:${Date.now()}}}`)}>
                      stamp
                    </button>
                    <button type="button" className="rich-tool rich-tool--text" title="Insert a live countdown" onClick={() => insertToken(`{{countdown:${Date.now() + 604_800_000}}}`)}>
                      countdown
                    </button>
                  </div>
                </div>

                <div className="rich-editor-grid">
                  <textarea
                    ref={textareaRef}
                    value={draft.bio}
                    onChange={(event) => update({ bio: event.target.value.slice(0, MAX_BIO_LENGTH) })}
                    placeholder="Tell visitors a bit about you"
                    rows={9}
                    maxLength={MAX_BIO_LENGTH}
                    spellCheck={false}
                  />
                  <div className="rich-live-preview">
                    {draft.bio.trim() ? (
                      <RichText text={draft.bio} />
                    ) : (
                      <span className="rich-live-empty">Your preview will appear here as you type.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="about-columns">
              <label className="about-field">
                <span>Location</span>
                <div className="about-input-with-icon">
                  <PinIcon size={13} />
                  <input
                    value={draft.location}
                    onChange={(event) => update({ location: event.target.value.slice(0, 64) })}
                    placeholder="e.g. Berlin, Germany"
                    maxLength={64}
                  />
                </div>
              </label>

              <div className="about-field">
                <span>Location placement</span>
                <Select
                  value={draft.design.locationPosition}
                  ariaLabel="Location placement"
                  options={LOCATION_POSITIONS}
                  onChange={(value) =>
                    updateDesign({ locationPosition: value as AboutDesign["locationPosition"] })
                  }
                />
              </div>

              <div className="about-field">
                <span>Join date placement</span>
                <Select
                  value={draft.design.joinPosition}
                  ariaLabel="Join date placement"
                  options={JOIN_POSITIONS}
                  onChange={(value) =>
                    updateDesign({ joinPosition: value as AboutDesign["joinPosition"] })
                  }
                />
              </div>

                                        </div>

          </section>

          <section className="dash-panel about-panel" data-reveal data-reveal-delay="60">
            <header className="about-panel-head">
              <div>
                <h2>Metadata</h2>
                <p>What the browser tab and the link show when someone opens tourn.lol/{user.username}.</p>
              </div>
            </header>

            <label className="about-field">
              <span>Tab name</span>
              <input
                value={draft.metadata.title}
                onChange={(event) => updateMetadata({ title: event.target.value.slice(0, 60) })}
                placeholder={draft.displayName.trim() || user.username}
                maxLength={60}
              />
            </label>
            <p className="about-help">Leave empty to use your name and tourn.lol.</p>

            <div className="about-block">
              <span className="about-label">Favicon</span>
              <ImageUpload
                label="favicon"
                value={draft.metadata.faviconUrl}
                onChange={(value) => updateMetadata({ faviconUrl: value })}
                hint="The little icon in the browser tab and next to the link. Empty = your profile picture."
                recommended="Square image · 128 × 128 or larger"
                variant="compact"
                maxWidth={128}
                maxHeight={128}
              />
            </div>

            <div className="about-columns">
              <div className="about-field">
                <span>Tab animation</span>
                <Select
                  value={draft.metadata.animation}
                  ariaLabel="Tab animation"
                  options={[
                    { value: "none", label: "Static" },
                    { value: "cycle", label: "Cycle messages" },
                    { value: "typewriter", label: "Typewriter" },
                  ]}
                  onChange={(value) => updateMetadata({ animation: value as TabAnimation })}
                />
              </div>

              <label className="about-field">
                <span>Seconds per message</span>
                <input
                  type="number"
                  min={2}
                  max={30}
                  value={draft.metadata.interval}
                  onChange={(event) =>
                    updateMetadata({ interval: Math.min(30, Math.max(2, Number(event.target.value) || 6)) })
                  }
                />
              </label>
            </div>

            <label className="about-field">
              <span>Tab messages (one per line)</span>
              <textarea
                rows={3}
                value={draft.metadata.messages.join("\n")}
                onChange={(event) =>
                  updateMetadata({
                    messages: event.target.value
                      .split("\n")
                      .map((line) => line.slice(0, 60))
                      .slice(0, 8),
                  })
                }
                placeholder={"tourn.lol\n@" + user.username}
                spellCheck={false}
              />
            </label>
            <p className="about-help">
              Only used when an animation is selected. Empty lines are ignored.
            </p>
          </section>

          <div className="about-savebar">
            <span className="about-save-note">Saved in this browser</span>
            <div className="about-save-actions">
              {saved && !dirty ? (
                <span className="about-saved">
                  <CheckIcon size={12} />
                  Saved
                </span>
              ) : null}
              <button type="submit" className="btn btn-primary btn-sm" disabled={!dirty}>
                Save changes
              </button>
            </div>
          </div>
        </form>
      </div>

    </>
  );
}
