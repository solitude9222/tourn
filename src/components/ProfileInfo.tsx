/* ---------------------------------------------------------------------------
   The profile picture's statistics popup.

   Clicking the picture opens the same kind of dialog the widget cards use, but
   filled with what this Linker page actually knows: view count, the reactions
   the server holds, and how the page is built. Nothing is invented — while the
   reaction numbers are loading (or when the endpoint is down) those rows say so.
   --------------------------------------------------------------------------- */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { readReactions, type ReactionState } from "../lib/reactions";
import "../profileInfo.css";

export type ProfileInfoCounts = {
  badges: number;
  links: number;
  projects: number;
  skills: number;
  gallery: number;
};

export type ProfileInfoData = {
  handle: string;
  displayName: string;
  secondaryName?: string;
  avatarUrl?: string;
  uid?: number | null;
  joined?: string;
  views?: number | null;
  location?: string;
  bio?: string;
  counts: ProfileInfoCounts;
};

const count = (value: number) => value.toLocaleString("en-US");

/** A bar is still readable at zero (a hairline) without pretending there is data. */
const share = (value: number, top: number) => `${value > 0 ? Math.max(3, (value / top) * 100) : 0}%`;

export function ProfileInfoDialog({ data, onClose }: { data: ProfileInfoData; onClose: () => void }) {
  const [reactions, setReactions] = useState<ReactionState | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus({ preventScroll: true });
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    void readReactions(data.handle).then((next) => {
      if (active) setReactions(next);
    });
    return () => {
      active = false;
    };
  }, [data.handle]);

  const views = typeof data.views === "number" ? data.views : 0;
  const likes = reactions?.likes ?? 0;
  const dislikes = reactions?.dislikes ?? 0;
  const votes = likes + dislikes;
  const likeShare = votes ? Math.round((likes / votes) * 100) : 0;
  const top = Math.max(1, views, likes, dislikes);
  const bars = [
    { key: "views", label: "Profile views", value: views },
    { key: "likes", label: "Likes", value: likes },
    { key: "dislikes", label: "Dislikes", value: dislikes },
  ];
  const composition = [
    { key: "links", label: "Links", value: data.counts.links, color: "#7aa2ff" },
    { key: "badges", label: "Badges", value: data.counts.badges, color: "#f4c66a" },
    { key: "projects", label: "Projects", value: data.counts.projects, color: "#a78bfa" },
    { key: "skills", label: "Skills", value: data.counts.skills, color: "#5eead4" },
    { key: "gallery", label: "Gallery", value: data.counts.gallery, color: "#38bdf8" },
  ].filter((entry) => entry.value > 0);
  const compositionTotal = composition.reduce((sum, entry) => sum + entry.value, 0);
  const tiles = [
    { key: "views", label: "Views", value: views },
    { key: "likes", label: "Likes", value: reactions ? likes : null },
    { key: "dislikes", label: "Dislikes", value: reactions ? dislikes : null },
    { key: "badges", label: "Badges", value: data.counts.badges },
    { key: "links", label: "Links", value: data.counts.links },
    { key: "projects", label: "Projects", value: data.counts.projects },
  ];

  return createPortal(
    <div
      className="wg-info-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="wg-info pi-dialog" role="dialog" aria-modal="true" aria-labelledby="pi-title">
        <header className="wg-info-head">
          <span className="wg-info-icon pi-avatar">
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt="" />
            ) : (
              <span aria-hidden="true">{data.displayName.slice(0, 1).toUpperCase()}</span>
            )}
          </span>
          <span className="wg-info-titles">
            <b id="pi-title">{data.displayName}</b>
            <small>
              @{data.handle}
              {typeof data.uid === "number" ? ` · #${data.uid}` : ""}
              {data.secondaryName ? ` · ${data.secondaryName}` : ""}
            </small>
          </span>
          <button ref={closeRef} type="button" className="wg-info-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="wg-info-body">
          {data.bio ? <p className="pi-bio">{data.bio}</p> : null}

          <div className="pi-stats">
            {tiles.map((tile) => (
              <div className="pi-stat" key={tile.key}>
                <b>{tile.value === null ? "—" : count(tile.value)}</b>
                <small>{tile.label}</small>
              </div>
            ))}
          </div>

          <section className="pi-panel" aria-label="Community numbers">
            <h4>Community</h4>
            <div className="pi-bars">
              {bars.map((bar) => (
                <div className="pi-bar-row" key={bar.key}>
                  <span>{bar.label}</span>
                  <span className={`pi-bar pi-bar--${bar.key}`}>
                    <i style={{ width: share(bar.value, top) }} />
                  </span>
                  <b>{bar.key !== "views" && !reactions ? "—" : count(bar.value)}</b>
                </div>
              ))}
            </div>
          </section>

          <section className="pi-panel pi-split" aria-label="Reactions and page composition">
            <div
              className={`pi-donut${votes ? "" : " pi-donut--empty"}`}
              style={{ "--pi-like": `${likeShare * 3.6}deg` } as CSSProperties}
              role="img"
              aria-label={votes ? `${likeShare}% of votes are likes` : "No votes yet"}
            >
              <span>{votes ? `${likeShare}%` : "—"}</span>
            </div>
            <div className="pi-legend">
              <h4>Reaction mix</h4>
              <div>
                <i style={{ background: "#6ee7a8" }} />
                Likes <b>{reactions ? count(likes) : "—"}</b>
              </div>
              <div>
                <i style={{ background: "#f08f9f" }} />
                Dislikes <b>{reactions ? count(dislikes) : "—"}</b>
              </div>
            </div>
          </section>

          <section className="pi-panel" aria-label="Page composition">
            <h4>Page composition</h4>
            {composition.length ? (
              <>
                <span className="pi-composition" aria-hidden="true">
                  {composition.map((entry) => (
                    <i
                      key={entry.key}
                      style={{ width: `${(entry.value / compositionTotal) * 100}%`, background: entry.color }}
                    />
                  ))}
                </span>
                <div className="pi-legend">
                  {composition.map((entry) => (
                    <div key={entry.key}>
                      <i style={{ background: entry.color }} />
                      {entry.label} <b>{count(entry.value)}</b>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="pi-note">No links, badges, projects, skills or gallery images on this page yet.</p>
            )}
          </section>
        </div>

        <footer className="wg-info-foot pi-foot">
          {data.location || data.joined ? (
            <small>
              {data.location ? data.location : null}
              {data.location && data.joined ? " · " : null}
              {data.joined ? `Joined ${data.joined}` : null}
            </small>
          ) : null}
          <button type="button" className="wg-info-done" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
