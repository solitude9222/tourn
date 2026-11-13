import { useState } from "react";
import { useDash } from "../context";
import { Button, Card, CardHead, Modal } from "../ui";
import { LinkerPreview } from "../../components/LinkerPreview";
import { EMPTY_ABOUT } from "../../lib/about";
import { TEMPLATE_GALLERY, type GalleryTemplate } from "../../lib/templateGallery";
import type { TemplateSnapshot } from "../../lib/templates";

/* ---------------------------------------------------------------------------
   Templates.

   Full looks, applied in one click. A template is only design: the preview and
   the result both use the signed-in account's own links, widgets and badges, so
   applying one can never add a link or a widget you did not already have.
   --------------------------------------------------------------------------- */

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
  const [preview, setPreview] = useState<GalleryTemplate | null>(null);

  const apply = (template: GalleryTemplate) => {
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
  };

  return (
    <>
      <Card>
        <CardHead
          icon="layers"
          title="Templates"
          subtitle="A complete look in one click. Your links, widgets and badges stay exactly yours — only the styling changes."
        />
        <p className="tw-foot-note">
          Previews are rendered with your own links and widgets, so what you see is what your page will look like.
        </p>
      </Card>

      <div className="tw-tpl-grid">
        {TEMPLATE_GALLERY.map((template) => (
          <article className="tw-tpl-card" key={template.id}>
            <div className="tw-tpl-stage">
              <TemplateStage snapshot={template.snapshot} />
            </div>
            <div className="tw-tpl-foot">
              <div className="tw-tpl-copy">
                <b>{template.name}</b>
                <small>{template.note}</small>
              </div>
              <div className="tw-tpl-actions">
                <Button onClick={() => setPreview(template)}>Preview</Button>
                <Button variant="primary" icon="check" onClick={() => apply(template)}>
                  Use
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={Boolean(preview)}
        title={preview?.name ?? "Template"}
        subtitle="Your links and widgets, wearing this look."
        onClose={() => setPreview(null)}
        footer={
          preview ? (
            <>
              <Button onClick={() => setPreview(null)}>Close</Button>
              <Button
                variant="primary"
                icon="check"
                onClick={() => {
                  apply(preview);
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

      <p className="tw-foot-note">
        Applied templates change the card, colours, effects and the styling of {links.links.length} link
        {links.links.length === 1 ? "" : "s"} and {widgets.widgets.length} widget{widgets.widgets.length === 1 ? "" : "s"} — never their
        contents.
      </p>
    </>
  );
}
