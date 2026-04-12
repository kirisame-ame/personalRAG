import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type QueryResponse = {
  answer: string;
};

const isQueryResponse = (value: unknown): value is QueryResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }
  return typeof (value as { answer?: unknown }).answer === "string";
};

function App() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Ask a question about me!",
    },
  ]);

  const canSend = useMemo(
    () => query.trim().length > 0 && !isLoading,
    [query, isLoading],
  );
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
  const apiEndpoint = apiBaseUrl.endsWith("/")
    ? `${apiBaseUrl}query`
    : `${apiBaseUrl}/query`;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isLoading) {
      return;
    }
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuery("");
    const payload = { query: trimmed };
    let reply = "Error getting response";

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        reply = message || `Request failed (${response.status})`;
      } else {
        const result: unknown = await response.json();
        reply = isQueryResponse(result) ? result.answer : "Unexpected response";
      }
    } catch (error) {
      reply =
        error instanceof Error ? error.message : "Network error, try again.";
    } finally {
      setIsLoading(false);
    }

    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
  };

  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-8 sm:px-6">
        <header className="mb-8">
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
            Kirisame's Chatbot
          </h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            RAG chatbot from my files
          </p>
        </header>

        <section className="flex-1 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/75 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
          <div className="h-full max-h-[55vh] overflow-y-auto px-5 py-6 sm:px-8">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`message-bubble ${
                    message.role === "user"
                      ? "message-user"
                      : "message-assistant"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-sm leading-relaxed sm:text-base">
                      {message.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-3 sm:flex-row"
        >
          <div className="flex-1">
            <label className="sr-only" htmlFor="query">
              Enter your query
            </label>
            <textarea
              id="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type your question here..."
              rows={2}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-slate-300 focus:ring-2 focus:ring-amber-200 sm:text-base"
            />
          </div>
          <button
            type="submit"
            disabled={!canSend}
            className="h-18 rounded-2xl bg-slate-900 px-6 text-sm font-medium text-white shadow-lg shadow-slate-900/25 transition enabled:hover:-translate-y-0.5 enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
