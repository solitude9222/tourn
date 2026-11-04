/* ---------------------------------------------------------------------------
   Links > Social Links — the real link store: add, edit, reorder, hide.
   --------------------------------------------------------------------------- */

import { useState } from "react";
import {
  CARD_STYLES,
  LINK_PRESETS,
  createLink,
  type LinkInstance,
} from "../../lib/links";
import { PLATFORMS, getPlatform, placeholderFor } from "../../lib/linkPlatforms";
import { PlatformIcon } from "../../components/PlatformIcons";
import { useDash } from "../context";
import {
  Button,
  Card,
  CardHead,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Modal,
  Select,
  TextInput,
  Toggle,
  Chip,
} from "../ui";

export function LinksPage() {
  const { links, setLinks, isPremium, go, notify } = useDash();
  const [adding, setAdding] = useState(false);
  const [platform, setPlatform] = useState("discord");
  const [editing, setEditing] = useState<LinkInstance | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const update = (id: string, patch: Partial<LinkInstance>) =>
    setLinks((current) => ({
      ...current,
      links: current.links.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    }));

  const remove = (id: string) =>
    setLinks((current) => ({
      ...current,
      links: current.links.filter((entry) => entry.id !== id),
    }));

  const add = () => {
    const created = createLink(platform);
    setLinks((current) => ({ ...current, links: [...current.links, created] }));
    setAdding(false);
    setEditing(created);
  };

  const reorder = (from: number, to: number) => {
    setLinks((current) => {
      const next = [...current.links];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...current, links: next };
    });
  };

  return (
    <>
      <Card>
        <CardHead
          icon="link"
          title="Social Links"
          subtitle="The links and buttons shown on your profile card."
          actions={
            <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>
              Add link
            </Button>
          }
        />

        {links.links.length ? (
          <div>
            {links.links.map((link, index) => {
              const definition = getPlatform(link.platform);
              return (
                <div
                  key={link.id}
                  className="tw-link-row"
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== index) reorder(dragIndex, index);
                    setDragIndex(null);
                  }}
                >
                  <span className="tw-drag" aria-hidden="true">
                    <Icon name="drag" size={14} />
                  </span>
                  <span className="tw-link-platform" style={{ color: link.color || undefined }}>
                    {link.iconUrl ? (
                      <img src={link.iconUrl} alt="" width={18} height={18} />
                    ) : (
                      <PlatformIcon id={link.platform} size={18} />
                    )}
                  </span>
                  <span className="tw-link-copy">
                    <b>{link.label || definition?.name || "Link"}</b>
                    <small>{link.url || "No URL yet"}</small>
                  </span>
                  {link.mode === "icon" ? <Chip>ICON</Chip> : null}
                  <Toggle
                    checked={link.visible}
                    onChange={(checked) => update(link.id, { visible: checked })}
                    label={`Show ${link.label}`}
                  />
                  <IconButton label={`Edit ${link.label}`} icon="edit" variant="primary" onClick={() => setEditing(link)} />
                  <IconButton label={`Delete ${link.label}`} icon="trash" variant="danger" onClick={() => remove(link.id)} />
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="link"
            title="No links yet"
            message="Add Discord, Spotify, Steam — anything visitors should be able to open."
            action={
              <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>
                Add your first link
              </Button>
            }
          />
        )}
      </Card>

      <Card>
        <CardHead icon="palette" title="Link Style" subtitle="Applies to every link on your profile." />
        <div className="tw-form-grid">
          <Field label="Card style">
            <Select
              value={links.design.cardStyle}
              options={CARD_STYLES.map((style) => ({ value: style.id, label: style.name }))}
              onChange={(value) =>
                setLinks((current) => ({
                  ...current,
                  design: { ...current.design, cardStyle: value as typeof current.design.cardStyle },
                }))
              }
            />
          </Field>
          <Field label="Corner radius">
            <Select
              value={String(links.design.borderRadius)}
              options={["0", "6", "8", "10", "12", "16", "24"].map((value) => ({
                value,
                label: `${value}px`,
              }))}
              onChange={(value) =>
                setLinks((current) => ({
                  ...current,
                  design: { ...current.design, borderRadius: Number(value) },
                }))
              }
            />
          </Field>
        </div>

        <div className="tw-inline-toggle" style={{ marginTop: 16 }}>
          <span>
            <b>Socials glow</b>
            <small>Coloured halo behind each link</small>
          </span>
          <Toggle
            checked={links.design.showGlow}
            onChange={(checked) =>
              setLinks((current) => ({
                ...current,
                design: { ...current.design, showGlow: checked },
              }))
            }
            label="Socials glow"
          />
        </div>

        <div className="tw-inline-toggle" style={{ marginTop: 12 }}>
          <span>
            <b>Hover tooltips</b>
            <small>Show the tooltip text on social links</small>
          </span>
          <Toggle
            checked={links.design.tooltipEnabled}
            onChange={(checked) =>
              setLinks((current) => ({
                ...current,
                design: { ...current.design, tooltipEnabled: checked },
              }))
            }
            label="Hover tooltips"
          />
        </div>

        <div className="tw-subhead">Quick looks</div>
        <div className="tw-row" style={{ flexWrap: "wrap" }}>
          {LINK_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              onClick={() => {
                if (!isPremium && (preset.patch.showGlow || preset.patch.cardStyle === "glass")) {
                  go("premium");
                  return;
                }
                setLinks((current) => ({
                  ...current,
                  design: { ...current.design, ...preset.patch },
                }));
                notify("Link style", `${preset.name} applied. Save to publish.`);
              }}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </Card>

      <Modal
        open={adding}
        title="Add a link"
        subtitle="Pick the platform — you can change the label after."
        onClose={() => setAdding(false)}
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" icon="plus" onClick={add}>
              Add link
            </Button>
          </>
        }
      >
        <span className="tw-label">Platform</span>
        <div className="tw-platform-menu" role="listbox" aria-label="Link platform">
          {PLATFORMS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="option"
              aria-selected={platform === entry.id}
              className={`tw-platform-option${platform === entry.id ? " is-active" : ""}`}
              onClick={() => setPlatform(entry.id)}
            >
              <PlatformIcon id={entry.id} size={17} />
              <span>{entry.name}</span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={Boolean(editing)}
        title="Edit link"
        subtitle={editing ? getPlatform(editing.platform)?.name : undefined}
        onClose={() => setEditing(null)}
        footer={<Button variant="primary" onClick={() => setEditing(null)}>Done</Button>}
      >
        {editing ? (
          <div className="tw-stack">
            <Field label="Label">
              <TextInput
                value={editing.label}
                maxLength={60}
                onChange={(event) => {
                  update(editing.id, { label: event.target.value.slice(0, 60) });
                  setEditing({ ...editing, label: event.target.value.slice(0, 60) });
                }}
              />
            </Field>
            <Field label="URL">
              <TextInput
                icon="link"
                value={editing.url}
                maxLength={500}
                placeholder={placeholderFor(editing.platform)}
                onChange={(event) => {
                  update(editing.id, { url: event.target.value.slice(0, 500) });
                  setEditing({ ...editing, url: event.target.value.slice(0, 500) });
                }}
              />
            </Field>
            <Field label="Description">
              <TextInput
                value={editing.description}
                maxLength={160}
                placeholder="Optional line under the label"
                onChange={(event) => {
                  update(editing.id, { description: event.target.value.slice(0, 160) });
                  setEditing({ ...editing, description: event.target.value.slice(0, 160) });
                }}
              />
            </Field>
            <Field label="Display">
              <Select
                value={editing.mode}
                options={[
                  { value: "card", label: "Card (icon + label)" },
                  { value: "icon", label: "Icon only" },
                ]}
                onChange={(value) => {
                  update(editing.id, { mode: value as LinkInstance["mode"] });
                  setEditing({ ...editing, mode: value as LinkInstance["mode"] });
                }}
              />
            </Field>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
