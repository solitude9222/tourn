/* ---------------------------------------------------------------------------
   Home — setup checklist, profile statistics, feedback.
   --------------------------------------------------------------------------- */

import { useState } from "react";
import { useDash, type Page } from "../context";
import { Button, Card, CardHead, Icon, type IconName } from "../ui";
import { AnalyticsPanel } from "../Analytics";
import { copyText } from "../files";
import { DEFAULT_PROFILE_ASSETS } from "../../lib/profileAssets";

export function HomePage() {
  const { user, about, links, widgets, badges, profileViews, isPremium, go, notify } = useDash();
  const [shared, setShared] = useState(() => {
    try { return localStorage.getItem(`tourn.lol/setup-shared/v1/${user.id}`) === "yes"; } catch { return false; }
  });
  const share = async () => {
    const url = `${location.origin}/${encodeURIComponent(user.username)}`;
    if (await copyText(url)) {
      setShared(true);
      try { localStorage.setItem(`tourn.lol/setup-shared/v1/${user.id}`, "yes"); } catch { /* optional */ }
      notify("Profile link copied", url);
    } else notify("Could not copy", `Copy this address: ${url}`);
  };

  const checklist = [
    {
      label: "Add a background",
      done: Boolean(about.assets.background.imageUrl) || about.assets.background.style === "gradient" || about.assets.background.color !== DEFAULT_PROFILE_ASSETS.background.color,
      target: () => go("account-profile", undefined, "background"),
    },
    {
      label: "Add Discord widget",
      done: widgets.widgets.some((item) => item.platform === "discord" && item.content.trim()),
      target: () => go("widgets"),
    },
    {
      label: "Add socials",
      done: links.links.some((link) => link.url.trim() && link.visible),
      target: () => go("links"),
    },
    {
      label: "Copy your profile link",
      done: shared,
      target: () => void share(),
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
            <Button variant="primary" icon="crown" onClick={() => go(isPremium ? "billing" : "premium")}>
              {isPremium ? "Manage Premium" : "Get Premium"}
            </Button>
            <Button
              icon="eye"
              onClick={() => window.open(`/${encodeURIComponent(user.username)}`, "_blank", "noopener,noreferrer")}
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

      <AnalyticsPanel compact />
    </>
  );
}
