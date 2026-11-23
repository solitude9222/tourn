import {lazy,Suspense} from "react";
import {preloadRoute} from "../lib/routePreload";
import "../home.css";
const ProfileCard=lazy(()=>import("./ProfileCard").then(module=>({default:module.ProfileCard})));
export function Hero({
  signedIn,
  onPrimary,
  onPremium,
}: {
  signedIn: boolean;
  onPrimary: () => void;
  onPremium: () => void;
}) {
  return (
    <section className="hm-hero" id="top">
      <div className="hm-hero-glow" aria-hidden="true" />
      <div className="hm-wrap hm-hero-grid">
        <div className="hm-hero-copy"><span className="hm-hero-kicker">MAKE YOURSELF AT HOME</span>
          <h1 className="hm-hero-title">
            Your world,<br/><span>one link.</span>
          </h1>
          <p className="hm-hero-sub">
            Your music, your communities, your work. Bring it all together on a profile that feels like you.
          </p>
          <div className="hm-hero-actions">
            <button
              type="button"
              className="hm-btn hm-btn--blue"
              onClick={onPrimary}
              onPointerEnter={() => { if (signedIn) preloadRoute("dashboard"); }}
              onFocus={() => { if (signedIn) preloadRoute("dashboard"); }}
            >
              {signedIn ? "Open your dashboard" : "Create account"}
            </button>
            <button
              type="button"
              className="hm-btn hm-btn--dark"
              onClick={onPremium}
              onPointerEnter={() => preloadRoute("premium")}
              onFocus={() => preloadRoute("premium")}
            >
              <span className="hm-btn-tag" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20.6 12.4 12.4 20.6a2 2 0 0 1-2.8 0l-6.2-6.2a2 2 0 0 1-.6-1.4V4.6c0-1.1.9-2 2-2h8.4c.5 0 1 .2 1.4.6l6.2 6.2a2 2 0 0 1 0 3Z" />
                  <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
                </svg>
              </span>
              View pricing
            </button>
          </div>
        </div>
        <div className="hm-hero-card">
          <Suspense fallback={<div className="hm-hero-preview-loading" role="status">Loading profile preview…</div>}><ProfileCard /></Suspense>
        </div>
      </div>
    </section>
  );
}

