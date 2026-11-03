import { useEffect, useState } from "react";
import { DEFAULT_ABOUT_DESIGN, type About } from "../lib/about";
import { DEFAULT_PROFILE_ASSETS } from "../lib/profileAssets";
import { DEFAULT_BADGE_STYLE, type BadgeInstance, type BadgeStyle } from "../lib/badges";
import { DEFAULT_LINK_DESIGN, type LinkInstance, type LinkStore } from "../lib/links";
import { formatJoined } from "../lib/format";
import { getViewCount } from "../lib/views";
import { fetchPublicProfile } from "../lib/serverProfile";
import { ArrowUpRight } from "./Icons";
import { ProfilePreview } from "./ProfilePreview";

/**
 * The home page's example card.
 *
 * It shows the *real* tourn.lol profile — the same document visitors get at
 * tourn.lol/tourn, including the links, badges and layout saved there — so the
 * demo can never drift from the product. The copy below is only the
 * first-paint fallback for a cold backend, and it carries no fake links.
 */
const HOME_HANDLE = "tourn";

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

const FALLBACK_LINK_DESIGN = { ...DEFAULT_LINK_DESIGN, iconOnly: true, cardStyle: "outline" as const };

type LiveCard = {
  about: About;
  badges: BadgeInstance[];
  badgeStyle: BadgeStyle;
  links: LinkInstance[];
  linkDesign: typeof FALLBACK_LINK_DESIGN | LinkStore["design"];
  username: string;
  avatar: string;
  joined: string;
};

export function ProfileCard() {
  const [live, setLive] = useState<LiveCard | null>(null);
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    void fetchPublicProfile(HOME_HANDLE).then((result) => {
      if (!active || !result.ok) return;
      const data = result.data;
      const document = data.profile;
      if (!document) return;
      setLive({
        about: document.about,
        badges: document.badges.equipped.filter((badge) => data.earned.includes(badge.id)),
        badgeStyle: document.badges.style ?? DEFAULT_BADGE_STYLE,
        links: document.links.links,
        linkDesign: document.links.design ?? DEFAULT_LINK_DESIGN,
        username: data.account.username,
        avatar: data.account.avatarUrl || "/logo.png",
        joined: formatJoined(new Date(data.account.joinedAt)),
      });
    });

    void getViewCount(HOME_HANDLE).then((count) => {
      if (active && count > 0) setViews(count);
    });

    return () => {
      active = false;
    };
  }, []);

  // The saved design is used as-is: width, radius, padding, avatar size, gap
  // and tilt on the home card are the same numbers as on tourn.lol/tourn.
  // The one deliberate exception is the beam ring — the hero always shows it,
  // so the effect that circles the card edge is what a first-time visitor sees.
  const about: About = live
    ? {
        ...live.about,
        assets: {
          ...live.about.assets,
          card: {
            id: "beam",
            color: live.about.assets.card.color || "#b4bffa",
            intensity: Math.max(70, live.about.assets.card.intensity),
            speed: live.about.assets.card.speed || 6,
          },
        },
      }
    : FALLBACK_ABOUT;

  return (
    <aside className="hero-profile" aria-label="The live tourn.lol profile card">
      <ProfilePreview
        user={{
          id: live ? HOME_HANDLE : "demo",
          uid: 1,
          username: live?.username ?? HOME_HANDLE,
          avatarUrl: live?.avatar ?? "/logo.png",
        }}
        about={about}
        badges={live?.badges ?? FALLBACK_BADGES}
        badgeStyle={live?.badgeStyle ?? DEFAULT_BADGE_STYLE}
        links={live?.links ?? FALLBACK_LINKS}
        linkDesign={live?.linkDesign ?? FALLBACK_LINK_DESIGN}
        views={views}
        joined={live?.joined ?? "Nov 2026"}
      />
      <a className="hero-profile-link" href={`/${encodeURIComponent(live?.username ?? HOME_HANDLE)}`}>
        tourn.lol/{live?.username ?? HOME_HANDLE}
        <ArrowUpRight size={11} />
      </a>
    </aside>
  );
}
