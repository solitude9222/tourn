import { PlatformIcon } from "./PlatformIcons";

/* Real, full-colour brand marks for widgets. Everything is bundled under
   /platform-icons so a card never depends on a third-party icon CDN. Game
   marks that Simple Icons does not carry use the official App Store artwork. */
const ICONS: Record<string, string> = {
  discord: "/platform-icons/discord.svg",
  discordbot: "/platform-icons/discord.svg",
  github: "/platform-icons/github.svg",
  roblox: "/platform-icons/roblox.svg",
  lastfm: "/platform-icons/lastfm.svg",
  statsfm: "/platform-icons/statsfm.jpg",
  valorant: "/platform-icons/valorant.svg",
  steam: "/platform-icons/steam.svg",
  twitch: "/platform-icons/twitch.svg",
  spotify: "/platform-icons/spotify.svg",
  youtube: "/platform-icons/youtube.svg",
  kick: "/platform-icons/kick.svg",
  minecraft: "/platform-icons/minecraft.jpg",
  clashofclans: "/platform-icons/clashofclans.jpg",
  clashroyale: "/platform-icons/clashroyale.jpg",
  brawlstars: "/platform-icons/brawlstars.jpg",
};

export function WidgetPlatformIcon({
  id,
  size = 16,
  className,
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const src = ICONS[id];
  if (!src) return <PlatformIcon id={id} size={size} className={className} />;

  return (
    <img
      className={`widget-platform-mark${className ? ` ${className}` : ""}`}
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
      aria-hidden="true"
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
