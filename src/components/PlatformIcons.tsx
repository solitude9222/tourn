import { PLATFORM_MARKS } from "./platformMarks";

type Props = { size?: number; className?: string };

function TimezoneIcon({ size = 16, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5V12l3 1.8M12 2v2M12 20v2M2 12h2M20 12h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function WeatherIcon({ size = 16, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M8.5 18.5h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.3 3.4 3.4 0 0 0 1.2 6.7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M6 6 4.8 4.8M6.5 11H4.4M11 3.5V2.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

const MARK_ALIASES: Record<string, string> = {
  discordbot: "discord",
  lastfm: "lastdotfm",
  chess: "chessdotcom",
  league: "leagueoflegends",
};

export function PlatformIcon({ id, size = 16, className }: Props & { id: string }) {
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
    case "timezone":
      return <TimezoneIcon size={size} className={className} />;
    case "weather":
      return <WeatherIcon size={size} className={className} />;
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M5 4.5h14v15H5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M8.5 9.5h7M8.5 13h4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
  }
}
