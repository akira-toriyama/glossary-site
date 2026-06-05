import { Command } from "cmdk";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderMarkdown } from "./markdown";
import type { Diagram, Entry, Glossary, SectionOverview } from "./types";

const OVERVIEW_PREFIX = "__overview__:";

// Mirrors builder/src/build.ts#slug — keep the two in sync.
function slugForLink(s: string): string {
  return s
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w぀-ヿ一-鿿 -]/g, "")
    .replace(/\s+/g, "-");
}
const isOverviewValue = (v: string) => v.startsWith(OVERVIEW_PREFIX);
const overviewNameOf = (v: string) => v.slice(OVERVIEW_PREFIX.length);

export default function App() {
  const [glossary, setGlossary] = useState<Glossary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string>("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "graph">("list");
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

  // cmdk filter: weighted score per match site so the entry whose *name* matches
  // ranks above entries that only mention the query in their body / aliases.
  //   term prefix     → 100
  //   term substring  → 50
  //   alias substring → 20
  //   body substring  → 5
  //   none of above   → 0 (filtered out)
  // Tokens AND together: any unmatched token → 0.
  const filter = useMemo(() => {
    const bodyByValue = new Map<string, string>();
    if (glossary) {
      for (const e of glossary.entries) bodyByValue.set(e.term, e.body);
      for (const so of glossary.sectionOverviews) {
        bodyByValue.set(OVERVIEW_PREFIX + so.name, so.body);
      }
    }
    const norm = (s: string) => s.toLowerCase().replace(/[`*]/g, "");
    return (value: string, search: string, keywords?: string[]): number => {
      const ss = norm(search).trim();
      if (!ss) return 1;
      const term = norm(value);
      const aliases = norm((keywords || []).join(" "));
      const body = norm(bodyByValue.get(value) || "");
      const tokens = ss.split(/\s+/).filter(Boolean);
      let score = 0;
      for (const t of tokens) {
        if (term.startsWith(t)) score += 100;
        else if (term.includes(t)) score += 50;
        else if (aliases.includes(t)) score += 20;
        else if (body.includes(t)) score += 5;
        else return 0;
      }
      return score;
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

  const overviewByName = new Map(glossary.sectionOverviews.map((s) => [s.name, s]));
  let viewing:
    | { kind: "entry"; entry: Entry }
    | { kind: "overview"; overview: SectionOverview }
    | null = null;
  if (isOverviewValue(highlighted)) {
    const o = overviewByName.get(overviewNameOf(highlighted));
    if (o) viewing = { kind: "overview", overview: o };
  } else {
    const e = glossary.entries.find((en) => en.term === highlighted);
    if (e) viewing = { kind: "entry", entry: e };
  }
  if (!viewing && glossary.entries.length) {
    viewing = { kind: "entry", entry: glossary.entries[0] };
  }

  // Pre-compute, per entry, which alias the current search query matched.
  // Lets the result list show "via "tooltip"" so the user sees why a wrong
  // name surfaces the canonical entry (Don't call it reverse lookup).
  const aliasMatches = new Map<string, string>();
  const q = query.trim().toLowerCase();
  if (q) {
    for (const e of glossary.entries) {
      const hit = e.aliases.find((a) => a.toLowerCase().includes(q));
      if (hit && !e.term.toLowerCase().includes(q)) aliasMatches.set(e.term, hit);
    }
  }

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
          <span className="stat-chip">
            {glossary.entries.length} {pluralize(glossary.entries.length, "entry", "entries")}
          </span>
          <span className="stat-chip">
            {glossary.sections.length} {pluralize(glossary.sections.length, "section", "sections")}
          </span>
          {glossary.diagrams.length > 0 && (
            <span className="stat-chip">
              {glossary.diagrams.length}{" "}
              {pluralize(glossary.diagrams.length, "diagram", "diagrams")}
            </span>
          )}
          <div className="view-toggle">
            <button
              type="button"
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
            >
              List
            </button>
            <button
              type="button"
              className={view === "graph" ? "active" : ""}
              onClick={() => setView("graph")}
            >
              Graph
            </button>
          </div>
        </div>
      </header>
      {view === "graph" && (
        <GraphView
          entries={glossary.entries}
          sections={glossary.sections}
          highlighted={highlighted}
          onSelect={setHighlighted}
        />
      )}
      {view === "list" && (
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
                  const overview = overviewByName.get(section);
                  if (!items.length && !overview) return null;
                  return (
                    <Command.Group key={section} heading={section}>
                      {overview && (
                        <Command.Item
                          key={OVERVIEW_PREFIX + section}
                          value={OVERVIEW_PREFIX + section}
                          keywords={[section, "概要", "overview"]}
                        >
                          <span className="item-term">📖 {section}</span>
                          <span className="item-aliases">概要 / overview</span>
                        </Command.Item>
                      )}
                      {items.map((e) => (
                        <Command.Item
                          key={e.term}
                          value={e.term}
                          keywords={[
                            ...e.aliases,
                            e.section,
                            ...(e.tags ?? []).map((t) => `#${t}`),
                          ]}
                        >
                          <span className="item-term">{e.term}</span>
                          {aliasMatches.get(e.term) && (
                            <span className="item-via">↩ via "{aliasMatches.get(e.term)}"</span>
                          )}
                          {!aliasMatches.get(e.term) && e.aliases.length > 0 && (
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
            {viewing?.kind === "entry" && <EntryView entry={viewing.entry} repo={glossary.repo} />}
            {viewing?.kind === "overview" && (
              <OverviewView
                overview={viewing.overview}
                repo={glossary.repo}
                diagrams={glossary.diagrams.filter((d) => d.sectionLabel === viewing.overview.name)}
              />
            )}
          </main>
        </div>
      )}
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

function OverviewView({
  overview,
  repo,
  diagrams,
}: {
  overview: SectionOverview;
  repo: string;
  diagrams: Diagram[];
}) {
  const html = useMemo(() => renderMarkdown(overview.body, repo), [overview.body, repo]);
  return (
    <article className="entry">
      <div className="entry-section">概要 / overview</div>
      <h2 id={overview.anchor}>📖 {overview.name}</h2>
      <div className="body" dangerouslySetInnerHTML={{ __html: html }} />
      {diagrams.length > 0 && (
        <section className="diagrams">
          <h3>図</h3>
          {diagrams.map((d) => (
            <figure key={d.id} className="diagram">
              <div className="diagram-svg" dangerouslySetInnerHTML={{ __html: d.svg }} />
            </figure>
          ))}
        </section>
      )}
    </article>
  );
}

function EntryView({ entry, repo }: { entry: Entry; repo: string }) {
  const html = useMemo(() => renderMarkdown(entry.body, repo), [entry.body, repo]);
  const dcHtml = useMemo(() => renderMarkdown(entry.dontcall, repo), [entry.dontcall, repo]);
  return (
    <article className="entry">
      <div className="entry-section">{entry.section}</div>
      <h2 id={entry.anchor} className={entry.deprecated ? "term-deprecated" : ""}>
        {entry.term}
      </h2>
      <div className="entry-meta-row">
        {entry.tags?.map((t) => (
          <span key={t} className="tag-chip">
            #{t}
          </span>
        ))}
        {entry.since && <span className="since-chip">since {entry.since}</span>}
        {entry.deprecated && (
          <span className="deprecated-chip">
            ⚠ deprecated
            {typeof entry.deprecated === "string" && `: ${entry.deprecated}`}
          </span>
        )}
      </div>
      <div className="body" dangerouslySetInnerHTML={{ __html: html }} />
      {entry.related && entry.related.length > 0 && (
        <div className="related">
          <span className="related-label">関連</span>
          <span className="related-body">
            {entry.related.map((r, idx) => (
              <span key={r}>
                {idx > 0 && " · "}
                <a href={`#${slugForLink(r)}`} className="wikilink" data-term={r}>
                  {r}
                </a>
              </span>
            ))}
          </span>
        </div>
      )}
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

type Node = {
  term: string;
  section: string;
  x: number;
  y: number;
  degree: number;
  deprecated: boolean;
};

type Edge = {
  from: string;
  to: string;
};

function GraphView({
  entries,
  sections,
  highlighted,
  onSelect,
}: {
  entries: Entry[];
  sections: string[];
  highlighted: string;
  onSelect: (term: string) => void;
}) {
  const { nodes, edges, width, height } = useMemo(() => {
    const byTerm = new Map<string, Entry>();
    for (const e of entries) byTerm.set(e.term, e);

    // Build edges from wikilinks ∪ related, deduped, target-must-exist.
    const edgeSet = new Set<string>();
    const edgeList: Edge[] = [];
    for (const e of entries) {
      const targets = new Set<string>();
      for (const w of e.wikilinks ?? []) targets.add(w);
      for (const r of e.related ?? []) targets.add(r);
      for (const t of targets) {
        if (!byTerm.has(t) || t === e.term) continue;
        const key = `${e.term} ${t}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edgeList.push({ from: e.term, to: t });
      }
    }

    const degree = new Map<string, number>();
    for (const ed of edgeList) {
      degree.set(ed.from, (degree.get(ed.from) ?? 0) + 1);
      degree.set(ed.to, (degree.get(ed.to) ?? 0) + 1);
    }

    // Section-column layout. Each section is a vertical lane;
    // entries are placed top-down sorted by degree (most-connected first).
    const colW = 260;
    const rowH = 56;
    const margin = { top: 60, side: 40 };
    const sectionsToShow = sections.filter((s) => entries.some((e) => e.section === s));
    const nodes: Node[] = [];
    sectionsToShow.forEach((s, colIdx) => {
      const inSection = entries
        .filter((e) => e.section === s)
        .map((e) => ({ e, deg: degree.get(e.term) ?? 0 }))
        .sort((a, b) => b.deg - a.deg);
      inSection.forEach(({ e, deg }, rowIdx) => {
        nodes.push({
          term: e.term,
          section: s,
          x: margin.side + colIdx * colW + colW / 2,
          y: margin.top + rowIdx * rowH,
          degree: deg,
          deprecated: Boolean(e.deprecated),
        });
      });
    });
    const maxRows = Math.max(
      ...sectionsToShow.map((s) => entries.filter((e) => e.section === s).length),
    );
    const width = margin.side * 2 + sectionsToShow.length * colW;
    const height = margin.top + maxRows * rowH + 40;
    return { nodes, edges: edgeList, width, height };
  }, [entries, sections]);

  const nodeByTerm = useMemo(() => {
    const m = new Map<string, Node>();
    for (const n of nodes) m.set(n.term, n);
    return m;
  }, [nodes]);

  return (
    <div className="graph-wrap">
      <svg
        className="graph-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="用語の関係グラフ"
      >
        <title>用語の関係グラフ</title>
        <g className="graph-edges">
          {edges.map((ed) => {
            const a = nodeByTerm.get(ed.from);
            const b = nodeByTerm.get(ed.to);
            if (!a || !b) return null;
            const mx = (a.x + b.x) / 2;
            const active = highlighted === ed.from || highlighted === ed.to;
            return (
              <path
                key={`${ed.from} ${ed.to}`}
                d={`M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`}
                className={active ? "edge edge-active" : "edge"}
              />
            );
          })}
        </g>
        <g className="graph-section-labels">
          {Array.from(new Set(nodes.map((n) => n.section))).map((s) => {
            const first = nodes.find((n) => n.section === s);
            if (!first) return null;
            return (
              <text key={s} x={first.x} y={30} className="graph-section-label">
                {s}
              </text>
            );
          })}
        </g>
        <g className="graph-nodes">
          {nodes.map((n) => {
            const active = n.term === highlighted;
            const rW = Math.max(120, Math.min(220, n.term.length * 11 + 16));
            return (
              <g
                key={n.term}
                className={`node ${active ? "node-active" : ""} ${n.deprecated ? "node-deprecated" : ""}`}
                transform={`translate(${n.x - rW / 2}, ${n.y - 16})`}
                role="button"
                tabIndex={0}
                aria-label={`select ${n.term}`}
                onClick={() => onSelect(n.term)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(n.term);
                  }
                }}
              >
                <rect width={rW} height={32} rx={8} />
                <text x={rW / 2} y={20} textAnchor="middle">
                  {n.term}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
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

function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}
