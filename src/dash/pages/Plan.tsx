/* ---------------------------------------------------------------------------
   Premium, Billing, Portfolio and the two embedded console pages.
   --------------------------------------------------------------------------- */

import { useDash } from "../context";
import {
  Button,
  Card,
  CardHead,
  Chip,
  EmptyState,
  Field,
  Icon,
  Slider,
  Toggle,
} from "../ui";

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
      price: "$4.99",
      hint: "The full customisation toolkit.",
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
            ["Card effects", "Gradient and glow treatments for your profile card."],
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
          Checkout is not live yet. The plan page opens the public pricing page, where the payment
          provider is connected.
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
  const { user, isPremium, go } = useDash();

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
            <small>Billing cycle</small>
            <b>{isPremium ? "Monthly" : "—"}</b>
          </div>
          <div>
            <small>Next payment</small>
            <b>{isPremium ? "Managed in checkout" : "—"}</b>
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
        <CardHead icon="chart" title="Invoices" subtitle="Receipts appear here after a payment." />
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

export function PortfolioPage() {
  const { about, setAbout } = useDash();
  const slideshow = about.design.slideshow;

  const update = (patch: Partial<typeof slideshow>) =>
    setAbout((current) => ({
      ...current,
      design: { ...current.design, slideshow: { ...current.design.slideshow, ...patch } },
    }));

  return (
    <>
      <Card>
        <CardHead
          icon="layers"
          title="Portfolio"
          subtitle="Full-height sections and how visitors move through them."
          actions={
            <Chip tone={about.design.cardStyle === "slideshow" ? "accent" : "muted"}>
              {about.design.cardStyle === "slideshow" ? "SLIDESHOW ON" : "CARD MODE"}
            </Chip>
          }
        />

        <div className="tw-inline-toggle">
          <span>
            <b>Use the slideshow layout</b>
            <small>Turn your profile into full-height portfolio sections.</small>
          </span>
          <Toggle
            checked={about.design.cardStyle === "slideshow"}
            onChange={(checked) =>
              setAbout((current) => ({
                ...current,
                design: {
                  ...current.design,
                  cardStyle: checked ? "slideshow" : "default",
                },
              }))
            }
            label="Use the slideshow layout"
          />
        </div>

        <div className="tw-grid tw-grid--2" style={{ marginTop: 20 }}>
          <div className="tw-inline-toggle">
            <span>
              <b>Smooth scrolling</b>
              <small>Animated snap between sections</small>
            </span>
            <Toggle
              checked={slideshow.smooth}
              onChange={(checked) => update({ smooth: checked })}
              label="Smooth scrolling"
            />
          </div>
          <div className="tw-inline-toggle">
            <span>
              <b>Section indicator</b>
              <small>Dots showing where the visitor is</small>
            </span>
            <Toggle
              checked={slideshow.indicator}
              onChange={(checked) => update({ indicator: checked })}
              label="Section indicator"
            />
          </div>
          <div className="tw-inline-toggle">
            <span>
              <b>Side navigation</b>
              <small>Section labels down the side</small>
            </span>
            <Toggle
              checked={slideshow.sideNav}
              onChange={(checked) => update({ sideNav: checked })}
              label="Side navigation"
            />
          </div>
          <Field label="Scroll speed">
            <Slider
              label="Scroll speed"
              value={slideshow.speed}
              min={250}
              max={1400}
              step={10}
              suffix="ms"
              onChange={(value) => update({ speed: value })}
            />
          </Field>
        </div>
      </Card>
    </>
  );
}
