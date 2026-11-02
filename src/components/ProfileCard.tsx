import { useTilt } from "../lib/useTilt";
import { ArrowRight, DiscordIcon, LinkIcon, PinIcon, SpotifyIcon, SteamIcon } from "./Icons";
import { RichText } from "./RichText";

export type HeroIdentity = {
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  joined: string;
  location: string;
  bio: string;
  discordLinked: boolean;
  spotifyLinked: boolean;
  steamLinked: boolean;
  live: boolean;
};

export function ProfileCard({
  identity,
  onClaim,
}: {
  identity: HeroIdentity | null;
  onClaim: () => void;
}) {
  const tilt = useTilt(7);

  return (
    <aside
      className={`profile-card${identity ? "" : " profile-card--empty"}`}
      ref={tilt.ref}
      style={tilt.style}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
    >
      <div className="profile-glow" aria-hidden="true" />
      <div className="tilt-glare" aria-hidden="true" />

      {identity ? (
        <>
          <div className="pc-top">
            {identity.avatarUrl ? (
              <img className="avatar avatar--xl" src={identity.avatarUrl} alt="" />
            ) : (
              <span className="avatar avatar--xl avatar--initial" aria-hidden="true">
                {identity.displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="pc-id">
              <p className="pc-name">{identity.displayName}</p>
              <p className="pc-handle">@{identity.handle}</p>
              <p className="pc-joined">{identity.joined}</p>
              {identity.location ? (
                <p className="pc-location">
                  <PinIcon size={9} />
                  {identity.location}
                </p>
              ) : null}
            </div>
          </div>

          <div className={`pc-custom${identity.bio.trim() ? "" : " is-empty"}`}>
            {identity.bio.trim() ? (
              <RichText text={identity.bio} />
            ) : (
              "One link for everything you play — Discord, servers, music and games, live."
            )}
          </div>

          {identity.discordLinked || identity.spotifyLinked || identity.steamLinked ? (
            <div className="pc-platforms">
              {identity.discordLinked ? (
                <span className="pc-platform is-on">
                  <DiscordIcon size={15} />
                </span>
              ) : null}
              {identity.spotifyLinked ? (
                <span className="pc-platform is-on">
                  <SpotifyIcon size={15} />
                </span>
              ) : null}
              {identity.steamLinked ? (
                <span className="pc-platform is-on">
                  <SteamIcon size={15} />
                </span>
              ) : null}
              <span className="pc-platform-label">{identity.live ? "connected" : "linked"}</span>
            </div>
          ) : null}

          {identity.discordLinked || identity.spotifyLinked || identity.steamLinked ? (
            <div className="pc-stats">
              {identity.discordLinked ? (
                <div>
                  <b>{identity.live ? "Live" : "Member"}</b>
                  <span>discord</span>
                </div>
              ) : null}
              {identity.spotifyLinked ? (
                <div>
                  <b>{identity.live ? "Playing" : "Linked"}</b>
                  <span>spotify</span>
                </div>
              ) : null}
              {identity.steamLinked ? (
                <div>
                  <b>Linked</b>
                  <span>steam</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="pc-footer">
            <span className="pc-sync">
              <i />
              {identity.live ? "syncing" : "joined"}
            </span>
          </div>
        </>
      ) : (
        <div className="pc-empty">
          <span className="pc-empty-icon" aria-hidden="true">
            <LinkIcon size={22} />
          </span>
          <p className="pc-empty-title">No bio card yet.</p>
          <p className="pc-empty-sub">
            Claim your link and this card fills with your bio, platforms and live widget stack.
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClaim}>
            Claim your link
            <ArrowRight size={13} />
          </button>
        </div>
      )}
    </aside>
  );
}
