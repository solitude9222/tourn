import { useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/backend";
import { openSellAuthCheckout } from "../lib/sellAuth";
import { useAuth, type Account } from "../lib/auth";
import { ArrowRight, CheckIcon, ChevronIcon, ExternalIcon, TrophyIcon } from "./Icons";
import "../leaderboard.css";
import "../pages.css";

type BoardRow = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  views: number | null;
};

const profileHrefFor = (handle: string) => `#/profile/${encodeURIComponent(handle)}`;

export function LeaderboardPage({ onSignUp }: { onSignUp: () => void }) {
  const { first } = useAuth();
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(18);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const board = await api<{ profiles: BoardRow[] }>("/api/leaderboard");
      if (!active) return;
      if (board.ok && board.data.profiles.length) {
        setRows(board.data.profiles.map((row) => ({ ...row, views: Number(row.views) || 0 })));
      } else {
        // Older/offline backend: still show the claimed handles, just without
        // a view count, rather than an empty page.
        const fallback = await api<{ profiles: Account[] }>("/api/profiles?limit=25");
        if (!active) return;
        const profiles =
          fallback.ok && fallback.data.profiles.length
            ? fallback.data.profiles
            : first
              ? [first]
              : [];
        setRows(
          profiles.map((row) => ({
            username: row.username,
            displayName: null,
            avatarUrl: row.avatarUrl,
            views: null,
          })),
        );
      }
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [first]);

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3, visible);
  const maxViews = rows.reduce((top, row) => Math.max(top, row.views ?? 0), 0);
  const share = (views: number | null) => `${maxViews ? Math.max(4, ((views ?? 0) / maxViews) * 100) : 0}%`;

  return (
    <section className="page">
      <div className="wrap page-head" data-reveal>
        <span className="eyebrow eyebrow--sm">leaderboard</span>
        <h1 className="page-title">The board.</h1>
        <p className="page-sub">
          Every published page, ranked by profile views. Open any name to visit that profile.
        </p>
      </div>

      <div className="wrap">
        {loading ? (
          <div className="board">
            {[0, 1, 2, 3].map((index) => (
              <div className="board-row" key={index}>
                <span className="skeleton" style={{ width: 34, height: 14 }} />
                <span className="skeleton" style={{ width: 38, height: 38, borderRadius: 12 }} />
                <span className="skeleton" style={{ width: 140, height: 12 }} />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-card" data-reveal>
            <span className="empty-icon">
              <TrophyIcon size={22} />
            </span>
            <h2>No pages on the board yet.</h2>
            <p>The first published profile takes the top spot.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={onSignUp}>
              Claim #1
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="board-podium">
              {podium.map((row, index) => (
                <a
                  key={row.username}
                  className={`board-podium-card is-${index + 1}`}
                  href={profileHrefFor(row.username)}
                  aria-label={`Rank ${index + 1}, @${row.username}`}
                >
                  <span className="board-podium-rank">
                    {index === 0 ? <TrophyIcon size={12} /> : null}
                    {index === 0 ? "Champion" : index === 1 ? "Runner-up" : "Third"}
                  </span>
                  {row.avatarUrl ? (
                    <img className="board-podium-avatar" src={row.avatarUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="board-podium-avatar board-podium-avatar--initial">
                      {row.username.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="board-podium-id">
                    <b>{row.displayName || row.username}</b>
                    <small>@{row.username}</small>
                  </span>
                  <span className="board-podium-views">
                    <b>{row.views === null ? "—" : row.views.toLocaleString()}</b>
                    <small>views</small>
                  </span>
                  <span className="board-podium-bar" aria-hidden="true">
                    <i style={{ width: share(row.views) }} />
                  </span>
                </a>
              ))}
            </div>

            {rest.length ? (
              <div className="board">
                {rest.map((row, index) => (
                  <a className="board-row" key={row.username} href={profileHrefFor(row.username)}>
                    <span className="board-rank">{String(index + 4).padStart(2, "0")}</span>
                    {row.avatarUrl ? (
                      <img className="avatar avatar--sm" src={row.avatarUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="avatar avatar--sm avatar--initial">
                        {row.username.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="board-id">
                      <p>{row.displayName || row.username}</p>
                      <span>tourn.lol/{row.username}</span>
                    </div>
                    <span className="board-row-bar" aria-hidden="true">
                      <i style={{ width: share(row.views) }} />
                    </span>
                    <span className="board-views">
                      {row.views === null ? null : (
                        <>
                          <b>{row.views.toLocaleString()}</b>
                          <small>views</small>
                        </>
                      )}
                    </span>
                    <ChevronIcon size={14} />
                  </a>
                ))}
              </div>
            ) : null}

            {rows.length > visible ? (
              <div className="board-more">
                <button type="button" className="btn btn-ghost" onClick={() => setVisible((count) => count + 15)}>
                  Load 15 more
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export function ShopPage({ onSignUp }: { onSignUp: () => void }) {
  const { user, isPremiumUser } = useAuth();
  const [shopUrl, setShopUrl] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handle, setHandle] = useState("");
  const [handleState, setHandleState] = useState<"idle" | "checking" | "free" | "taken" | "invalid">("idle");

  const checkHandle = async (value: string) => {
    const next = Array.from(value.trim().toLowerCase())[0] ?? "";
    setHandle(next);
    if (!next) { setHandleState("idle"); return; }
    setHandleState("checking");
    const result = await api<{ available: boolean; reason?: string }>(
      `/api/commerce/availability?handle=${encodeURIComponent(next)}`,
    );
    if (!result.ok) { setHandleState("idle"); return; }
    setHandleState(result.data.available ? "free" : result.data.reason ? "invalid" : "taken");
  };

  const buyUsername = async () => {
    if (!user) { onSignUp(); return; }
    if (!handle || handleState !== "free") return;
    setBuying(true);
    setError(null);
    try {
      await openSellAuthCheckout("oneCharacter", handle);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout is unavailable right now.");
    } finally {
      setBuying(false);
    }
  };

  // Stock, prices and receipts all live in the SellAuth store; this page only
  // points at it and opens the Premium checkout.
  useEffect(() => {
    void api<{ shopUrl: string }>("/api/commerce/config").then((result) => {
      if (result.ok && result.data.shopUrl) setShopUrl(result.data.shopUrl);
    });
  }, []);

  const buyPremium = async () => {
    if (!user) { onSignUp(); return; }
    setBuying(true);
    setError(null);
    try {
      await openSellAuthCheckout("premium");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout is unavailable right now.");
    } finally {
      setBuying(false);
    }
  };

  return <section className="page marketplace-page"><div className="wrap page-head" data-reveal>
    <h1 className="page-title">Store<span className="market-title-dot">.</span></h1>
    <p className="page-sub">Usernames, badges and Premium are sold through the tourn.lol store. Stock, prices and receipts are handled there, not here.</p>
  </div>
    <div className="wrap">
      <div className="store-grid">
        <article className="store-card" data-reveal>
          <span className="eyebrow eyebrow--sm">PREMIUM</span>
          <h2>One payment. Permanent.</h2>
          <div className="store-price">$9.99 <small>once</small></div>
          <p>Every effect, every audio style and a second profile address, attached to your account the moment the order is confirmed.</p>
          {isPremiumUser ? <a className="btn btn-ghost" href="#/dashboard/billing">Manage Premium <ArrowRight size={14} /></a> : <button type="button" className="btn btn-primary" disabled={buying} onClick={() => void buyPremium()}>{buying ? "Opening checkout…" : "Buy Premium"} <ArrowRight size={14} /></button>}
        </article>
        <article className="store-card" data-reveal data-reveal-delay="60">
          <span className="eyebrow eyebrow--sm">1-CHARACTER USERNAME</span>
          <h2>Claim a single character.</h2>
          <p>Type the letter, number or symbol you want. Availability is checked live on your account, then checkout opens with that name attached to the order.</p>
          <div className="store-handle">
            <span className="store-handle-prefix">tourn.lol/</span>
            <input
              value={handle}
              maxLength={1}
              placeholder="a"
              aria-label="Choose one character"
              onChange={(event) => void checkHandle(event.target.value)}
            />
          </div>
          <p className={`store-handle-state is-${handleState}`}>
            {handleState === "checking" ? "Checking availability…" : null}
            {handleState === "free" ? `@${handle} is available.` : null}
            {handleState === "taken" ? `@${handle} is already taken.` : null}
            {handleState === "invalid" ? "Use one letter, number or symbol." : null}
            {handleState === "idle" ? "Price is shown at checkout." : null}
          </p>
          <button type="button" className="btn btn-primary" disabled={buying || handleState !== "free"} onClick={() => void buyUsername()}>
            {buying ? "Opening checkout…" : user ? "Buy this name" : "Sign in to buy"}
            <ArrowRight size={14} />
          </button>
          {shopUrl ? <a className="store-link" href={shopUrl} target="_blank" rel="noreferrer">Browse badges & everything else <ExternalIcon size={12} /></a> : null}
        </article>
      </div>
      {error ? <p className="premium-buy-note" role="alert">{error}</p> : null}
      <p className="market-purchase-note">Codes from any order can be redeemed in Dashboard → Billing if Premium or a badge does not appear on its own.</p>
    </div>
  </section>;
}

function PlanCards({onSignUp,onPremium,buying}:{onSignUp:()=>void;onPremium:()=>void;buying:boolean}) {
  const {user,isPremiumUser}=useAuth();
  return <div className="plan-choice-grid">
    <article className="plan-choice"><span className="eyebrow eyebrow--sm">NORMAL</span><h2>Your space on the internet.</h2><div className="plan-choice-price">$0 <small>forever</small></div><p>A complete profile with your links, widgets, badges and your own design.</p><ul><li>Profile editor and asset uploads</li><li>Links and live platform widgets</li><li>Profile views and analytics</li></ul><a className="btn btn-ghost" href={user?'#/dashboard':'#/premium'} onClick={e=>{if(!user){e.preventDefault();onSignUp();}}}>{user?'Open your dashboard':'Create your profile'} <ArrowRight size={14}/></a></article>
    <article className="plan-choice plan-choice--premium"><span className="eyebrow eyebrow--sm">PREMIUM</span><h2>Every detail. Your way.</h2><div className="plan-choice-price">$9.99 <small>once</small></div><p>One payment, permanent access to animated effects, expressive audio and a second profile address.</p><ul><li>Background, overlay and text effects</li><li>Vinyl, marquee and lyrics players</li><li>Glass links and a swats.bio claim</li></ul>{isPremiumUser ? <a className="btn btn-primary" href="#/dashboard/billing">Manage Premium <ArrowRight size={14}/></a> : <button type="button" className="btn btn-primary" disabled={buying} onClick={onPremium}>{buying ? "Opening checkout…" : "Get Premium"} <ArrowRight size={14}/></button>}</article>
  </div>;
}
function PlanComparison() {
  return <section className="plan-compare-section"><span className="eyebrow eyebrow--sm">SIDE BY SIDE</span><h2>Find your fit.</h2><p>The essentials are free. Premium adds more ways to express yourself.</p><div className="premium-table"><div className="premium-table-head"><span>Included features</span><span>Normal</span><span>✦ Premium</span></div>{PREMIUM_COMPARE.map(row=><div className="premium-table-row" key={row.label}><span className="premium-table-label">{row.label}</span><span className={'premium-table-cell '+(row.free?'is-in':'is-out')}>{row.free?<CheckIcon size={15}/>:<span aria-label="Not included">—</span>}</span><span className="premium-table-cell is-in"><CheckIcon size={15}/></span></div>)}</div></section>;
}

/* -------------------------------------------------------------- premium */

const PREMIUM_PRICE = "$9.99";

const PREMIUM_COMPARE: { label: string; free: boolean }[] = [
  { label: "Bio page with your handle", free: true },
  { label: "Widget stack (all platforms)", free: true },
  { label: "Links with custom icons", free: true },
  { label: "Badges & badge styling", free: true },
  { label: "Live Discord / Roblox / Steam / Spotify widgets", free: true },
  { label: "Background & overlay effects beyond None", free: false },
  { label: "Marquee, vinyl & lyrics audio styles", free: false },
  { label: "File-upload audio with full transport", free: false },
  { label: "Glass & Glow link card styles", free: false },
  { label: "Primary claim — tourn.lol/you", free: true },
  { label: "Second claim — swats.bio/you", free: false },
];

const PREMIUM_FAQ = [
  {
    q: "How much is it?",
    a: `Premium is ${PREMIUM_PRICE}, paid once. It does not renew and there is no subscription to cancel — the account keeps it permanently.`,
  },
  {
    q: "How does checkout work?",
    a: "Checkout runs through SellAuth, which owns the payment, the stock and the delivery. Sign in to tourn.lol first so the order can be attached to the right profile.",
  },
  {
    q: "When does Premium switch on?",
    a: "As soon as the payment is confirmed: SellAuth reports the completed order to tourn.lol and Premium is applied to the account you were signed in with. Nothing to paste.",
  },
  {
    q: "What happens to my second claim?",
    a: "Your swats.bio claim stays live while Premium is active. Since Premium does not expire, it stays live until you release the name or delete the account.",
  },
];

export function PremiumPage({ onSignUp }: { onSignUp: () => void }) {
  const { user, isPremiumUser } = useAuth();
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  /* SellAuth owns the money and the stock; opening its checkout is the whole
     handoff. Signed-out visitors get the sign-up dialog first, because the
     order has to belong to an account before it can grant anything. */
  const buyPremium = async () => {
    if (!user) {
      onSignUp();
      return;
    }
    setBuying(true);
    setBuyError(null);
    try {
      await openSellAuthCheckout();
    } catch (error) {
      setBuyError(error instanceof Error ? error.message : "Checkout is unavailable right now.");
    } finally {
      setBuying(false);
    }
  };

  return (
    <section className="page">
      <div className="wrap page-head" data-reveal>
        <span className="eyebrow eyebrow--sm">premium</span>
        <h1 className="page-title">
          Everything, <span className="accent">unlocked.</span>
        </h1>
        <p className="page-sub">
          The core bio link stays free forever. Premium is one payment of {PREMIUM_PRICE} that
          turns on every effect, every audio style and a second claim on swats.bio — yours
          permanently, with nothing to renew.
        </p>
      </div>

      <div className="wrap">
        <PlanCards onSignUp={onSignUp} onPremium={()=>void buyPremium()} buying={buying} />

        {buyError ? (
          <p className="premium-buy-note" role="alert">
            {buyError}
          </p>
        ) : null}

        <PlanComparison />

        <div className="premium-faq">
          {PREMIUM_FAQ.map((item, index) => (
            <details className="faq-item" key={item.q} data-reveal data-reveal-delay={index * 45}>
              <summary>
                {item.q}
                <span className="faq-chevron" aria-hidden="true">
                  <ChevronIcon size={16} />
                </span>
              </summary>
              <div className="faq-body">
                <p>{item.a}</p>
              </div>
            </details>
          ))}
        </div>

        <div className="shop-note" data-reveal data-reveal-delay="120">
          <p>
            {isPremiumUser
              ? "Premium is already active on this account — everything on this page is unlocked."
              : "Checkout runs through SellAuth. Sign in first so the purchase is tied to your tourn.lol account, and Premium stays on it permanently."}
          </p>
          <a className="btn btn-ghost btn-sm" href="#/legal">
            Read the terms
            <ArrowRight size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- legal */

const LEGAL_UPDATED = "3 November 2026";

type LegalSection = { id: string; title: string; body: ReactNode[] };

const LEGAL_SECTIONS: LegalSection[] = [
  {
    id: "terms",
    title: "1. Terms of Service",
    body: [
      "These terms are the agreement between you and tourn.lol (\"tourn.lol\", \"we\", \"us\") for using this website and the profile pages it hosts. By creating an account, signing in with Discord, or visiting a published page, you accept them. If you do not accept them, do not use the service.",
      "tourn.lol is in open beta. Features can be added, changed, limited or removed, and the service can be interrupted for maintenance. We do not guarantee uninterrupted availability, and we may suspend an account that breaks these terms.",
      "You are responsible for the content you publish: your display name, bio, links, widgets, badge choices, audio and images. You must own or have permission to use everything you upload, and you must keep your account credentials and Discord session secure.",
      "Handles are allocated first-come. A handle stays yours while the account is in use and these terms are respected. We may reclaim a handle that impersonates someone, infringes a trademark, or is reserved for the operation of the site. Single-character usernames and special characters are sold through the official marketplace. Purchased names can be transferred to another member using the dashboard gifting flow.",
    ],
  },
  {
    id: "accounts",
    title: "2. Accounts and eligibility",
    body: [
      "You must be at least 13 years old to use tourn.lol, and old enough to consent to digital services where you live. If you are below the age of majority, you need a parent or guardian's permission.",
      "Sign-in is handled with Discord OAuth. We receive your Discord user id, username, display name, avatar, and the email address Discord shares with us. We never receive your Discord password.",
      "Accounts are personal. Do not share an account, and do not create accounts to evade a suspension or to claim handles in bulk for resale.",
    ],
  },
  {
    id: "acceptable-use",
    title: "3. Acceptable use",
    body: [
      "Do not use tourn.lol to publish or link to: content that is illegal where you or your visitors are, child sexual abuse material, credible threats or incitement to violence, targeted harassment, non-consensual intimate imagery, malware or phishing, scams and fraudulent giveaways, or material that infringes someone else's copyright, trademark or privacy.",
      "Do not attempt to break the service: no scraping at a rate that degrades it, no automated account creation, no attempts to access another account's dashboard or data, no exploiting an unpublished handler or endpoint, and no using the profile pages as a redirector for bulk unsolicited traffic.",
      "Do not impersonate staff, the site itself, or another person. Verification badges belong to the account they were granted to and may not be imitated in a bio, display name or image.",
    ],
  },
  {
    id: "content",
    title: "4. Your content and our licence",
    body: [
      "You keep ownership of everything you upload or write. To operate the site, you grant tourn.lol a non-exclusive, worldwide, royalty-free licence to store, copy, resize, compress, cache and display that content only as needed to run and promote your public page.",
      "Your public page is public. Anything you publish — name, bio, links, location label, avatar, widgets, view count and join date — can be seen, copied and archived by anyone. Do not publish anything private.",
      "When you remove content it stops appearing on your page, and the previous published copy is replaced. Backups and logs can retain a copy for a short period before they rotate.",
    ],
  },
  {
    id: "privacy",
    title: "5. Privacy policy",
    body: [
      "We collect the minimum needed to run a bio page: your Discord account identifier and profile details, your email address if Discord provides it, your published page document (bio, links, widgets, badges, design settings), a view counter per handle, and technical logs such as IP address, browser and timestamps kept to secure the site and debug failures.",
      "We use this data to sign you in, publish and serve your page, count views, grant badges, run the leaderboard, prevent abuse, and answer support requests. We do not sell personal data, we do not build advertising profiles, and we do not share your data with advertisers.",
      "Some data is processed by the providers that host and operate the site (application hosting, database and object storage, and Discord for sign-in). Third-party widgets you choose to add — Lanyard for Discord presence, Discord invite lookups, Spotify and Steam links — fetch data from those services and are governed by their own policies.",
      "Your dashboard settings and drafts are also stored in your browser's local storage so the page loads instantly. That copy stays on your device and is cleared when you clear site data.",
      "Legal basis: we process this data to perform our agreement with you (running your page), for our legitimate interest in keeping the service secure and working, and with your consent where the law requires it. We keep account data while the account exists and for up to 30 days after deletion in rotating backups.",
    ],
  },
  {
    id: "cookies",
    title: "6. Cookies and local storage",
    body: [
      "tourn.lol uses a small number of first-party cookies: a session cookie that keeps you signed in after the Discord callback, and security cookies that protect the sign-in flow. They are required for the site to work, so there is no cookie banner to dismiss.",
      "We use browser local storage for your saved page state, the entry screen's \"seen this visit\" flag, your dashboard navigation preferences, and the premium flag used during testing. We do not use advertising or cross-site tracking cookies, and there is no third-party analytics script on the site.",
      "You can delete cookies and local storage in your browser at any time. Signing out clears the session cookie; your published page stays live until you delete or unpublish it.",
    ],
  },
  {
    id: "premium",
    title: "7. Premium, payments and refunds",
    body: [
      "Premium is a cosmetic upgrade: effects, audio styles and a second claim. It never affects ranking, visibility of other pages, or access to the core bio link, which stays free.",
      "Premium is a single one-time payment of $9.99, processed by SellAuth, which receives your payment details — tourn.lol never sees or stores full card numbers. The price is shown before you pay and never renews.",
      "Because Premium does not expire and is not a subscription, there is nothing to cancel. Where consumer law gives you a right of withdrawal, contact legal@tourn.lol within 14 days of the charge and we will refund it if the upgrade has not been materially used.",
      "If a payment is reversed or refunded, Premium features switch off but your page, links and handle remain. Nothing you wrote is deleted because a purchase was undone.",
    ],
  },
  {
    id: "dmca",
    title: "8. Copyright and takedowns",
    body: [
      "If you believe content on a tourn.lol page infringes your copyright, email legal@tourn.lol with: your name and contact details, identification of the work, the exact URL of the infringing page, a statement that you have a good-faith belief the use is unauthorised, a statement that the information is accurate and that you are the owner or authorised to act for them, and your physical or electronic signature.",
      "We remove or disable access to material that is the subject of a valid notice, and we notify the account holder. Accounts that receive repeated valid notices are suspended. If your content was removed in error, you can send a counter-notice to the same address with the same elements plus consent to jurisdiction; we may restore the content unless the claimant files an action.",
      "For trademark, impersonation or privacy complaints, use the same address and describe the right that is being infringed. We aim to respond within five working days.",
    ],
  },
  {
    id: "data-rights",
    title: "9. Your data rights and deletion",
    body: [
      "You can view and edit everything stored about your page from the dashboard, and unpublish the page at any time. To delete the account entirely — account, published page, badges, view counters and stored assets — email legal@tourn.lol from the address on the account, or from the Discord account used to sign in, and confirm the handle you want removed.",
      "Deletion is processed within 30 days, and rotating backups are purged within a further 30 days. We keep the minimum records needed to comply with tax, fraud-prevention or legal obligations, and we keep an abuse record if an account was removed for breaking these terms.",
      "Depending on where you live you may also have the right to access, correct, export, restrict or object to processing, and to complain to your local data protection authority. Requests are answered within the statutory period.",
    ],
  },
  {
    id: "security",
    title: "10. Security",
    body: [
      "Sign-in is delegated to Discord over OAuth, sessions are carried in HTTP-only cookies, and private API routes require a verified session and same-origin requests. Data belonging to one account is scoped to that account's session on the server.",
      "No service is perfectly secure. Report a vulnerability to legal@tourn.lol instead of publishing it or testing it against other people's accounts. We will not pursue good-faith research that avoids privacy violations, data destruction and service disruption, and we credit reporters who want it.",
    ],
  },
  {
    id: "liability",
    title: "11. Availability, liability and changes",
    body: [
      "The service is provided \"as is\" during the beta. To the extent the law allows, tourn.lol is not liable for indirect or consequential losses, lost profits, or loss of data caused by outages, third-party services (Discord, Lanyard, Spotify, Steam, hosting providers) or content published by other users. Nothing here limits liability that cannot legally be limited, including for fraud or death and personal injury caused by negligence.",
      "We may update these terms as the product changes. Material changes are announced on this page with a new date, and continuing to use the service after a change means you accept the updated terms. If you do not agree, unpublish your page and delete your account.",
      "These terms are governed by the laws that apply at the operator's place of establishment, without regard to conflict-of-law rules. Before any formal action, contact us so we can try to resolve the issue informally.",
    ],
  },
  {
    id: "contact",
    title: "12. Contact",
    body: [
      "Legal, privacy and takedown requests: legal@tourn.lol. General support and account help: hello@tourn.lol. The fastest route for a broken page or a badge that will not show is the tourn.lol Discord, where staff can look at the account directly.",
      `These pages were last updated on ${LEGAL_UPDATED}.`,
    ],
  },
];

export function LegalPage() {
  // `#/legal/privacy` keeps the legal page mounted and scrolls to that section
  // instead of routing home.
  useEffect(() => {
    const scrollToSection = () => {
      const raw = window.location.hash.replace(/^#\/?/, "");
      if (!raw.startsWith("legal/")) return;
      const id = decodeURIComponent(raw.slice("legal/".length));
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const timer = window.setTimeout(scrollToSection, 120);
    window.addEventListener("hashchange", scrollToSection);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", scrollToSection);
    };
  }, []);

  return (
    <section className="page legal-page">
      <div className="wrap page-head" data-reveal>
        <span className="eyebrow eyebrow--sm">legal</span>
        <h1 className="page-title">The rules, in full.</h1>
        <p className="page-sub">
          Terms, privacy, cookies, takedowns and how to get your data deleted — everything that
          applies to a tourn.lol page, written to be read rather than skimmed past.
        </p>
        <p className="legal-updated">Last updated {LEGAL_UPDATED}</p>
      </div>

      <div className="wrap legal-wrap">
        <nav className="legal-toc" aria-label="Legal sections" data-reveal>
          {LEGAL_SECTIONS.map((section) => (
            <a key={section.id} href={`#/legal/${section.id}`}>
              {section.title}
            </a>
          ))}
        </nav>

        <article className="legal-body">
          <div className="legal-intro" data-reveal>
            <p>
              tourn.lol hosts one public page per handle. This document covers the whole service:
              the site, the dashboard, published profiles, badges, the leaderboard and Premium.
            </p>
          </div>

          {LEGAL_SECTIONS.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="legal-section"
              data-reveal
              data-reveal-delay={index * 20}
            >
              <h2>{section.title}</h2>
              {section.body.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>{paragraph}</p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </section>
  );
}
