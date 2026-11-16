/* ---------------------------------------------------------------------------
   Social — an admin-only, Discord-style space built from real tourn accounts.

   No sample servers, members or messages are rendered. The area starts empty
   for new servers and the seeded Socials Hub is assembled from real accounts.
   Messages refresh on a short interval; profile cards warm their public
   document on hover so opening a profile is effectively instant.
   --------------------------------------------------------------------------- */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { BADGE_CATALOGUE, BADGE_MAP } from "../../lib/badges";
import { api, post } from "../../lib/backend";
import { fetchPublicProfile, type ProfilePayload } from "../../lib/serverProfile";
import { useDash } from "../context";
import { Icon, type IconName } from "../ui";
import "../../social.css";

type RoleSummary = {
  id: string;
  name: string;
  color: string;
  position: number;
};

type SocialRole = RoleSummary & {
  permissions: Record<string, boolean>;
  isDefault?: boolean;
};

type SocialBadge = { id: string; visible?: boolean };

type SocialAuthor = {
  id: string;
  username: string;
  alias: string | null;
  displayName?: string | null;
  avatarUrl: string | null;
  premium: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  roles?: SocialRole[];
  badges?: SocialBadge[];
};

type SocialServer = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  memberCount: number;
  channelCount: number;
};

type SocialCategory = { id: string; serverId: string; name: string; position: number };
type SocialChannel = {
  id: string;
  serverId: string;
  categoryId: string | null;
  name: string;
  type: string;
  topic: string;
  position: number;
  viewRoleId: string | null;
  sendRoleId: string | null;
  viewRole: RoleSummary | null;
  sendRole: RoleSummary | null;
  canSend: boolean;
};
type SocialMember = SocialAuthor & {
  joinedAt: string | null;
  roles: SocialRole[];
  badges: SocialBadge[];
  profileViews?: number;
  serverCount?: number;
};
type SocialMessage = {
  id: string;
  channelId: string;
  content: string;
  embed?: SocialEmbed | null;
  replyTo?: SocialReply | null;
  reactions?: SocialReaction[];
  createdAt: string;
  author: SocialAuthor;
};
type SocialEmbed = {
  title: string;
  description: string;
  url: string;
  image: string;
  color: string;
};
type SocialReply = {
  id: string;
  content: string;
  authorName: string;
  authorHandle: string;
};
type SocialReaction = { emoji: string; count: number };
type LeaderboardEntry = { userId: string; messages: number; lastMessageAt: string | null };
type ModerationEntry = {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
  actor: SocialIdentity | null;
  target: SocialIdentity | null;
};
type ServerDetail = {
  server: SocialServer;
  categories: SocialCategory[];
  channels: SocialChannel[];
  members: SocialMember[];
  roles: SocialRole[];
};

type SocialTab = {
  key: string;
  serverId: string;
  channelId: string;
  serverName: string;
  channelName: string;
};

type ModalKind = "server" | "channel" | "member" | "roles" | "moderation" | "settings" | "leaderboard" | null;

type SocialTheme = "tourn" | "ocean" | "ember" | "mono";
type SocialIdentity = { username?: string; alias?: string | null; displayName?: string | null };

type SocialSettings = {
  compact: boolean;
  timestamps: boolean;
  embeds: boolean;
  enterToSend: boolean;
  showMembers: boolean;
  reduceMotion: boolean;
};

type ContextTarget =
  | { kind: "app" }
  | { kind: "message"; message: SocialMessage }
  | { kind: "member"; member: SocialMember | SocialAuthor }
  | { kind: "channel"; channel: SocialChannel }
  | { kind: "server"; server: SocialServer };
type ContextMenuState = { x: number; y: number; target: ContextTarget };
type OwnedNames = {
  items: { handle: string; acquired_at: string }[];
  primary: string;
  username: string;
  alias2: string | null;
};

const SOCIAL_THEMES: { id: SocialTheme; label: string; swatch: [string, string] }[] = [
  { id: "tourn", label: "Tourn", swatch: ["#b8c2ff", "#17181b"] },
  { id: "ocean", label: "Ocean", swatch: ["#62c8ff", "#07121b"] },
  { id: "ember", label: "Ember", swatch: ["#ffa65c", "#140e0b"] },
  { id: "mono", label: "Mono", swatch: ["#e6ebf5", "#0a0b0d"] },
];

const DEFAULT_SOCIAL_SETTINGS: SocialSettings = {
  compact: false,
  timestamps: true,
  embeds: true,
  enterToSend: true,
  showMembers: true,
  reduceMotion: false,
};
const REACTION_CHOICES = ["🔥", "❤️", "😂", "👍", "👀", "🎉"];

function readSocialTheme(): SocialTheme {
  try {
    const saved = localStorage.getItem("tourn.social.theme");
    if (saved === "midnight") return "tourn";
    if (SOCIAL_THEMES.some((theme) => theme.id === saved)) return saved as SocialTheme;
  } catch {
    /* local only */
  }
  return "tourn";
}

function readSocialSettings(): SocialSettings {
  try {
    const saved = JSON.parse(localStorage.getItem("tourn.social.settings") ?? "{}");
    if (!saved || typeof saved !== "object") return DEFAULT_SOCIAL_SETTINGS;
    return {
      compact: saved.compact === true,
      timestamps: saved.timestamps !== false,
      embeds: saved.embeds !== false,
      enterToSend: saved.enterToSend !== false,
      showMembers: saved.showMembers !== false,
      reduceMotion: saved.reduceMotion === true,
    };
  } catch {
    return DEFAULT_SOCIAL_SETTINGS;
  }
}

const nameOf = (person: SocialIdentity) =>
  person.displayName?.trim() || person.alias?.trim() || person.username?.trim() || "Member";
const handleOf = (person: Pick<SocialAuthor, "alias" | "username">) =>
  person.alias?.trim() || person.username;
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const timeOf = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};
const dayOf = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};
const joinedOf = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString([], { month: "short", year: "numeric" });
};
const countOf = (value: number | undefined) => {
  const number = Number(value) || 0;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(number);
};

function Avatar({ person, size = 32 }: { person: SocialIdentity & { avatarUrl?: string | null }; size?: number }) {
  return person.avatarUrl ? (
    <img
      className="soc-avatar"
      src={person.avatarUrl}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span className="soc-avatar soc-avatar--initial" style={{ width: size, height: size }}>
      {initialsOf(nameOf(person))}
    </span>
  );
}

function BadgeMarks({ badges, size = 14 }: { badges?: SocialBadge[]; size?: number }) {
  if (!badges?.length) return null;
  return (
    <span className="soc-badge-marks">
      {badges.slice(0, 5).map((badge) => {
        const def = BADGE_MAP.get(badge.id);
        if (!def?.art) return null;
        return (
          <img
            key={badge.id}
            src={def.art}
            alt={def.name}
            title={def.name}
            width={size}
            height={size}
            loading="lazy"
            decoding="async"
          />
        );
      })}
    </span>
  );
}

function RoleChip({ role, small = false }: { role: RoleSummary; small?: boolean }) {
  return (
    <span
      className={`soc-role-chip${small ? " is-small" : ""}`}
      style={{
        color: role.color,
        borderColor: `${role.color}55`,
        background: `${role.color}14`,
      }}
    >
      <i style={{ background: role.color }} />
      {role.name}
    </span>
  );
}

function Modal({
  title,
  subtitle,
  children,
  onClose,
  footer,
  wide = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
  footer: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="soc-modal-layer" role="presentation" onMouseDown={onClose}>
      <section
        className={`soc-modal${wide ? " soc-modal--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="soc-modal-head">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button" className="soc-icon-button" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </header>
        <div className="soc-modal-body">{children}</div>
        <footer className="soc-modal-foot">{footer}</footer>
      </section>
    </div>
  );
}

function SettingToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="soc-setting-toggle">
      <span>
        <b>{label}</b>
        <small>{hint}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

function ContextMenuItem({
  icon,
  children,
  onClick,
  danger = false,
}: {
  icon: IconName;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`soc-context-item${danger ? " is-danger" : ""}`}
      onClick={onClick}
    >
      <Icon name={icon} size={13} />
      <span>{children}</span>
    </button>
  );
}

function embedDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1).split("/")[0] || null;
    if (!/(^|\.)youtube\.com$/i.test(parsed.hostname)) return null;
    if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
    const match = parsed.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function MessageEmbeds({ message, enabled }: { message: SocialMessage; enabled: boolean }) {
  if (!enabled) return null;
  const embed = message.embed;
  const urls = Array.from(new Set(message.content.match(/https?:\/\/[^\s<>"']+/gi) ?? []))
    .filter((url) => url !== embed?.url)
    .slice(0, 3);
  if (!embed && !urls.length) return null;
  return (
    <div className="soc-embeds">
      {embed ? (
        <article className="soc-embed" style={{ borderLeftColor: embed.color || "var(--soc-accent)" }}>
          {embed.title ? <strong>{embed.title}</strong> : null}
          {embed.description ? <p>{embed.description}</p> : null}
          {embed.image ? (
            <img className="soc-embed-image" src={embed.image} alt="" loading="lazy" decoding="async" />
          ) : null}
          {embed.url ? (
            <a href={embed.url} target="_blank" rel="noreferrer">
              {embedDomain(embed.url)} <Icon name="external" size={10} />
            </a>
          ) : null}
        </article>
      ) : null}
      {urls.map((url) => {
        const video = youtubeId(url);
        const image = !video && /\.(png|jpe?g|gif|webp|avif)(\?|#|$)/i.test(url);
        return (
          <article className={`soc-embed soc-embed--link${image ? " is-image" : ""}`} key={url}>
            {video ? (
              <a className="soc-embed-video" href={url} target="_blank" rel="noreferrer">
                <img src={`https://img.youtube.com/vi/${encodeURIComponent(video)}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" />
                <span><Icon name="external" size={12} /> YouTube</span>
              </a>
            ) : image ? (
              <a href={url} target="_blank" rel="noreferrer">
                <img className="soc-embed-image" src={url} alt="" loading="lazy" decoding="async" />
              </a>
            ) : (
              <a className="soc-embed-link" href={url} target="_blank" rel="noreferrer">
                <span className="soc-embed-favicon"><Icon name="globe" size={14} /></span>
                <span>
                  <b>{embedDomain(url)}</b>
                  <small>{url}</small>
                </span>
                <Icon name="external" size={12} />
              </a>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function SocialPage() {
  const { user, isAdmin, go, notify, earned, badges } = useDash();

  const [servers, setServers] = useState<SocialServer[] | null>(null);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ServerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailVersion, setDetailVersion] = useState(0);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [messagesVersion, setMessagesVersion] = useState(0);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<SocialTab[]>([]);

  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem("tourn.social.muted") === "1"; } catch { return false; }
  });
  const [deafened, setDeafened] = useState(() => {
    try { return localStorage.getItem("tourn.social.deafened") === "1"; } catch { return false; }
  });
  const [theme, setTheme] = useState<SocialTheme>(readSocialTheme);
  const [themeOpen, setThemeOpen] = useState(false);
  const [settings, setSettings] = useState<SocialSettings>(readSocialSettings);
  const [replyTarget, setReplyTarget] = useState<SocialMessage | null>(null);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedDraft, setEmbedDraft] = useState<SocialEmbed>({
    title: "",
    description: "",
    url: "",
    image: "",
    color: "#b8c2ff",
  });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardVersion, setLeaderboardVersion] = useState(0);
  const [inventoryNames, setInventoryNames] = useState<OwnedNames | null>(null);

  const [modal, setModal] = useState<ModalKind>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [serverName, setServerName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelTopic, setChannelTopic] = useState("");
  const [channelCategory, setChannelCategory] = useState("");
  const [channelViewRole, setChannelViewRole] = useState("");
  const [channelSendRole, setChannelSendRole] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<SocialMember[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [roleTarget, setRoleTarget] = useState<SocialMember | null>(null);
  const [roleSelection, setRoleSelection] = useState<string[]>([]);
  const [roleName, setRoleName] = useState("");
  const [roleColor, setRoleColor] = useState("#8db6ff");
  const [rolePerms, setRolePerms] = useState({
    manage_messages: false,
    manage_channels: false,
    manage_roles: false,
    manage_members: false,
    manage_server: false,
  });
  const [moderationLog, setModerationLog] = useState<ModerationEntry[]>([]);
  const [moderationLoading, setModerationLoading] = useState(false);

  const [selectedMember, setSelectedMember] = useState<SocialMember | SocialAuthor | null>(null);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileRequest = useRef(0);
  const profileCache = useRef(new Map<string, ProfilePayload>());

  const messagesRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLElement>(null);
  const pendingChannel = useRef<string | null>(null);

  const query = search.trim().toLowerCase();
  const activeChannel = detail?.channels.find((channel) => channel.id === activeChannelId) ?? null;
  const activeServer = detail?.server ?? servers?.find((server) => server.id === activeServerId) ?? null;
  const activeTabKey = activeServer && activeChannel ? `${activeServer.id}:${activeChannel.id}` : null;
  const selfMember = detail?.members.find((member) => member.id === user.id) ?? null;
  const canModerateMessages = Boolean(selfMember?.isOwner || selfMember?.roles.some((role) => role.permissions?.manage_messages));
  const canManageChannels = Boolean(selfMember?.isOwner || selfMember?.roles.some((role) => role.permissions?.manage_channels));
  const canManageMembers = Boolean(selfMember?.isOwner || selfMember?.roles.some((role) => role.permissions?.manage_members));
  const canManageRoles = Boolean(selfMember?.isOwner || selfMember?.roles.some((role) => role.permissions?.manage_roles));

  const ownedBadgeIds = new Set([...earned, ...badges.equipped.map((badge) => badge.id)]);
  const inventoryBadges = BADGE_CATALOGUE.filter((badge) => ownedBadgeIds.has(badge.id));
  const inventoryHandles = inventoryNames
    ? [inventoryNames.username, ...inventoryNames.items.map((item) => item.handle)].filter(
        (handle, index, all) => handle && all.findIndex((item) => item.toLowerCase() === handle.toLowerCase()) === index,
      )
    : [];

  useEffect(() => {
    try { localStorage.setItem("tourn.social.theme", theme); } catch { /* local only */ }
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem("tourn.social.settings", JSON.stringify(settings)); } catch { /* local only */ }
  }, [settings]);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    void api<OwnedNames>("/api/account/aliases").then((result) => {
      if (alive && result.ok) setInventoryNames(result.data);
    });
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!themeOpen) return;
    const close = (event: PointerEvent) => {
      if (!themeRef.current?.contains(event.target as Node)) setThemeOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [themeOpen]);

  const loadServers = useCallback(async (preferredId?: string) => {
    const result = await api<{ servers: SocialServer[] }>("/api/social/servers");
    if (!result.ok) {
      setServers([]);
      setFatalError(result.error);
      return;
    }
    setFatalError(null);
    setServers(result.data.servers);
    setActiveServerId((current) => {
      const wanted = preferredId ?? current;
      if (wanted && result.data.servers.some((server) => server.id === wanted)) return wanted;
      return result.data.servers[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void loadServers();
  }, [isAdmin, loadServers]);

  useEffect(() => {
    if (!activeServerId) {
      setDetail(null);
      setActiveChannelId(null);
      return;
    }
    let alive = true;
    setDetail(null);
    setDetailLoading(true);
    void api<ServerDetail>(`/api/social/servers/${encodeURIComponent(activeServerId)}`)
      .then((result) => {
        if (!alive) return;
        if (!result.ok) {
          setFatalError(result.error);
          return;
        }
        setFatalError(null);
        setDetail(result.data);
        const wanted = pendingChannel.current;
        pendingChannel.current = null;
        setActiveChannelId((current) => {
          if (wanted && result.data.channels.some((channel) => channel.id === wanted)) return wanted;
          return current && result.data.channels.some((channel) => channel.id === current)
            ? current
            : result.data.channels[0]?.id ?? null;
        });
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeServerId, detailVersion]);

  useEffect(() => {
    if (!activeServerId) {
      setLeaderboard([]);
      return;
    }
    let alive = true;
    void api<{ entries: LeaderboardEntry[] }>(
      `/api/social/servers/${encodeURIComponent(activeServerId)}/leaderboard`,
    ).then((result) => {
      if (alive) setLeaderboard(result.ok ? result.data.entries : []);
    });
    return () => {
      alive = false;
    };
  }, [activeServerId, detailVersion, leaderboardVersion]);

  useEffect(() => {
    if (!activeServer || !activeChannel) return;
    const key = `${activeServer.id}:${activeChannel.id}`;
    setOpenTabs((current) => {
      if (current.some((tab) => tab.key === key)) return current;
      return [
        ...current,
        {
          key,
          serverId: activeServer.id,
          channelId: activeChannel.id,
          serverName: activeServer.name,
          channelName: activeChannel.name,
        },
      ].slice(-8);
    });
  }, [activeServer, activeChannel]);

  useEffect(() => {
    if (!activeChannelId) {
      setMessages([]);
      setHasMore(false);
      return;
    }
    let alive = true;
    setMessages([]);
    setMessagesLoading(true);

    const load = async () => {
      const result = await api<{ messages: SocialMessage[] }>(
        `/api/social/channels/${encodeURIComponent(activeChannelId)}/messages`,
      );
      if (!alive) return;
      if (!result.ok) {
        setFatalError(result.error);
        return;
      }
      setFatalError(null);
      setMessages((current) => {
        const byId = new Map(current.map((message) => [message.id, message]));
        for (const message of result.data.messages) byId.set(message.id, message);
        return [...byId.values()].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
      setHasMore(result.data.messages.length >= 80);
    };

    void load().finally(() => {
      if (alive) setMessagesLoading(false);
    });
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 5000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [activeChannelId, messagesVersion]);

  useEffect(() => {
    setReplyTarget(null);
    setEmbedOpen(false);
    setContextMenu(null);
    setChatSearch("");
  }, [activeChannelId]);

  useEffect(() => {
    const pane = messagesRef.current;
    if (!pane) return;
    const nearBottom = pane.scrollHeight - pane.scrollTop - pane.clientHeight < 160;
    if (nearBottom) pane.scrollTop = pane.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal]);

  useEffect(() => {
    if (!selectedMember) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeProfile();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedMember]);

  useEffect(() => {
    if (!selectedMember) return;
    const onPointerDown = (event: PointerEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) closeProfile();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [selectedMember]);

  useEffect(() => {
    if (!contextMenu) return;
    const closeIfOutside = (event: PointerEvent) => {
      if (!contextRef.current?.contains(event.target as Node)) setContextMenu(null);
    };
    const close = () => setContextMenu(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setContextMenu(null);
    };
    document.addEventListener("pointerdown", closeIfOutside);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", closeIfOutside);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [contextMenu]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const warmProfile = useCallback((person: SocialAuthor) => {
    const handle = handleOf(person);
    if (!handle || profileCache.current.has(handle)) return;
    void fetchPublicProfile(handle).then((result) => {
      if (result.ok) profileCache.current.set(handle, result.data);
    });
  }, []);

  useEffect(() => {
    if (!detail) return;
    const seen = new Set<string>();
    for (const member of detail.members.slice(0, 16)) {
      const handle = handleOf(member);
      if (seen.has(handle)) continue;
      seen.add(handle);
      warmProfile(member);
    }
  }, [detail, warmProfile]);

  useEffect(() => {
    if (!messages.length) return;
    const seen = new Set<string>();
    for (const message of messages.slice(-24)) {
      const handle = handleOf(message.author);
      if (seen.has(handle)) continue;
      seen.add(handle);
      warmProfile(message.author);
    }
  }, [messages, warmProfile]);

  useEffect(() => {
    if (modal !== "member" || !activeServerId) return;
    const text = memberQuery.trim();
    if (!text) {
      setMemberResults([]);
      setMemberSearching(false);
      return;
    }
    let alive = true;
    setMemberSearching(true);
    const timer = window.setTimeout(() => {
      void api<{ users: SocialMember[] }>(
        `/api/social/servers/${encodeURIComponent(activeServerId)}/users?q=${encodeURIComponent(text)}`,
      ).then((result) => {
        if (!alive) return;
        setMemberResults(result.ok ? result.data.users : []);
        setMemberSearching(false);
      });
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [memberQuery, modal, activeServerId]);

  const openProfile = (person: SocialMember | SocialAuthor) => {
    const handle = handleOf(person);
    setSelectedMember(person);
    setProfileError(null);
    const cached = profileCache.current.get(handle);
    if (cached) {
      setProfile(cached);
      setProfileLoading(false);
      return;
    }
    setProfile(null);
    setProfileLoading(true);
    const request = ++profileRequest.current;
    void fetchPublicProfile(handle).then((result) => {
      if (request !== profileRequest.current) return;
      if (result.ok) {
        profileCache.current.set(handle, result.data);
        setProfile(result.data);
      } else {
        setProfileError(result.error);
      }
      setProfileLoading(false);
    });
  };

  const closeProfile = () => {
    profileRequest.current += 1;
    setSelectedMember(null);
    setProfile(null);
    setProfileError(null);
    setProfileLoading(false);
  };

  const openContextMenuAt = (x: number, y: number, target: ContextTarget) => {
    const width = 224;
    const height = 330;
    setContextMenu({
      x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
      target,
    });
  };

  const openContextMenu = (event: ReactMouseEvent, target: ContextTarget) => {
    event.preventDefault();
    event.stopPropagation();
    openContextMenuAt(event.clientX, event.clientY, target);
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify("Copied", `${label} copied to your clipboard.`);
    } catch {
      notify("Copy failed", "Your browser blocked clipboard access.");
    }
  };

  const updateSetting = (key: keyof SocialSettings, value: boolean) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const scrollToMessage = (messageId: string) => {
    const node = messagesRef.current?.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
    if (!node) return;
    node.scrollIntoView({ behavior: settings.reduceMotion ? "auto" : "smooth", block: "center" });
    node.classList.add("is-flash");
    window.setTimeout(() => node.classList.remove("is-flash"), 1200);
  };

  const startReply = (message: SocialMessage) => {
    setReplyTarget(message);
    closeProfile();
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  const toggleReaction = async (message: SocialMessage, emoji: string) => {
    const result = await api<{ reactions: SocialReaction[] }>(
      `/api/social/messages/${encodeURIComponent(message.id)}/reactions`,
      { method: "POST", body: JSON.stringify({ emoji }) },
    );
    if (!result.ok) {
      notify("Reaction not saved", result.error);
      return;
    }
    setMessages((current) =>
      current.map((item) => (item.id === message.id ? { ...item, reactions: result.data.reactions } : item)),
    );
  };

  const openSettings = () => {
    setContextMenu(null);
    setModal("settings");
  };

  const selectTab = (tab: SocialTab) => {
    pendingChannel.current = tab.channelId;
    setActiveServerId(tab.serverId);
    setActiveChannelId(tab.channelId);
    setSearch("");
  };

  const closeTab = (key: string) => {
    const index = openTabs.findIndex((tab) => tab.key === key);
    if (index === -1) return;
    const next = openTabs.filter((tab) => tab.key !== key);
    setOpenTabs(next);
    if (key !== activeTabKey) return;
    const fallback = next[Math.max(0, index - 1)] ?? next[0];
    if (fallback) {
      selectTab(fallback);
    } else {
      setActiveChannelId(null);
    }
  };

  const openServerModal = () => {
    setServerName("");
    setFormError(null);
    setModal("server");
  };

  const openChannelModal = (categoryId?: string) => {
    if (!canManageChannels) {
      notify("Permission needed", "You do not have permission to manage channels in this server.");
      return;
    }
    setChannelName("");
    setChannelTopic("");
    setChannelCategory(categoryId ?? detail?.categories[0]?.id ?? "");
    setChannelViewRole("");
    setChannelSendRole("");
    setFormError(null);
    setModal("channel");
  };

  const openMemberModal = () => {
    if (!canManageMembers) {
      notify("Permission needed", "You do not have permission to add members to this server.");
      return;
    }
    setMemberQuery("");
    setMemberResults([]);
    setFormError(null);
    setModal("member");
  };

  const openRolesModal = (target?: SocialMember) => {
    if (!canManageRoles) {
      notify("Permission needed", "You do not have permission to manage roles in this server.");
      return;
    }
    if (target) closeProfile();
    setRoleTarget(target ?? null);
    setRoleSelection(target?.roles.map((role) => role.id) ?? []);
    setRoleName("");
    setRoleColor("#8db6ff");
    setRolePerms({ manage_messages: false, manage_channels: false, manage_roles: false, manage_members: false, manage_server: false });
    setFormError(null);
    setModal("roles");
  };

  const openModeration = async () => {
    if (!activeServerId) return;
    if (!canModerateMessages && !canManageMembers) {
      notify("Permission needed", "You do not have permission to view moderation here.");
      return;
    }
    setModal("moderation");
    setModerationLoading(true);
    const result = await api<{ entries: ModerationEntry[] }>(
      `/api/social/servers/${encodeURIComponent(activeServerId)}/moderation`,
    );
    setModerationLoading(false);
    if (!result.ok) {
      setModerationLog([]);
      notify("Couldn't load moderation", result.error);
      return;
    }
    setModerationLog(result.data.entries);
  };

  const createServer = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError(null);
    const result = await post<{ server: SocialServer }>("/api/social/servers", { name: serverName });
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setModal(null);
    notify("Server created", `${result.data.server.name} is ready.`);
    await loadServers(result.data.server.id);
  };

  const createChannel = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !activeServerId) return;
    setBusy(true);
    setFormError(null);
    const result = await post<{ channel: SocialChannel }>(
      `/api/social/servers/${encodeURIComponent(activeServerId)}/channels`,
      {
        name: channelName,
        topic: channelTopic,
        categoryId: channelCategory || null,
        viewRoleId: channelViewRole || null,
        sendRoleId: channelSendRole || null,
      },
    );
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setModal(null);
    setActiveChannelId(result.data.channel.id);
    setDetailVersion((value) => value + 1);
    notify("Channel created", `#${result.data.channel.name} is ready.`);
  };

  const addMember = async (member: SocialMember) => {
    if (busy || !activeServerId) return;
    setBusy(true);
    setFormError(null);
    const result = await post(
      `/api/social/servers/${encodeURIComponent(activeServerId)}/members`,
      { userId: member.id },
    );
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setModal(null);
    setDetailVersion((value) => value + 1);
    notify("Member added", `${nameOf(member)} is now in this server.`);
  };

  const saveRoles = async () => {
    if (busy || !activeServerId || !roleTarget) return;
    setBusy(true);
    setFormError(null);
    const result = await api<{ ok: boolean }>(
      `/api/social/servers/${encodeURIComponent(activeServerId)}/members/${encodeURIComponent(roleTarget.id)}/roles`,
      {
        method: "PUT",
        body: JSON.stringify({ roleIds: roleSelection }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setModal(null);
    setDetailVersion((value) => value + 1);
    notify("Roles updated", `${nameOf(roleTarget)} now has ${roleSelection.length} role${roleSelection.length === 1 ? "" : "s"}.`);
  };

  const createRole = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !activeServerId) return;
    setBusy(true);
    setFormError(null);
    const result = await post<{ role: SocialRole }>(
      `/api/social/servers/${encodeURIComponent(activeServerId)}/roles`,
      {
        name: roleName,
        color: roleColor,
        permissions: {
          read_messages: true,
          send_messages: true,
          ...rolePerms,
        },
      },
    );
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setRoleName("");
    setDetailVersion((value) => value + 1);
    notify("Role created", `${result.data.role.name} is ready to assign.`);
  };

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || !activeChannelId || sending || activeChannel?.canSend === false) return;
    setSending(true);
    const embed = [embedDraft.title, embedDraft.description, embedDraft.url, embedDraft.image].some(
      (value) => value.trim(),
    )
      ? { ...embedDraft, color: embedDraft.color || "#b8c2ff" }
      : null;
    const result = await post<{ message: SocialMessage }>(
      `/api/social/channels/${encodeURIComponent(activeChannelId)}/messages`,
      { content, replyToId: replyTarget?.id ?? null, embed },
    );
    setSending(false);
    if (!result.ok) {
      notify("Message not sent", result.error);
      return;
    }
    setDraft("");
    setReplyTarget(null);
    setEmbedOpen(false);
    setEmbedDraft({ title: "", description: "", url: "", image: "", color: "#b8c2ff" });
    setMessages((current) => {
      if (current.some((message) => message.id === result.data.message.id)) return current;
      return [...current, result.data.message];
    });
    setLeaderboardVersion((value) => value + 1);
    composerRef.current?.focus();
  };

  const deleteMessage = async (message: SocialMessage) => {
    if (!canModerateMessages) return;
    setContextMenu(null);
    if (!window.confirm("Delete this message? This cannot be undone.")) return;
    const result = await api<{ ok: boolean }>(
      `/api/social/messages/${encodeURIComponent(message.id)}`,
      { method: "DELETE" },
    );
    if (!result.ok) {
      notify("Message not deleted", result.error);
      return;
    }
    setMessages((current) => current.filter((item) => item.id !== message.id));
    setReplyTarget((current) => (current?.id === message.id ? null : current));
    setLeaderboardVersion((value) => value + 1);
    notify("Message deleted", "The message was removed and logged.");
  };

  const removeMember = async (member: SocialMember) => {
    if (!activeServerId || !canManageMembers || member.isOwner || member.id === user.id) return;
    if (!window.confirm(`Remove ${nameOf(member)} from ${activeServer?.name ?? "this server"}?`)) return;
    const result = await api<{ ok: boolean }>(
      `/api/social/servers/${encodeURIComponent(activeServerId)}/members/${encodeURIComponent(member.id)}`,
      { method: "DELETE" },
    );
    if (!result.ok) {
      notify("Member not removed", result.error);
      return;
    }
    closeProfile();
    setDetailVersion((value) => value + 1);
    notify("Member removed", `${nameOf(member)} was removed and the action was logged.`);
  };

  const loadEarlier = async () => {
    const oldest = messages[0];
    if (!oldest || !activeChannelId) return;
    const result = await api<{ messages: SocialMessage[] }>(
      `/api/social/channels/${encodeURIComponent(activeChannelId)}/messages?before=${encodeURIComponent(oldest.createdAt)}`,
    );
    if (!result.ok) {
      notify("Couldn't load older messages", result.error);
      return;
    }
    setMessages((current) => {
      const byId = new Map(current.map((message) => [message.id, message]));
      for (const message of result.data.messages) byId.set(message.id, message);
      return [...byId.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    });
    setHasMore(result.data.messages.length >= 80);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try { localStorage.setItem("tourn.social.muted", next ? "1" : "0"); } catch { /* local only */ }
  };

  const toggleDeafen = () => {
    const next = !deafened;
    setDeafened(next);
    if (next) setMuted(true);
    try {
      localStorage.setItem("tourn.social.deafened", next ? "1" : "0");
      localStorage.setItem("tourn.social.muted", next ? "1" : "0");
    } catch { /* local only */ }
  };

  const visibleChannels = useMemo(() => {
    if (!detail) return [];
    return detail.channels.filter((channel) => !query || channel.name.toLowerCase().includes(query));
  }, [detail, query]);

  const visibleServers = useMemo(() => {
    if (!servers) return null;
    return servers.filter((server) => !query || server.name.toLowerCase().includes(query));
  }, [servers, query]);

  const visibleMembers = useMemo(() => {
    if (!detail) return [];
    return detail.members.filter((member) => {
      if (!query) return true;
      return (
        nameOf(member).toLowerCase().includes(query) ||
        member.username.toLowerCase().includes(query) ||
        member.alias?.toLowerCase().includes(query) ||
        member.roles.some((role) => role.name.toLowerCase().includes(query))
      );
    });
  }, [detail, query]);

  const memberGroups = useMemo(() => {
    const groups = new Map<string, { label: string; position: number; members: SocialMember[] }>();
    for (const member of visibleMembers) {
      const role = member.roles[0];
      const key = role?.id ?? (member.isOwner ? "owner" : member.isAdmin ? "admin" : "member");
      const label = role?.name ?? (member.isOwner ? "Owner" : member.isAdmin ? "Staff" : "Members");
      const position = role?.position ?? (member.isOwner ? 100 : member.isAdmin ? 50 : 0);
      const group = groups.get(key) ?? { label, position, members: [] };
      group.members.push(member);
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => b.position - a.position);
  }, [visibleMembers]);

  const displayedMessages = useMemo(() => {
    const text = chatSearch.trim().toLowerCase();
    if (!text) return messages;
    return messages.filter((message) =>
      message.content.toLowerCase().includes(text) ||
      nameOf(message.author).toLowerCase().includes(text) ||
      message.author.username.toLowerCase().includes(text),
    );
  }, [messages, chatSearch]);

  if (!isAdmin) {
    return (
      <div className="social-app social-app--denied">
        <div className="soc-denied">
          <Icon name="shield" size={28} />
          <h1>Admins only</h1>
          <p>The Social area is restricted to staff accounts.</p>
          <button type="button" className="soc-button soc-button--primary" onClick={() => go("home")}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const activeCategoryChannels = detail
    ? detail.categories.map((category) => ({
        category,
        channels: visibleChannels.filter((channel) => channel.categoryId === category.id),
      }))
    : [];
  const uncategorized = visibleChannels.filter(
    (channel) => !channel.categoryId || !detail?.categories.some((category) => category.id === channel.categoryId),
  );

  const selectedRecord = selectedMember && detail
    ? detail.members.find((member) => member.id === selectedMember.id) ?? null
    : null;
  const selectedPerson = selectedRecord ?? selectedMember;
  const profileAbout = profile?.profile?.about;
  const profileBadges = profile?.profile?.badges.equipped ?? selectedRecord?.badges ?? selectedMember?.badges ?? [];
  const selectedHandle = selectedPerson ? handleOf(selectedPerson) : "";
  const selectedName = profileAbout?.displayName?.trim() || (selectedPerson ? nameOf(selectedPerson) : "");
  const selectedRoles = selectedRecord?.roles ?? selectedMember?.roles ?? [];
  const selectedJoinedAt = profile?.account.joinedAt ?? selectedRecord?.joinedAt ?? null;
  const selectedViews = selectedRecord?.profileViews ?? 0;
  const selectedServers = selectedRecord?.serverCount ?? 0;
  const leaderboardMembers = leaderboard
    .map((entry) => ({
      ...entry,
      member: detail?.members.find((member) => member.id === entry.userId) ?? null,
    }))
    .filter((entry): entry is LeaderboardEntry & { member: SocialMember } => Boolean(entry.member));
  const topLeaderboard = leaderboardMembers.slice(0, 3);
  const menuMessage = contextMenu?.target.kind === "message" ? contextMenu.target.message : null;
  const menuMember = contextMenu?.target.kind === "member" ? contextMenu.target.member : null;
  const menuChannel = contextMenu?.target.kind === "channel" ? contextMenu.target.channel : null;
  const menuServer = contextMenu?.target.kind === "server" ? contextMenu.target.server : null;
  const contextMemberRecord = menuMember
    ? detail?.members.find((member) => member.id === menuMember.id) ?? null
    : null;

  const copySelectedHandle = async () => {
    if (!selectedHandle) return;
    try {
      await navigator.clipboard.writeText(`tourn.lol/${selectedHandle}`);
      notify("Copied", "Profile link copied to your clipboard.");
    } catch {
      notify("Copy failed", "Your browser blocked clipboard access.");
    }
  };

  const startMessage = () => {
    if (!selectedRecord || !activeChannel?.canSend) return;
    const mention = `@${handleOf(selectedRecord)} `;
    setDraft((current) => (current.trim() ? `${current.replace(/\s+$/, "")} ${mention}` : mention));
    closeProfile();
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  const mentionMember = (person: SocialMember | SocialAuthor) => {
    if (!activeChannel?.canSend) {
      notify("Cannot message here", "You do not have permission to post in this channel.");
      return;
    }
    const mention = `@${handleOf(person)} `;
    setDraft((current) => (current.trim() ? `${current.replace(/\s+$/, "")} ${mention}` : mention));
    closeProfile();
    setContextMenu(null);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  return (
    <div
      className={`social-app${settings.compact ? " is-compact" : ""}${settings.showMembers ? "" : " is-members-hidden"}`}
      data-soc-theme={theme}
      data-soc-motion={settings.reduceMotion ? "off" : "on"}
      onContextMenu={(event) => openContextMenu(event, { kind: "app" })}
    >
      <div className="soc-tabstrip" role="tablist" aria-label="Open channels">
        <button type="button" className="soc-browser-home" onClick={() => go("home")} title="Dashboard">
          <img src="/logo.png" alt="" width={16} height={16} />
          <span>Dashboard</span>
        </button>
        <div className="soc-browser-tabs">
          {openTabs.map((tab) => {
            const active = tab.key === activeTabKey;
            return (
              <div className={`soc-browser-tab${active ? " is-active" : ""}`} key={tab.key}>
                <button
                  type="button"
                  className="soc-browser-tab-main"
                  role="tab"
                  aria-selected={active}
                  title={`${tab.serverName} · #${tab.channelName}`}
                  onClick={() => selectTab(tab)}
                >
                  <span className="soc-tab-favicon">{initialsOf(tab.serverName)}</span>
                  <span className="soc-tab-label">{tab.channelName}</span>
                </button>
                <button
                  type="button"
                  className="soc-tab-close"
                  aria-label={`Close #${tab.channelName}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeTab(tab.key);
                  }}
                >
                  <Icon name="x" size={11} />
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" className="soc-tab-new" onClick={openServerModal} aria-label="Create server">
          <Icon name="plus" size={14} />
        </button>
        <span className="soc-tabstrip-spacer" />
        <span className="soc-tabstrip-role"><Icon name="shield" size={11} /> Admin</span>
      </div>

      <header className="soc-topbar">
        <button type="button" className="soc-back" onClick={() => go("home")} aria-label="Back to dashboard">
          <Icon name="arrow-right" size={15} />
        </button>
        <div className="soc-brand">
          <img src="/logo.png" alt="" width={28} height={28} />
          <span>
            tourn<i>.</i>
          </span>
          <b>social</b>
        </div>
        <div className="soc-crumbs">
          Dashboard <span>/</span> <strong>Social</strong>
        </div>
        <label className="soc-search">
          <Icon name="search" size={14} />
          <input
            ref={searchRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search servers, people, messages"
            aria-label="Search servers, people, messages"
          />
          <kbd>⌘K</kbd>
        </label>
        <div className="soc-topbar-spacer" />
        <div className="soc-theme-picker" ref={themeRef}>
          <button
            type="button"
            className="soc-icon-button"
            onClick={() => setThemeOpen((open) => !open)}
            aria-label="Choose Social theme"
            aria-expanded={themeOpen}
            title="Social theme"
          >
            <Icon name="palette" size={15} />
          </button>
          {themeOpen ? (
            <div className="soc-theme-menu" role="menu" aria-label="Social themes">
              {SOCIAL_THEMES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={theme === preset.id}
                  className={`soc-theme-option${theme === preset.id ? " is-active" : ""}`}
                  onClick={() => { setTheme(preset.id); setThemeOpen(false); }}
                >
                  <span className="soc-theme-swatch" aria-hidden="true">
                    <i style={{ background: preset.swatch[0] }} />
                    <i style={{ background: preset.swatch[1] }} />
                  </span>
                  {preset.label}
                  {theme === preset.id ? <Icon name="check" size={12} /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button type="button" className="soc-icon-button soc-help" onClick={() => go("support")} aria-label="Open support">
          <Icon name="help" size={15} />
        </button>
        <span className="soc-admin-pill">
          <Icon name="shield" size={12} /> Admin only
        </span>
        <button type="button" className="soc-button soc-button--primary" onClick={openServerModal}>
          <Icon name="plus" size={14} /> Create server
        </button>
        <button type="button" className="soc-self" onClick={() => openProfile(memberFromUser(user))}>
          <Avatar person={{ alias: user.alias ?? null, username: user.username, avatarUrl: user.avatarUrl }} size={28} />
          <span>{user.alias?.trim() || user.username}</span>
        </button>
      </header>

      <div className="soc-shell">
        <nav className="soc-server-rail" aria-label="Servers">
          {servers === null ? <span className="soc-rail-loading" /> : null}
          {visibleServers?.map((server) => (
            <button
              key={server.id}
              type="button"
              className={`soc-server${server.id === activeServerId ? " is-active" : ""}`}
              title={`${server.name} · ${server.memberCount} members`}
              aria-label={server.name}
              onContextMenu={(event) => openContextMenu(event, { kind: "server", server })}
              onClick={() => {
                setActiveServerId(server.id);
                setActiveChannelId(null);
                pendingChannel.current = null;
                setSearch("");
              }}
            >
              {initialsOf(server.name)}
            </button>
          ))}
          <button type="button" className="soc-server soc-server--add" onClick={openServerModal} aria-label="Create server">
            <Icon name="plus" size={18} />
          </button>
          <div className="soc-rail-foot">
            <Icon name="shield" size={16} />
          </div>
        </nav>

        <aside className="soc-channels">
          <div
            className="soc-server-head"
            onContextMenu={(event) => activeServer && openContextMenu(event, { kind: "server", server: activeServer })}
          >
            <div className="soc-server-title">
              <strong>{activeServer?.name ?? "No server selected"}</strong>
              {activeServer ? <Icon name="chevron-down" size={11} /> : null}
              {activeServer ? <small>{activeServer.memberCount} members · {activeServer.channelCount} channels</small> : null}
            </div>
            {activeServer ? (
              <div className="soc-server-head-actions">
                {canManageChannels ? (
                  <button type="button" className="soc-icon-button" onClick={() => openChannelModal()} aria-label="Create channel">
                    <Icon name="plus" size={15} />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="soc-icon-button"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    openContextMenuAt(rect.right - 210, rect.bottom + 6, { kind: "server", server: activeServer });
                  }}
                  aria-label="Server menu"
                  title="Server menu"
                >
                  <Icon name="dots" size={15} />
                </button>
              </div>
            ) : null}
          </div>

          <div className="soc-channel-scroll">
            {detailLoading ? <p className="soc-side-note">Loading channels…</p> : null}
            {!detailLoading && detail
              ? activeCategoryChannels.map(({ category, channels }) => (
                  <section className="soc-channel-group" key={category.id}>
                    <div className="soc-channel-group-head">
                      <span>{category.name}</span>
                      {canManageChannels ? (
                        <button type="button" onClick={() => openChannelModal(category.id)} aria-label={`Create channel in ${category.name}`}>
                          <Icon name="plus" size={12} />
                        </button>
                      ) : null}
                    </div>
                    {channels.map((channel) => (
                      <button
                        key={channel.id}
                        type="button"
                        className={`soc-channel${channel.id === activeChannelId ? " is-active" : ""}`}
                        onContextMenu={(event) => openContextMenu(event, { kind: "channel", channel })}
                        onClick={() => setActiveChannelId(channel.id)}
                        title={channel.sendRole ? `Only ${channel.sendRole.name} can post` : channel.topic || undefined}
                      >
                        <span className="soc-channel-hash">#</span>
                        <span>{channel.name}</span>
                        {channel.viewRole ? <Icon name="lock" size={11} className="soc-channel-lock" /> : null}
                        {!channel.viewRole && channel.sendRole ? <span className="soc-channel-send-lock" title={`Only ${channel.sendRole.name} can post`} /> : null}
                      </button>
                    ))}
                    {!channels.length ? <p className="soc-channel-empty">No channels</p> : null}
                  </section>
                ))
              : null}
            {uncategorized.length ? (
              <section className="soc-channel-group">
                <div className="soc-channel-group-head"><span>Channels</span></div>
                {uncategorized.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    className={`soc-channel${channel.id === activeChannelId ? " is-active" : ""}`}
                    onContextMenu={(event) => openContextMenu(event, { kind: "channel", channel })}
                    onClick={() => setActiveChannelId(channel.id)}
                  >
                    <span className="soc-channel-hash">#</span>
                    <span>{channel.name}</span>
                    {channel.sendRole ? <span className="soc-channel-send-lock" /> : null}
                  </button>
                ))}
              </section>
            ) : null}
            {detail && !detail.channels.length ? (
              <div className="soc-side-empty">
                <p>No channels visible yet.</p>
                {canManageChannels ? <button type="button" className="soc-link-button" onClick={() => openChannelModal()}>Create a channel</button> : null}
              </div>
            ) : null}
          </div>

          <div className="soc-user-panel">
            <button type="button" className="soc-user-identity" onClick={() => openProfile(memberFromUser(user))}>
              <span className="soc-user-avatar">
                <Avatar person={{ alias: user.alias ?? null, username: user.username, avatarUrl: user.avatarUrl }} size={30} />
                <i />
              </span>
              <span className="soc-user-copy">
                <strong>{user.alias?.trim() || user.username}</strong>
                <small>{deafened ? "Deafened" : muted ? "Muted" : "Online"}</small>
              </span>
            </button>
            <div className="soc-user-actions">
              <button type="button" className={muted ? "is-on" : ""} onClick={toggleMute} title={muted ? "Unmute" : "Mute"} aria-label={muted ? "Unmute" : "Mute"}>
                <Icon name={muted ? "mic-off" : "mic"} size={14} />
              </button>
              <button type="button" className={deafened ? "is-on" : ""} onClick={toggleDeafen} title={deafened ? "Undeafen" : "Deafen"} aria-label={deafened ? "Undeafen" : "Deafen"}>
                <Icon name={deafened ? "headphones-off" : "headphones"} size={14} />
              </button>
              <button type="button" onClick={openSettings} title="Social settings" aria-label="Social settings">
                <Icon name="settings" size={14} />
              </button>
            </div>
          </div>
        </aside>

        <main className="soc-chat">
          {fatalError ? (
            <div className="soc-banner">
              <span>{fatalError}</span>
              <button type="button" onClick={() => void loadServers(activeServerId ?? undefined)}>Retry</button>
            </div>
          ) : null}

          {servers !== null && servers.length === 0 ? (
            <div className="soc-empty">
              <span className="soc-empty-icon"><Icon name="comment" size={24} /></span>
              <h1>No servers yet</h1>
              <p>Create the first private admin server. It starts with #welcome and #general, and no fake members.</p>
              <button type="button" className="soc-button soc-button--primary" onClick={openServerModal}>
                <Icon name="plus" size={14} /> Create your first server
              </button>
            </div>
          ) : activeChannel ? (
            <>
              <header
                className="soc-chat-head"
                onContextMenu={(event) => activeServer && openContextMenu(event, { kind: "server", server: activeServer })}
              >
                <span className="soc-chat-hash">#</span>
                <strong>{activeChannel.name}</strong>
                {activeChannel.topic ? <span className="soc-chat-topic">{activeChannel.topic}</span> : null}
                {activeChannel.sendRole ? (
                  <span className="soc-channel-rule"><Icon name="lock" size={11} /> {activeChannel.sendRole.name} only</span>
                ) : null}
                <div className="soc-chat-head-actions">
                  <label className="soc-chat-search">
                    <Icon name="search" size={12} />
                    <input
                      value={chatSearch}
                      onChange={(event) => setChatSearch(event.target.value)}
                      placeholder="Search"
                      aria-label={`Search messages in #${activeChannel.name}`}
                    />
                  </label>
                  <button
                    type="button"
                    className="soc-icon-button"
                    onClick={() => setMessagesVersion((value) => value + 1)}
                    title="Refresh messages"
                    aria-label="Refresh messages"
                  >
                    <Icon name="refresh" size={13} />
                  </button>
                  <button
                    type="button"
                    className={`soc-icon-button${settings.showMembers ? " is-on" : ""}`}
                    onClick={() => updateSetting("showMembers", !settings.showMembers)}
                    title={settings.showMembers ? "Hide members" : "Show members"}
                    aria-label={settings.showMembers ? "Hide members" : "Show members"}
                  >
                    <Icon name="users" size={13} />
                  </button>
                </div>
              </header>

              <div className="soc-messages" ref={messagesRef}>
                {messagesLoading && !messages.length ? <p className="soc-message-note">Loading messages…</p> : null}
                {hasMore ? (
                  <button type="button" className="soc-load-earlier" onClick={() => void loadEarlier()}>
                    Load earlier messages
                  </button>
                ) : null}
                {!messagesLoading && !messages.length ? (
                  <div className="soc-welcome">
                    <span className="soc-welcome-icon"><Icon name="comment" size={22} /></span>
                    <div>
                      <strong>Welcome to #{activeChannel.name}</strong>
                      <p>{activeChannel.topic || "This is the beginning of the channel. Say hello."}</p>
                    </div>
                  </div>
                ) : null}
                {!messagesLoading && messages.length > 0 && displayedMessages.length === 0 ? (
                  <p className="soc-message-note">No messages match “{chatSearch.trim()}”.</p>
                ) : null}
                {displayedMessages.map((message, index) => {
                  const previous = displayedMessages[index - 1];
                  const divider = !previous || dayOf(previous.createdAt) !== dayOf(message.createdAt);
                  const topRole = message.author.roles?.[0];
                  return (
                    <div key={message.id}>
                      {divider ? <div className="soc-day"><span>{dayOf(message.createdAt)}</span></div> : null}
                      <article
                        className="soc-message"
                        data-message-id={message.id}
                        onContextMenu={(event) => openContextMenu(event, { kind: "message", message })}
                      >
                        <button
                          type="button"
                          className="soc-message-avatar"
                          onClick={() => openProfile(message.author)}
                          onPointerEnter={() => warmProfile(message.author)}
                          onFocus={() => warmProfile(message.author)}
                          aria-label={`Open ${nameOf(message.author)}`}
                        >
                          <Avatar person={message.author} size={36} />
                        </button>
                        <div className="soc-message-body">
                          <div className="soc-message-line">
                            <button
                              type="button"
                              className="soc-message-name"
                              onClick={() => openProfile(message.author)}
                              onPointerEnter={() => warmProfile(message.author)}
                              onFocus={() => warmProfile(message.author)}
                            >
                              {nameOf(message.author)}
                            </button>
                            <BadgeMarks badges={message.author.badges} size={13} />
                            {topRole ? <RoleChip role={topRole} small /> : null}
                            {settings.timestamps ? <time dateTime={message.createdAt}>{timeOf(message.createdAt)}</time> : null}
                            <span className="soc-message-hover-actions">
                              <button type="button" onClick={() => startReply(message)} title="Reply" aria-label="Reply">
                                <Icon name="comment" size={11} />
                              </button>
                              <button type="button" onClick={() => void toggleReaction(message, "🔥")} title="React with fire" aria-label="React with fire">
                                🔥
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  const rect = event.currentTarget.getBoundingClientRect();
                                  openContextMenuAt(rect.right - 210, rect.bottom + 4, { kind: "message", message });
                                }}
                                title="More actions"
                                aria-label="More actions"
                              >
                                <Icon name="dots" size={12} />
                              </button>
                              {canModerateMessages ? (
                                <button
                                  type="button"
                                  onClick={() => void deleteMessage(message)}
                                  title="Delete message"
                                  aria-label="Delete message"
                                >
                                  <Icon name="trash-2" size={11} />
                                </button>
                              ) : null}
                            </span>
                          </div>
                          {message.replyTo ? (
                            <button
                              type="button"
                              className="soc-reply-preview"
                              onClick={() => scrollToMessage(message.replyTo!.id)}
                              title="Jump to replied message"
                            >
                              <span>{message.replyTo.authorName}</span>
                              <p>{message.replyTo.content.slice(0, 140)}</p>
                            </button>
                          ) : null}
                          <p>{message.content}</p>
                          <MessageEmbeds message={message} enabled={settings.embeds} />
                          {message.reactions?.length ? (
                            <div className="soc-reactions">
                              {message.reactions.map((reaction) => (
                                <button
                                  type="button"
                                  key={reaction.emoji}
                                  className="soc-reaction"
                                  onClick={() => void toggleReaction(message, reaction.emoji)}
                                  title={`React with ${reaction.emoji}`}
                                >
                                  <span>{reaction.emoji}</span> {reaction.count}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    </div>
                  );
                })}
                {!messagesLoading && messages.length ? (
                  <div className="soc-caught-up"><span>You're all caught up</span></div>
                ) : null}
              </div>

              {activeChannel.canSend ? (
                <div className="soc-composer-wrap">
                  {replyTarget ? (
                    <div className="soc-reply-bar">
                      <span>Replying to <b>{nameOf(replyTarget.author)}</b></span>
                      <p>{replyTarget.content.slice(0, 120)}</p>
                      <button type="button" onClick={() => setReplyTarget(null)} aria-label="Cancel reply">
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  ) : null}
                  {embedOpen ? (
                    <div className="soc-embed-builder">
                      <div className="soc-embed-builder-head">
                        <span><Icon name="layers" size={12} /> Rich embed</span>
                        <button type="button" onClick={() => { setEmbedOpen(false); setEmbedDraft({ title: "", description: "", url: "", image: "", color: "#b8c2ff" }); }}>
                          Clear
                        </button>
                      </div>
                      <input
                        className="soc-input"
                        value={embedDraft.title}
                        onChange={(event) => setEmbedDraft((current) => ({ ...current, title: event.target.value.slice(0, 120) }))}
                        placeholder="Embed title"
                        aria-label="Embed title"
                      />
                      <textarea
                        className="soc-input soc-embed-description"
                        value={embedDraft.description}
                        onChange={(event) => setEmbedDraft((current) => ({ ...current, description: event.target.value.slice(0, 600) }))}
                        placeholder="Description"
                        aria-label="Embed description"
                        rows={2}
                      />
                      <div className="soc-embed-fields">
                        <input
                          className="soc-input"
                          value={embedDraft.url}
                          onChange={(event) => setEmbedDraft((current) => ({ ...current, url: event.target.value.slice(0, 1000) }))}
                          placeholder="https://link"
                          aria-label="Embed link"
                        />
                        <input
                          className="soc-input"
                          value={embedDraft.image}
                          onChange={(event) => setEmbedDraft((current) => ({ ...current, image: event.target.value.slice(0, 1000) }))}
                          placeholder="https://image"
                          aria-label="Embed image"
                        />
                        <input
                          type="color"
                          className="soc-color-input"
                          value={embedDraft.color}
                          onChange={(event) => setEmbedDraft((current) => ({ ...current, color: event.target.value }))}
                          aria-label="Embed colour"
                        />
                      </div>
                    </div>
                  ) : null}
                  <form className="soc-composer" onSubmit={sendMessage}>
                    <button
                      type="button"
                      className={`soc-composer-plus${embedOpen ? " is-on" : ""}`}
                      onClick={() => setEmbedOpen((open) => !open)}
                      title="Add a rich embed"
                      aria-label="Add a rich embed"
                    >
                      <Icon name="plus" size={15} />
                    </button>
                    <textarea
                      ref={composerRef}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey && (settings.enterToSend || event.metaKey || event.ctrlKey)) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                      placeholder={`Message #${activeChannel.name}`}
                      rows={1}
                      aria-label={`Message #${activeChannel.name}`}
                    />
                    <div className="soc-composer-actions">
                      <button
                        type="button"
                        className={`soc-composer-tool${embedOpen ? " is-on" : ""}`}
                        onClick={() => setEmbedOpen((open) => !open)}
                        title="Rich embed"
                        aria-label="Toggle rich embed builder"
                      >
                        <Icon name="layers" size={14} />
                      </button>
                      <button type="submit" className="soc-send" disabled={!draft.trim() || sending} aria-label="Send message">
                        <Icon name="arrow-right" size={15} />
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="soc-readonly">
                  <Icon name="lock" size={15} />
                  <span>Only {activeChannel.sendRole?.name ?? "a staff role"} can post in #{activeChannel.name}.</span>
                </div>
              )}
            </>
          ) : detailLoading ? (
            <div className="soc-empty soc-empty--small"><p>Loading server…</p></div>
          ) : activeServer ? (
            <div className="soc-empty soc-empty--small">
              <Icon name="comment" size={24} />
              <h1>No channel selected</h1>
              <p>Create a channel or choose one from the sidebar.</p>
              {canManageChannels ? (
                <button type="button" className="soc-button soc-button--primary" onClick={() => openChannelModal()}>
                  Create channel
                </button>
              ) : null}
            </div>
          ) : (
            <div className="soc-empty soc-empty--small">
              <Icon name="users" size={24} />
              <h1>Select a server</h1>
              <p>Choose a server from the rail to see its channels.</p>
            </div>
          )}
        </main>

        <aside className="soc-members">
          <header className="soc-members-head">
            <strong>Members</strong>
            <span>{detail?.members.length ?? 0}</span>
            <button type="button" className="soc-icon-button" onClick={() => setModal("leaderboard")} aria-label="Server leaderboard" title="Server leaderboard">
              <Icon name="crown" size={13} />
            </button>
            {canManageRoles ? (
              <button type="button" className="soc-icon-button" onClick={() => openRolesModal()} aria-label="Manage roles">
                <Icon name="shield" size={13} />
              </button>
            ) : null}
            {canManageMembers ? (
              <button type="button" className="soc-icon-button" onClick={openMemberModal} aria-label="Add member">
                <Icon name="plus" size={14} />
              </button>
            ) : null}
          </header>
          <div className="soc-mini-board">
            <div className="soc-mini-board-head">
              <span><Icon name="crown" size={11} /> Leaderboard</span>
              <button type="button" onClick={() => setModal("leaderboard")}>View all</button>
            </div>
            {topLeaderboard.length ? topLeaderboard.map((entry, index) => (
              <button
                type="button"
                className="soc-mini-board-row"
                key={entry.userId}
                onClick={() => openProfile(entry.member)}
              >
                <span className={`soc-mini-board-rank is-${index + 1}`}>{index + 1}</span>
                <Avatar person={entry.member} size={22} />
                <strong>{nameOf(entry.member)}</strong>
                <small>{entry.messages}</small>
              </button>
            )) : <p>No messages yet. The board fills up from real messages.</p>}
          </div>
          <div className="soc-members-scroll">
            {detailLoading ? <p className="soc-side-note">Loading members…</p> : null}
            {!detailLoading && memberGroups.map((group) => (
              <section className="soc-member-group" key={group.label}>
                <div className="soc-member-group-head">{group.label} · {group.members.length}</div>
                {group.members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className={`soc-member${selectedMember?.id === member.id ? " is-selected" : ""}`}
                    onClick={() => openProfile(member)}
                    onContextMenu={(event) => openContextMenu(event, { kind: "member", member })}
                    onPointerEnter={() => warmProfile(member)}
                    onFocus={() => warmProfile(member)}
                  >
                    <span className="soc-member-avatar">
                      <Avatar person={member} size={28} />
                      {member.id === user.id ? <i /> : null}
                    </span>
                    <span className="soc-member-copy">
                      <span className="soc-member-name-line">
                        <strong>{nameOf(member)}</strong>
                        <BadgeMarks badges={member.badges} size={11} />
                      </span>
                      <small>{member.roles[0]?.name ?? (member.isOwner ? "Owner" : member.isAdmin ? "Staff" : "Member")}</small>
                    </span>
                  </button>
                ))}
              </section>
            ))}
            {!detailLoading && detail && !detail.members.length ? (
              <div className="soc-side-empty">
                <p>No members yet.</p>
                {canManageMembers ? <button type="button" className="soc-link-button" onClick={openMemberModal}>Add a real account</button> : null}
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {modal === "server" ? (
        <Modal
          title="Create a server"
          subtitle="A private admin space with real tourn accounts. Nothing is seeded."
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="soc-button" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" form="soc-create-server" className="soc-button soc-button--primary" disabled={busy}>
                {busy ? "Creating…" : "Create server"}
              </button>
            </>
          }
        >
          <form id="soc-create-server" className="soc-form" onSubmit={createServer}>
            <label className="soc-label" htmlFor="soc-server-name">Server name</label>
            <input
              id="soc-server-name"
              className="soc-input"
              value={serverName}
              onChange={(event) => setServerName(event.target.value.slice(0, 64))}
              placeholder="Late Night Lounge"
              autoFocus
            />
            <p className="soc-help">You will be added as the owner. Starts with #welcome and #general plus Owner, Staff and Member roles.</p>
            {formError ? <p className="soc-form-error">{formError}</p> : null}
          </form>
        </Modal>
      ) : null}

      {modal === "channel" ? (
        <Modal
          title="Create a channel"
          subtitle={`Add a text channel to ${activeServer?.name ?? "this server"}.`}
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="soc-button" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" form="soc-create-channel" className="soc-button soc-button--primary" disabled={busy}>
                {busy ? "Creating…" : "Create channel"}
              </button>
            </>
          }
        >
          <form id="soc-create-channel" className="soc-form" onSubmit={createChannel}>
            <label className="soc-label" htmlFor="soc-channel-name">Channel name</label>
            <div className="soc-input-prefix">
              <span>#</span>
              <input
                id="soc-channel-name"
                className="soc-input"
                value={channelName}
                onChange={(event) => setChannelName(event.target.value.slice(0, 32))}
                placeholder="general"
                autoFocus
              />
            </div>
            <label className="soc-label" htmlFor="soc-channel-topic">Topic <span>(optional)</span></label>
            <input
              id="soc-channel-topic"
              className="soc-input"
              value={channelTopic}
              onChange={(event) => setChannelTopic(event.target.value.slice(0, 200))}
              placeholder="What is this channel for?"
            />
            <label className="soc-label" htmlFor="soc-channel-category">Category</label>
            <select
              id="soc-channel-category"
              className="soc-input"
              value={channelCategory}
              onChange={(event) => setChannelCategory(event.target.value)}
            >
              {detail?.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <div className="soc-form-grid">
              <div>
                <label className="soc-label" htmlFor="soc-channel-view">Who can see it</label>
                <select
                  id="soc-channel-view"
                  className="soc-input"
                  value={channelViewRole}
                  onChange={(event) => setChannelViewRole(event.target.value)}
                >
                  <option value="">Everyone</option>
                  {detail?.roles.map((role) => <option key={role.id} value={role.id}>{role.name} and above</option>)}
                </select>
              </div>
              <div>
                <label className="soc-label" htmlFor="soc-channel-send">Who can post</label>
                <select
                  id="soc-channel-send"
                  className="soc-input"
                  value={channelSendRole}
                  onChange={(event) => setChannelSendRole(event.target.value)}
                >
                  <option value="">Everyone</option>
                  {detail?.roles.map((role) => <option key={role.id} value={role.id}>{role.name} and above</option>)}
                </select>
              </div>
            </div>
            {formError ? <p className="soc-form-error">{formError}</p> : null}
          </form>
        </Modal>
      ) : null}

      {modal === "member" ? (
        <Modal
          title="Add a member"
          subtitle="Search real tourn accounts. No placeholder profiles."
          onClose={() => setModal(null)}
          footer={<button type="button" className="soc-button" onClick={() => setModal(null)}>Done</button>}
        >
          <label className="soc-label" htmlFor="soc-member-search">Search by alias or username</label>
          <input
            id="soc-member-search"
            className="soc-input"
            value={memberQuery}
            onChange={(event) => setMemberQuery(event.target.value)}
            placeholder="Start typing an account…"
            autoFocus
          />
          {formError ? <p className="soc-form-error">{formError}</p> : null}
          <div className="soc-member-results">
            {memberSearching ? <p className="soc-help">Searching accounts…</p> : null}
            {!memberSearching && memberQuery.trim() && !memberResults.length ? (
              <p className="soc-help">No unadded accounts match that search.</p>
            ) : null}
            {memberResults.map((member) => (
              <div className="soc-member-result" key={member.id}>
                <Avatar person={member} size={32} />
                <div>
                  <strong>{nameOf(member)}</strong>
                  <small>{member.roles[0]?.name ?? "Member"} · {countOf(member.profileViews)} views</small>
                </div>
                <button type="button" className="soc-button soc-button--small" onClick={() => void addMember(member)} disabled={busy}>
                  Add
                </button>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}

      {modal === "roles" ? (
        <Modal
          title={roleTarget ? `Roles for ${nameOf(roleTarget)}` : "Server roles"}
          subtitle={roleTarget ? "Give this account the server roles it should have." : "Roles control who can post in restricted channels and who can manage the server."}
          onClose={() => setModal(null)}
          footer={
            roleTarget ? (
              <>
                <button type="button" className="soc-button" onClick={() => setModal(null)}>Cancel</button>
                <button type="button" className="soc-button soc-button--primary" onClick={() => void saveRoles()} disabled={busy}>
                  {busy ? "Saving…" : "Save roles"}
                </button>
              </>
            ) : (
              <button type="button" className="soc-button" onClick={() => setModal(null)}>Done</button>
            )
          }
        >
          {roleTarget ? (
            <div className="soc-role-assign">
              <div className="soc-role-assign-head">
                <Avatar person={roleTarget} size={30} />
                <div>
                  <strong>{nameOf(roleTarget)}</strong>
                  <small>Choose every role this account should have.</small>
                </div>
              </div>
              <div className="soc-role-options">
                {detail?.roles.map((role) => (
                  <label className="soc-role-option" key={role.id}>
                    <input
                      type="checkbox"
                      checked={roleSelection.includes(role.id)}
                      onChange={(event) => {
                        setRoleSelection((current) =>
                          event.target.checked
                            ? [...current, role.id]
                            : current.filter((id) => id !== role.id),
                        );
                      }}
                    />
                    <RoleChip role={role} />
                    <span>{role.isDefault ? "Default" : role.permissions.manage_server ? "Full access" : role.permissions.manage_messages ? "Can moderate messages" : role.permissions.manage_channels ? "Can manage channels" : "Member access"}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="soc-role-list">
            <div className="soc-profile-section-label">Server roles</div>
            {detail?.roles.map((role) => (
              <div className="soc-role-row" key={role.id}>
                <RoleChip role={role} />
                <span>{role.isDefault ? "Default role" : role.permissions.manage_server ? "Full access" : role.permissions.manage_messages ? "Can moderate messages" : role.permissions.manage_channels ? "Can manage channels" : "Member access"}</span>
                <b>{role.position}</b>
              </div>
            ))}
          </div>

          <form className="soc-role-create" onSubmit={createRole}>
            <div className="soc-profile-section-label">Create a role</div>
            <div className="soc-role-create-row">
              <input
                className="soc-input"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value.slice(0, 32))}
                placeholder="Designer"
                aria-label="Role name"
              />
              <input
                type="color"
                className="soc-color-input"
                value={roleColor}
                onChange={(event) => setRoleColor(event.target.value)}
                aria-label="Role colour"
              />
              <button type="submit" className="soc-button soc-button--small" disabled={busy || !roleName.trim()}>
                Create
              </button>
            </div>
            <div className="soc-perm-row">
              <label><input type="checkbox" checked={rolePerms.manage_messages} onChange={(event) => setRolePerms((current) => ({ ...current, manage_messages: event.target.checked }))} /> Delete messages</label>
              <label><input type="checkbox" checked={rolePerms.manage_channels} onChange={(event) => setRolePerms((current) => ({ ...current, manage_channels: event.target.checked }))} /> Manage channels</label>
              <label><input type="checkbox" checked={rolePerms.manage_members} onChange={(event) => setRolePerms((current) => ({ ...current, manage_members: event.target.checked }))} /> Manage members</label>
              <label><input type="checkbox" checked={rolePerms.manage_roles} onChange={(event) => setRolePerms((current) => ({ ...current, manage_roles: event.target.checked }))} /> Manage roles</label>
              <label><input type="checkbox" checked={rolePerms.manage_server} onChange={(event) => setRolePerms((current) => ({ ...current, manage_server: event.target.checked }))} /> Manage server</label>
            </div>
            {formError ? <p className="soc-form-error">{formError}</p> : null}
          </form>
        </Modal>
      ) : null}

      {modal === "moderation" ? (
        <Modal
          title="Moderation log"
          subtitle={`Recent moderator actions in ${activeServer?.name ?? "this server"}.`}
          onClose={() => setModal(null)}
          footer={<button type="button" className="soc-button" onClick={() => setModal(null)}>Done</button>}
        >
          {moderationLoading ? <p className="soc-help">Loading moderation history…</p> : null}
          {!moderationLoading && !moderationLog.length ? (
            <p className="soc-help">No moderation actions have been taken in this server yet.</p>
          ) : null}
          <div className="soc-mod-log">
            {moderationLog.map((entry) => (
              <div className="soc-mod-entry" key={entry.id}>
                <span className={`soc-mod-icon soc-mod-icon--${entry.action}`}>
                  <Icon name={entry.action === "message_delete" ? "trash-2" : "users"} size={14} />
                </span>
                <div>
                  <strong>{entry.actor ? nameOf(entry.actor) : "Staff"}</strong>
                  <p>{entry.detail}</p>
                  <small>
                    {dayOf(entry.createdAt)} · {timeOf(entry.createdAt)}
                    {entry.target ? ` · ${nameOf(entry.target)}` : ""}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}

      {modal === "settings" ? (
        <Modal
          title="Social settings"
          subtitle="Saved on this account in this browser and applied across the whole Social area."
          wide
          onClose={() => setModal(null)}
          footer={<button type="button" className="soc-button soc-button--primary" onClick={() => setModal(null)}>Done</button>}
        >
          <div className="soc-settings-layout">
            <div className="soc-settings-main">
              <div className="soc-profile-section-label">Appearance</div>
              <div className="soc-theme-grid">
                {SOCIAL_THEMES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`soc-theme-card${theme === preset.id ? " is-active" : ""}`}
                    onClick={() => setTheme(preset.id)}
                    aria-pressed={theme === preset.id}
                  >
                    <span className="soc-theme-swatch" aria-hidden="true">
                      <i style={{ background: preset.swatch[0] }} />
                      <i style={{ background: preset.swatch[1] }} />
                    </span>
                    <span>{preset.label}</span>
                    {theme === preset.id ? <Icon name="check" size={12} /> : null}
                  </button>
                ))}
              </div>

              <div className="soc-profile-section-label">Chat</div>
              <SettingToggle
                label="Compact messages"
                hint="Tighter spacing so more of the conversation fits on screen."
                checked={settings.compact}
                onChange={(next) => updateSetting("compact", next)}
              />
              <SettingToggle
                label="Show timestamps"
                hint="Keep the time beside every message."
                checked={settings.timestamps}
                onChange={(next) => updateSetting("timestamps", next)}
              />
              <SettingToggle
                label="Rich embeds"
                hint="Render link previews, images, media cards and custom embeds."
                checked={settings.embeds}
                onChange={(next) => updateSetting("embeds", next)}
              />
              <SettingToggle
                label="Enter sends"
                hint="Turn this off to require Ctrl+Enter instead."
                checked={settings.enterToSend}
                onChange={(next) => updateSetting("enterToSend", next)}
              />

              <div className="soc-profile-section-label">Layout & motion</div>
              <SettingToggle
                label="Show member list"
                hint="Hide the right-hand roster when you want a wider conversation."
                checked={settings.showMembers}
                onChange={(next) => updateSetting("showMembers", next)}
              />
              <SettingToggle
                label="Reduce motion"
                hint="Disable the profile and menu entrance animations."
                checked={settings.reduceMotion}
                onChange={(next) => updateSetting("reduceMotion", next)}
              />
            </div>

            <aside className="soc-inventory-preview">
              <div className="soc-profile-section-label">Inventory preview</div>
              <div className="soc-inventory-person">
                <Avatar person={{ alias: user.alias ?? null, username: user.username, avatarUrl: user.avatarUrl }} size={36} />
                <div>
                  <strong>{inventoryNames?.primary || user.alias?.trim() || user.username}</strong>
                  <small>@{user.username}</small>
                </div>
              </div>
              <div className="soc-inventory-stats">
                <div><b>{inventoryHandles.length || "—"}</b><span>handles</span></div>
                <div><b>{inventoryBadges.length}</b><span>badges</span></div>
              </div>
              <div className="soc-inventory-handles">
                {inventoryHandles.slice(0, 3).map((handle) => <span key={handle}>@{handle}</span>)}
                {!inventoryHandles.length ? <small>Your signup username is your first handle.</small> : null}
              </div>
              <div className="soc-inventory-badges">
                {inventoryBadges.slice(0, 6).map((badge) =>
                  badge.art ? <img key={badge.id} src={badge.art} alt={badge.name} title={badge.name} /> : null,
                )}
                {!inventoryBadges.length ? <small>No badges collected yet.</small> : null}
              </div>
              <button type="button" className="soc-button soc-button--small" onClick={() => { setModal(null); go("aliases"); }}>
                Open full inventory <Icon name="arrow-right" size={11} />
              </button>
              <p>Your handles and badges come straight from your account inventory.</p>
            </aside>
          </div>
        </Modal>
      ) : null}

      {modal === "leaderboard" ? (
        <Modal
          title="Server leaderboard"
          subtitle={`Top message senders in ${activeServer?.name ?? "this server"}, from real messages only.`}
          onClose={() => setModal(null)}
          footer={<button type="button" className="soc-button" onClick={() => setModal(null)}>Done</button>}
        >
          {!leaderboardMembers.length ? (
            <p className="soc-help">No messages have been sent in this server yet. The leaderboard fills up as people talk.</p>
          ) : (
            <div className="soc-leaderboard">
              {leaderboardMembers.map((entry, index) => (
                <button
                  type="button"
                  className="soc-leaderboard-row"
                  key={entry.userId}
                  onClick={() => { setModal(null); openProfile(entry.member); }}
                >
                  <span className={`soc-leaderboard-rank is-${index + 1}`}>
                    {index < 3 ? <Icon name="crown" size={13} /> : index + 1}
                  </span>
                  <Avatar person={entry.member} size={30} />
                  <span className="soc-leaderboard-copy">
                    <strong>{nameOf(entry.member)}</strong>
                    <small>@{handleOf(entry.member)}</small>
                  </span>
                  <span className="soc-leaderboard-count"><b>{entry.messages.toLocaleString()}</b><small>messages</small></span>
                </button>
              ))}
            </div>
          )}
        </Modal>
      ) : null}

      {selectedMember ? (
        <div className="soc-profile-layer" role="presentation" onMouseDown={closeProfile}>
          <aside
            ref={profileRef}
            className="soc-profile-card"
            onMouseDown={(event) => event.stopPropagation()}
            onContextMenu={(event) => openContextMenu(event, { kind: "member", member: selectedPerson ?? selectedMember })}
            aria-label={`${nameOf(selectedMember)} profile`}
          >
            <div className="soc-profile-banner" />
            <button type="button" className="soc-profile-close" onClick={closeProfile} aria-label="Close profile">
              <Icon name="x" size={15} />
            </button>
            <div className="soc-profile-content">
              <Avatar person={selectedMember} size={72} />
              <div className="soc-profile-name-row">
                <strong>{selectedName || selectedHandle || "Member"}</strong>
                <BadgeMarks badges={profileBadges} size={17} />
                {selectedHandle ? <span>@{selectedHandle}</span> : null}
              </div>
              <div className="soc-profile-tags">
                {selectedPerson?.isOwner ? <span className="soc-tag soc-tag--owner">OWNER</span> : null}
                {selectedPerson?.isAdmin ? <span className="soc-tag soc-tag--staff">ADMIN</span> : null}
                {selectedPerson?.premium ? <span className="soc-tag soc-tag--premium">PREMIUM</span> : null}
              </div>
              {profileLoading ? (
                <p className="soc-profile-bio is-muted">Loading profile details…</p>
              ) : profileError ? (
                <p className="soc-profile-bio is-muted">{profileError}</p>
              ) : (
                <p className="soc-profile-bio">
                  {profileAbout?.bio?.trim() || "No bio on this profile yet."}
                </p>
              )}

              <div className="soc-profile-stats">
                <div><b>{countOf(selectedViews)}</b><span>views</span></div>
                <div><b>{countOf(selectedServers)}</b><span>servers</span></div>
                <div><b>{joinedOf(selectedJoinedAt)}</b><span>joined</span></div>
              </div>

              {selectedRoles.length ? (
                <div className="soc-profile-roles">
                  <div className="soc-profile-section-label">Roles in this server</div>
                  <div className="soc-role-inline">
                    {selectedRoles.map((role) => <RoleChip role={role} key={role.id} small />)}
                  </div>
                </div>
              ) : null}

              {profileBadges.length ? (
                <div className="soc-profile-badge-strip">
                  {profileBadges.slice(0, 8).map((badge) => {
                    const def = BADGE_MAP.get(badge.id);
                    return def?.art ? (
                      <img key={badge.id} src={def.art} alt={def.name} title={def.name} />
                    ) : null;
                  })}
                </div>
              ) : null}

              <div className="soc-profile-handle">
                <span>tourn.lol/{selectedHandle}</span>
                <button type="button" onClick={() => void copySelectedHandle()}><Icon name="copy" size={11} /> copy</button>
              </div>

              <div className="soc-profile-actions">
                <a className="soc-button soc-button--primary" href={`#/profile/${encodeURIComponent(selectedHandle)}`}>
                  Open tourn page <Icon name="external" size={12} />
                </a>
                <button type="button" className="soc-button" onClick={startMessage} disabled={!selectedRecord || !activeChannel?.canSend}>
                  Message
                </button>
              </div>
              {selectedRecord && canManageRoles ? (
                <button type="button" className="soc-profile-roles-button" onClick={() => openRolesModal(selectedRecord)}>
                  <Icon name="shield" size={12} /> Manage server roles
                </button>
              ) : null}
              {selectedRecord && canManageMembers && !selectedRecord.isOwner && selectedRecord.id !== user.id ? (
                <button type="button" className="soc-profile-remove-button" onClick={() => void removeMember(selectedRecord)}>
                  <Icon name="trash-2" size={12} /> Remove from server
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {contextMenu ? (
        <div
          ref={contextRef}
          className="soc-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          aria-label="Social actions"
          onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}
        >
          {contextMenu.target.kind === "app" ? (
            <>
              <div className="soc-context-label">Social</div>
              <ContextMenuItem icon="settings" onClick={() => { setContextMenu(null); openSettings(); }}>Social settings</ContextMenuItem>
              <ContextMenuItem icon="palette" onClick={() => { setContextMenu(null); openSettings(); }}>Appearance & theme</ContextMenuItem>
              <ContextMenuItem icon="layers" onClick={() => { setContextMenu(null); setModal("settings"); }}>Inventory preview</ContextMenuItem>
              <div className="soc-context-separator" />
              <ContextMenuItem icon="plus" onClick={() => { setContextMenu(null); openServerModal(); }}>Create a server</ContextMenuItem>
              <ContextMenuItem
                icon="users"
                onClick={() => { setContextMenu(null); updateSetting("showMembers", !settings.showMembers); }}
              >
                {settings.showMembers ? "Hide member list" : "Show member list"}
              </ContextMenuItem>
              <ContextMenuItem icon="crown" onClick={() => { setContextMenu(null); setModal("leaderboard"); }}>Server leaderboard</ContextMenuItem>
            </>
          ) : null}

          {menuMessage ? (
            <>
              <div className="soc-context-reactions">
                {REACTION_CHOICES.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    title={`React with ${emoji}`}
                    aria-label={`React with ${emoji}`}
                    onClick={() => { setContextMenu(null); void toggleReaction(menuMessage, emoji); }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <ContextMenuItem icon="comment" onClick={() => { setContextMenu(null); startReply(menuMessage); }}>Reply</ContextMenuItem>
              <ContextMenuItem icon="copy" onClick={() => { setContextMenu(null); void copyText(menuMessage.content, "Message"); }}>Copy text</ContextMenuItem>
              <ContextMenuItem icon="user" onClick={() => { setContextMenu(null); openProfile(menuMessage.author); }}>Open profile</ContextMenuItem>
              {canModerateMessages ? (
                <>
                  <div className="soc-context-separator" />
                  <ContextMenuItem icon="trash-2" danger onClick={() => void deleteMessage(menuMessage)}>Delete message</ContextMenuItem>
                </>
              ) : null}
            </>
          ) : null}

          {menuMember ? (
            <>
              <div className="soc-context-label">{nameOf(menuMember)}</div>
              <ContextMenuItem icon="user" onClick={() => { setContextMenu(null); openProfile(menuMember); }}>Open profile</ContextMenuItem>
              <ContextMenuItem icon="at" onClick={() => mentionMember(menuMember)}>Mention in chat</ContextMenuItem>
              <ContextMenuItem icon="copy" onClick={() => { setContextMenu(null); void copyText(`@${handleOf(menuMember)}`, "Handle"); }}>Copy handle</ContextMenuItem>
              {contextMemberRecord && canManageRoles ? (
                <ContextMenuItem icon="shield" onClick={() => { setContextMenu(null); openRolesModal(contextMemberRecord); }}>Manage roles</ContextMenuItem>
              ) : null}
              {contextMemberRecord && canManageMembers && !contextMemberRecord.isOwner && contextMemberRecord.id !== user.id ? (
                <>
                  <div className="soc-context-separator" />
                  <ContextMenuItem icon="trash-2" danger onClick={() => { setContextMenu(null); void removeMember(contextMemberRecord); }}>Remove from server</ContextMenuItem>
                </>
              ) : null}
            </>
          ) : null}

          {menuChannel ? (
            <>
              <div className="soc-context-label">#{menuChannel.name}</div>
              <ContextMenuItem icon="comment" onClick={() => { setContextMenu(null); setActiveChannelId(menuChannel.id); }}>Open channel</ContextMenuItem>
              <ContextMenuItem icon="copy" onClick={() => { setContextMenu(null); void copyText(`#${menuChannel.name}`, "Channel name"); }}>Copy channel name</ContextMenuItem>
              {canManageChannels ? (
                <ContextMenuItem icon="plus" onClick={() => { setContextMenu(null); openChannelModal(menuChannel.categoryId ?? undefined); }}>Create channel here</ContextMenuItem>
              ) : null}
            </>
          ) : null}

          {menuServer ? (
            <>
              <div className="soc-context-label">{menuServer.name}</div>
              <ContextMenuItem icon="comment" onClick={() => { setContextMenu(null); setActiveServerId(menuServer.id); setActiveChannelId(null); }}>Open server</ContextMenuItem>
              <ContextMenuItem icon="crown" onClick={() => { setContextMenu(null); setActiveServerId(menuServer.id); setModal("leaderboard"); }}>Leaderboard</ContextMenuItem>
              <ContextMenuItem icon="copy" onClick={() => { setContextMenu(null); void copyText(menuServer.name, "Server name"); }}>Copy server name</ContextMenuItem>
              <div className="soc-context-separator" />
              {menuServer.id === activeServerId && canManageChannels ? (
                <ContextMenuItem icon="plus" onClick={() => { setContextMenu(null); setActiveServerId(menuServer.id); openChannelModal(); }}>Create channel</ContextMenuItem>
              ) : null}
              {menuServer.id === activeServerId && canManageRoles ? (
                <ContextMenuItem icon="shield" onClick={() => { setContextMenu(null); setActiveServerId(menuServer.id); openRolesModal(); }}>Manage roles</ContextMenuItem>
              ) : null}
              {menuServer.id === activeServerId && (canModerateMessages || canManageMembers) ? (
                <ContextMenuItem icon="clock" onClick={() => { setContextMenu(null); setActiveServerId(menuServer.id); void openModeration(); }}>Moderation log</ContextMenuItem>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The signed-in account is already a real SocialAuthor. */
function memberFromUser(user: ReturnType<typeof useDash>["user"]): SocialMember {
  return {
    id: user.id,
    username: user.username,
    alias: user.alias ?? null,
    displayName: null,
    avatarUrl: user.avatarUrl,
    premium: Boolean(user.premium),
    isAdmin: Boolean(user.isAdmin),
    isOwner: Boolean(user.isOwner),
    joinedAt: null,
    roles: [],
    badges: [],
    profileViews: 0,
    serverCount: 0,
  };
}
