/* ---------------------------------------------------------------------------
   Home â€” setup checklist, profile statistics, feedback.
   --------------------------------------------------------------------------- */

import { useMemo } from "react";
import { useDash, type Page } from "../context";
import { Button, Card, CardHead, Icon, type IconName } from "../ui";

const PERIODS = [
  { value: "24h", label: "Last 24 hours" },
  { value: "3d", label: "Last 3 days" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

function lastDays(count: number): string[] {
  const formatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - index));
    return formatter.format(date);
  });
}

export function ViewsChart({ total, days = 7 }: { total: number | null; days?: number }) {
  const labels = useMemo(() => lastDays(days), [days]);
  const width = 640;
  const height = 186;
  const padX = 34;
  const padY = 18;
  const top = Math.max(10, total ?? 0);
  const innerW = width - padX - 8;
  const innerH = height - padY - 24;
  const step = labels.length === 1 ? 0 : innerW / (labels.length - 1);
  const labelEvery = Math.max(1, Math.ceil(labels.length / 7));

  const points = labels.map((_, index) => {
    const x = labels.length === 1 ? padX + innerW : padX + index * step;
    const y = padY + innerH;
    return `${x},${y}`;
  });

  return (
    <svg className="tw-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Profile views for the last seven days">
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = padY + innerH * ratio;
        const value = Math.round(top * (1 - ratio));
        return (
          <g key={ratio}>
            <line className="tw-chart-grid" x1={padX} x2={width - 8} y1={y} y2={y} />
            <text x={padX - 10} y={y + 3} textAnchor="end">
              {value}
            </text>
          </g>
        );
      })}
      <polyline className="tw-chart-line" points={points.join(" ")} />
      {labels.map((label, index) => {
        if (index % labelEvery !== 0 && index !== labels.length - 1) return null;
        const x = labels.length === 1 ? padX + innerW : padX + index * step;
        return (
          <text key={label + index} x={x} y={height - 4} textAnchor="middle">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

export function HomePage() {
  const { user, about, links, widgets, profileViews, go } = useDash();
  const stats: { label: string; value: number | string; icon: IconName; page: Page }[] = [
    { label: "Profile views", value: profileViews ?? "—", icon: "eye", page: "analytics" },
    { label: "Visible links", value: links.links.filter((item) => item.visible).length, icon: "link", page: "links" },
    { label: "Visible widgets", value: widgets.widgets.filter((item) => item.visible).length, icon: "grid", page: "widgets" },
  ];
  return (
    <>
      <div className="tw-welcome">
        <div><span className="tw-welcome-label">YOUR SPACE</span><h2>Make yourself at home, {user.username}.</h2><p>Everything you share starts here.</p></div>
        <a className="tw-btn tw-btn--primary" href={`/${encodeURIComponent(user.username)}`} target="_blank" rel="noreferrer">View your page <Icon name="arrow-right" size={15} /></a>
      </div>
      <div className="tw-overview-stats">
        {stats.map((stat) => <button key={stat.label} type="button" onClick={() => go(stat.page)}><Icon name={stat.icon} size={18} /><strong>{stat.value}</strong><span>{stat.label}</span><Icon name="chevron-right" size={14} /></button>)}
      </div>
      <div className="tw-overview-grid">
        <Card>
          <CardHead icon="sliders" title="Build your page" subtitle="A few essentials. The rest is up to you." />
          {([
            { page: "customize-profile", icon: "user", title: "Your identity", text: "Update your name, photo and bio." },
            { page: "links", icon: "link", title: "Your links", text: "Give people a way to find you everywhere." },
            { page: "layout", icon: "layout", title: "Your layout", text: "Set the colours, spacing and arrangement." },
            { page: "widgets", icon: "grid", title: "Your widgets", text: "Connect the platforms you want to share." },
          ] as const).map((item) => <button className="tw-overview-action" type="button" key={item.page} onClick={() => go(item.page)}><Icon name={item.icon} size={18} /><span><b>{item.title}</b><small>{item.text}</small></span><Icon name="arrow-right" size={15} /></button>)}
        </Card>
        <Card>
          <CardHead icon="link" title="Your address" subtitle="One link for all the places you show up." />
          <div className="tw-address-box">tourn.lol/<b>{user.username}</b></div>
          <p className="tw-overview-description">Add it to your bios, streams and profiles. Your address stays the same as your page grows.</p>
          <Button icon="copy" onClick={() => void navigator.clipboard.writeText(`${location.origin}/${user.username}`)}>Copy your link</Button>
          <div className="tw-overview-note"><Icon name="check" size={15} /><span>Changes are saved automatically. Publication is confirmed when the server accepts them.</span></div>
        </Card>
      </div>
    </>
  );
}
