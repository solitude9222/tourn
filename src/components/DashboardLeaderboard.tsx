import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/backend";
import { useAuth } from "../lib/auth";
import { formatJoined } from "../lib/format";
import { ArrowUpRight } from "./Icons";
import "../dashboard.css";

type BoardRow = {
  id: string;
  username: string;
  alias?: string | null;
  avatarUrl?: string | null;
  joinedAt: string;
};

/**
 * The board, inside the dashboard. Same accounts as tourn.lol/leaderboard but
 * with your own position called out, so a signed-in player never has to leave
 * the dashboard to see where they sit.
 */
export function DashboardLeaderboard() {
  const { user, first } = useAuth();
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void api<{ profiles: BoardRow[] }>("/api/profiles?limit=100").then((result) => {
      if (!active) return;
      if (result.ok) setRows(result.data.profiles ?? []);
      else {
        setError(result.error);
        setRows(first ? [first] : []);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [first]);

  const handle = user?.username.toLowerCase() ?? "";
  const myIndex = useMemo(
    () => rows.findIndex((row) => row.username.toLowerCase() === handle),
    [rows, handle],
  );

  const joined = myIndex >= 0 ? formatJoined(new Date(rows[myIndex].joinedAt)) : "";

  return (
    <div className="dash-board">
      <section className="dash-panel dash-rank-card" data-reveal>
        <div className="dash-rank-figure">
          <span>Your rank</span>
          <b>{loading ? "—" : myIndex >= 0 ? `#${myIndex + 1}` : "—"}</b>
        </div>

        <div className="dash-rank-body">
          <p className="dash-rank-name">
            {handle ? `tourn.lol/${handle}` : "No handle claimed"}
          </p>
          <small>
            {loading
              ? "Reading the board…"
              : myIndex >= 0
                ? `${myIndex + 1} of ${rows.length} ${rows.length === 1 ? "player" : "players"} · claimed ${joined}`
                : error ?? "You are not on the board yet"}
          </small>
        </div>

        <a className="dash-rank-link" href="#/leaderboard">
          Public board
          <ArrowUpRight size={11} />
        </a>
      </section>

      <section className="dash-panel dash-board-list" data-reveal data-reveal-delay="60">
        <header className="dash-board-head">
          <div>
            <h2>Leaderboard</h2>
            <p>Earliest claim takes the top.</p>
          </div>
          <span className="dash-board-count">{rows.length}</span>
        </header>

        {loading ? (
          <div className="board board--dash">
            {[0, 1, 2, 3].map((index) => (
              <div className="board-row" key={index}>
                <span className="skeleton" style={{ width: 26, height: 11 }} />
                <span className="skeleton" style={{ width: 34, height: 34, borderRadius: 10 }} />
                <span className="skeleton" style={{ width: 160, height: 12 }} />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="dash-board-empty">
            No links claimed yet. The first account to claim a handle takes #1 permanently.
          </p>
        ) : (
          <div className="board board--dash">
            {rows.map((row, index) => {
              const isYou = handle && row.username.toLowerCase() === handle;
              const display = row.alias?.trim() || row.username;
              const showsHandle = display !== row.username;
              return (
                <div
                  className={`board-row${isYou ? " is-you" : ""}`}
                  key={row.id}
                  data-reveal
                  data-reveal-delay={Math.min(index * 25, 300)}
                >
                  <span className="board-rank">{String(index + 1).padStart(2, "0")}</span>
                  {row.avatarUrl ? (
                    <img className="avatar avatar--sm" src={row.avatarUrl} alt="" />
                  ) : (
                    <span className="avatar avatar--sm avatar--initial">
                      {row.username.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="board-id">
                    <p>
                      {display}
                      {isYou ? <span className="dash-board-you">you</span> : null}
                    </p>
                    {showsHandle ? <span>tourn.lol/{row.username}</span> : null}
                  </div>
                  <span className="board-joined">{formatJoined(new Date(row.joinedAt))}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
