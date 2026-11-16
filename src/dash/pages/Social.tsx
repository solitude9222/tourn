/* ---------------------------------------------------------------------------
   Social — an admin-only, Discord-style space built from real tourn accounts.

   No sample servers, members or messages are rendered. The area starts empty
   and fills only with rows from /api/social, which is admin-gated on the
   backend as well. Messages refresh on a short interval; profile cards read
   the public profile document for the selected account.
   --------------------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { BADGE_MAP } from "../../lib/badges";
import { api, post } from "../../lib/backend";
import { fetchPublicProfile, type ProfilePayload } from "../../lib/serverProfile";
import { useDash } from "../context";
import { Icon } from "../ui";
import "../../social.css";

type SocialAuthor = {
  id: string;
  username: string;
  alias: string | null;
  avatarUrl: string | null;
  premium: boolean;
  isAdmin: boolean;
  isOwner: boolean;
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
};
type SocialMember = SocialAuthor & { joinedAt: string | null };
type SocialMessage = {
  id: string;
  channelId: string;
  content: string;
  createdAt: string;
  author: SocialAuthor;
};
type ServerDetail = {
  server: SocialServer;
  categories: SocialCategory[];
  channels: SocialChannel[];
  members: SocialMember[];
};

type ModalKind = "server" | "channel" | "member" | null;

const nameOf = (person: Pick<SocialAuthor, "alias">) => person.alias?.trim() || "Unclaimed";
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
const joinedOf = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString([], { month: "short", year: "numeric" });
};

function Avatar({ person, size = 32 }: { person: Pick<SocialAuthor, "alias" | "avatarUrl">; size?: number }) {
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

function Modal({
  title,
  subtitle,
  children,
  onClose,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
  footer: ReactNode;
}) {
  return (
    <div className="soc-modal-layer" role="presentation" onMouseDown={onClose}>
      <section
        className="soc-modal"
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

export function SocialPage() {
  const { user, isAdmin, go, notify } = useDash();

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
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalKind>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [serverName, setServerName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelTopic, setChannelTopic] = useState("");
  const [channelCategory, setChannelCategory] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<SocialMember[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);

  const [selectedMember, setSelectedMember] = useState<SocialMember | SocialAuthor | null>(null);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileRequest = useRef(0);

  const messagesRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const query = search.trim().toLowerCase();
  const activeChannel = detail?.channels.find((channel) => channel.id === activeChannelId) ?? null;
  const activeServer = detail?.server ?? servers?.find((server) => server.id === activeServerId) ?? null;

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
        setActiveChannelId((current) =>
          current && result.data.channels.some((channel) => channel.id === current)
            ? current
            : result.data.channels[0]?.id ?? null,
        );
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeServerId, detailVersion]);

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
      if (event.key === "Escape") setSelectedMember(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedMember]);

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
    setSelectedMember(person);
    setProfile(null);
    setProfileError(null);
    setProfileLoading(true);
    const request = ++profileRequest.current;
    void fetchPublicProfile(handleOf(person)).then((result) => {
      if (request !== profileRequest.current) return;
      if (result.ok) setProfile(result.data);
      else setProfileError(result.error);
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

  const openServerModal = () => {
    setServerName("");
    setFormError(null);
    setModal("server");
  };

  const openChannelModal = (categoryId?: string) => {
    setChannelName("");
    setChannelTopic("");
    setChannelCategory(categoryId ?? detail?.categories[0]?.id ?? "");
    setFormError(null);
    setModal("channel");
  };

  const openMemberModal = () => {
    setMemberQuery("");
    setMemberResults([]);
    setFormError(null);
    setModal("member");
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
      { name: channelName, topic: channelTopic, categoryId: channelCategory || null },
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
    notify("Member added", `${nameOf(member)} can now appear in this server.`);
  };

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || !activeChannelId || sending) return;
    setSending(true);
    const result = await post<{ message: SocialMessage }>(
      `/api/social/channels/${encodeURIComponent(activeChannelId)}/messages`,
      { content },
    );
    setSending(false);
    if (!result.ok) {
      notify("Message not sent", result.error);
      return;
    }
    setDraft("");
    setMessages((current) => {
      if (current.some((message) => message.id === result.data.message.id)) return current;
      return [...current, result.data.message];
    });
    composerRef.current?.focus();
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

  const visibleChannels = useMemo(() => {
    if (!detail) return [];
    return detail.channels.filter((channel) => !query || channel.name.toLowerCase().includes(query));
  }, [detail, query]);

  const visibleMembers = useMemo(() => {
    if (!detail) return [];
    return detail.members.filter((member) => {
      if (!query) return true;
      return (
        nameOf(member).toLowerCase().includes(query) ||
        member.username.toLowerCase().includes(query) ||
        member.alias?.toLowerCase().includes(query)
      );
    });
  }, [detail, query]);

  const memberGroups = useMemo(() => {
    if (!visibleMembers.length) return [];
    const owners = visibleMembers.filter((member) => member.isOwner);
    const admins = visibleMembers.filter((member) => !member.isOwner && member.isAdmin);
    const members = visibleMembers.filter((member) => !member.isOwner && !member.isAdmin);
    return [
      { label: "Owner", members: owners },
      { label: "Admins", members: admins },
      { label: "Members", members },
    ].filter((group) => group.members.length);
  }, [visibleMembers]);

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

  const profileAbout = profile?.profile?.about;
  const profileBadges = profile?.profile?.badges.equipped ?? [];
  const selectedHandle = selectedMember ? handleOf(selectedMember) : "";
  const selectedName = profileAbout?.displayName?.trim() || (selectedMember ? nameOf(selectedMember) : "");
  const selectedJoinedAt = selectedMember && "joinedAt" in selectedMember ? selectedMember.joinedAt : null;

  return (
    <div className="social-app">
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
          Admin <span>/</span> <strong>Social</strong>
        </div>
        <label className="soc-search">
          <Icon name="search" size={14} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search channels and members"
            aria-label="Search channels and members"
          />
        </label>
        <div className="soc-topbar-spacer" />
        <span className="soc-admin-pill">
          <Icon name="shield" size={12} /> Admin only
        </span>
        <button type="button" className="soc-button soc-button--primary" onClick={openServerModal}>
          <Icon name="plus" size={14} /> Create server
        </button>
        <button type="button" className="soc-self" onClick={() => openProfile(memberFromUser(user))}>
          <Avatar person={{ alias: user.alias ?? null, avatarUrl: user.avatarUrl }} size={28} />
          <span>{user.alias?.trim() || "Admin"}</span>
        </button>
      </header>

      <div className="soc-shell">
        <nav className="soc-server-rail" aria-label="Servers">
          {servers === null ? <span className="soc-rail-loading" /> : null}
          {servers?.map((server) => (
            <button
              key={server.id}
              type="button"
              className={`soc-server${server.id === activeServerId ? " is-active" : ""}`}
              title={server.name}
              aria-label={server.name}
              onClick={() => {
                setActiveServerId(server.id);
                setActiveChannelId(null);
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
          <div className="soc-server-head">
            <div>
              <strong>{activeServer?.name ?? "No server selected"}</strong>
              {activeServer ? <small>{activeServer.memberCount} members</small> : null}
            </div>
            {activeServer ? (
              <button type="button" className="soc-icon-button" onClick={() => openChannelModal()} aria-label="Create channel">
                <Icon name="plus" size={15} />
              </button>
            ) : null}
          </div>

          <div className="soc-channel-scroll">
            {detailLoading ? <p className="soc-side-note">Loading channels…</p> : null}
            {!detailLoading && detail
              ? activeCategoryChannels.map(({ category, channels }) => (
                  <section className="soc-channel-group" key={category.id}>
                    <div className="soc-channel-group-head">
                      <span>{category.name}</span>
                      <button type="button" onClick={() => openChannelModal(category.id)} aria-label={`Create channel in ${category.name}`}>
                        <Icon name="plus" size={12} />
                      </button>
                    </div>
                    {channels.map((channel) => (
                      <button
                        key={channel.id}
                        type="button"
                        className={`soc-channel${channel.id === activeChannelId ? " is-active" : ""}`}
                        onClick={() => setActiveChannelId(channel.id)}
                      >
                        <span className="soc-channel-hash">#</span>
                        <span>{channel.name}</span>
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
                    onClick={() => setActiveChannelId(channel.id)}
                  >
                    <span className="soc-channel-hash">#</span>
                    <span>{channel.name}</span>
                  </button>
                ))}
              </section>
            ) : null}
            {detail && !detail.channels.length ? (
              <div className="soc-side-empty">
                <p>No channels yet.</p>
                <button type="button" className="soc-link-button" onClick={() => openChannelModal()}>Create the first channel</button>
              </div>
            ) : null}
          </div>

          <div className="soc-user-panel">
            <Avatar person={{ alias: user.alias ?? null, avatarUrl: user.avatarUrl }} size={30} />
            <div>
              <strong>{user.alias?.trim() || "Admin"}</strong>
              <span>Admin</span>
            </div>
            <Icon name="shield" size={13} />
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
              <header className="soc-chat-head">
                <span className="soc-chat-hash">#</span>
                <strong>{activeChannel.name}</strong>
                {activeChannel.topic ? <span className="soc-chat-topic">{activeChannel.topic}</span> : null}
                <div className="soc-chat-head-actions">
                  <button type="button" className="soc-soft-button" onClick={openMemberModal}>
                    <Icon name="users" size={13} /> Add member
                  </button>
                  <span className="soc-member-count">{detail?.members.length ?? 0} members</span>
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
                  <div className="soc-chat-empty">
                    <span><Icon name="comment" size={20} /></span>
                    <strong>No messages yet</strong>
                    <p>This is the beginning of #{activeChannel.name}. Say hello.</p>
                  </div>
                ) : null}
                {messages.map((message, index) => {
                  const previous = messages[index - 1];
                  const divider = !previous || dayOf(previous.createdAt) !== dayOf(message.createdAt);
                  return (
                    <div key={message.id}>
                      {divider ? <div className="soc-day"><span>{dayOf(message.createdAt)}</span></div> : null}
                      <article className="soc-message">
                        <button type="button" className="soc-message-avatar" onClick={() => openProfile(message.author)} aria-label={`Open ${nameOf(message.author)}`}>
                          <Avatar person={message.author} size={36} />
                        </button>
                        <div className="soc-message-body">
                          <div className="soc-message-line">
                            <button type="button" className="soc-message-name" onClick={() => openProfile(message.author)}>
                              {nameOf(message.author)}
                            </button>
                            {message.author.isOwner ? <span className="soc-tag soc-tag--owner">OWNER</span> : null}
                            {!message.author.isOwner && message.author.isAdmin ? <span className="soc-tag soc-tag--staff">ADMIN</span> : null}
                            {message.author.premium ? <span className="soc-tag soc-tag--premium">PREMIUM</span> : null}
                            <time dateTime={message.createdAt}>{timeOf(message.createdAt)}</time>
                          </div>
                          <p>{message.content}</p>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>

              <form className="soc-composer" onSubmit={sendMessage}>
                <textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder={`Message #${activeChannel.name}`}
                  rows={1}
                  aria-label={`Message #${activeChannel.name}`}
                />
                <div className="soc-composer-foot">
                  <span>{draft.length ? `${draft.length}/2000` : "Enter to send · Shift+Enter for a new line"}</span>
                  <button type="submit" className="soc-send" disabled={!draft.trim() || sending} aria-label="Send message">
                    <Icon name="arrow-right" size={15} />
                  </button>
                </div>
              </form>
            </>
          ) : detailLoading ? (
            <div className="soc-empty soc-empty--small"><p>Loading server…</p></div>
          ) : activeServer ? (
            <div className="soc-empty soc-empty--small">
              <Icon name="comment" size={24} />
              <h1>No channel selected</h1>
              <p>Create a channel or choose one from the sidebar.</p>
              <button type="button" className="soc-button soc-button--primary" onClick={() => openChannelModal()}>
                Create channel
              </button>
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
            <button type="button" className="soc-icon-button" onClick={openMemberModal} aria-label="Add member">
              <Icon name="plus" size={14} />
            </button>
          </header>
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
                  >
                    <span className="soc-member-avatar">
                      <Avatar person={member} size={28} />
                      {member.id === user.id ? <i /> : null}
                    </span>
                    <span className="soc-member-copy">
                      <strong>{nameOf(member)}</strong>
                      <small>{member.isOwner ? "Owner" : member.isAdmin ? "Admin" : "Member"}</small>
                    </span>
                  </button>
                ))}
              </section>
            ))}
            {!detailLoading && detail && !detail.members.length ? (
              <div className="soc-side-empty">
                <p>No members yet.</p>
                <button type="button" className="soc-link-button" onClick={openMemberModal}>Add a real account</button>
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
            <p className="soc-help">You will be added as the owner. Starts with #welcome and #general.</p>
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
                  <small>{member.isOwner ? "Owner" : member.isAdmin ? "Admin" : "Member"}</small>
                </div>
                <button type="button" className="soc-button soc-button--small" onClick={() => void addMember(member)} disabled={busy}>
                  Add
                </button>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}

      {selectedMember ? (
        <div className="soc-profile-layer" role="presentation" onMouseDown={closeProfile}>
          <aside className="soc-profile-card" onMouseDown={(event) => event.stopPropagation()} aria-label={`${nameOf(selectedMember)} profile`}>
            <div className="soc-profile-banner" />
            <button type="button" className="soc-profile-close" onClick={closeProfile} aria-label="Close profile">
              <Icon name="x" size={15} />
            </button>
            <div className="soc-profile-content">
              <Avatar person={selectedMember} size={72} />
              <div className="soc-profile-name-row">
                <strong>{selectedName || "Unclaimed"}</strong>
                {selectedMember.alias ? <span>@{selectedMember.alias}</span> : <span>No alias claimed</span>}
              </div>
              <div className="soc-profile-tags">
                {selectedMember.isOwner ? <span className="soc-tag soc-tag--owner">OWNER</span> : null}
                {selectedMember.isAdmin ? <span className="soc-tag soc-tag--staff">ADMIN</span> : null}
                {selectedMember.premium ? <span className="soc-tag soc-tag--premium">PREMIUM</span> : null}
              </div>
              {profileLoading ? (
                <p className="soc-profile-bio is-muted">Loading profile…</p>
              ) : profileError ? (
                <p className="soc-profile-bio is-muted">{profileError}</p>
              ) : (
                <p className="soc-profile-bio">
                  {profileAbout?.bio?.trim() || "No bio on this profile yet."}
                </p>
              )}
              {profileBadges.length ? (
                <div className="soc-profile-badges">
                  {profileBadges.slice(0, 6).map((badge) => {
                    const art = BADGE_MAP.get(badge.id)?.art;
                    return art ? (
                      <img key={badge.id} src={art} alt={BADGE_MAP.get(badge.id)?.name ?? ""} title={BADGE_MAP.get(badge.id)?.name ?? ""} />
                    ) : null;
                  })}
                </div>
              ) : null}
              <div className="soc-profile-meta">
                <span>In this server since {joinedOf(selectedJoinedAt) || "—"}</span>
                <span>{selectedMember.alias ? `tourn.lol/${selectedMember.alias}` : "Alias not claimed"}</span>
              </div>
              <div className="soc-profile-actions">
                <a className="soc-button soc-button--primary" href={`#/profile/${encodeURIComponent(selectedHandle)}`}>
                  Open tourn page <Icon name="external" size={12} />
                </a>
                <button type="button" className="soc-button" onClick={closeProfile}>Close</button>
              </div>
            </div>
          </aside>
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
    avatarUrl: user.avatarUrl,
    premium: Boolean(user.premium),
    isAdmin: Boolean(user.isAdmin),
    isOwner: Boolean(user.isOwner),
    joinedAt: null,
  };
}
