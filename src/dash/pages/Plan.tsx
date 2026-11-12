/* ---------------------------------------------------------------------------
   Premium and Billing.
   --------------------------------------------------------------------------- */

import { useState } from "react";
import { post } from "../../lib/backend";
import { useAuth } from "../../lib/auth";
import { useDash } from "../context";
import { Button, Card, CardHead, Chip, EmptyState, Field, Icon, TextInput } from "../ui";

export function PremiumPage() {
  const { isPremium, go, notify } = useDash();

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      hint: "Everything you need for one clean page.",
      features: ["Profile page", "Links & widgets", "Badges", "Asset uploads"],
      active: !isPremium,
    },
    {
      id: "premium",
      name: "Premium",
      price: "$9.99",
      hint: "One payment, permanent access to the full customisation toolkit.",
      features: [
        "Custom badges",
        "Gradient & glow card effects",
        "Glass & glow link styles",
        "Premium aliases",
      ],
      active: isPremium,
    },
  ];

  return (
    <>
      <Card>
        <CardHead
          icon="crown"
          title="Your plan"
          subtitle={isPremium ? "Premium is active on this account." : "You are on the free plan."}
          actions={<Chip tone={isPremium ? "success" : "muted"}>{isPremium ? "PREMIUM" : "FREE"}</Chip>}
        />
      </Card>

      <div className="tw-plan-grid">
        {plans.map((plan) => (
          <Card key={plan.id} className={`tw-plan${plan.active ? " is-active" : ""}`}>
            <div className="tw-plan-head">
              <span>{plan.name}</span>
              {plan.active ? <Chip tone="accent">CURRENT</Chip> : null}
            </div>
            <b className="tw-plan-price">{plan.price}</b>
            <small>{plan.hint}</small>
            <ul className="tw-plan-list">
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Icon name="check" size={13} />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              variant={plan.id === "premium" ? "primary" : "ghost"}
              wide
              disabled={plan.active}
              onClick={() => {
                if (plan.id === "premium") {
                  window.location.hash = "#/premium";
                } else {
                  notify("Free plan", "You are already on the free plan.");
                }
              }}
            >
              {plan.active ? "Current plan" : plan.id === "premium" ? "Upgrade" : "Free"}
            </Button>
          </Card>
        ))}
      </div>

      <Card>
        <CardHead icon="star" title="What Premium unlocks" />
        <div className="tw-grid tw-grid--3">
          {[
            ["Custom badges", "Create your own badge with a custom icon and name."],
            ["Premium links", "Glass and glow styles for your social links."],
            ["Alias", "A second address under swats.bio."],
            ["Priority support", "Direct help in the Discord."],
            ["Early features", "New customisation tools first."],
          ].map(([title, copy]) => (
            <div className="tw-plan-perk" key={title}>
              <Icon name="sparkles" size={15} />
              <b>{title}</b>
              <small>{copy}</small>
            </div>
          ))}
        </div>
        <p className="tw-foot-note">
          Premium is a one-time $9.99 purchase through SellAuth on the pricing page. Marketplace usernames are separate purchases.
        </p>
        <div className="tw-row" style={{ marginTop: 12 }}>
          <Button variant="primary" icon="external" onClick={() => (window.location.hash = "#/premium")}>
            Open pricing
          </Button>
          <Button icon="settings" onClick={() => go("billing")}>
            Billing
          </Button>
        </div>
      </Card>
    </>
  );
}

export function BillingPage() {
  const { user, isPremium, go, notify } = useDash();
  const { retryAuth } = useAuth();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  /* SellAuth delivers a one-use TOURN code with every order. Redeeming it here
     is the fallback path when the order couldn't be matched to this account
     automatically (checkout as a guest, a different browser, a gift). */
  const redeem = async () => {
    if (!code.trim() || redeeming) return;
    setRedeeming(true);
    const result = await post<{ reward: { kind: string; handle: string | null } }>(
      "/api/commerce/redeem",
      { code },
    );
    setRedeeming(false);
    if (!result.ok) {
      notify("Couldn't redeem", result.error);
      return;
    }
    setCode("");
    await retryAuth();
    notify(
      "Code redeemed",
      result.data.reward.kind === "premium"
        ? "Premium is now active on this account."
        : `@${result.data.reward.handle} is now yours.`,
    );
  };

  return (
    <>
      <Card>
        <CardHead
          icon="crown"
          title="Billing"
          subtitle="Your plan and payment details."
          actions={<Chip tone={isPremium ? "success" : "muted"}>{isPremium ? "PREMIUM" : "FREE"}</Chip>}
        />

        <div className="tw-meta-grid">
          <div>
            <small>Plan</small>
            <b>{isPremium ? "Premium" : "Free"}</b>
          </div>
          <div>
            <small>Purchase</small>
            <b>{isPremium ? "One-time · $9.99" : "—"}</b>
          </div>
          <div>
            <small>Renewal</small>
            <b>{isPremium ? "Never expires" : "—"}</b>
          </div>
          <div>
            <small>Account</small>
            <b>@{user.username}</b>
          </div>
        </div>

        <div className="tw-row" style={{ marginTop: 18 }}>
          <Button variant="primary" icon="crown" onClick={() => (window.location.hash = "#/premium")}>
            {isPremium ? "Manage plan" : "Upgrade to Premium"}
          </Button>
          <Button icon="help" onClick={() => go("premium")}>
            Compare plans
          </Button>
        </div>
      </Card>

      <Card>
        <CardHead
          icon="key"
          title="Redeem a code"
          subtitle="Paid on SellAuth? Paste the TOURN code from your order if Premium didn't switch on by itself."
        />
        <Field label="Purchase code" hint="Looks like TOURN-0F2A…, 32 characters after the dash.">
          <TextInput
            value={code}
            placeholder="TOURN-"
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter") void redeem();
            }}
          />
        </Field>
        <div className="tw-row" style={{ marginTop: 12 }}>
          <Button variant="primary" icon="key" disabled={!code.trim() || redeeming} onClick={() => void redeem()}>
            {redeeming ? "Redeeming…" : "Redeem code"}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHead icon="chart" title="Invoices" subtitle="Receipts live in SellAuth, where the payment was made." />
        <EmptyState
          icon="save"
          title="No invoices yet"
          message="Once checkout is connected, every payment will leave a receipt here."
        />
      </Card>

      <Card>
        <CardHead icon="key" title="Payment method" />
        <EmptyState
          icon="lock"
          title="No card on file"
          message="Card details are handled by the payment provider and never stored on tourn.lol."
          action={
            <Button onClick={() => (window.location.hash = "#/premium")}>
              Open checkout
            </Button>
          }
        />
      </Card>
    </>
  );
}

