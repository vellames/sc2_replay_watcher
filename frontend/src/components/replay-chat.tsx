"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Clock3, HeartHandshake, LoaderCircle, Maximize2, MessageCircle, Minimize2, Send, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useI18n } from "@/components/i18n";
import type { WinProbabilitySeries } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8010";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  snapshotTime?: number;
};

function formatTime(seconds: number) {
  const value = Math.max(0, Math.round(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export function ReplayChat({ analysisId, currentTime, probabilityStatus }: { analysisId: string; currentTime: number; probabilityStatus: WinProbabilitySeries["status"] }) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelName, setModelName] = useState("DeepSeek V4 Flash");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/chat/config`, { signal: controller.signal })
      .then(async (response) => response.ok ? await response.json() as { modelName?: string } : null)
      .then((config) => {
        if (config?.modelName) setModelName(config.modelName);
      })
      .catch((configError) => {
        if (!(configError instanceof DOMException && configError.name === "AbortError")) return;
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || loading || probabilityStatus !== "ready") return;
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/replays/${encodeURIComponent(analysisId)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time: currentTime,
          locale,
          messages: nextMessages.slice(-12).map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        }),
      });
      const payload = await response.json() as { message?: string; modelName?: string; snapshotTime?: number; detail?: string };
      if (!response.ok || !payload.message) {
        throw new Error(response.status === 503 ? t("chat.notConfigured") : payload.detail || t("chat.error"));
      }
      setMessages((current) => [...current, {
        role: "assistant",
        content: payload.message as string,
        snapshotTime: payload.snapshotTime,
      }]);
      if (payload.modelName) setModelName(payload.modelName);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("chat.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`replay-chat ${open ? "open" : ""} ${expanded ? "expanded" : ""}`}>
      {open && (
        <section className="replay-chat-panel" role="dialog" aria-label={t("chat.title")} onWheel={(event) => event.stopPropagation()}>
          <header>
            <span><Bot size={17} /><i /></span>
            <div><small>{t("chat.eyebrow")}</small><strong>{t("chat.title")}</strong></div>
            <button type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? t("chat.collapse") : t("chat.expand")} aria-pressed={expanded}>{expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
            <button type="button" onClick={() => setOpen(false)} aria-label={t("chat.close")}><X size={15} /></button>
          </header>
          <div className="replay-chat-context">
            <span><Clock3 size={11} />{t("chat.anchor", { time: formatTime(currentTime) })}</span>
            <span className="replay-chat-model"><Bot size={11} />{t("chat.model", { model: modelName })}</span>
            <small>{t("chat.omniscient")}</small>
          </div>
          <div className="replay-chat-messages" aria-live="polite">
            {messages.length === 0 && (
              <div className="replay-chat-welcome">
                <Sparkles size={18} />
                <strong>{t("chat.welcome")}</strong>
                <p>{t("chat.suggestions")}</p>
              </div>
            )}
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={message.role}>
                <small>{message.role === "assistant" ? t("chat.analyst") : t("chat.you")}{message.snapshotTime != null ? ` · ${formatTime(message.snapshotTime)}` : ""}</small>
                {message.role === "assistant"
                  ? <div className="replay-chat-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div>
                  : <p>{message.content}</p>}
              </article>
            ))}
            {loading && <article className="assistant loading"><small>{t("chat.analyst")}</small><p><i /><i /><i /></p></article>}
            {error && <div className="replay-chat-error"><AlertTriangle size={12} />{error}</div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={submit}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                  return;
                }
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              maxLength={2000}
              rows={2}
              placeholder={t("chat.placeholder")}
              aria-label={t("chat.placeholder")}
            />
            <button type="submit" disabled={!draft.trim() || loading} aria-label={t("chat.send")}><Send size={14} /></button>
          </form>
          <footer>
            <span><HeartHandshake size={10} />{t("chat.sponsorDisclaimer")}</span>
            <span><AlertTriangle size={10} />{t("chat.privacy")}</span>
          </footer>
        </section>
      )}
      <button
        className="replay-chat-trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={!open && probabilityStatus !== "ready"}
        aria-expanded={open}
        aria-label={probabilityStatus === "loading" ? t("chat.loadingProbabilities") : probabilityStatus === "unavailable" ? t("chat.probabilitiesUnavailable") : t("chat.open")}
      >
        {open ? <X size={18} /> : probabilityStatus === "loading" ? <LoaderCircle className="replay-chat-trigger-spinner" size={18} /> : <MessageCircle size={18} />}
        {!open && <span>{probabilityStatus === "loading" ? t("chat.loadingProbabilities") : probabilityStatus === "unavailable" ? t("chat.probabilitiesUnavailable") : t("chat.ask")}</span>}
      </button>
    </div>
  );
}
