/* ---------------------------------------------------------------------------
   Home — setup checklist, profile statistics, feedback.
   --------------------------------------------------------------------------- */

import { useMemo, useState } from "react";
import { useDash } from "../context";
import { Button, Card, CardHead, EmptyState, Icon, Segmented } from "../ui";

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
  const { user, about, settings, links, profileViews, go, notify } = useDash();
  const [period, setPeriod] = useState("7d");
  const [feedback, setFeedback] = useState("received");

  const checklist = [
    {
      label: "Add a background",
      done: Boolean(about.assets.background.imageUrl) || about.assets.background.style === "gradient",
      target: () => go("effects"),
    },
    {
      label: "Connect Discord account",
      done: Boolean(settings.discordUserId),
      target: () => go("widgets"),
    },
    {
      label: "Add socials",
      done: links.links.length > 0,
      target: () => go("links"),
    },
    {
      label: "Reach 10 profile views",
      done: (profileViews ?? 0) >= 10,
      target: () => go("analytics"),
    },
  ];

  const views = profileViews ?? 0;
  const days =
    period === "24h" ? 1 : period === "3d" ? 3 : period === "7d" ? 7 : period === "30d" ? 30 : 90;

  return (
    <>
      <div className="tw-home-top">
        <div className="tw-checklist">
          {checklist.map((item) => (
            <button
              key={item.label}
              type="button"
              className="tw-check-row"
              onClick={item.target}
            >
              <span className={`tw-check-mark${item.done ? " is-done" : ""}`}>
                {item.done ? <Icon name="check" size={12} strokeWidth={2.4} /> : null}
              </span>
              <b>{item.label}</b>
              <Icon name="chevron-right" size={14} className="tw-chevron" />
            </button>
          ))}
        </div>

        <div className="tw-home-actions">
          <Button variant="primary" icon="crown" onClick={() => go("premium")}>
            Get Premium
          </Button>
          <Button
            icon="eye"
            onClick={() => window.open(`/${encodeURIComponent(user.username)}`, "_blank")}
          >
            View your profile
          </Button>
        </div>
      </div>

      <Card>
        <CardHead
          icon="chart"
          title="Profile Statistics"
          subtitle="Compact overview for last 7 days."
          actions={
            <div className="tw-row" style={{ gap: 10 }}>
              <div className="tw-periods">
                {PERIODS.map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    className={`tw-period${period === entry.value ? " is-active" : ""}`}
                    onClick={() => setPeriod(entry.value)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              <Button trailingIcon="arrow-right" onClick={() => go("analytics")}>
                View analytics
              </Button>
            </div>
          }
        />

        <div className="tw-stat-panels">
          <div className="tw-stat-panel">
            <h3>Visitor Devices</h3>
            <EmptyState
              icon="grid"
              title="No device data yet"
              message="Share your profile to collect visitor devices."
            />
          </div>
          <div className="tw-stat-panel">
            <h3>Profile Views</h3>
            <ViewsChart total={views} days={days} />
            {views > 0 ? (
              <p className="tw-chart-note">{views.toLocaleString("en-US")} views all time · daily history starts from today.</p>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <CardHead
          icon="comment"
          title="Profile Feedback"
          subtitle="Get insights to the people who liked, disliked or commented on your profile"
          actions={
            <div className="tw-feedback-icons" aria-hidden="true">
              <span>
                <Icon name="like" size={14} />
              </span>
              <span>
                <Icon name="dislike" size={14} />
              </span>
              <span>
                <Icon name="comment" size={14} />
              </span>
            </div>
          }
        />

        <div className="tw-feedback">
          <Segmented
            wide
            value={feedback}
            onChange={setFeedback}
            options={[
              { value: "received", label: "Received feedback" },
              { value: "given", label: "Given feedback" },
            ]}
          />
          <EmptyState
            icon="comment"
            title="No comments yet"
            message="Really quiet here at the moment..."
          />
        </div>
      </Card>
    </>
  );
}
