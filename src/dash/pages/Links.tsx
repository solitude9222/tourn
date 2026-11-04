/* ---------------------------------------------------------------------------
   Links > Social Links — the real link store: add, edit, reorder, hide.

   A profile shows links as a row of icons only, so the style panel is just the
   icon colour, the icon size and an optional glow.
   --------------------------------------------------------------------------- */

import { useState } from "react";
import { ICON_SIZES, createLink, type LinkInstance } from "../../lib/links";
import { PLATFORMS, getPlatform, placeholderFor } from "../../lib/linkPlatforms";
import { PlatformIcon } from "../../components/PlatformIcons";
import { LinkGlyph } from "../../components/LinkGlyph";
import { ProfileLinks } from "../../components/ProfileLinks";
import { useDash } from "../context";
import {
  Button,
  Card,
  CardHead,
  ColorField,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Modal,
  Slider,
  TextInput,
  Toggle,
} from "../ui";

export function LinksPage() {
  const { links, setLinks } = useDash();
  const [adding, setAdding] = useState(false);
  const [platform, setPlatform] = useState("discord");
  const [editing, setEditing] = useState<LinkInstance | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const update = (id: string, patch: Partial<LinkInstance>) =>
    setLinks((current) => ({
      ...current,
      links: current.links.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    }));

  const updateDesign = (patch: Partial<typeof links.design>) =>
    setLinks((current) => ({ ...current, design: { ...current.design, ...patch } }));

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
          subtitle="One icon per link on your profile card."
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
                  <span className="tw-link-platform">
                    <LinkGlyph
                      platformId={link.platform}
                      iconUrl={link.iconUrl}
                      size={18}
                      brandIcon={getPlatform(link.platform)?.Icon}
                    />
                  </span>
                  <span className="tw-link-copy">
                    <b>{link.label || definition?.name || "Link"}</b>
                    <small>{link.url || "No URL yet"}</small>
                  </span>
                  <Toggle
                    checked={link.visible}
                    onChange={(checked) => update(link.id, { visible: checked })}
                    label={`Show ${link.label}`}
                  />
                  <IconButton
                    label={`Edit ${link.label}`}
                    icon="edit"
                    variant="primary"
                    onClick={() => setEditing(link)}
                  />
                  <IconButton
                    label={`Delete ${link.label}`}
                    icon="trash"
                    variant="danger"
                    onClick={() => remove(link.id)}
                  />
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
        <CardHead icon="palette" title="Icon style" subtitle="Applies to every link on your profile." />

        <div className="tw-icon-preview">
          <ProfileLinks links={links.links} design={links.design} />
          {links.links.length ? null : <small>Add a link to see it here.</small>}
        </div>

        <div className="tw-grid tw-grid--2" style={{ marginTop: 18 }}>
          <div className="tw-inline-toggle">
            <span>
              <b>Use brand colours</b>
              <small>Give every icon its own platform colour</small>
            </span>
            <Toggle
              checked={!links.design.iconColor}
              onChange={(checked) => updateDesign({ iconColor: checked ? "" : "#b4bffa" })}
              label="Use brand colours"
            />
          </div>
          <div className="tw-inline-toggle">
            <span>
              <b>Icon glow</b>
              <small>A coloured halo around every icon</small>
            </span>
            <Toggle
              checked={links.design.glow}
              onChange={(checked) => updateDesign({ glow: checked })}
              label="Icon glow"
            />
          </div>
        </div>

        {/* Colour pickers on the left, sliders on the right. */}
        <div className="tw-split" style={{ marginTop: 18 }}>
          <div className="tw-split-col">
            <span className="tw-split-label">Colours</span>
            <ColorField
              label="Icon colour"
              value={links.design.iconColor || "#b4bffa"}
              onChange={(value) => updateDesign({ iconColor: value })}
            />
            {links.design.glow ? (
              <ColorField
                label="Glow colour"
                value={links.design.glowColor}
                onChange={(value) => updateDesign({ glowColor: value })}
              />
            ) : null}
          </div>

          <div className="tw-split-col">
            <span className="tw-split-label">Sizes &amp; sliders</span>
            <Slider
              label="Icon size"
              value={links.design.iconSize}
              min={ICON_SIZES.min}
              max={ICON_SIZES.max}
              suffix="px"
              onChange={(value) => updateDesign({ iconSize: value })}
            />
            {links.design.glow ? (
              <Slider
                label="Glow intensity"
                value={links.design.glowIntensity}
                min={0}
                max={100}
                suffix="%"
                onChange={(value) => updateDesign({ glowIntensity: value })}
              />
            ) : null}
          </div>
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
        footer={
          <Button variant="primary" onClick={() => setEditing(null)}>
            Done
          </Button>
        }
      >
        {editing ? (
          <div className="tw-stack">
            <Field label="Label">
              <TextInput
                value={editing.label}
                maxLength={60}
                onChange={(event) => {
                  const label = event.target.value.slice(0, 60);
                  update(editing.id, { label });
                  setEditing({ ...editing, label });
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
                  const url = event.target.value.slice(0, 500);
                  update(editing.id, { url });
                  setEditing({ ...editing, url });
                }}
              />
            </Field>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
