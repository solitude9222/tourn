import { useEffect, useState } from "react";
import { chooseHomePreview, initialHomePreviews, refreshHomePreviews } from "../lib/homePreview";
import { DEFAULT_ABOUT_DESIGN, type About } from "../lib/about";
import { DEFAULT_PROFILE_ASSETS } from "../lib/profileAssets";
import { DEFAULT_BADGE_STYLE, type BadgeInstance, type BadgeStyle } from "../lib/badges";
import { DEFAULT_LINK_DESIGN, type LinkInstance, type LinkStore } from "../lib/links";
import { formatJoined } from "../lib/format";
import { getViewCount } from "../lib/views";
import type { ProfilePayload } from "../lib/serverProfile";
import { DEFAULT_WIDGET_DESIGN, type WidgetStore } from "../lib/widgets";
import { ProfilePreview } from "./ProfilePreview";
import { WidgetCard } from "./WidgetCard";

/**
 * The home page's example card.
 *
 * It shows a real published tourn.lol profile — the same document visitors get
 * at tourn.lol/<handle>, including the links, badges and layout saved there —
 * so the demo can never drift from the product. The card below is only the
 * first-paint fallback when no preview is configured.
 */
const FALLBACK_ABOUT: About = {
  displayName: "tourn",
  bio: "One link for everything you play.\nDiscord, music and games — always current.",
  location: "tourn.lol",
  metadata: { title: "", faviconUrl: "", animation: "none", messages: [], interval: 6 },
  design: { ...DEFAULT_ABOUT_DESIGN, tilt: 8 },
  assets: DEFAULT_PROFILE_ASSETS,
};

const FALLBACK_BADGES: BadgeInstance[] = [
  { id: "owner", visible: true },
  { id: "staff", visible: true },
  { id: "verified", visible: true },
];

const FALLBACK_LINKS: LinkInstance[] = [];

const FALLBACK_LINK_DESIGN = { ...DEFAULT_LINK_DESIGN };

type LiveCard = {
  about: About;
  badges: BadgeInstance[];
  badgeStyle: BadgeStyle;
  links: LinkInstance[];
  linkDesign: typeof FALLBACK_LINK_DESIGN | LinkStore["design"];
  widgets: WidgetStore;
  username: string;
  id: string;
  uid?: number | null;
  avatar: string;
  joined: string;
};

function toLiveCard(data: ProfilePayload): LiveCard | null {
  const document = data.profile;
  if (!document) return null;
  return {
    about: document.about,
    // Unknown earned list (no server field) must not empty the row.
    badges: data.earned
      ? document.badges.equipped.filter((badge) => data.earned!.includes(badge.id))
      : document.badges.equipped,
    badgeStyle: document.badges.style ?? DEFAULT_BADGE_STYLE,
    links: document.links.links,
    linkDesign: document.links.design ?? DEFAULT_LINK_DESIGN,
    widgets: document.widgets,
    username: data.account.username,
    id: data.account.id,
    uid: data.account.uid,
    avatar: data.account.avatarUrl || "/logo.png",
    joined: formatJoined(new Date(data.account.joinedAt)),
  };
}

export function ProfileCard() {
  // The card paints from the bundled snapshot (or a newer local copy) on the
  // very first frame, then refreshes quietly. The handle picked on this page
  // load never changes mid-view, so fresh data cannot swap the hero profile.
  const [bundled] = useState(initialHomePreviews);
  const [pool, setPool] = useState(bundled);
  const [pickedHandle, setPickedHandle] = useState(
    () => chooseHomePreview(bundled)?.account.username ?? null,
  );
  const [views, setViews] = useState<number | null>(null);

  const selected = (() => {
    if (pool.mode === "off" || !pickedHandle) return null;
    const key = pickedHandle.toLowerCase();
    return (
      pool.profiles.find((row) => row.account.username.toLowerCase() === key) ??
      bundled.profiles.find((row) => row.account.username.toLowerCase() === key) ??
      null
    );
  })();
  const live = selected ? toLiveCard(selected) : null;

  useEffect(() => {
    let active = true;
    void refreshHomePreviews().then((next) => {
      if (!active || !next) return;
      setPool(next);
      // An admin may have changed the mode since the snapshot was built;
      // re-pick once so the setting (off / fixed / random) is honoured.
      if (next.mode !== bundled.mode) {
        setPickedHandle(chooseHomePreview(next)?.account.username ?? null);
      }
    });
    return () => {
      active = false;
    };
  }, [bundled.mode]);

  useEffect(() => {
    let active = true;
    setViews(null);
    if (live) {
      void getViewCount(live.username).then((count) => {
        if (active) setViews(count);
      });
    }
    return () => {
      active = false;
    };
  }, [live?.username]);

  // The saved design is used as-is: width, radius, padding, avatar size, gap
  // and tilt on the home card are the same numbers as on the real profile.
  // The one deliberate exception is the beam ring — the hero always shows it,
  // so the effect that circles the card edge is what a first-time visitor sees.
  const about: About = live
    ? {
        ...live.about,
        assets: {
          ...live.about.assets,
          card: {
            id: "beam",
            color: live.about.assets.card.color || "#ff9d98",
            intensity: Math.max(70, live.about.assets.card.intensity),
            speed: live.about.assets.card.speed || 6,
          },
        },
      }
    : FALLBACK_ABOUT;

  // The hero shows the widgets saved on the real profile. Nothing is invented:
  // an account with no widgets simply gets a card without that block.
  const heroWidgets: WidgetStore = live?.widgets ?? {
    widgets: [],
    design: DEFAULT_WIDGET_DESIGN,
  };
  const heroVisible = heroWidgets.widgets.filter((widget) => widget.visible !== false);
  // Same lead card as the real profile: Discord on its own full-width row.
  const heroOrdered = [...heroVisible].sort((a, b) =>
    a.platform === "discord" ? -1 : b.platform === "discord" ? 1 : 0,
  );
  const heroCards = heroOrdered.slice(0, 4).map((widget) => (
    <WidgetCard
      key={widget.id}
      widget={widget}
      design={heroWidgets.design}
      className={`widget-card--linker${
        widget.platform === "discord" ? " widget-card--wide" : ""
      }`}
    />
  ));

  return (
    <aside className="hero-profile" aria-label="The live tourn.lol profile card">
      <ProfilePreview
        user={{
          id: live?.id || "demo",
          uid: live?.uid || 1,
          username: live?.username ?? "tourn",
          avatarUrl: live?.avatar ?? "/logo.png",
        }}
        about={about}
        badges={live?.badges ?? FALLBACK_BADGES}
        badgeStyle={live?.badgeStyle ?? DEFAULT_BADGE_STYLE}
        links={live?.links ?? FALLBACK_LINKS}
        linkDesign={live?.linkDesign ?? FALLBACK_LINK_DESIGN}
        views={views}
        joined={live?.joined}
        // The hero is a preview: no music, no player chrome, and no footer
        // stats — location, join date and view counts belong to the real
        // profile page, not to the landing page card.
        hideAudio
        hideViews
        hideJoined
        hideLocation
      >
        {heroCards.length ? (
          <div className="lkr-widgets-block">
            <div className="lkr-widgets" style={{ gap: heroWidgets.design.gap }}>
              {heroCards}
            </div>
          </div>
        ) : null}
      </ProfilePreview>
    </aside>
  );
}
