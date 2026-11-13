import { useEffect, useRef, useState } from "react";
import { loadCatalog, type CatalogItem, type CatalogKind } from "../lib/mediaCatalog";
import { Button, Modal, TextInput } from "./ui";

/* A searchable browser over the public anime and game catalogues. The parent
   decides what a pick means; this only loads and presents the real artwork. */
export function MediaLibrary({
  open,
  kind,
  onClose,
  onPick,
}: {
  open: boolean;
  kind: CatalogKind;
  onClose: () => void;
  onPick: (item: CatalogItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  // A fresh open always starts from the popular first page.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPage(1);
    setItems([]);
    setError(null);
  }, [open, kind]);

  useEffect(() => {
    if (!open) return;
    const id = ++request.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      loadCatalog(kind, query, page, controller.signal)
        .then((result) => {
          if (id !== request.current) return;
          setItems((current) => (page === 1 ? result.items : [...current, ...result.items]));
          setHasMore(result.hasMore);
        })
        .catch((reason) => {
          if (id !== request.current || controller.signal.aborted) return;
          setError(reason instanceof Error ? reason.message : "The library could not be loaded.");
        })
        .finally(() => {
          if (id === request.current) setLoading(false);
        });
    }, page === 1 ? 280 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, kind, query, page]);

  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
    setItems([]);
  };

  return (
    <Modal
      open={open}
      title={kind === "anime" ? "Anime library" : "Game library"}
      subtitle={
        kind === "anime"
          ? "20,000+ real titles from AniList, 48 per page. Pick one to fill the section."
          : "400+ real free-to-play games from the FreeToGame catalogue. Pick one to fill the section."
      }
      onClose={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="tw-media-library">
        <div className="tw-media-search">
          <TextInput
            value={query}
            placeholder={kind === "anime" ? "Search anime…" : "Search games…"}
            onChange={(event) => changeQuery(event.target.value)}
          />
          <span className="tw-media-count">
            {loading && page === 1 ? "Loading…" : `${items.length} loaded`}
          </span>
        </div>

        {error ? (
          <p className="tw-media-error">{error}</p>
        ) : items.length === 0 && loading ? (
          <div className="tw-media-grid">
            {Array.from({ length: 8 }, (_, index) => (
              <span className="tw-media-card is-skeleton" key={index} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="tw-empty-note">Nothing matched that search.</p>
        ) : (
          <div className="tw-media-grid">
            {items.map((item) => (
              <button
                type="button"
                className={`tw-media-card tw-media-card--${item.kind}`}
                key={item.id}
                onClick={() => {
                  onPick(item);
                  onClose();
                }}
              >
                <span className="tw-media-art">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                </span>
                <span className="tw-media-copy">
                  <b>{item.title}</b>
                  <small>{item.subtitle || item.meta}</small>
                </span>
              </button>
            ))}
          </div>
        )}

        {hasMore ? (
          <div className="tw-media-more">
            <Button disabled={loading} onClick={() => setPage((current) => current + 1)}>
              {loading ? "Loading…" : "Load 48 more"}
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
