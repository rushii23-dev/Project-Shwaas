import { useEffect, useId, useRef, useState } from "react";
import { Send, Square } from "lucide-react";
import { askAssistant, type ChatMessage, MAX_QUESTION_CHARS } from "../lib/ai/assistant";
import { AiUnavailableError } from "../lib/ai/gemini";
import type { MessageKey } from "../lib/i18n";
import type { DayInsights } from "../lib/insights";
import type { AirSnapshot, Profile } from "../lib/types";
import { useApp } from "../state/AppState";

/**
 * Streaming Q&A grounded in today's forecast and the household profile.
 * Loaded lazily: nobody pays for it until they open it.
 */
export default function ChatPanel({ snap, ins, profile }: { snap: AirSnapshot; ins: DayInsights; profile: Profile }) {
  const { t, lang } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const partial = useRef("");
  const inputId = useId();

  useEffect(() => () => ctrl.current?.abort(), []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, streaming]);

  async function ask(question: string) {
    const q = question.trim().slice(0, MAX_QUESTION_CHARS);
    if (!q || streaming !== null) return;
    const history: ChatMessage[] = [...messages, { role: "user", text: q }];
    setMessages(history);
    setDraft("");
    setError(null);
    setStreaming("");
    const c = new AbortController();
    ctrl.current = c;
    partial.current = "";
    const onText = (full: string) => {
      partial.current = full;
      setStreaming(full);
    };
    try {
      const answer = await askAssistant({ snap, ins, profile, lang, messages: history, signal: c.signal, onText });
      setMessages([...history, { role: "model", text: answer }]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Stopped by the user: keep whatever had arrived.
        if (partial.current) setMessages([...history, { role: "model", text: partial.current }]);
      } else {
        setError(`chat.error.${err instanceof AiUnavailableError ? err.reason : "network"}` as MessageKey);
      }
    } finally {
      setStreaming(null);
    }
  }

  const suggestions: MessageKey[] = ["chat.s1", "chat.s2", "chat.s3"];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div role="log" aria-live="polite" aria-busy={streaming !== null} aria-label={t("chat.title")} className="grid gap-4">
          {messages.length === 0 && (
            <div>
              <p className="text-ink-2">{t("chat.intro")}</p>
              <ul className="mt-4 grid gap-2">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      className="w-full rounded-2xl border border-line bg-paper-2 px-4 py-3 text-left hover:border-ink-2"
                      onClick={() => void ask(t(s))}
                    >
                      {t(s)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {messages.map((m, i) => (
            <Bubble key={i} who={m.role === "user" ? t("chat.you") : t("chat.bot")} mine={m.role === "user"} text={m.text} />
          ))}
          {streaming !== null && <Bubble who={t("chat.bot")} mine={false} text={streaming || t("chat.thinking")} />}
          {error && (
            <p role="alert" className="rounded-2xl bg-paper-2 px-4 py-3 text-warn">
              {t(error)}
            </p>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form
        className="border-t border-line p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          {t("chat.label")}
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id={inputId}
            rows={2}
            maxLength={MAX_QUESTION_CHARS}
            className="field min-h-12 flex-1 resize-none"
            placeholder={t("chat.placeholder")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void ask(draft);
              }
            }}
          />
          {streaming !== null ? (
            <button
              type="button"
              className="btn btn-quiet size-12 p-0"
              onClick={() => ctrl.current?.abort()}
              aria-label={t("chat.stop")}
            >
              <Square aria-hidden="true" size={18} />
            </button>
          ) : (
            <button type="submit" className="btn btn-primary size-12 p-0" disabled={!draft.trim()} aria-label={t("chat.send")}>
              <Send aria-hidden="true" size={18} />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-2">{t("chat.disclaimer")}</p>
      </form>
    </div>
  );
}

function Bubble({ who, mine, text }: { who: string; mine: boolean; text: string }) {
  return (
    <div className={mine ? "ml-10 justify-self-end" : "mr-6"}>
      <p className="mb-1 text-xs font-semibold text-ink-2">{who}</p>
      <div className={`rounded-2xl px-4 py-3 ${mine ? "bg-accent text-accent-ink" : "bg-paper-2"}`}>
        <RichText text={text} />
      </div>
    </div>
  );
}

/** Minimal, safe formatting: paragraphs and "- " bullets as React text nodes. Never HTML. */
export function RichText({ text }: { text: string }) {
  const blocks: { list: boolean; lines: string[] }[] = [];
  for (const raw of text.replace(/\*\*(.+?)\*\*/g, "$1").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = /^[-*•]\s+/.test(line);
    const content = line.replace(/^[-*•]\s+/, "");
    const last = blocks[blocks.length - 1];
    if (bullet && last?.list) last.lines.push(content);
    else blocks.push({ list: bullet, lines: [content] });
  }
  return (
    <div className="grid gap-2">
      {blocks.map((b, i) =>
        b.list ? (
          <ul key={i} className="grid list-disc gap-1 pl-5">
            {b.lines.map((l, j) => (
              <li key={j}>{l}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.lines[0]}</p>
        ),
      )}
    </div>
  );
}
