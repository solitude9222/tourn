import { useState } from "react";
import { useDash } from "../context";
import { BADGE_CATALOGUE } from "../../lib/badges";
import { Card, CardHead, Chip, EmptyState, Segmented } from "../ui";
import { AliasesPage } from "./Aliases";

type InventoryTab = "usernames" | "badges" | "collectables";

const TABS: { value: InventoryTab; label: string }[] = [
  { value: "usernames", label: "Usernames" },
  { value: "badges", label: "Badges" },
  { value: "collectables", label: "Collectables" },
];

export function InventoryPage() {
  const { earned, badges } = useDash();
  const [tab, setTab] = useState<InventoryTab>("usernames");
  const earnedSet = new Set([...earned, ...badges.equipped.map((badge) => badge.id)]);
  const owned = BADGE_CATALOGUE.filter((badge) => earnedSet.has(badge.id));

  return (
    <>
      <Card>
        <CardHead
          icon="layers"
          title="Inventory"
          subtitle="Everything your account owns: usernames, badges and the collectables shelf."
          actions={<Chip tone="muted">{owned.length} badges</Chip>}
        />
        <Segmented value={tab} options={TABS} onChange={(value) => setTab(value as InventoryTab)} />
      </Card>

      {tab === "usernames" ? <AliasesPage /> : null}

      {tab === "badges" ? (
        <>
          <Card>
            <CardHead
              icon="star"
              title="Your badges"
              subtitle="Earned, granted and purchased badges live on your profile."
              actions={<Chip tone={owned.length ? "success" : "muted"}>{owned.length} of {BADGE_CATALOGUE.length}</Chip>}
            />
            {owned.length ? (
              <div className="tw-grid tw-grid--3">
                {owned.map((badge) => (
                  <div className="tw-plan-perk" key={badge.id}>
                    <img src={badge.art} alt="" width={22} height={22} loading="lazy" />
                    <b>{badge.name}</b>
                    <small>{badge.description}</small>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="star" title="No badges yet" message="Badges appear here as you earn them or buy them from the store." />
            )}
          </Card>

          <Card>
            <CardHead icon="sparkles" title="Still to earn" subtitle="Every badge in the catalogue, with how it is unlocked." />
            <div className="tw-grid tw-grid--3">
              {BADGE_CATALOGUE.filter((badge) => !earnedSet.has(badge.id)).map((badge) => (
                <div className="tw-plan-perk" key={badge.id}>
                  <img src={badge.art} alt="" width={22} height={22} loading="lazy" style={{ opacity: 0.55 }} />
                  <b>{badge.name}</b>
                  <small>{badge.requirement}</small>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : null}

      {tab === "collectables" ? (
        <Card>
          <CardHead icon="layers" title="Collectables" subtitle="Trading cards, animated items and one-off drops." actions={<Chip tone="muted">COMING SOON</Chip>} />
          <EmptyState
            icon="lock"
            title="Collectables are coming soon"
            message="A shelf for limited items — animated card art, seasonal drops and numbered pieces. Nothing to collect yet."
          />
        </Card>
      ) : null}
    </>
  );
}
