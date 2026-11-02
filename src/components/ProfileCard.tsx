import { DEFAULT_ABOUT_DESIGN, type About } from "../lib/about";
import { DEFAULT_PROFILE_ASSETS } from "../lib/profileAssets";
import { type BadgeInstance } from "../lib/badges";
import { DEFAULT_LINK_DESIGN, type LinkInstance } from "../lib/links";
import { ProfilePreview } from "./ProfilePreview";

/**
 * The home page's example card. It deliberately renders static demo data —
 * never the viewer's account and never a network request — so it paints on the
 * first frame and always looks complete, even when the backend is cold.
 */
const DEMO_ABOUT: About = {
  displayName: "tourn",
  bio: "One link for everything you play.\nDiscord, music and games — always current.",
  location: "tourn.lol",
  metadata: { title: "", faviconUrl: "", animation: "none", messages: [], interval: 6 },
  design: {
    ...DEFAULT_ABOUT_DESIGN,
    cardWidth: 372,
    cardPadding: 22,
    avatarSize: 86,
  },
  assets: DEFAULT_PROFILE_ASSETS,
};

const DEMO_BADGES: BadgeInstance[] = [
  { id: "owner", visible: true },
  { id: "verified", visible: true },
  { id: "premium", visible: true },
  { id: "staff", visible: true },
  { id: "donator", visible: true },
];

const demoLink = (id: string, platform: string, label: string, url: string): LinkInstance => ({
  id,
  platform,
  label,
  url,
  tooltip: "",
  description: "",
  fold: "",
  mode: "icon",
  visible: true,
  color: "",
  glowOn: false,
  glowColor: "",
  iconUrl: "",
});

const DEMO_LINKS: LinkInstance[] = [
  demoLink("demo-discord", "discord", "Discord", "https://discord.gg/tourn"),
  demoLink("demo-spotify", "spotify", "Spotify", "https://open.spotify.com"),
  demoLink("demo-steam", "steam", "Steam", "https://steamcommunity.com"),
];

export function ProfileCard() {
  return (
    <aside className="hero-profile" aria-label="Example tourn.lol profile card">
      <ProfilePreview
        user={{ id: "demo", uid: 1, username: "tourn", avatarUrl: "/logo.png" }}
        about={DEMO_ABOUT}
        badges={DEMO_BADGES}
        links={DEMO_LINKS}
        linkDesign={{ ...DEFAULT_LINK_DESIGN, iconOnly: true, cardStyle: "outline" }}
        views={353}
        joined="Nov 2026"
      />
    </aside>
  );
}
