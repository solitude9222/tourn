import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/backend";
import { useAuth } from "../lib/auth";
import { formatJoined } from "../lib/format";
import { ArrowUpRight, TrophyIcon } from "./Icons";
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

  return (
    <div className="dash-board">
      <section className="dash-panel dash-board-summary" data-reveal>
        <div className="dash-board-summary-main">
          <span className="dash-board-trophy" aria-hidden="true">
            <TrophyIcon size={17} />
          </span>
          <div>
            <span className="eyebrow eyebrow--sm">Your position</span>
            <b className="dash-board-rank">
              {loading ? "—" : myIndex >= 0 ? `#${myIndex + 1}` : "Unranked"}
            </b>
            <small>
              {loading
                ? "Reading the board…"
                : myIndex >= 0
                  ? `of ${rows.length} ${rows.length === 1 ? "player" : "players"} · joined ${formatJoined(new Date(rows[myIndex].joinedAt))}`
                  : error ?? "You are not on the board yet"}
            </small>
          </div>
        </div>

        <div className="dash-board-summary-side">
          <a className="btn btn-ghost btn-sm" href="#/leaderboard">
            Public board
            <ArrowUpRight size={12} />
          </a>
        </div>
      </section>

      <section className="dash-panel dash-board-list" data-reveal data-reveal-delay="60">
        <header className="about-panel-head">
          <div>
            <h2>Everyone on tourn.lol</h2>
            <p>Ranked by the moment a handle was claimed — first claim, highest rank.</p>
          </div>
          <span className="dash-section-icon dash-section-icon--small">
            <TrophyIcon size={13} />
          </span>
        </header>

        {loading ? (
          <div className="board board--dash">
            {[0, 1, 2, 3].map((index) => (
              <div className="board-row" key={index}>
                <span className="skeleton" style={{ width: 30, height: 13 }} />
                <span className="skeleton" style={{ width: 36, height: 36, borderRadius: 12 }} />
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
                      {row.alias?.trim() || row.username}
                      {isYou ? <span className="dash-board-you">you</span> : null}
                    </p>
                    <span>tourn.lol/{row.alias?.trim() || row.username}</span>
                  </div>
                  <span className="board-joined">
                    Joined {formatJoined(new Date(row.joinedAt))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
