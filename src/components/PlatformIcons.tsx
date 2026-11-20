import { getPlatform } from "../lib/linkPlatforms";
import { PLATFORM_MARKS } from "./platformMarks";

type Props = { size?: number; className?: string };

const MARK_ALIASES: Record<string, string> = {
  discordbot: "discord",
  lastfm: "lastdotfm",
  chess: "chessdotcom",
  league: "leagueoflegends",
};

export function PlatformIcon({ id, size = 16, className }: Props & { id: string }) {
  const BrandIcon=getPlatform(id)?.Icon;
  if(BrandIcon)return <BrandIcon size={size} className={className} data-platform-icon={id} aria-hidden="true" />;
  const mark = PLATFORM_MARKS[id] ?? PLATFORM_MARKS[MARK_ALIASES[id]];

  if (mark) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={mark.viewBox}
        fill="currentColor"
        className={className}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: mark.body }}
      />
    );
  }

  switch (id) {
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M5 4.5h14v15H5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M8.5 9.5h7M8.5 13h4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
  }
}
