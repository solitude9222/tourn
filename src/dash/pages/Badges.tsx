/* ---------------------------------------------------------------------------
   Account > Badges — the badge you are wearing, and the full catalogue.

   The catalogue is grouped by where a badge comes from (platform, seasonal,
   Discord) instead of one long undifferentiated grid, and every row is a fixed
   three-column shape — art, text, actions — so a long name can never push the
   buttons out of line or run text under them.
   --------------------------------------------------------------------------- */

import { useMemo, useState } from "react";
import { BADGE_CATALOGUE, badgeDef, type BadgeDef, type BadgeGroup } from "../../lib/badges";
import { useDash } from "../context";
import { Button, Card, CardHead, Chip, EmptyState, Icon, IconButton, Modal } from "../ui";

const MAX_ACTIVE = 30;

const GROUPS: { id: BadgeGroup; label: string; hint: string }[] = [
  { id: "platform", label: "Platform", hint: "Earned on tourn.lol" },
  { id: "seasonal", label: "Seasonal", hint: "Limited to a date" },
  { id: "discord", label: "Discord", hint: "From the tourn.lol server" },
];

type Filter = "all" | "earned" | "shown";

function BadgeArt({ badge, size = 36 }: { badge: BadgeDef; size?: number }) {
  return (
    <span
      className={`tw-badge-art${badge.art ? "" : " is-fallback"}`}
      style={{ width: size, height: size }}
    >
      {badge.art ? (
        <img
          src={badge.art}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            event.currentTarget.parentElement?.classList.add("is-fallback");
          }}
        />
      ) : null}
      <i className="tw-badge-art-letter" aria-hidden="true">
        {badge.name.slice(0, 1).toUpperCase()}
      </i>
    </span>
  );
}

export function BadgesPage() {
  const { badges, earned, setBadges, isPremium, go, notify } = useDash();
  const [preview, setPreview] = useState(false);
  const [detail, setDetail] = useState<BadgeDef | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const equipped = badges.equipped.flatMap((instance) => {
    const badge = badgeDef(instance.id);
    return badge ? [{ instance, badge }] : [];
  });

  const earnedSet = useMemo(() => new Set(earned), [earned]);
  const shownSet = useMemo(() => new Set(badges.equipped.map((entry) => entry.id)), [badges.equipped]);
  const earnedCount = BADGE_CATALOGUE.filter((badge) => earnedSet.has(badge.id)).length;

  const toggleBadge = (badge: BadgeDef) => {
    if (!earnedSet.has(badge.id)) {
      setDetail(badge);
      return;
    }
    const active = badges.equipped.some((entry) => entry.id === badge.id);
    if (!active && badges.equipped.length >= MAX_ACTIVE) {
      notify("Badge limit", `You can show up to ${MAX_ACTIVE} badges.`);
      return;
    }
    setBadges((current) => ({
      ...current,
      equipped: active
        ? current.equipped.filter((entry) => entry.id !== badge.id)
        : [...current.equipped, { id: badge.id, visible: true }],
    }));
  };

  const visible = (badge: BadgeDef) => {
    if (filter === "earned") return earnedSet.has(badge.id);
    if (filter === "shown") return shownSet.has(badge.id);
    return true;
  };

  return (
    <>
      <Card>
        <CardHead
          icon="shield"
          title="Your badges"
          subtitle="Click a badge to show or hide it. Their order on the card follows this list."
          actions={<span className="tw-active-count">{badges.equipped.length} / {MAX_ACTIVE} shown</span>}
        />

        <div className={`tw-badge-drop${equipped.length ? "" : " is-empty"}`}>
          {equipped.length ? (
            equipped.map(({ badge }) => (
              <button
                key={badge.id}
                type="button"
                className="tw-drop-badge"
                title={`${badge.name} — click to remove`}
                onClick={() =>
                  setBadges((current) => ({
                    ...current,
                    equipped: current.equipped.filter((entry) => entry.id !== badge.id),
                  }))
                }
              >
                <BadgeArt badge={badge} size={22} />
                {badge.name}
                <Icon name="x" size={12} />
              </button>
            ))
          ) : (
            <EmptyState
              icon="pin"
              title="Nothing on show yet"
              message="Badges you earn show up in the catalogue below — click one to put it on your profile."
            />
          )}
        </div>

        <p className="tw-foot-note">
          Unlock codes are redeemed in{" "}
          <button type="button" className="tw-inline-link" onClick={() => go("settings")}>
            account settings
          </button>
          .
        </p>
      </Card>

      <Card>
        <div className="tw-badge-promo">
          <span className="tw-badge-promo-icon">
            <img src="/badges/icons/norm/premium.svg" alt="" width={34} height={34} loading="lazy" />
          </span>
          <div className="tw-badge-promo-copy">
            <b>
              Custom badges <Chip tone="new">NEW</Chip>
            </b>
            <small>
              Upload your own icon and name, then re-edit it later with an edit token. Part of
              Premium.
            </small>
          </div>
          <div className="tw-badge-promo-actions">
            <Button icon="eye" onClick={() => setPreview(true)}>
              Preview
            </Button>
            <Button variant="primary" icon="crown" onClick={() => go("premium")}>
              {isPremium ? "Create one" : "Get Premium"}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHead
          icon="grid"
          title="Catalogue"
          subtitle={`${earnedCount} of ${BADGE_CATALOGUE.length} unlocked on this account`}
          actions={
            <div className="tw-badge-filter" role="group" aria-label="Filter badges">
              {(
                [
                  ["all", `All ${BADGE_CATALOGUE.length}`],
                  ["earned", `Unlocked ${earnedCount}`],
                  ["shown", `Shown ${badges.equipped.length}`],
                ] as [Filter, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`tw-badge-filter-btn${filter === id ? " is-active" : ""}`}
                  onClick={() => setFilter(id)}
                  aria-pressed={filter === id}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />

        {GROUPS.map((group) => {
          const items = BADGE_CATALOGUE.filter((badge) => badge.group === group.id && visible(badge));
          if (!items.length) return null;
          return (
            <section className="tw-badge-group" key={group.id}>
              <div className="tw-badge-group-head">
                <h3>{group.label}</h3>
                <small>{group.hint}</small>
              </div>
              <div className="tw-badge-list">
                {items.map((badge) => {
                  const isEarned = earnedSet.has(badge.id);
                  const isActive = shownSet.has(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`tw-badge-tile${isActive ? " is-equipped" : ""}${isEarned ? "" : " is-locked"}`}
                    >
                      <BadgeArt badge={badge} />
                      <span className="tw-badge-copy">
                        <b>{badge.name}</b>
                        <small>{badge.description}</small>
                      </span>
                      <span className="tw-badge-actions">
                        <IconButton
                          label={
                            isEarned
                              ? isActive
                                ? `Remove ${badge.name}`
                                : `Show ${badge.name}`
                              : `How to unlock ${badge.name}`
                          }
                          icon={isEarned ? (isActive ? "check" : "plus") : "lock"}
                          variant={isActive ? "primary" : "plain"}
                          onClick={() => (isEarned ? toggleBadge(badge) : setDetail(badge))}
                        />
                        <IconButton
                          label={`About ${badge.name}`}
                          icon="help"
                          variant="plain"
                          onClick={() => setDetail(badge)}
                        />
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {filter !== "all" && !BADGE_CATALOGUE.some(visible) ? (
          <p className="tw-empty-note">
            {filter === "shown"
              ? "No badges on show yet — pick one from the catalogue."
              : "Nothing unlocked in this filter yet."}
          </p>
        ) : null}
      </Card>

      <Modal
        open={preview}
        title="Custom badge preview"
        subtitle={
          isPremium
            ? "Premium custom badges are available on your plan."
            : "Custom badges are part of Premium."
        }
        onClose={() => setPreview(false)}
        footer={
          <>
            <Button onClick={() => setPreview(false)}>Close</Button>
            {!isPremium ? (
              <Button variant="primary" icon="crown" onClick={() => go("premium")}>
                Get Premium
              </Button>
            ) : null}
          </>
        }
      >
        <div className="tw-badge-preview">
          <img src="/badges/icons/norm/premium.svg" alt="" width={56} height={56} loading="lazy" />
          <div>
            <b>Your custom badge</b>
            <small>A badge only you can display.</small>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(detail)}
        title={detail?.name ?? "Badge"}
        subtitle={detail?.description}
        onClose={() => setDetail(null)}
        footer={
          <>
            <Button onClick={() => setDetail(null)}>Close</Button>
            {detail && !earnedSet.has(detail.id) ? (
              <Button variant="primary" onClick={() => go("premium")}>
                How to unlock
              </Button>
            ) : null}
          </>
        }
      >
        {detail ? (
          <div className="tw-badge-detail">
            <BadgeArt badge={detail} size={56} />
            <p>{detail.requirement}</p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
