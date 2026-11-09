import { useEffect, useRef, useState } from "react";
import { hrefFor, type Route } from "../lib/router";
import { useAuth, type Account } from "../lib/auth";
import {
  ChevronIcon,
  CloseIcon,
  GridIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
} from "./Icons";

/* The site header is three links: the site, the legal pages and the plan.
   Leaderboard, shop and the admin console live in the dashboard instead. */
const LINKS: { label: string; route: Route }[] = [
  { label: "Home", route: "" },
  { label: "Legal", route: "legal" },
  { label: "Premium", route: "premium" },
];

export function Header({
  route,
  user,
  loading,
  avatar,
  onSignIn,
  onSignUp,
  onSignOut,
}: {
  route: Route;
  user: Account | null;
  loading: boolean;
  /** The avatar the owner uploaded on their profile, so the header shows the
      real picture even when the account has no platform avatar. */
  avatar?: string;
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
}) {
  const { isOwner, setAlias, user: viewer } = useAuth();
  const avatarUrl = (avatar || user?.avatarUrl || "").trim();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setNavOpen(false);
  }, [route]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 981px)");
    const closeMobileNav = () => {
      if (desktop.matches) setNavOpen(false);
    };
    closeMobileNav();
    desktop.addEventListener("change", closeMobileNav);
    return () => desktop.removeEventListener("change", closeMobileNav);
  }, []);

  return (
    <header className={`site-head${scrolled ? " is-scrolled" : ""}`}>
      <div className="head-inner">
        <a className="brand" href={hrefFor("")} aria-label="tourn.lol home">
          <span className="brand-text">
            tourn<span className="brand-dot">.</span>lol
          </span>
        </a>

        <nav className="head-links" aria-label="Main">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={hrefFor(link.route)}
              className={`head-link${route === link.route ? " is-active" : ""}`}
              aria-current={route === link.route ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="head-actions">
          {loading ? (
            <span className="head-skeleton" aria-label="Checking sign-in state" />
          ) : user ? (
            <div className={`profile-menu${menuOpen ? " is-open" : ""}`} ref={menuRef}>
              <a
                className="profile-trigger"
                href={hrefFor("dashboard")}
                aria-label="Open your dashboard"
              >
                {avatarUrl ? (
                  <img className="avatar avatar--xs" src={avatarUrl} alt="" />
                ) : (
                  <span className="avatar avatar--xs avatar--initial">
                    {user.username.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="profile-trigger-copy">
                  <span className="profile-trigger-name">{user.username}</span>
                  <span className="profile-trigger-sub">Dashboard</span>
                </span>
              </a>
              <button
                type="button"
                className="profile-more"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
              >
                <ChevronIcon size={14} className="profile-chevron" />
              </button>

              {menuOpen ? (
                <div className="menu" role="menu">
                  <div className="menu-head">
                    <p className="menu-name">{user.username}</p>
                    <p className="menu-mail">{user.email ?? "Discord account"}</p>
                  </div>
                  <a className="menu-item" role="menuitem" href={hrefFor("dashboard")}>
                    <GridIcon size={15} />
                    Dashboard
                  </a>
                  <a
                    className="menu-item"
                    role="menuitem"
                    href={`/${encodeURIComponent(user.username)}`}
                  >
                    <SettingsIcon size={15} />
                    View public bio
                  </a>
                  {isOwner ? (
                    <button
                      type="button"
                      className="menu-item"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        const next = window.prompt("Owner alias (shown on the home card, max 32 chars)", viewer?.alias ?? "");
                        if (next === null) return;
                        void setAlias(next).then((result) => {
                          if (result.error) window.alert(result.error);
                        });
                      }}
                    >
                      <SettingsIcon size={15} />
                      Set owner alias
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="menu-item menu-item--danger"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onSignOut();
                    }}
                  >
                    <LogoutIcon size={15} />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <button type="button" className="head-signin" onClick={onSignIn}>
                Sign in
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={onSignUp}>
                Sign up
              </button>
            </>
          )}

          <button
            type="button"
            className="head-burger"
            onClick={() => setNavOpen((open) => !open)}
            aria-label={navOpen ? "Close menu" : "Open menu"}
            aria-expanded={navOpen}
            aria-controls="mobile-nav"
          >
            {navOpen ? <CloseIcon size={16} /> : <MenuIcon size={16} />}
          </button>
        </div>
      </div>

      {navOpen ? (
        <div className="head-mobile" id="mobile-nav">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={hrefFor(link.route)}
              className={`head-mobile-link${route === link.route ? " is-active" : ""}`}
            >
              {link.label}
            </a>
          ))}
          {user ? (
            <>
              <a className="head-mobile-link" href={hrefFor("dashboard")}>
                Dashboard
              </a>
              <button
                type="button"
                className="head-mobile-link head-mobile-link--danger"
                onClick={() => {
                  setNavOpen(false);
                  onSignOut();
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              className="head-mobile-link"
              onClick={() => {
                setNavOpen(false);
                onSignIn();
              }}
            >
              Sign in
            </button>
          )}
        </div>
      ) : null}
    </header>
  );
}
