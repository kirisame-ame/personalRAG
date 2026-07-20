import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Modal } from "../components/Modal";

type Message = { role: "user" | "assistant"; content: string };

const initialMessages: Message[] = [
  { role: "assistant", content: "Ask a question about me!" },
];
const chatStorageKey = "personal-rag-chat-messages";

export function ChatPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(chatStorageKey);
    if (!saved) return initialMessages;

    try {
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) return initialMessages;

      const validMessages = parsed.filter((message): message is Message =>
        Boolean(
          message &&
          typeof message === "object" &&
          ((message as Message).role === "user" ||
            (message as Message).role === "assistant") &&
          typeof (message as Message).content === "string",
        ),
      );

      return validMessages.length > 0 ? validMessages : initialMessages;
    } catch {
      return initialMessages;
    }
  });

  useEffect(() => {
    localStorage.setItem(chatStorageKey, JSON.stringify(messages));
  }, [messages]);

  const clearChat = () => {
    localStorage.removeItem(chatStorageKey);
    setMessages(initialMessages);
    setShowClearConfirmation(false);
  };
  const canSend = useMemo(
    () => query.trim().length > 0 && !isLoading,
    [query, isLoading],
  );
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
  const apiEndpoint = `${apiBaseUrl.replace(/\/$/, "")}/query`;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;
    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: "" },
    ]);
    setQuery("");
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      if (!response.ok) {
        throw new Error(
          (await response.text()) || `Request failed (${response.status})`,
        );
      }

      if (!response.body) {
        throw new Error("The server did not return a streaming response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamCompleted = false;
      let streamFailed = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        let chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        const errorMarker = "__RAG_STREAM_ERROR__:";
        const doneMarker = "__RAG_STREAM_DONE__";
        const errorIndex = chunk.indexOf(errorMarker);
        const doneIndex = chunk.indexOf(doneMarker);

        if (errorIndex !== -1) {
          streamFailed = true;
          chunk = "The model is currently busy. Please try again in a moment.";
          await reader.cancel();
        } else if (doneIndex !== -1) {
          streamCompleted = true;
          chunk = chunk.slice(0, doneIndex);
        }

        if (chunk) {
          setMessages((prev) => {
            const next = [...prev];
            const lastIndex = next.length - 1;
            next[lastIndex] = {
              ...next[lastIndex],
              content: streamFailed ? chunk : next[lastIndex].content + chunk,
            };
            return next;
          });
        }

        if (streamFailed || streamCompleted) break;
      }

      const finalChunk =
        streamCompleted || streamFailed ? "" : decoder.decode();
      if (finalChunk) {
        setMessages((prev) => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          next[lastIndex] = {
            ...next[lastIndex],
            content: next[lastIndex].content + finalChunk,
          };
          return next;
        });
      }

      if (!streamCompleted && !streamFailed) {
        throw new Error(
          "The response stream ended unexpectedly. Please try again.",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Network error, try again.";
      setMessages((prev) => {
        const next = [...prev];
        const lastIndex = next.length - 1;
        next[lastIndex] = {
          ...next[lastIndex],
          content: message,
        };
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <section
      className="relative my-3 flex min-h-0 flex-1 flex-col border border-[#aaa79e] bg-[rgba(246,244,239,.7)]"
      aria-label="Chat archive"
    >
      <div className="flex h-9 items-center justify-between border-b border-[#c3c0b7] px-4 font-mono text-[10px] tracking-[.08em] text-[#77756f]">
        <span>LIVE QUERY</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowClearConfirmation(true)}
            disabled={isLoading}
            className="cursor-pointer border-0 bg-transparent p-0 font-mono text-[10px] tracking-[.08em] text-[#ed542c] disabled:cursor-not-allowed disabled:opacity-40"
          >
            CLEAR CHAT
          </button>
          <span>{Math.floor((messages.length - 1) / 2)} EXCHANGES</span>
        </div>
      </div>
      <Modal
        open={showClearConfirmation}
        title="CLEAR CHAT?"
        confirmLabel="CLEAR CHAT"
        onConfirm={clearChat}
        onCancel={() => setShowClearConfirmation(false)}
      >
        <p className="m-0">
          This will remove your saved conversation from this browser.
        </p>
      </Modal>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-8">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className="mb-6 flex min-w-0 flex-col gap-1 sm:flex-row sm:gap-[18px]"
          >
            <span
              className={`shrink-0 font-mono text-[10px] ${message.role === "assistant" ? "text-[#ed542c]" : "text-[#1c59fd]"} sm:basis-[74px] sm:pt-1 sm:text-[12px]`}
            >
              {message.role === "assistant" ? "AI / SYSTEM" : "YOU / NOW"}
            </span>
            <div
              className={`max-w-full min-w-0 text-[15px] leading-[1.6] break-words ${message.role === "user" ? "font-mono text-[13px]" : ""}`}
            >
              {message.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              ) : (
                <p className="m-0">{message.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex min-h-[68px] shrink-0 border-t border-[#aaa79e]"
      >
        <label className="sr-only" htmlFor="query">
          Enter your query
        </label>
        <textarea
          id="query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleQueryKeyDown}
          placeholder="Type a question about the archive..."
          rows={1}
          className="min-w-0 flex-1 resize-none border-0 bg-transparent px-4 py-5 font-mono text-[13px] text-[#151515] outline-none placeholder:text-[#929087]"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="border-0 border-l border-[#aaa79e] bg-[#151515] px-5 font-mono text-[11px] text-[#eeece6] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-35 sm:px-8"
        >
          {isLoading ? "WORKING" : "SEND ↗"}
        </button>
      </form>
    </section>
  );
}
