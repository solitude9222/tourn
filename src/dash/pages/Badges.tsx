/* ---------------------------------------------------------------------------
   Account > Badges — active badge arrangement and the full catalogue.
   --------------------------------------------------------------------------- */

import { useMemo, useState } from "react";
import { BADGE_CATALOGUE, badgeDef, type BadgeDef } from "../../lib/badges";
import { useDash } from "../context";
import {
  Button,
  Card,
  CardHead,
  Chip,
  EmptyState,
  Icon,
  IconButton,
  Modal,
} from "../ui";

const MAX_ACTIVE = 30;

function BadgeArt({ badge, size = 34 }: { badge: BadgeDef; size?: number }) {
  return (
    <span className="tw-badge-art" style={{ width: size, height: size }}>
      {badge.art ? (
        <img
          src={badge.art}
          alt=""
          width={size}
          height={size}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        badge.name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

export function BadgesPage() {
  const { badges, earned, setBadges, isPremium, go, notify } = useDash();
  const [preview, setPreview] = useState(false);
  const [detail, setDetail] = useState<BadgeDef | null>(null);

  const equipped = badges.equipped.flatMap((instance) => {
    const badge = badgeDef(instance.id);
    return badge ? [{ instance, badge }] : [];
  });

  const earnedSet = useMemo(() => new Set(earned), [earned]);

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

  return (
    <>
      <Card>
        <CardHead
          icon="sparkles"
          title={
            <span className="tw-row" style={{ gap: 8 }}>
              Custom Badges <Chip tone="new">NEW</Chip>
            </span>
          }
        />
        <p className="tw-copy-block">
          Custom badges let you create your own badge with a custom icon and name. Edit tokens let
          you update them later.
        </p>
        <div className="tw-row">
          <Button variant="primary" icon="sparkles" onClick={() => go("premium")}>
            Purchase Badge
          </Button>
          <Button icon="eye" onClick={() => setPreview(true)}>
            Preview
          </Button>
        </div>
      </Card>

      <Card>
        <CardHead
          icon="shield"
          title="Badges"
          actions={<span className="tw-active-count">Active badges: {badges.equipped.length} / {MAX_ACTIVE}</span>}
        />
        <p className="tw-copy-block" style={{ marginTop: -6 }}>
          Choose and organize your badges
        </p>

        <div className={`tw-badge-drop${equipped.length ? "" : " is-empty"}`}>
          {equipped.length ? (
            equipped.map(({ instance, badge }) => (
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
                <BadgeArt badge={badge} size={24} />
                {badge.name}
                <Icon name="x" size={12} />
              </button>
            ))
          ) : (
            <EmptyState
              icon="pin"
              title="No badges yet"
              message="Badges you earn or unlock show up here, ready to be arranged on your profile."
            />
          )}
        </div>

        <p className="tw-foot-note">
          You can unlock more badges with a code in <button type="button" className="tw-inline-link" onClick={() => go("settings")}>settings section</button>.
        </p>
      </Card>

      <Card>
        <CardHead
          icon="shield"
          title="Badge Overview"
          subtitle="Manage and view your achievement badges"
          actions={<span className="tw-active-count">{BADGE_CATALOGUE.length} BADGES</span>}
        />

        <div className="tw-grid tw-grid--3">
          {BADGE_CATALOGUE.map((badge) => {
            const isEarned = earnedSet.has(badge.id);
            const isActive = badges.equipped.some((entry) => entry.id === badge.id);
            return (
              <div
                key={badge.id}
                className={`tw-badge-tile${isActive ? " is-equipped" : ""}`}
              >
                <BadgeArt badge={badge} />
                <span className="tw-badge-copy">
                  <b>{badge.name}</b>
                  <small>{badge.description}</small>
                </span>
                {isEarned ? (
                  <IconButton
                    label={isActive ? `Remove ${badge.name}` : `Show ${badge.name}`}
                    icon={isActive ? "check" : "plus"}
                    variant={isActive ? "primary" : "plain"}
                    onClick={() => toggleBadge(badge)}
                  />
                ) : (
                  <Button data-size="sm" onClick={() => toggleBadge(badge)}>
                    Unlock
                  </Button>
                )}
                <IconButton label={`About ${badge.name}`} icon="help" variant="plain" onClick={() => setDetail(badge)} />
              </div>
            );
          })}
        </div>
      </Card>

      <Modal
        open={preview}
        title="Custom Badge Preview"
        subtitle={isPremium ? "Premium custom badges are available on your plan." : "Custom badges are part of Premium."}
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
          <BadgeArt badge={BADGE_CATALOGUE[0]} size={48} />
          <div>
            <b>Your Custom Badge</b>
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
