import { useMemo } from "react";
import type { Account } from "../lib/auth";
import { EMPTY_ABOUT, loadAbout, type About } from "../lib/about";
import { EMPTY_WIDGET_STORE, loadWidgetStore, type WidgetStore } from "../lib/widgets";
import { EMPTY_BADGE_STORE, loadBadgeStore, type BadgeStore } from "../lib/badges";
import { EMPTY_LINK_STORE, loadLinkStore, type LinkStore } from "../lib/links";
import { LinkerPreview } from "./LinkerPreview";
import { Oneko } from "./Oneko";
import { SiteBackdrop } from "./Chrome";
import { ArrowRight } from "./Icons";
import "../about.css";

type ProfileData = {
  about: About;
  widgets: WidgetStore;
  badges: BadgeStore;
  links: LinkStore;
};

/**
 * /demo — the real public link page, not the marketing home page.
 *
 * - The owner account (flagged server-side) sees their live dashboard data.
 * - Any signed-in account previews its own public page.
 * - Visitors see the owner's profile row (Railway Postgres) once it exists.
 * - With no owner configured, the home page's ambient background and logo
 *   sit behind a simple "this handle isn't taken — sign up" prompt. No fake
 *   data, ever.
 */
export function DemoPage({
  user,
  isOwner,
  first,
  about,
  widgets,
  badges,
  links,
  onSignUp,
}: {
  user: Account | null;
  isOwner: boolean;
  first: Account | null;
  about: About;
  widgets: WidgetStore;
  badges: BadgeStore;
  links: LinkStore;
  onSignUp: () => void;
}) {
  const owner = (isOwner && user ? user : null) ?? user ?? first;

  const data = useMemo<ProfileData | null>(() => {
    if (!owner) return null;
    if (isOwner && user) return { about, widgets, badges, links };

    const stored: ProfileData = {
      about: loadAbout(owner.id),
      widgets: loadWidgetStore(owner.id),
      badges: loadBadgeStore(owner.id),
      links: loadLinkStore(owner.id),
    };
    const empty =
      !stored.about.displayName.trim() &&
      !stored.about.bio.trim() &&
      !stored.widgets.widgets.length &&
      !stored.links.links.length;
    return empty ? null : stored;
  }, [owner, isOwner, user, about, widgets, badges, links]);

  if (!owner || !data) {
    return (
      <section className="profile-page demo-page">
        <SiteBackdrop />
        <div className="demo-claim">
          <img className="demo-claim-logo" src="/logo.png" alt="" width={72} height={72} />
          <span className="demo-claim-brand">
            tourn<span>.</span>lol
          </span>
          <p className="demo-claim-handle">
            tourn.lol/<b>yourname</b> isn't taken.
          </p>
          <button type="button" className="btn btn-primary demo-claim-btn" onClick={onSignUp}>
            Sign up and claim it
            <ArrowRight size={15} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-page demo-page">
      <Oneko enabled={Boolean(data.about.design.oneko)} />
      <LinkerPreview
        user={owner}
        about={data.about}
        widgets={data.widgets}
        badges={data.badges}
        links={data.links}
        interactive
      />
    </section>
  );
}
