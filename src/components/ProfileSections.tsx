import {normalizeStudio,type StudioOptions} from "../lib/studioOptions";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DEFAULT_PROJECT_LAYOUT, type InterestMode, type ProfileSection, type ProjectLayout } from "../lib/about";
import { TECH_BY_ID, techIconUrl } from "../lib/techStack";
import "../aboutSections.css";

/* Public rendering for profile sections. Projects are wide, full-size cards;
   interests are poster cards from the anime library. Both carry real artwork,
   metadata, genuine technology icons and links. */

const KIND_LABEL: Record<ProfileSection["kind"], string> = {
  project: "Project",
  interest: "Interest",
};

function safeUrl(url: string): string | null {
  return /^https?:\/\//i.test(url) ? url : null;
}

function TechBadge({ id }: { id: string }) {
  const tech = TECH_BY_ID.get(id);
  if (!tech) return null;
  return (
    <span className="lkr-tech" title={tech.name}>
      <img
        src={techIconUrl(tech)}
        alt=""
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
      {tech.name}
    </span>
  );
}

/* Interests sit in a fixed four-up rail. The rail fades at whichever edge has
   more posters beyond it and the two arrow buttons move one page at a time;
   catalogue mode drops the rail and shows every poster in the same grid. */
function InterestSet({ section, mode,studio:input }: { section: ProfileSection; mode?: InterestMode;studio?:StudioOptions }) {
  const studio=normalizeStudio(input);
  const [filter,setFilter]=useState("all");
  const picks = (section.items ?? []).filter(pick=>filter==="all"||(pick.category||"anime")===filter);
  const layout: InterestMode = mode === "catalog" ? "catalog" : "carousel";
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const sync = () => {
      const remaining = track.scrollWidth - track.clientWidth;
      setOverflowing(remaining > 2);
      setEdges({
        left: track.scrollLeft > 2,
        right: remaining > 2 && track.scrollLeft < remaining - 2,
      });
    };
    sync();
    track.addEventListener("scroll", sync, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    observer?.observe(track);
    window.addEventListener("resize", sync);
    return () => {
      track.removeEventListener("scroll", sync);
      observer?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [picks.length, layout]);

  const scrollPage = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
  };

  const mask = layout === "carousel" && overflowing
    ? `linear-gradient(90deg, ${edges.left ? "transparent" : "#000"} 0, #000 26px, #000 calc(100% - 26px), ${edges.right ? "transparent" : "#000"} 100%)`
    : undefined;

  return (
    <article className="lkr-interest-set">
      <div className="lkr-interest-head">
        {section.title ? <h2>{section.title}</h2> : null}
        {layout === "carousel" && overflowing ? (
          <div className="lkr-interest-arrows">
            <button
              type="button"
              aria-label="Previous interests"
              disabled={!edges.left}
              onClick={() => scrollPage(-1)}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              aria-label="Next interests"
              disabled={!edges.right}
              onClick={() => scrollPage(1)}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        ) : null}
      </div>
      {(new Set(section.items.map(p=>p.category||"anime"))).size>1?<div className="studio-interest-filters" aria-label="Interest categories">{['all',...new Set(section.items.map(p=>p.category||'anime'))].map(value=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value}</button>)}</div>:null}
      <div className={`lkr-interest-rail lkr-interest-rail--${layout}`}>
        <div
          ref={trackRef}
          className="lkr-interest-track"
          style={{ maskImage: mask, WebkitMaskImage: mask } as CSSProperties}
        >
          {picks.map((pick) => {
            const href = safeUrl(pick.url);
            const body = (
              <>
                <span className="lkr-interest-art" data-fallback={pick.title||"No poster"}>
                  {pick.image ? <img src={pick.image} alt="" loading="lazy" style={{objectPosition:`${pick.cropX??50}% ${pick.cropY??50}%`,transform:`scale(${pick.zoom??1})`}} onError={event=>{event.currentTarget.style.visibility="hidden";}}/> : null}
                </span>
                <span className="lkr-interest-copy">
                  <b>{pick.title || "Untitled"}</b>
                  <small>{[pick.subtitle, pick.meta,studio.posterRating&&pick.rating?`★ ${pick.rating}/10`:null,studio.posterStatus?pick.status:null].filter(Boolean).join(" · ")}</small>
                </span>
              </>
            );
            return href ? (
              <a className="lkr-interest-tile" title={pick.notes||pick.title} href={href} target="_blank" rel="noreferrer" key={pick.id}>
                {body}
              </a>
            ) : (
              <span className="lkr-interest-tile" title={pick.notes||pick.title} key={pick.id}>
                {body}
              </span>
            );
          })}
        </div>
      </div>
      {section.text ? <p className="lkr-interest-note">{section.text}</p> : null}
    </article>
  );
}

export function ProfileSections({
  sections,
  interestMode,
  projectLayout = DEFAULT_PROJECT_LAYOUT,
  studio,
}: {
  sections: ProfileSection[];
  interestMode?: InterestMode;
  projectLayout?: ProjectLayout;
  studio?:StudioOptions;
}) {
  if (!sections.length) return null;

  const single = sections.length === 1 && sections[0].kind === "project";

  return (
    <div className={`lkr-sections${single ? " lkr-sections--single" : ""}`}>
      {sections.map((section) => {
        const mainUrl = safeUrl(section.url);

        // Several animes in one section: one rail or one catalogue grid.
        if (section.kind === "interest" && (section.items ?? []).length) {
          return <InterestSet section={section} mode={interestMode} studio={studio} key={section.id} />;
        }

        const kinds = [projectLayout.showStatus ? section.status : "", section.meta].filter(Boolean);
        return (
          <article
            className={`lkr-showcase lkr-showcase--${section.kind}`}
            data-project-media={section.kind === "project" ? projectLayout.media : undefined}
            key={section.id}
          >
            <div className={`lkr-showcase-art${section.image ? "" : " is-empty"}`}>
              {section.image ? (
                <img src={section.image} alt={section.title ? `${section.title} project artwork` : "Project artwork"} loading="lazy" style={{objectPosition:`${section.cropX??50}% ${section.cropY??50}%`}} />
              ) : (
                <span aria-hidden="true">{(section.title || KIND_LABEL[section.kind]).slice(0, 1).toUpperCase()}</span>
              )}
              {projectLayout.showStatus ? (
                <span className={`lkr-showcase-kind lkr-showcase-kind--${section.kind}`}>
                  {section.status || KIND_LABEL[section.kind]}
                </span>
              ) : null}
            </div>
            <div className="lkr-showcase-body">
              {projectLayout.showMeta && kinds.length ? (
                <div className="lkr-showcase-meta-row">
                  {kinds.map((value) => (
                    <span key={value}>{value}</span>
                  ))}
                </div>
              ) : null}
              <h2>{section.title || `Untitled ${KIND_LABEL[section.kind].toLowerCase()}`}</h2>
              {section.subtitle ? <p className="lkr-showcase-sub">{section.subtitle}</p> : null}
              {projectLayout.showText && section.text ? (
                <p className="lkr-showcase-text">{section.text}</p>
              ) : null}

              {projectLayout.showStack && section.stack.length ? (
                <div className="lkr-tech-row">
                  {section.stack.map((id) => (
                    <TechBadge id={id} key={id} />
                  ))}
                </div>
              ) : null}

              {projectLayout.showLinks && (mainUrl || section.links.length) ? (
                <div className="lkr-showcase-links">
                  {mainUrl ? (
                    <a className="lkr-showcase-cta" href={mainUrl} target="_blank" rel="noreferrer">
                      {section.kind === "project" ? "View project" : "Open anime"}
                      <span aria-hidden="true">↗</span>
                    </a>
                  ) : null}
                  {section.links.map((link, index) =>
                    safeUrl(link.url) ? (
                      <a
                        className="lkr-showcase-link"
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        key={`${link.url}-${index}`}
                      >
                        {link.label || "Link"}
                        <span aria-hidden="true">↗</span>
                      </a>
                    ) : null,
                  )}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
