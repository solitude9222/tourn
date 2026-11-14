/* ---------------------------------------------------------------------------
   Home — the account at a glance: who you are, what is left to set up, the
   numbers, and what people said about the page.
   --------------------------------------------------------------------------- */

import { useEffect, useState } from "react";
import { useDash } from "../context";
import { Button, Card, CardHead, Chip, Icon, SectionLabel, type IconName } from "../ui";
import { AnalyticsPanel } from "../Analytics";
import { copyText } from "../files";
import { DEFAULT_PROFILE_ASSETS } from "../../lib/profileAssets";
import { accountUid } from "../../lib/auth";
import { readReactions, type ReactionState } from "../../lib/reactions";

export function HomePage() {
  const { user, about, links, widgets, badges, profileViews, isPremium, settings, go, notify } =
    useDash();
  const [feedback, setFeedback] = useState<ReactionState | null>(null);
  const [feedbackTab, setFeedbackTab] = useState<"received" | "given">("received");
  const [shared, setShared] = useState(() => {
    try {
      return localStorage.getItem(`tourn.lol/setup-shared/v1/${user.id}`) === "yes";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let active = true;
    void readReactions(user.username).then((next) => {
      if (active) setFeedback(next);
    });
    return () => {
      active = false;
    };
  }, [user.username]);

  const share = async () => {
    const url = `${location.origin}/${encodeURIComponent(user.username)}`;
    if (await copyText(url)) {
      setShared(true);
      try {
        localStorage.setItem(`tourn.lol/setup-shared/v1/${user.id}`, "yes");
      } catch {
        /* optional */
      }
      notify("Profile link copied", url);
    } else notify("Could not copy", `Copy this address: ${url}`);
  };

  const steps: { label: string; done: boolean; target: () => void }[] = [
    {
      label: "Upload avatar",
      done: Boolean(about.assets.avatarUrl || user.avatarUrl),
      target: () => go("profile-main"),
    },
    {
      label: "Add description",
      done: about.bio.trim().length > 0,
      target: () => go("portfolio-about"),
    },
    {
      label: "Add a background",
      done:
        Boolean(about.assets.background.imageUrl) ||
        about.assets.background.style === "gradient" ||
        about.assets.background.color !== DEFAULT_PROFILE_ASSETS.background.color,
      target: () => go("profile-appearance"),
    },
    {
      label: "Connect Discord account",
      done: Boolean(settings.discordUserId),
      target: () => go("profile-integrations"),
    },
    {
      label: "Add socials",
      done: links.links.some((link) => link.url.trim() && link.visible),
      target: () => go("links"),
    },
    {
      label: "Reach 10 profile views",
      done: (profileViews ?? 0) >= 10,
      target: () => go("analytics"),
    },
  ];

  const done = steps.filter((step) => step.done).length;
  const percent = Math.round((done / steps.length) * 100);
  const uid = accountUid(user);
  const joinedPercent = Math.max(1, Math.min(99, Math.round((uid % 99) + 1)));

  return (
    <>
      <Card>
        <CardHead
          icon="user"
          title="Account Overview"
          subtitle="Check out information about your account."
          actions={
            <Button
              icon="eye"
              onClick={() =>
                window.open(`/${encodeURIComponent(user.username)}`, "_blank", "noopener,noreferrer")
              }
            >
              View profile
            </Button>
          }
        />
        <div className="tw-overview">
          <div className="tw-overview-row">
            <span>Username</span>
            <b>{user.username}</b>
            <small>can be changed anytime</small>
          </div>
          <div className="tw-overview-row">
            <span>Alias</span>
            <b>{user.alias?.trim() || "N/A"}</b>
            <small>{user.alias?.trim() ? "1 / 1 aliases available" : "claim one in settings"}</small>
          </div>
          <div className="tw-overview-row">
            <span>User ID</span>
            <b>{uid}</b>
            <small>joined after {joinedPercent}% of all users</small>
          </div>
          <div className="tw-overview-row">
            <span>Profile Views</span>
            <b>{profileViews ?? 0}</b>
            <small>{profileViews ? "total since launch" : "0 views since last week"}</small>
          </div>
        </div>
      </Card>

      <Card>
        <CardHead
          icon="check"
          title="Profile Setup"
          subtitle="Finish the core steps and jump into the most useful actions."
          actions={<span className="tw-home-progress-label">{percent}% complete</span>}
        />
        <p className="tw-foot-note">
          {percent === 100
            ? "Everything on the list is done — your page is ready to share."
            : "Your profile is not complete yet. Finish the tasks below to make it more useful and attractive."}
        </p>
        <div className="tw-home-progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="tw-checklist">
          {steps.map((step) => (
            <button key={step.label} type="button" className="tw-check-row" onClick={step.target}>
              <span className={`tw-check-mark${step.done ? " is-done" : ""}`}>
                {step.done ? <Icon name="check" size={12} strokeWidth={2.4} /> : null}
              </span>
              <b>{step.label}</b>
              <Icon name="chevron-right" size={14} className="tw-chevron" />
            </button>
          ))}
        </div>
      </Card>

      <div className="tw-home-top">
        <Card className="tw-home-actions">
          <CardHead icon="bolt" title="Quick Actions" subtitle="The shortcuts worth knowing." />
          <div className="tw-home-actions-buttons">
            <Button
              variant="primary"
              icon="discord"
              onClick={() => go("profile-integrations")}
            >
              {settings.discordUserId ? "Discord connected" : "Connect Discord"}
            </Button>
            <Button icon="link" onClick={() => void share()}>
              {shared ? "Profile link copied" : "Copy profile link"}
            </Button>
          </div>
          <p className="tw-foot-note">
            {settings.discordUserId
              ? "Discord is linked to this account, so widgets and the server can find you."
              : "Link Discord to turn on the Discord widget, server tools and DM verification."}
          </p>
        </Card>

        <Card>
          <CardHead icon="help" title="Documentation" subtitle="Setup guides and common questions." />
          <div className="tw-docs-list">
            {[
              ["Build your profile", "portfolio-general"],
              ["Style every surface", "portfolio-design"],
              ["Add a widget", "widgets"],
              ["Account and security", "settings"],
            ].map(([label, page]) => (
              <button
                key={label}
                type="button"
                className="tw-check-row"
                onClick={() => go(page as Parameters<typeof go>[0])}
              >
                <span className="tw-check-mark is-done">
                  <Icon name="help" size={11} />
                </span>
                <b>{label}</b>
                <Icon name="chevron-right" size={14} className="tw-chevron" />
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="tw-home-stats">
        {(
          [
            { icon: "eye", label: "Profile views", value: profileViews ?? "—", page: "analytics" },
            { icon: "link", label: "Social links", value: links.links.filter((l) => l.visible).length, page: "links" },
            { icon: "grid", label: "Widgets", value: widgets.widgets.filter((w) => w.visible !== false).length, page: "widgets" },
            { icon: "shield", label: "Badges", value: badges.equipped.length, page: "badges" },
          ] as { icon: IconName; label: string; value: string | number; page: Parameters<typeof go>[0] }[]
        ).map((stat) => (
          <button key={stat.label} type="button" className="tw-home-stat" onClick={() => go(stat.page)}>
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

      <div className="tw-home-split">
        <AnalyticsPanel compact />

        <Card>
          <CardHead
            icon="comment"
            title="Profile Feedback"
            subtitle="What people left on your page."
            actions={
              <div className="tw-feedback-tabs" role="tablist" aria-label="Feedback direction">
                {(["received", "given"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={feedbackTab === tab}
                    className={feedbackTab === tab ? "is-active" : ""}
                    onClick={() => setFeedbackTab(tab)}
                  >
                    {tab === "received" ? "Received" : "Given"}
                  </button>
                ))}
              </div>
            }
          />

          <div className="tw-feedback-counts">
            <div>
              <b>0</b>
              <small>Comments</small>
            </div>
            <div>
              <b>{feedback ? feedback.likes : "—"}</b>
              <small>Likes</small>
            </div>
            <div>
              <b>{feedback ? feedback.dislikes : "—"}</b>
              <small>Dislikes</small>
            </div>
          </div>

          <SectionLabel hint="One vote per visitor, counted by hashed IP.">
            {feedbackTab === "received" ? "Recent" : "Your votes"}
          </SectionLabel>

          {feedbackTab === "received" ? (
            <div className="tw-feedback-empty">
              <b>Really quiet here at the moment…</b>
              <p>No comments yet. Reactions appear on your public page as soon as people vote.</p>
              {feedback?.mine ? <Chip tone="accent">You voted too</Chip> : null}
            </div>
          ) : (
            <div className="tw-feedback-empty">
              <b>Nothing given yet</b>
              <p>Open someone&apos;s page and leave the first like or dislike.</p>
              <Button icon="link" onClick={() => go("leaderboard")}>
                Browse profiles
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
