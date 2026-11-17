import { useMemo, useState } from "react";
import { SKILL_CATEGORIES, TECH_BY_ID, TECH_STACK, techIconUrl, type SkillCategory } from "../lib/techStack";

const MAX_SKILLS = 100;
type SortMode = "category" | "az" | "selected";
type CategoryFilter = "All" | SkillCategory;

const CATEGORY_ORDER = new Map<string, number>(SKILL_CATEGORIES.map((category, index) => [category, index]));
const categoryCount = (category: CategoryFilter, query: string) =>
  TECH_STACK.filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
    const haystack = `${item.name} ${item.category} ${item.slug}`.toLowerCase();
    return matchesCategory && haystack.includes(query);
  }).length;

export function SkillPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [sort, setSort] = useState<SortMode>("category");
  const normalizedQuery = query.trim().toLowerCase();
  const selected = value.flatMap((id) => {
    const item = TECH_BY_ID.get(id);
    return item ? [item] : [];
  });

  const filtered = useMemo(() => {
    const items = TECH_STACK.filter((item) => {
      if (category !== "All" && item.category !== category) return false;
      if (!normalizedQuery) return true;
      return `${item.name} ${item.category} ${item.slug}`.toLowerCase().includes(normalizedQuery);
    });
    return [...items].sort((a, b) => {
      if (sort === "az") return a.name.localeCompare(b.name);
      if (sort === "selected") {
        const selectedA = value.includes(a.id) ? 0 : 1;
        const selectedB = value.includes(b.id) ? 0 : 1;
        if (selectedA !== selectedB) return selectedA - selectedB;
      }
      const byCategory = (CATEGORY_ORDER.get(a.category) ?? 99) - (CATEGORY_ORDER.get(b.category) ?? 99);
      return byCategory || a.name.localeCompare(b.name);
    });
  }, [category, normalizedQuery, sort, value]);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }
    if (value.length >= MAX_SKILLS) return;
    onChange([...value, id]);
  };

  const groups = useMemo(() => {
    const byCategory = new Map<SkillCategory, typeof filtered>();
    for (const item of filtered) {
      const items = byCategory.get(item.category) ?? [];
      items.push(item);
      byCategory.set(item.category, items);
    }
    return byCategory;
  }, [filtered]);

  return (
    <div className="tw-skills">
      <details className="tw-tech-picker">
        <summary>
          <span>
            <b>{selected.length ? `${selected.length} skills selected` : "Choose skills"}</b>
            <small>
              {selected.length
                ? `${MAX_SKILLS - selected.length} slots left`
                : `${TECH_STACK.length} languages, tools and platforms`}
            </small>
          </span>
          <span className="tw-tech-summary-action">{selected.length ? "Edit" : "Browse"}</span>
        </summary>

        <div className="tw-skill-tools">
          <label className="tw-skill-search">
            <span className="tw-sr-only">Search skills</span>
            <input
              className="tw-input"
              type="search"
              placeholder={`Search ${TECH_STACK.length} skills…`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="tw-skill-sort">
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
              <option value="category">Category</option>
              <option value="az">A–Z</option>
              <option value="selected">Selected first</option>
            </select>
          </label>
        </div>

        <div className="tw-skill-filters" role="tablist" aria-label="Skill categories">
          {(["All", ...SKILL_CATEGORIES] as CategoryFilter[]).map((item) => {
            const count = categoryCount(item, normalizedQuery);
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={category === item}
                className={category === item ? "is-on" : ""}
                onClick={() => setCategory(item)}
              >
                {item} <span>{count}</span>
              </button>
            );
          })}
        </div>

        {selected.length ? (
          <div className="tw-skill-selected-head">
            <b>Selected</b>
            <button type="button" className="tw-inline-link" onClick={() => onChange([])}>
              Clear all
            </button>
          </div>
        ) : null}
        <div className="tw-tech-selected">
          {selected.map((item) => (
            <button
              type="button"
              className="tw-tech-chip is-selected"
              key={item.id}
              onClick={() => toggle(item.id)}
              aria-label={`Remove ${item.name}`}
            >
              <img src={techIconUrl(item)} alt="" width={16} height={16} />
              {item.name}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>

        <div className="tw-skill-results" aria-live="polite">
          {filtered.length === 0 ? (
            <p className="tw-skill-empty">No skills match “{query.trim()}”. Try a shorter search.</p>
          ) : sort === "az" ? (
            <div className="tw-tech-grid">
              {filtered.map((item) => (
                <SkillButton key={item.id} item={item} selected={value.includes(item.id)} onToggle={() => toggle(item.id)} />
              ))}
            </div>
          ) : (
            SKILL_CATEGORIES.map((group) => {
              const items = groups.get(group);
              if (!items?.length) return null;
              return (
                <section key={group}>
                  <h4>
                    {group} <span>{items.length}</span>
                  </h4>
                  <div className="tw-tech-grid">
                    {items.map((item) => (
                      <SkillButton key={item.id} item={item} selected={value.includes(item.id)} onToggle={() => toggle(item.id)} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>

        <p className="tw-skill-limit">
          {value.length >= MAX_SKILLS
            ? `You have all ${MAX_SKILLS} skill slots filled. Remove one to add another.`
            : `${selected.length} of ${MAX_SKILLS} selected · shown on your public Skills section.`}
        </p>
      </details>
    </div>
  );
}

function SkillButton({
  item,
  selected,
  onToggle,
}: {
  item: (typeof TECH_STACK)[number];
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" aria-pressed={selected} className={selected ? "is-on" : ""} onClick={onToggle}>
      <img src={techIconUrl(item)} alt="" loading="lazy" width={18} height={18} />
      <span>{item.name}</span>
      <i aria-hidden="true">{selected ? "✓" : "+"}</i>
    </button>
  );
}
