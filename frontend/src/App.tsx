import { useState } from "react";
import { ChatPage } from "./pages/ChatPage";
import { PapersPage } from "./pages/PapersPage";
import { PublicationsPage } from "./pages/PublicationsPage";

export type Page = "chat" | "papers" | "publications";

const pages: { id: Page; label: string; icon: string }[] = [
  { id: "chat", label: "Chat", icon: "↗" },
  { id: "papers", label: "Papers", icon: "◫" },
  { id: "publications", label: "Publications", icon: "↗" },
];

function App() {
  const [page, setPage] = useState<Page>("chat");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pageNumber = String(
    pages.findIndex((item) => item.id === page) + 1,
  ).padStart(3, "0");

  const handlePageChange = (nextPage: Page) => {
    setPage(nextPage);
    setMobileMenuOpen(false);
  };

  return (
    <div className="relative flex h-svh flex-col overflow-hidden bg-[#eeece6] text-[#151515] before:pointer-events-none before:fixed before:inset-0 before:[background-image:linear-gradient(rgba(20,20,20,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,.045)_1px,transparent_1px)] before:[background-size:64px_64px] before:opacity-40">
      <header className="relative z-10 shrink-0 border-b border-[#aaa79e] bg-[rgba(238,236,230,.88)]">
        <div className="relative mx-auto flex min-h-16 w-full items-center justify-between px-4 sm:max-w-[1440px] sm:px-6">
          <button
            className="cursor-pointer border-0 bg-transparent p-0 font-mono text-xs font-semibold tracking-[.08em]"
            onClick={() => handlePageChange("chat")}
            aria-label="Go to home"
          >
            WILLIAM ANDRIAN<span className="mx-[3px] text-[#ed542c]">/</span>
            ARCHIVE
          </button>
          <nav
            className="hidden gap-5 sm:flex sm:gap-7"
            aria-label="Primary navigation"
          >
            {pages.map((item) => (
              <button
                key={item.id}
                className={`cursor-pointer border-0 bg-transparent font-mono text-xs ${page === item.id ? "text-[#151515]" : "text-[#55534e]"}`}
                onClick={() => handlePageChange(item.id)}
              >
                <span className="inline-flex items-baseline underline decoration-1 underline-offset-4">
                  {item.label}
                  <span className="ml-1 text-[#ed542c]">{item.icon}</span>
                </span>
              </button>
            ))}
          </nav>
          <button
            type="button"
            className="flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-1 border-0 bg-transparent sm:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
          >
            <span className="block h-px w-5 bg-[#151515]" />
            <span className="block h-px w-5 bg-[#151515]" />
            <span className="block h-px w-5 bg-[#151515]" />
          </button>
          {mobileMenuOpen && (
            <nav
              className="absolute top-full right-0 flex min-w-44 flex-col border border-[#aaa79e] bg-[#eeece6] shadow-[0_12px_24px_rgba(21,21,21,.08)] sm:hidden"
              aria-label="Mobile navigation"
            >
              {pages.map((item) => (
                <button
                  key={item.id}
                  className={`flex cursor-pointer items-center justify-between border-0 border-b border-[#c3c0b7] bg-transparent px-4 py-3 text-left font-mono text-xs last:border-b-0 ${page === item.id ? "text-[#151515]" : "text-[#55534e]"}`}
                  onClick={() => handlePageChange(item.id)}
                >
                  {item.label}
                  <span className="text-[#ed542c]">{item.icon}</span>
                </button>
              ))}
            </nav>
          )}
          <div className="hidden font-mono text-[10px] tracking-[.04em] text-[#77756f] sm:block">
            <i className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#ed542c]" />
            ONLINE / PERSONAL RAG
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col pt-3 sm:pt-4">
        <div
          className={`mx-auto flex min-h-0 w-full flex-1 flex-col px-4 sm:px-6 ${page === "chat" ? "max-w-[1440px]" : "max-w-[1040px]"}`}
        >
          <div className="shrink-0 border-b border-[#bbb8ae] pb-3 font-mono text-[10px] tracking-[.12em] text-[#77756f]">
            <span className="text-[#ed542c]">{pageNumber}</span> /{" "}
            {page.toUpperCase()}
          </div>
          {page === "chat" && <ChatPage />}
          {page === "papers" && <PapersPage />}
          {page === "publications" && <PublicationsPage />}
        </div>
      </main>

      <footer className="relative z-10 grid shrink-0 grid-cols-3 border-t border-[#aaa79e] px-5 py-3 font-mono text-[8px] tracking-[.06em] text-[#77756f] sm:px-[5vw] sm:text-[10px]">
        <span>© 2026 William Andrian</span>
        <span className="hidden text-center sm:inline">Archive</span>
        <span className="text-right">↑</span>
      </footer>
    </div>
  );
}

export default App;
