import type { ProfileSection } from "../lib/about";
import { TECH_BY_ID, techIconUrl } from "../lib/techStack";
import "../aboutSections.css";

/* Public rendering for profile sections. Projects are wide, full-size cards;
   interests are poster cards from the anime library. Both carry real artwork,
   metadata, genuine technology icons and links. */

const KIND_LABEL: Record<ProfileSection["kind"], string> = {
  project: "Project",
  interest: "Interest",
  "pc-build": "PC build",
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

export function ProfileSections({ sections }: { sections: ProfileSection[] }) {
  if (!sections.length) return null;

  const single = sections.length === 1 && sections[0].kind === "project";

  return (
    <div className={`lkr-sections${single ? " lkr-sections--single" : ""}`}>
      {sections.map((section) => {
        const mainUrl = safeUrl(section.url);

        // Several animes in one section: a single card holding the whole set.
        const picks = section.items ?? [];
        if (section.kind === "pc-build") {
          return (
            <article className={`lkr-pc-build lkr-pc-build--${section.pcView ?? "grid"}`} key={section.id}>
              <header className="lkr-pc-build-head">
                <div>
                  <span className="lkr-pc-build-eyebrow">PC BUILD</span>
                  <h2>{section.title || "My PC"}</h2>
                  {section.subtitle ? <p>{section.subtitle}</p> : null}
                </div>
                <span className="lkr-pc-build-count">{picks.length} component{picks.length === 1 ? "" : "s"}</span>
              </header>
              {section.text ? <p className="lkr-pc-build-note">{section.text}</p> : null}
              <div className="lkr-pc-parts">
                {picks.map((part) => {
                  const content = (
                    <>
                      <span className="lkr-pc-part-image">
                        {part.image ? <img src={part.image} alt={`${[part.meta, part.title].filter(Boolean).join(" ")} product view`} loading="lazy" /> : <span aria-hidden="true">{part.category?.slice(0, 1) || "P"}</span>}
                      </span>
                      <span className="lkr-pc-part-copy">
                        <small>{part.category || "Component"}</small>
                        <b>{part.title}</b>
                        {part.subtitle ? <span>{part.subtitle}</span> : null}
                        {part.meta ? <em>{part.meta}</em> : null}
                      </span>
                      {safeUrl(part.url) ? <span className="lkr-pc-part-arrow" aria-hidden="true">↗</span> : null}
                    </>
                  );
                  return safeUrl(part.url) ? <a className="lkr-pc-part" href={safeUrl(part.url)!} target="_blank" rel="noreferrer" key={part.id}>{content}</a> : <div className="lkr-pc-part" key={part.id}>{content}</div>;
                })}
              </div>
            </article>
          );
        }
        if (section.kind === "interest" && picks.length) {
          return (
            <article className="lkr-interest-set" key={section.id}>
              {section.title ? <h2>{section.title}</h2> : null}
              <div className="lkr-interest-grid">
                {picks.map((pick) => {
                  const href = safeUrl(pick.url);
                  const body = (
                    <>
                      <span className="lkr-interest-art">
                        {pick.image ? <img src={pick.image} alt="" loading="lazy" /> : null}
                      </span>
                      <span className="lkr-interest-copy">
                        <b>{pick.title || "Untitled"}</b>
                        <small>{[pick.subtitle, pick.meta].filter(Boolean).join(" · ")}</small>
                      </span>
                    </>
                  );
                  return href ? (
                    <a className="lkr-interest-tile" href={href} target="_blank" rel="noreferrer" key={pick.id}>
                      {body}
                    </a>
                  ) : (
                    <span className="lkr-interest-tile" key={pick.id}>
                      {body}
                    </span>
                  );
                })}
              </div>
              {section.text ? <p className="lkr-interest-note">{section.text}</p> : null}
            </article>
          );
        }

        const kinds = [section.status, section.meta].filter(Boolean);
        return (
          <article className={`lkr-showcase lkr-showcase--${section.kind}`} key={section.id}>
            <div className={`lkr-showcase-art${section.image ? "" : " is-empty"}`}>
              {section.image ? (
                <img src={section.image} alt="" loading="lazy" />
              ) : (
                <span aria-hidden="true">{(section.title || KIND_LABEL[section.kind]).slice(0, 1).toUpperCase()}</span>
              )}
              <span className={`lkr-showcase-kind lkr-showcase-kind--${section.kind}`}>
                {section.status || KIND_LABEL[section.kind]}
              </span>
            </div>
            <div className="lkr-showcase-body">
              {kinds.length ? (
                <div className="lkr-showcase-meta-row">
                  {kinds.map((value) => (
                    <span key={value}>{value}</span>
                  ))}
                </div>
              ) : null}
              <h2>{section.title || `Untitled ${KIND_LABEL[section.kind].toLowerCase()}`}</h2>
              {section.subtitle ? <p className="lkr-showcase-sub">{section.subtitle}</p> : null}
              {section.text ? <p className="lkr-showcase-text">{section.text}</p> : null}

              {section.stack.length ? (
                <div className="lkr-tech-row">
                  {section.stack.map((id) => (
                    <TechBadge id={id} key={id} />
                  ))}
                </div>
              ) : null}

              {mainUrl || section.links.length ? (
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
