import "../headerAccount.css";
import { useEffect, useId, useRef, useState } from "react";
import { hrefFor, type Route } from "../lib/router";
import { preloadRoute } from "../lib/routePreload";
import { useAuth, type Account } from "../lib/auth";
import {
  BagIcon,
  ChevronIcon,
  CloseIcon,
  GridIcon,
  ExternalIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
} from "./Icons";
import { cartCount, cartSubscribe } from "../lib/cart";

/* The site header: the site, the board, the plan and the legal pages. The
   shop and admin console live in the dashboard instead. */
const LINKS: { label: string; route?: Route; href?: string }[] = [
  { label: "Discord", href: "https://discord.gg/a9uwptuepD" },
  { label: "Leaderboard", route: "leaderboard" },
  { label: "Pricing", route: "premium" },
  { label: "Marketplace", route: "shop" },
  { label: "Legal", route: "legal" },
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
  const publicName = user?.alias?.trim() || user?.username || "";
  const [menuOpen, setMenuVisible] = useState(false);
  const [menuClosing,setMenuClosing]=useState(false);
  const closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const triggerRef=useRef<HTMLButtonElement>(null);
  const menuId=useId();
  const setMenuOpen=(value:boolean|((open:boolean)=>boolean))=>{const next=typeof value==='function'?value(menuOpen):value;if(closeTimer.current)clearTimeout(closeTimer.current);if(next){setMenuClosing(false);setMenuVisible(true);}else if(menuOpen){setMenuVisible(false);setMenuClosing(true);closeTimer.current=setTimeout(()=>setMenuClosing(false),160);}else{setMenuVisible(false);setMenuClosing(false);}};
  useEffect(()=>()=>{if(closeTimer.current)clearTimeout(closeTimer.current);},[]);
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartTotal, setCartTotal] = useState(() => cartCount());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => cartSubscribe(() => setCartTotal(cartCount())), []);

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
      if(event.key==='Escape'){event.preventDefault();setMenuOpen(false);triggerRef.current?.focus();return;}
      if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key)||!menuRef.current?.contains(event.target as Node))return;event.preventDefault();const items=Array.from(menuRef.current.querySelectorAll<HTMLElement>('[role=menuitem]'));const index=items.indexOf(document.activeElement as HTMLElement);const next=event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(index+1)%items.length:(index-1+items.length)%items.length;items[next]?.focus();
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
          <img className="brand-logo" src="/brand/tourn-mark.svg" alt="" width={30} height={30} />
          <span className="brand-text">
            tourn<span className="brand-dot">.</span>lol
          </span>
        </a>

        <nav className="head-links" aria-label="Main">
          {LINKS.map((link) =>
            link.href ? (
              <a
                key={link.label}
                href={link.href}
                className="head-link"
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
            ) : (
              <a
                key={link.label}
                href={hrefFor(link.route ?? "")}
                className={`head-link${route === link.route ? " is-active" : ""}`}
                aria-current={route === link.route ? "page" : undefined}
                onPointerEnter={() => preloadRoute(link.route ?? "")}
                onPointerDown={() => preloadRoute(link.route ?? "")}
                onFocus={() => preloadRoute(link.route ?? "")}
              >
                {link.label}
              </a>
            ),
          )}
        </nav>

        <div className="head-actions">
          <a
            className={`head-cart${route === "cart" ? " is-active" : ""}`}
            href={hrefFor("cart")}
            aria-label={`Cart, ${cartTotal} item${cartTotal === 1 ? "" : "s"}`}
          >
            <BagIcon size={16} />
            {cartTotal ? <span className="head-cart-count">{cartTotal}</span> : null}
          </a>
          {loading ? (
            <span className="head-skeleton" aria-label="Checking sign-in state" />
          ) : user ? (
            <div className={`profile-menu${menuOpen ? " is-open" : ""}`} ref={menuRef} onBlurCapture={event=>{if(menuOpen&&!event.currentTarget.contains(event.relatedTarget as Node|null))setMenuOpen(false);}}>
              <button ref={triggerRef} type="button" className="profile-trigger" aria-label="Account menu" aria-controls={menuId} onKeyDown={event=>{if(event.key!=="ArrowDown"&&event.key!=="ArrowUp")return;event.preventDefault();setMenuOpen(true);const last=event.key==="ArrowUp";requestAnimationFrame(()=>{const items=menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]");if(items?.length)items[last?items.length-1:0].focus();});}} aria-haspopup="menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(open=>!open)} onPointerEnter={()=>preloadRoute("dashboard")}>
                {avatarUrl?<img className="avatar avatar--xs" src={avatarUrl} alt=""/>:<span className="avatar avatar--xs avatar--initial">{publicName.slice(0,1).toUpperCase()}</span>}
                <span className="profile-trigger-copy"><span className="profile-trigger-name">{publicName}</span><span className="profile-trigger-sub">My account</span></span><ChevronIcon size={14} className="profile-chevron"/>
              </button>

              {menuOpen||menuClosing ? (
                <div id={menuId} className={`menu${menuClosing?" is-closing":""}`} role="menu" aria-label="Your account" inert={!menuOpen} onClick={event=>{if((event.target as Element).closest("a[role=menuitem]"))setMenuOpen(false);}}>
                  <div className="menu-head">{avatarUrl?<img className="menu-account-avatar" src={avatarUrl} alt=""/>:<span className="menu-account-avatar">{publicName.slice(0,1).toUpperCase()}</span>}<div><p className="menu-name">{publicName}</p><p className="menu-mail">@{user.username}</p></div><span className="menu-account-status">Signed in</span></div>
                  <a className="menu-item" role="menuitem" href={hrefFor("dashboard")}>
                    <GridIcon size={15} />
                    Dashboard
                  </a>
                  <a
                    className="menu-item"
                    role="menuitem"
                    href={`/${encodeURIComponent(user.username)}`}
                  >
                    <ExternalIcon size={15} />
                    View profile
                  </a>
                  <a className="menu-item" role="menuitem" href={hrefFor("dashboard")+"/settings"}><SettingsIcon size={15}/>Account settings</a>
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
              href={link.href ?? hrefFor(link.route ?? "")}
              className={`head-mobile-link${route === link.route ? " is-active" : ""}`}
              {...(link.href ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {link.label}
            </a>
          ))}
          {user ? (
            <>
              <a
                className="head-mobile-link"
                href={hrefFor("dashboard")}
                onPointerEnter={() => preloadRoute("dashboard")}
                onPointerDown={() => preloadRoute("dashboard")}
                onFocus={() => preloadRoute("dashboard")}
              >
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
