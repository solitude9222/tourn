import type { ReactNode } from "react";
import { useNow } from "../lib/hooks";
import { ClockIcon } from "./Icons";
import "../richText.css";

const INLINE_TOKEN =
  /(```[\s\S]*?```|`[^`\n]+`|\[[^\]\n]+\]\((?:https?:\/\/|mailto:|\/|#)[^)\s]+\)|\{\{(?:clock|date|stamp:\d+|ago:\d+|countdown:\d+)\}\}|\*\*[^*\n]+\*\*|\*[^*\n]+\*|__[^_\n]+__|~~[^~\n]+~~|==[^=\n]+==|\|\|[^|\n]+\|\|)/g;

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const STAMP_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function relativeTime(target: number, now: number): string {
  const diff = target - now;
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;

  let value: number;
  let unit: string;
  if (abs < minute) {
    value = Math.max(1, Math.round(abs / 1000));
    unit = "s";
  } else if (abs < hour) {
    value = Math.round(abs / minute);
    unit = "m";
  } else if (abs < day) {
    value = Math.round(abs / hour);
    unit = "h";
  } else if (abs < day * 30) {
    value = Math.round(abs / day);
    unit = "d";
  } else if (abs < day * 365) {
    value = Math.round(abs / (day * 30));
    unit = "mo";
  } else {
    value = Math.round(abs / (day * 365));
    unit = "y";
  }

  return diff >= 0 ? `in ${value}${unit}` : `${value}${unit} ago`;
}

function countdown(target: number, now: number): string {
  const diff = target - now;
  if (diff <= 0) return "now";
  const day = 86_400_000;
  const hour = 3_600_000;
  const minute = 60_000;
  if (diff >= day) return `${Math.floor(diff / day)}d ${Math.floor((diff % day) / hour)}h`;
  if (diff >= hour) return `${Math.floor(diff / hour)}h ${Math.floor((diff % hour) / minute)}m`;
  return `${Math.max(1, Math.floor(diff / minute))}m`;
}

function renderClock(now: number, key: string): ReactNode {
  return (
    <span className="rt-live" key={key} title="Live clock">
      <i />
      {TIME_FORMAT.format(now)}
    </span>
  );
}

function renderStamp(raw: string, key: string): ReactNode {
  const stamp = Number(raw.slice(8, -2));
  if (!Number.isFinite(stamp)) return raw;
  return (
    <span className="rt-stamp" key={key} title={new Date(stamp).toLocaleString()}>
      <ClockIcon size={10} />
      {STAMP_FORMAT.format(new Date(stamp))}
    </span>
  );
}

function renderNowToken(token: string, key: string, now: number): ReactNode | null {
  if (token === "{{date}}") {
    return (
      <span className="rt-stamp rt-date" key={key} title={new Date(now).toLocaleDateString()}>
        {DATE_FORMAT.format(now)}
      </span>
    );
  }

  if (token.startsWith("{{ago:")) {
    const stamp = Number(token.slice(6, -2));
    if (!Number.isFinite(stamp)) return token;
    return (
      <span className="rt-relative" key={key} title={new Date(stamp).toLocaleString()}>
        {relativeTime(stamp, now)}
      </span>
    );
  }

  if (token.startsWith("{{countdown:")) {
    const stamp = Number(token.slice(12, -2));
    if (!Number.isFinite(stamp)) return token;
    return (
      <span className="rt-countdown" key={key} title={`Ends ${new Date(stamp).toLocaleString()}`}>
        <ClockIcon size={10} />
        {countdown(stamp, now)}
      </span>
    );
  }

  return null;
}

function safeHref(href: string): string | null {
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href) || href.startsWith("/") || href.startsWith("#")) {
    return href;
  }
  return null;
}

function renderInline(token: string, key: string, now: number): ReactNode {
  if (token === "{{clock}}") return renderClock(now, key);
  if (token.startsWith("{{stamp:")) return renderStamp(token, key);

  const nowToken = renderNowToken(token, key, now);
  if (nowToken !== null) return nowToken;

  if (token.startsWith("```")) {
    const body = token.replace(/^```\w*\n?/, "").replace(/```$/, "");
    return (
      <pre className="rt-code-block" key={key}>
        <code>{body.replace(/\n$/, "")}</code>
      </pre>
    );
  }

  if (token.startsWith("`")) {
    return (
      <code className="rt-code" key={key}>
        {token.slice(1, -1)}
      </code>
    );
  }

  if (token.startsWith("[")) {
    const match = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!match) return token;
    const [, label, rawHref] = match;
    const href = safeHref(rawHref);
    if (!href) return token;
    const external = /^https?:\/\//i.test(href);
    return (
      <a
        className="rt-link"
        href={href}
        key={key}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
      >
        {label}
      </a>
    );
  }

  if (token.startsWith("**")) {
    return (
      <strong key={key} className="rt-strong">
        {token.slice(2, -2)}
      </strong>
    );
  }

  if (token.startsWith("__")) {
    return (
      <u key={key} className="rt-underline">
        {token.slice(2, -2)}
      </u>
    );
  }

  if (token.startsWith("~~")) {
    return (
      <s key={key} className="rt-strike">
        {token.slice(2, -2)}
      </s>
    );
  }

  if (token.startsWith("==")) {
    return (
      <mark key={key} className="rt-highlight">
        {token.slice(2, -2)}
      </mark>
    );
  }

  if (token.startsWith("||")) {
    return (
      <span key={key} className="rt-spoiler" title="Hover or focus to reveal" tabIndex={0}>
        {token.slice(2, -2)}
      </span>
    );
  }

  if (token.startsWith("*")) {
    return (
      <em key={key} className="rt-em">
        {token.slice(1, -1)}
      </em>
    );
  }

  return token;
}

function renderInlineText(text: string, now: number, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE_TOKEN).filter((part) => part !== undefined && part !== "");
  return parts.map((part, index) => {
    const isToken =
      part.startsWith("```") ||
      part.startsWith("`") ||
      part.startsWith("[") ||
      part.startsWith("{{") ||
      part.startsWith("**") ||
      part.startsWith("__") ||
      part.startsWith("~~") ||
      part.startsWith("==") ||
      part.startsWith("||") ||
      part.startsWith("*");
    return isToken ? (
      renderInline(part, `${keyPrefix}-${index}`, now)
    ) : (
      <span key={`${keyPrefix}-${index}`}>{part}</span>
    );
  });
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const now = useNow(1000);
  if (!text) return null;

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim().startsWith("```")) {
      const language = line.trim().slice(3).trim();
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        <pre className="rt-code-block" key={`block-${index}`}>
          {language ? <span className="rt-code-lang">{language}</span> : null}
          <code>{body.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const Tag = `h${level + 2}` as "h3" | "h4" | "h5";
      blocks.push(
        <Tag className={`rt-heading rt-heading--${level}`} key={`block-${index}`}>
          {renderInlineText(heading[2], now, `h-${index}`)}
        </Tag>,
      );
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote className="rt-quote" key={`block-${index}`}>
          {renderInlineText(quote.join(" "), now, `q-${index}`)}
        </blockquote>,
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul className="rt-list" key={`block-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`li-${index}-${itemIndex}`}>
              {renderInlineText(item, now, `li-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].trim().startsWith("```") &&
      !/^#{1,3}\s+/.test(lines[index]) &&
      !/^\s*>\s?/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }

    blocks.push(
      <p className="rt-paragraph" key={`block-${index}`}>
        {paragraph.map((row, rowIndex) => (
          <span key={`row-${index}-${rowIndex}`}>
            {renderInlineText(row, now, `p-${index}-${rowIndex}`)}
            {rowIndex < paragraph.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>,
    );
  }

  return <div className={`rich-text${className ? ` ${className}` : ""}`}>{blocks}</div>;
}
