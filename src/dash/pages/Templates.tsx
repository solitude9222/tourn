import { useCallback, useEffect, useState } from "react";
import { useDash } from "../context";
import { Button, Card, CardHead, Icon, Modal, TextInput } from "../ui";
import { api, post } from "../../lib/backend";
import { LinkerPreview } from "../../components/LinkerPreview";
import { EMPTY_ABOUT } from "../../lib/about";
import { snapshotFrom, type TemplateSnapshot } from "../../lib/templates";

/* ---------------------------------------------------------------------------
   Templates.

   Members publish their own looks and everyone can apply one. A template is
   only design: the preview and the result both use the signed-in account's own
   links, widgets and badges, so applying one can never add content you did not
   already have, and uploads never travel with it.
   --------------------------------------------------------------------------- */

type MarketTemplate = {
  id: string;
  name: string;
  note: string;
  uses: number;
  createdAt: string;
  author: string;
  mine: boolean;
  snapshot: TemplateSnapshot;
};

function TemplateStage({ snapshot }: { snapshot: TemplateSnapshot }) {
  const { user, about, links, widgets, badges } = useDash();
  return (
    <div className="tw-template-stage">
      <div className="tw-template-stage-inner">
        <LinkerPreview
          user={{ id: user.id, username: user.username, avatarUrl: about.assets.avatarUrl || user.avatarUrl }}
          about={{ ...EMPTY_ABOUT, design: snapshot.design, assets: { ...about.assets, ...snapshot.assets, avatarUrl: about.assets.avatarUrl } }}
          links={{ links: links.links, design: snapshot.links.design }}
          widgets={{ widgets: widgets.widgets, design: snapshot.widgets.design }}
          badges={{ equipped: badges.equipped, style: snapshot.badges.style }}
          showEntry={false}
          showMetadata={false}
          interactive={false}
        />
      </div>
    </div>
  );
}

export function TemplatesPage() {
  const { about, links, widgets, badges, setAbout, setLinks, setWidgets, setBadges, notify } = useDash();
  const [items, setItems] = useState<MarketTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<MarketTemplate | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const result = await api<{ templates: MarketTemplate[] }>("/api/templates");
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    // Only rows that carry a complete snapshot can be rendered safely.
    setItems(
      result.data.templates.filter(
        (item) => item.snapshot && item.snapshot.design && item.snapshot.assets && item.snapshot.links && item.snapshot.widgets && item.snapshot.badges,
      ),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = async (template: MarketTemplate) => {
    const snapshot = template.snapshot;
    setAbout((current) => ({
      ...current,
      design: { ...snapshot.design },
      assets: {
        ...current.assets,
        card: { ...snapshot.assets.card },
        effects: { ...snapshot.assets.effects },
      },
    }));
    setLinks((current) => ({ ...current, design: { ...snapshot.links.design } }));
    setWidgets((current) => ({ ...current, design: { ...snapshot.widgets.design } }));
    setBadges((current) => ({ ...current, style: { ...snapshot.badges.style } }));
    notify("Template applied", `${template.name} is on your card. Save to publish it.`);
    void post(`/api/templates/${template.id}/use`, {});
  };

  const publish = async () => {
    setBusy(true);
    setError("");
    const result = await post<{ ok: boolean; id: string }>("/api/templates", {
      name,
      note,
      snapshot: snapshotFrom(about, links, widgets, badges),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPublishing(false);
    setName("");
    setNote("");
    notify("Template published", "It is in the gallery for everyone to use.");
    await load();
  };

  const remove = async (template: MarketTemplate) => {
    const result = await api<{ ok: boolean }>(`/api/templates/${template.id}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
  };

  return (
    <>
      <Card>
        <CardHead
          icon="layers"
          title="Templates"
          subtitle="Looks published by members. Applying one changes styling only — your links, widgets and badges stay exactly yours."
        />
        <div className="tw-tpl-toolbar">
          <p className="tw-foot-note">
            {items.length} template{items.length === 1 ? "" : "s"} live · previews render with your own content
          </p>
          <Button variant="primary" icon="upload" onClick={() => setPublishing(true)}>
            Publish this look
          </Button>
        </div>
      </Card>

      {error ? (
        <p className="tw-foot-note is-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="tw-foot-note">Loading templates…</p>
      ) : items.length ? (
        <div className="tw-tpl-grid">
          {items.map((template) => (
            <article className="tw-tpl-card" key={template.id}>
              <div className="tw-tpl-stage">
                <TemplateStage snapshot={template.snapshot} />
              </div>
              <div className="tw-tpl-foot">
                <div className="tw-tpl-copy">
                  <b>{template.name}</b>
                  <small>
                    {template.note || `by @${template.author}`} · {template.uses} use{template.uses === 1 ? "" : "s"}
                  </small>
                </div>
                <div className="tw-tpl-actions">
                  {template.mine ? (
                    <Button icon="trash" onClick={() => void remove(template)}>
                      Delete
                    </Button>
                  ) : null}
                  <Button onClick={() => setPreview(template)}>Preview</Button>
                  <Button variant="primary" icon="check" onClick={() => void apply(template)}>
                    Use
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="tw-tpl-empty">
          <span className="tw-tpl-empty-icon">
            <Icon name="layers" size={20} />
          </span>
          <b>No templates yet</b>
          <p>The gallery was cleared. Publish your current card and it becomes the first one everyone can use.</p>
          <Button variant="primary" icon="upload" onClick={() => setPublishing(true)}>
            Publish this look
          </Button>
        </div>
      )}

      <Modal
        open={Boolean(preview)}
        title={preview?.name ?? "Template"}
        subtitle={preview ? `Published by @${preview.author}` : undefined}
        onClose={() => setPreview(null)}
        footer={
          preview ? (
            <>
              <Button onClick={() => setPreview(null)}>Close</Button>
              <Button
                variant="primary"
                icon="check"
                onClick={() => {
                  void apply(preview);
                  setPreview(null);
                }}
              >
                Use this look
              </Button>
            </>
          ) : null
        }
      >
        {preview ? (
          <div className="tw-template-full">
            <TemplateStage snapshot={preview.snapshot} />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={publishing}
        title="Publish this look"
        subtitle="Your card, colours, effects and link/widget/badge styling. Names, bios and uploads are never included."
        onClose={() => setPublishing(false)}
        width={480}
        footer={
          <>
            <Button onClick={() => setPublishing(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" disabled={busy || name.trim().length < 2} onClick={() => void publish()}>
              {busy ? "Publishing…" : "Publish"}
            </Button>
          </>
        }
      >
        <div className="tw-tpl-form">
          <label className="tw-field">
            Template name
            <TextInput
              value={name}
              maxLength={40}
              placeholder="e.g. Winter night"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="tw-field">
            Short note
            <TextInput
              value={note}
              maxLength={160}
              placeholder="What makes this look worth using?"
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <p className="tw-field-hint">You can keep up to 12 published templates. Delete one from the gallery to free a slot.</p>
        </div>
      </Modal>
    </>
  );
}
