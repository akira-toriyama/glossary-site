import { useEffect, useMemo, useRef, useState } from "react";
import { Command } from "cmdk";
import type { Entry, Glossary } from "./types";
import { renderMarkdown } from "./markdown";

export default function App() {
  const [glossary, setGlossary] = useState<Glossary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string>("");
  const [query, setQuery] = useState("");
  const previewRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch("./glossary.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((g: Glossary) => {
        setGlossary(g);
        if (g.entries.length) setHighlighted(g.entries[0].term);
      })
      .catch((e) => setError(String(e)));
  }, []);

  // cmdk filter: match search against item value (= term) + keywords + body
  // (body lives in closure rather than keywords to keep keyword strings short)
  const filter = useMemo(() => {
    const bodyByTerm = new Map<string, string>();
    if (glossary) {
      for (const e of glossary.entries) {
        bodyByTerm.set(e.term, e.body);
      }
    }
    return (value: string, search: string, keywords?: string[]): number => {
      const ss = search.toLowerCase().replace(/[`*]/g, "").trim();
      if (!ss) return 1;
      const hay = (
        value +
        " " +
        (keywords || []).join(" ") +
        " " +
        (bodyByTerm.get(value) || "")
      )
        .toLowerCase()
        .replace(/[`*]/g, "");
      const tokens = ss.split(/\s+/).filter(Boolean);
      for (const t of tokens) {
        if (!hay.includes(t)) return 0;
      }
      return 1;
    };
  }, [glossary]);

  // Wikilink click delegation in the preview pane
  useEffect(() => {
    const el = previewRef.current;
    if (!el || !glossary) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.classList.contains("wikilink")) {
        const term = t.getAttribute("data-term");
        if (term) {
          const match = glossary.entries.find((en) => en.term === term);
          if (match) {
            e.preventDefault();
            setHighlighted(match.term);
            el.scrollTo({ top: 0, behavior: "smooth" });
          }
        }
      }
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [glossary]);

  // ⌘K / Ctrl-K refocuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>("[cmdk-input]");
        input?.focus();
        input?.select();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (error) return <div className="state">エラー: {error}</div>;
  if (!glossary) return <div className="state">Loading…</div>;

  const current =
    glossary.entries.find((e) => e.term === highlighted) ?? glossary.entries[0];

  return (
    <div className="app">
      <header className="head">
        <div className="title-wrap">
          <h1>{glossary.title}</h1>
          <a
            className="repo"
            href={`https://github.com/akira-toriyama/${glossary.repo}`}
            target="_blank"
            rel="noopener"
          >
            akira-toriyama/{glossary.repo} ↗
          </a>
        </div>
        <div className="stats">
          <span className="stat-chip">{glossary.entries.length} entries</span>
          <span className="stat-chip">{glossary.sections.length} sections</span>
          {glossary.diagrams.length > 0 && (
            <span className="stat-chip">{glossary.diagrams.length} diagrams</span>
          )}
        </div>
      </header>
      <div className="layout">
        <aside className="sidebar">
          <Command
            label="用語集"
            filter={filter}
            value={highlighted}
            onValueChange={setHighlighted}
          >
            <div className="cmdk-input-wrap">
              <SearchIcon />
              <Command.Input
                autoFocus
                placeholder="用語・本文・同義語を検索…"
                value={query}
                onValueChange={setQuery}
              />
              <kbd className="kbd">⌘K</kbd>
            </div>
            <Command.List>
              <Command.Empty>該当なし</Command.Empty>
              {glossary.sections.map((section) => {
                const items = glossary.entries.filter((e) => e.section === section);
                if (!items.length) return null;
                return (
                  <Command.Group key={section} heading={section}>
                    {items.map((e) => (
                      <Command.Item
                        key={e.term}
                        value={e.term}
                        keywords={[...e.aliases, e.section]}
                      >
                        <span className="item-term">{e.term}</span>
                        {e.aliases.length > 0 && (
                          <span className="item-aliases">
                            {e.aliases.slice(0, 3).join(" · ")}
                            {e.aliases.length > 3 && " …"}
                          </span>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              })}
            </Command.List>
          </Command>
        </aside>
        <main className="preview" ref={previewRef}>
          {current && <EntryView entry={current} repo={glossary.repo} />}
          {glossary.diagrams.length > 0 && (
            <section className="diagrams">
              <h3>図</h3>
              {glossary.diagrams.map((d) => (
                <figure key={d.id} className="diagram">
                  <figcaption>{d.sectionLabel}</figcaption>
                  <div
                    className="diagram-svg"
                    dangerouslySetInnerHTML={{ __html: d.svg }}
                  />
                </figure>
              ))}
            </section>
          )}
        </main>
      </div>
      <footer className="foot">
        <div className="foot-left">
          <a href={glossary.sourceUrl} target="_blank" rel="noopener">
            source: docs/glossary.md ↗
          </a>
          <span className="sep">·</span>
          <span title={glossary.generatedAt}>
            generated {new Date(glossary.generatedAt).toLocaleString("ja-JP")}
          </span>
        </div>
        <div className="foot-right">
          <kbd className="kbd">↑↓</kbd>
          <span>選択</span>
          <kbd className="kbd">Esc</kbd>
          <span>クリア</span>
        </div>
      </footer>
    </div>
  );
}

function EntryView({ entry, repo }: { entry: Entry; repo: string }) {
  const html = useMemo(() => renderMarkdown(entry.body, repo), [entry.body, repo]);
  const dcHtml = useMemo(
    () => renderMarkdown(entry.dontcall, repo),
    [entry.dontcall, repo]
  );
  return (
    <article className="entry">
      <div className="entry-section">{entry.section}</div>
      <h2 id={entry.anchor}>{entry.term}</h2>
      <div className="body" dangerouslySetInnerHTML={{ __html: html }} />
      {entry.dontcall && (
        <div className="dontcall">
          <span className="dontcall-label">
            <WarnIcon /> Don't call it
          </span>
          <span
            className="dontcall-body"
            dangerouslySetInnerHTML={{ __html: stripWrappingP(dcHtml) }}
          />
        </div>
      )}
    </article>
  );
}

function SearchIcon() {
  return (
    <svg
      className="cmdk-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11.5 11.5L14 14M7 13A6 6 0 1 1 7 1a6 6 0 0 1 0 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg
      className="warn-icon"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 1L15 14H1L8 1Z M8 6V9 M8 11V11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function stripWrappingP(s: string): string {
  return s.replace(/^<p>/, "").replace(/<\/p>$/, "");
}
