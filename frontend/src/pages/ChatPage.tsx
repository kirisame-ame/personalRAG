import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; content: string };
type QueryResponse = { answer: string };

const isQueryResponse = (value: unknown): value is QueryResponse =>
  Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as QueryResponse).answer === "string",
  );

export function ChatPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ask a question about me!" },
  ]);
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
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuery("");
    let reply = "Error getting response";
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const result: unknown = response.ok
        ? await response.json()
        : await response.text();
      reply =
        response.ok && isQueryResponse(result)
          ? result.answer
          : String(result || `Request failed (${response.status})`);
    } catch (error) {
      reply =
        error instanceof Error ? error.message : "Network error, try again.";
    } finally {
      setIsLoading(false);
    }
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
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
      className="my-3 flex min-h-0 flex-1 flex-col border border-[#aaa79e] bg-[rgba(246,244,239,.7)]"
      aria-label="Chat archive"
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#c3c0b7] px-4 font-mono text-[10px] tracking-[.08em] text-[#77756f]">
        <span>LIVE QUERY</span>
        <span>{messages.length - 1} EXCHANGES</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className="mb-6 flex gap-3 sm:gap-[18px]"
          >
            <span
              className={`shrink-0 basis-[62px] pt-1 font-mono text-[10px] ${message.role === "assistant" ? "text-[#ed542c]" : "text-[#1c59fd]"} sm:basis-[74px] sm:text-[12px]`}
            >
              {message.role === "assistant" ? "AI / SYSTEM" : "YOU / NOW"}
            </span>
            <div
              className={`max-w-3xl text-[15px] leading-[1.6] ${message.role === "user" ? "font-mono text-[13px]" : ""}`}
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
