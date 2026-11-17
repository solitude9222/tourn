import {SkillPicker} from "../SkillPicker";
/* ---------------------------------------------------------------------------
   Links > Social Links — the real link store: add, edit, reorder, hide.

   The page is a manage list first: one row per link with a grip, the platform
   mark, the destination and its row actions. Icon styling lives in the
   "Set color for all" sheet so the list stays as quiet as the reference.
   --------------------------------------------------------------------------- */

import { useState } from "react";
import { ICON_GAPS, ICON_SIZES, createLink, linkIconUrl, type LinkInstance } from "../../lib/links";
import { PLATFORMS, getPlatform, placeholderFor } from "../../lib/linkPlatforms";
import { PlatformIcon } from "../../components/PlatformIcons";
import { LinkGlyph } from "../../components/LinkGlyph";
import { ProfileLinks } from "../../components/ProfileLinks";
import { PageActions } from "../PageActions";
import { usePointerSort } from "../Sortable";
import { useDash } from "../context";
import {
  Button,
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

const LINK_COUNT_BASE = 10;

export function LinksPage() {
  const { links, setLinks, about, setAbout, notify } = useDash();
  const [adding, setAdding] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [platform, setPlatform] = useState("discord");
  const [editing, setEditing] = useState<LinkInstance | null>(null);

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

  const reorder = (from: number, to: number) => {
    setLinks((current) => {
      const next = [...current.links];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...current, links: next };
    });
  };

  const sortable = usePointerSort(links.links, reorder);

  const add = () => {
    const created = createLink(platform);
    setLinks((current) => ({ ...current, links: [...current.links, created] }));
    setAdding(false);
    setEditing(created);
  };

  const copyLink = async (link: LinkInstance) => {
    const text = link.url.trim();
    if (!text) {
      notify("Link", "Add a URL before copying it.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.cssText = "position:fixed;opacity:0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    notify("Link copied", text);
  };

  return (
    <>
      <PageActions>
        <Button icon="palette" onClick={() => setStyleOpen(true)}>
          Set color for all
        </Button>
        <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>
          Add link
        </Button>
      </PageActions>

      <div className="tw-manage-page tw-links-page">
        <div className="tw-manage-bar">
          <span>Manage and sort your social links</span>
          <span className="tw-manage-count">
            {links.links.length} of {Math.max(LINK_COUNT_BASE, links.links.length)} links
          </span>
        </div>

        {links.links.length ? (
          <div className="tw-manage-list">
            {links.links.map((link, index) => {
              const definition = getPlatform(link.platform);
              return (
                <div
                  key={link.id}
                  ref={sortable.register(link.id)}
                  className={[
                    "tw-manage-row",
                    link.visible ? "" : "is-hidden",
                    sortable.drag?.from === index ? "is-dragging" : "",
                    sortable.drag && sortable.drag.over === index && sortable.drag.from !== index ? "is-drop-target" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <button
                    type="button"
                    className="tw-row-grip"
                    aria-label={`Reorder ${link.label || definition?.name || "link"}`}
                    title="Drag to reorder · arrow keys also move this row"
                    aria-grabbed={sortable.drag?.from === index}
                    onPointerDown={(event) => sortable.begin(event, index)}
                    onKeyDown={(event) => sortable.keyDown(event, index)}
                  >
                    <Icon name="drag" size={16} />
                  </button>

                  <div className="tw-manage-content">
                    <div className="tw-manage-head">
                      <span className="tw-manage-icon" style={{ ["--link-color" as string]: definition?.color }}>
                        <LinkGlyph
                          platformId={link.platform}
                          iconUrl={linkIconUrl(link)}
                          size={23}
                          brandIcon={definition?.Icon}
                        />
                      </span>
                      <span className="tw-manage-copy">
                        <b>
                          {link.label || definition?.name || "Link"}
                          {link.visible ? null : <em className="tw-manage-badge">Hidden</em>}
                        </b>
                        <small>{link.url || "No URL yet"}</small>
                      </span>
                      <span className="tw-manage-actions">
                        <IconButton
                          label={`Copy ${link.label || definition?.name || "link"}`}
                          icon="copy"
                          onClick={() => void copyLink(link)}
                        />
                        <IconButton
                          label={`Edit ${link.label || definition?.name || "link"}`}
                          icon="edit"
                          onClick={() => setEditing(link)}
                        />
                        <IconButton
                          label={`Delete ${link.label || definition?.name || "link"}`}
                          icon="trash"
                          variant="danger"
                          onClick={() => remove(link.id)}
                        />
                      </span>
                    </div>
                  </div>
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

        <details className="tw-manage-extra">
          <summary>
            <span>
              <b>Profile skills</b>
              <small>Each skill appears as its own pill below your profile.</small>
            </span>
            <span className="tw-manage-extra-count">{about.design.skills?.length || 0}</span>
            <Icon name="chevron-down" size={15} />
          </summary>
          <div className="tw-manage-extra-body">
            <SkillPicker value={about.design.skills || []} onChange={(skills) => setAbout((current) => ({ ...current, design: { ...current.design, skills } }))} />
          </div>
        </details>
      </div>

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
            <div className="tw-inline-toggle">
              <span>
                <b>Show on profile</b>
                <small>Hidden links stay here but are left off the public page.</small>
              </span>
              <Toggle
                checked={editing.visible}
                onChange={(visible) => {
                  update(editing.id, { visible });
                  setEditing({ ...editing, visible });
                }}
                label="Show on profile"
              />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={styleOpen}
        title="Icon style"
        subtitle="These settings apply to every social link on your profile."
        onClose={() => setStyleOpen(false)}
        footer={
          <Button variant="primary" onClick={() => setStyleOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="tw-icon-preview">
          <ProfileLinks
            links={links.links}
            design={links.design}
            tooltipStyle={about.design.tooltips.style}
            tooltipEnabled={about.design.tooltips.enabled}
          />
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
              onChange={(checked) => updateDesign({ iconColor: checked ? "" : "#ff8f92" })}
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

        <div className="tw-split" style={{ marginTop: 18 }}>
          <div className="tw-split-col">
            <span className="tw-split-label">Colours</span>
            <ColorField
              label="Icon colour"
              value={links.design.iconColor || "#ff8f92"}
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
            <Slider
              label="Icon spacing"
              value={links.design.iconGap}
              min={ICON_GAPS.min}
              max={ICON_GAPS.max}
              suffix="px"
              onChange={(value) => updateDesign({ iconGap: value })}
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
      </Modal>
    </>
  );
}
