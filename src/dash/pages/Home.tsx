/* ---------------------------------------------------------------------------
   Home — setup checklist, profile statistics, feedback.
   --------------------------------------------------------------------------- */

import { useMemo, useState } from "react";
import { useDash, type Page } from "../context";
import { Button, Card, CardHead, EmptyState, Icon, Segmented, type IconName } from "../ui";
import { WidgetCardPreview } from "../../components/WidgetCard";

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
  const { user, about, settings, links, widgets, badges, profileViews, go, notify } = useDash();
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

  const done = checklist.filter((item) => item.done).length;

  // A quick read of the page at a glance — the four numbers the dashboard can
  // actually count, each one a link into the page that owns it.
  const stats: { icon: IconName; label: string; value: string | number; page: Page }[] = [
    { icon: "eye", label: "Profile views", value: profileViews ?? "—", page: "analytics" },
    {
      icon: "link",
      label: "Social links",
      value: links.links.filter((link) => link.visible).length,
      page: "links",
    },
    {
      icon: "grid",
      label: "Widgets",
      value: widgets.widgets.filter((widget) => widget.visible !== false).length,
      page: "widgets",
    },
    { icon: "shield", label: "Badges", value: badges.equipped.length, page: "badges" },
  ];

  const views = profileViews ?? 0;
  const days =
    period === "24h" ? 1 : period === "3d" ? 3 : period === "7d" ? 7 : period === "30d" ? 30 : 90;

  // The home preview stacks the first few widgets the way visitors see them,
  // but with no surface of their own so the cards read as one cascade.
  const previewWidgets = widgets.widgets.filter((widget) => widget.visible !== false).slice(0, 3);
  const previewItems = previewWidgets.length
    ? previewWidgets.map((widget) => ({ platform: widget.platform, content: widget.content }))
    : [
        { platform: "discord", content: "" },
        { platform: "github", content: "" },
        { platform: "spotify", content: "" },
      ];
  const previewDesign = {
    ...widgets.design,
    backgroundStyle: "solid" as const,
    backgroundOpacity: 0,
    borderWidth: 0,
    borderOpacity: 0,
    outlineEffect: "none" as const,
    hoverLift: false,
    scale: 1,
  };

  return (
    <>
      <div className="tw-home-top">
        <Card className="tw-home-setup">
          <CardHead
            icon="check"
            title="Finish your page"
            subtitle="A few small steps and your profile is ready to share."
            actions={
              <span className="tw-home-progress-label">
                {done} of {checklist.length} done
              </span>
            }
          />

          <div
            className="tw-home-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={checklist.length}
            aria-valuenow={done}
          >
            <span style={{ width: `${(done / checklist.length) * 100}%` }} />
          </div>

          <div className="tw-checklist">
            {checklist.map((item) => (
              <button key={item.label} type="button" className="tw-check-row" onClick={item.target}>
                <span className={`tw-check-mark${item.done ? " is-done" : ""}`}>
                  {item.done ? <Icon name="check" size={12} strokeWidth={2.4} /> : null}
                </span>
                <b>{item.label}</b>
                <Icon name="chevron-right" size={14} className="tw-chevron" />
              </button>
            ))}
          </div>
        </Card>

        <Card className="tw-home-actions">
          <CardHead
            icon="sparkles"
            title="Quick actions"
            subtitle="The two things you reach for most."
          />
          <div className="tw-home-actions-buttons">
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
        </Card>
      </div>

      <div className="tw-home-stats">
        {stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            className="tw-home-stat"
            onClick={() => go(stat.page)}
          >
            <span className="tw-home-stat-icon">
              <Icon name={stat.icon} size={17} />
            </span>
            <span className="tw-home-stat-copy">
              <b>{stat.value}</b>
              <small>{stat.label}</small>
            </span>
            <Icon name="chevron-right" size={13} className="tw-home-stat-chev" />
          </button>
        ))}
      </div>

      <Card className="tw-home-widgets">
        <div className="tw-home-widgets-copy">
          <CardHead
            icon="grid"
            title="Your widgets"
            subtitle="Live cards, stacked the way visitors see them."
          />
          <p className="tw-home-widgets-note">
            Widgets sit beside your profile card in the order you arrange them. Connect an account
            and the card fills itself in — no screenshots, no manual updates.
          </p>
          <Button trailingIcon="arrow-right" onClick={() => go("widgets")}>
            Customise widgets
          </Button>
        </div>

        <div className="tw-home-widgets-stage" aria-hidden="true">
          {previewItems.map((item, index) => (
            <div
              key={`${item.platform}-${index}`}
              className="tw-home-widget-stair"
              style={{ top: index * 88, left: index * 26, zIndex: index + 1 }}
            >
              <WidgetCardPreview
                design={previewDesign}
                platformId={item.platform}
                content={item.content || undefined}
              />
            </div>
          ))}
        </div>
      </Card>

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
