/* ---------------------------------------------------------------------------
   Support — one ticket per account.

   The account only ever has a single open thread, so this page is either the
   composer that opens it or the conversation with it. Team accounts get an
   inbox alongside, because they answer other people's threads, not their own.
   --------------------------------------------------------------------------- */

import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/backend";
import { useDash } from "../context";
import { Button, Card, CardHead, EmptyState, Field, Icon, TextInput, Textarea } from "../ui";

type Message = { id: string; role: "user" | "admin"; body: string; createdAt: string };

type Ticket = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  account?: string;
  email?: string;
};

type InboxItem = {
  id: string;
  subject: string;
  account: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string | null;
  userMessages: number;
};

const when = (value: string) =>
  new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function Thread({ messages }: { messages: Message[] }) {
  if (!messages.length) return null;
  return (
    <div className="tw-support-thread">
      {messages.map((message) => (
        <div key={message.id} className={`tw-support-message is-${message.role}`}>
          <div className="tw-support-meta">
            <b>{message.role === "admin" ? "Support" : "You"}</b>
            <span>{when(message.createdAt)}</span>
          </div>
          <p>{message.body}</p>
        </div>
      ))}
    </div>
  );
}

export function SupportPage() {
  const { user, isAdmin, notify } = useDash();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [subject, setSubject] = useState("");
  const [draft, setDraft] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"mine" | "inbox">("mine");
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const loadThread = useCallback(async () => {
    const result = await api<{ ticket: Ticket | null; messages: Message[] }>("/api/support/thread");
    if (result.ok) {
      setTicket(result.data.ticket);
      setMessages(result.data.messages ?? []);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  const loadInbox = useCallback(async () => {
    const result = await api<{ tickets: InboxItem[] }>("/api/support/inbox");
    if (result.ok) {
      setInbox(result.data.tickets ?? []);
      setError(null);
    } else {
      setError(result.error);
    }
  }, []);

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (isAdmin && mode === "inbox") void loadInbox();
  }, [isAdmin, mode, loadInbox]);

  const openTicket = async () => {
    setBusy(true);
    setError(null);
    const result = await api<{ ticket: Ticket; messages: Message[] }>("/api/support/tickets", {
      method: "POST",
      body: JSON.stringify({ subject, message: body }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTicket(result.data.ticket);
    setMessages(result.data.messages ?? []);
    setSubject("");
    setBody("");
    notify("Ticket opened", "We have it. Replies appear here.");
  };

  const send = async () => {
    if (!ticket || !draft.trim()) return;
    setBusy(true);
    setError(null);
    const result = await api<{ messages: Message[] }>(`/api/support/tickets/${ticket.id}/messages`, {
      method: "POST",
      body: JSON.stringify({ body: draft }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessages(result.data.messages ?? []);
    setDraft("");
  };

  const close = async () => {
    if (!ticket) return;
    setBusy(true);
    const result = await api(`/api/support/tickets/${ticket.id}/close`, { method: "POST" });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTicket(null);
    setMessages([]);
    notify("Ticket closed", "Open a new one whenever you need us.");
  };

  const openInboxTicket = async (id: string) => {
    setOpenId(id);
    const result = await api<{ ticket: Ticket; messages: Message[] }>(`/api/support/inbox/${id}`);
    if (result.ok) {
      setTicket(result.data.ticket);
      setMessages(result.data.messages ?? []);
      setDraft("");
    } else {
      setError(result.error);
    }
  };

  const reply = async () => {
    if (!ticket || !draft.trim()) return;
    setBusy(true);
    const result = await api<{ messages: Message[] }>(`/api/support/inbox/${ticket.id}/reply`, {
      method: "POST",
      body: JSON.stringify({ body: draft }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessages(result.data.messages ?? []);
    setDraft("");
  };

  const closeAsTeam = async () => {
    if (!ticket) return;
    setBusy(true);
    const result = await api(`/api/support/inbox/${ticket.id}/close`, { method: "POST" });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTicket(null);
    setMessages([]);
    setOpenId(null);
    void loadInbox();
  };

  if (mode === "inbox" && isAdmin) {
    return (
      <>
        <Card>
          <CardHead
            icon="help"
            title="Support inbox"
            subtitle="Every open ticket, most recently active first."
            actions={
              <Button icon="arrow-right" onClick={() => setMode("mine")}>
                My ticket
              </Button>
            }
          />
          {error ? <p className="tw-support-error">{error}</p> : null}
          {inbox.length ? (
            <div className="tw-support-inbox">
              {inbox.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`tw-support-inbox-row${openId === item.id ? " is-open" : ""}`}
                  onClick={() => void openInboxTicket(item.id)}
                >
                  <b>{item.subject}</b>
                  <small>
                    @{item.account} · {item.userMessages} message{item.userMessages === 1 ? "" : "s"} · {when(item.updatedAt)}
                  </small>
                  {item.lastMessage ? <span>{item.lastMessage}</span> : null}
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon="check" title="Nothing waiting" message="No open tickets right now." />
          )}
        </Card>

        {ticket ? (
          <Card>
            <CardHead
              icon="comment"
              title={ticket.subject}
              subtitle={`@${ticket.account ?? "account"} · ${ticket.email ?? ""}`}
              actions={
                <Button icon="x" onClick={() => void closeAsTeam()}>
                  Close ticket
                </Button>
              }
            />
            <Thread messages={messages} />
            <div className="tw-support-composer">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Reply to this account…"
                rows={3}
              />
              <Button variant="primary" icon="arrow-right" disabled={busy || !draft.trim()} onClick={() => void reply()}>
                {busy ? "Sending…" : "Send reply"}
              </Button>
            </div>
          </Card>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHead
          actions={
            isAdmin ? (
              <Button icon="layers" onClick={() => setMode("inbox")}>
                Inbox
              </Button>
            ) : null
          }
          icon="help"
          title={ticket ? ticket.subject : "Open a ticket"}
          subtitle={
            ticket
              ? "One thread at a time — replies from the team show up here and in your email."
              : "One ticket at a time. Tell us what broke, and every message is mirrored to the team's channel."
          }
        />
        {error ? <p className="tw-support-error">{error}</p> : null}

        {loading ? (
          <p className="tw-foot-note">Loading your ticket…</p>
        ) : ticket ? (
          <>
            <Thread messages={messages} />
            <div className="tw-support-composer">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add to this ticket…"
                rows={3}
              />
              <div className="tw-support-actions">
                <Button variant="primary" icon="arrow-right" disabled={busy || !draft.trim()} onClick={() => void send()}>
                  {busy ? "Sending…" : "Send message"}
                </Button>
                <Button icon="x" onClick={() => void close()}>
                  Close ticket
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="tw-support-form">
            <Field label="Subject">
              <TextInput
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Something broke on my profile"
              />
            </Field>
            <Field label="What happened" hint="Steps, the page, and anything you already tried.">
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Describe it here…"
                rows={5}
              />
            </Field>
            <Button
              variant="primary"
              icon="arrow-right"
              disabled={busy || subject.trim().length < 3 || body.trim().length < 3}
              onClick={() => void openTicket()}
            >
              {busy ? "Opening…" : "Open ticket"}
            </Button>
          </div>
        )}
      </Card>

      <p className="tw-foot-note">
        Signed in as @{user.alias || user.username}. A ticket is answered in this thread — keep it open until it is
        resolved, then close it.
      </p>
    </>
  );
}
