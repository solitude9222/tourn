import { useEffect, useMemo, useRef, useState } from "react";
import { loadGuildEmojis, type GuildEmoji } from "../lib/emojis";

/**
 * Emoji button that sits at the end of a text box. The menu lists the custom
 * emojis of the Discord server the bot lives in (animated ones included) and
 * inserts the `:name:` token the renderer understands.
 */
export function EmojiPicker({ onPick }: { onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<GuildEmoji[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    void loadGuildEmojis().then((items) => {
      if (!alive) return;
      setList(items);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? list.filter((item) => item.name.toLowerCase().includes(needle)) : list;
  }, [list, query]);

  return (
    <span className="tw-emoji" ref={wrap}>
      <button
        type="button"
        className={`tw-emoji-btn${open ? " is-open" : ""}`}
        aria-label="Insert an emoji"
        aria-expanded={open}
        title="Insert an emoji"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">☺</span>
      </button>
      {open ? (
        <div className="tw-emoji-pop" role="dialog" aria-label="Emoji picker">
          <div className="tw-emoji-head">
            <b>Emojis</b>
            <small>{list.length ? `${list.length} in the server` : loading ? "Loading…" : "None yet"}</small>
          </div>
          <input
            className="tw-emoji-search"
            type="search"
            value={query}
            placeholder="Search emojis…"
            aria-label="Search emojis"
            onChange={(event) => setQuery(event.target.value)}
          />
          {filtered.length ? (
            <div className="tw-emoji-grid">
              {filtered.slice(0, 80).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={`:${item.name}:`}
                  aria-label={`:${item.name}:`}
                  onClick={() => {
                    onPick(item.name);
                    setOpen(false);
                  }}
                >
                  <img src={item.url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          ) : (
            <p className="tw-emoji-empty">
              {list.length ? "No emoji matches that search." : loading ? "Reading the server's emojis…" : "This server has no custom emojis yet."}
            </p>
          )}
          <p className="tw-emoji-hint">
            Add your own emojis with <code>/emoji &lt;name&gt;</code> in our Discord server, then use{" "}
            <code>:name:</code> here.
          </p>
        </div>
      ) : null}
    </span>
  );
}
