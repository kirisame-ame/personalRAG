import { useCallback, useEffect, useState } from "react";
import { Modal } from "../components/Modal";

type Source = { source_file: string; file_hash: string };
type AdminTab = "documents" | "papers" | "publications";

export function AdminPage() {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
    /\/$/,
    "",
  );
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [files, setFiles] = useState<Source[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("documents");
  const [fileToRemove, setFileToRemove] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/ingest/files`, {
      credentials: "include",
    });
    if (!response.ok) return;
    const data = (await response.json()) as { items: Source[] };
    setFiles(data.items);
  }, [apiBaseUrl]);

  useEffect(() => {
    void fetch(`${apiBaseUrl}/admin/session`, { credentials: "include" })
      .then((response) => {
        if (response.ok) {
          setAuthenticated(true);
          void loadFiles();
        }
      })
      .catch(() => undefined);
  }, [apiBaseUrl, loadFiles]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch(`${apiBaseUrl}/admin/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      setMessage("Invalid credentials.");
      return;
    }
    setAuthenticated(true);
    setPassword("");
    setMessage("");
    void loadFiles();
  };

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFiles?.length) return;
    const formData = new FormData();
    Array.from(selectedFiles).forEach((file) => formData.append("files", file));
    const response = await fetch(`${apiBaseUrl}/ingest/`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    setMessage(response.ok ? "Documents indexed." : await response.text());
    if (response.ok) {
      setSelectedFiles(null);
      void loadFiles();
    }
  };

  const remove = async (sourceFile: string) => {
    const response = await fetch(
      `${apiBaseUrl}/ingest/source/${encodeURIComponent(sourceFile)}?remove_file=true`,
      { method: "DELETE", credentials: "include" },
    );
    setMessage(response.ok ? `${sourceFile} removed.` : await response.text());
    setFileToRemove(null);
    if (response.ok) void loadFiles();
  };

  if (!authenticated) {
    return (
      <section className="max-w-md py-12 sm:py-20">
        <p className="mb-3 font-mono text-[11px] tracking-[.14em] text-[#ed542c]">
          ADMIN / ACCESS
        </p>
        <h1 className="text-5xl leading-none font-medium tracking-[-.06em]">
          Manage <em className="font-serif font-normal">archive.</em>
        </h1>
        <form onSubmit={login} className="mt-10 flex flex-col gap-3">
          <input
            className="border border-[#aaa79e] bg-transparent p-3 font-mono text-xs"
            placeholder="USERNAME"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <input
            className="border border-[#aaa79e] bg-transparent p-3 font-mono text-xs"
            placeholder="PASSWORD"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button className="cursor-pointer bg-[#151515] p-3 font-mono text-xs text-[#eeece6] hover:bg-[#ed542c]">
            SIGN IN ↗
          </button>
        </form>
        {message && <p className="mt-4 text-sm text-[#ed542c]">{message}</p>}
      </section>
    );
  }

  return (
    <section className="max-w-3xl py-12 sm:py-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-3 font-mono text-[11px] tracking-[.14em] text-[#ed542c]">
            ADMIN / ARCHIVE
          </p>
          <h1 className="text-5xl leading-none font-medium tracking-[-.06em]">
            Manage <em className="font-serif font-normal">documents.</em>
          </h1>
        </div>
        <button
          onClick={() =>
            void fetch(`${apiBaseUrl}/admin/logout`, {
              method: "POST",
              credentials: "include",
            }).then(() => setAuthenticated(false))
          }
          className="font-mono text-[10px] underline hover:text-[#ed542c]"
        >
          SIGN OUT
        </button>
      </div>
      <div className="mt-10 flex gap-5 border-b border-[#aaa79e] font-mono text-xs">
        {(["documents", "papers", "publications"] as AdminTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`border-0 bg-transparent px-0 pb-3 capitalize ${activeTab === tab ? "text-[#ed542c] underline underline-offset-4" : "text-[#68665f]"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      {activeTab === "documents" ? (
        <>
          <form
            onSubmit={upload}
            className="flex flex-wrap items-center gap-3 border-b border-[#aaa79e] py-5"
          >
            <label className="cursor-pointer bg-[#151515] px-4 py-3 font-mono text-xs text-[#eeece6]">
              SELECT DOCUMENT
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                onChange={(event) => setSelectedFiles(event.target.files)}
                className="sr-only"
              />
            </label>
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-[#68665f]">
              {selectedFiles?.length
                ? Array.from(selectedFiles)
                    .map((file) => file.name)
                    .join(", ")
                : "No document selected"}
            </span>
            <button
              disabled={!selectedFiles?.length}
              className="bg-[#151515] px-4 py-3 font-mono text-xs text-[#eeece6] disabled:cursor-not-allowed disabled:opacity-35"
            >
              UPLOAD ↗
            </button>
          </form>
          {message && <p className="mt-4 text-sm text-[#ed542c]">{message}</p>}
          <div className="mt-8 divide-y divide-[#c3c0b7] border-y border-[#aaa79e]">
            {files.map((file) => (
              <div
                key={file.file_hash}
                className="flex items-center justify-between gap-4 py-4 font-mono text-xs"
              >
                <span className="min-w-0 break-words">{file.source_file}</span>
                <button
                  onClick={() => setFileToRemove(file.source_file)}
                  className="shrink-0 cursor-pointer text-[#ed542c] underline"
                >
                  REMOVE
                </button>
              </div>
            ))}
            {!files.length && (
              <p className="py-4 text-sm text-[#68665f]">
                No indexed documents.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="border-b border-[#aaa79e] py-8 text-sm leading-6 text-[#68665f]">
          Management for {activeTab} will be added here.
        </div>
      )}
      <Modal
        open={fileToRemove !== null}
        title="REMOVE DOCUMENT?"
        confirmLabel="REMOVE"
        onConfirm={() => {
          if (fileToRemove) void remove(fileToRemove);
        }}
        onCancel={() => setFileToRemove(null)}
      >
        <p className="m-0">
          Remove <strong>{fileToRemove}</strong> from the indexed archive and
          stored files?
        </p>
      </Modal>
    </section>
  );
}
