import { useEffect, useState } from "react";

/* A real analog clock face for the Timezone widget. Time is read in the
   owner's zone every second, so the hands actually move on the page. */

export type ClockFaceStyle = "classic" | "minimal" | "neon" | "ring";

const FACE_STYLES: ClockFaceStyle[] = ["classic", "minimal", "neon", "ring"];

function zoneTime(zone: string, now: Date) {
  const parts = (timeZone: string) => {
    const format = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const found = format.formatToParts(now);
    const read = (type: string) => Number(found.find((part) => part.type === type)?.value ?? 0);
    return { hours: read("hour") % 24, minutes: read("minute"), seconds: read("second") };
  };
  try {
    return parts(zone.trim() || "UTC");
  } catch {
    return parts("UTC");
  }
}

const pad = (value: number) => String(value).padStart(2, "0");

export function ClockWidget({
  timeZone,
  face = "classic",
  analog = true,
}: {
  timeZone: string;
  face?: string;
  analog?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const style = (FACE_STYLES.includes(face as ClockFaceStyle) ? face : "classic") as ClockFaceStyle;
  const { hours, minutes, seconds } = zoneTime(timeZone, now);
  const secondAngle = seconds * 6;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const hourAngle = (hours % 12) * 30 + minutes * 0.5;
  const digital = `${pad(hours)}:${pad(minutes)}`;
  const ticks = style === "minimal" ? 4 : 12;

  return (
    <div className={`clock clock--${style}${analog ? "" : " clock--digital"}`}>
      {analog ? (
        <svg className="clock-face" viewBox="0 0 100 100" role="img" aria-label={`${digital} in ${timeZone || "UTC"}`}>
          <circle className="clock-rim" cx="50" cy="50" r="47" />
          {Array.from({ length: ticks }, (_, index) => {
            const angle = (index * 360) / ticks;
            const length = index % 3 === 0 ? 7 : 4;
            return (
              <line
                key={index}
                className={index % 3 === 0 ? "clock-tick clock-tick--major" : "clock-tick"}
                x1="50"
                y1={12}
                x2="50"
                y2={12 + length}
                transform={`rotate(${angle} 50 50)`}
              />
            );
          })}
          <line className="clock-hand clock-hand--hour" x1="50" y1="54" x2="50" y2="28" transform={`rotate(${hourAngle} 50 50)`} />
          <line className="clock-hand clock-hand--minute" x1="50" y1="56" x2="50" y2="18" transform={`rotate(${minuteAngle} 50 50)`} />
          {style === "classic" || style === "neon" ? (
            <line className="clock-hand clock-hand--second" x1="50" y1="58" x2="50" y2="14" transform={`rotate(${secondAngle} 50 50)`} />
          ) : null}
          <circle className="clock-cap" cx="50" cy="50" r="3" />
        </svg>
      ) : (
        <div className="clock-digital-time">{digital}</div>
      )}
      <div className="clock-caption">
        <b>{timeZone.trim() || "UTC"}</b>
        <small>{now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</small>
      </div>
    </div>
  );
}
