import { describe, expect, it } from "vitest";
import { extractTags, findBrokenWikilinks, parseGlossary, slug } from "./build.ts";
import type { GlossaryJson } from "./types.ts";

function makeGlossary(
  entries: { term: string; aliases?: string[]; wikilinks?: string[]; tags?: string[] }[],
): GlossaryJson {
  return {
    repo: "test",
    title: "test",
    generatedAt: "2026-01-01T00:00:00Z",
    sourceUrl: "",
    frontmatter: {},
    diagrams: [],
    sections: [],
    sectionOverviews: [],
    entries: entries.map((e) => ({
      term: e.term,
      section: "",
      body: "",
      dontcall: "",
      aliases: e.aliases ?? [],
      wikilinks: e.wikilinks ?? [],
      anchor: e.term,
      tags: e.tags ?? [],
    })),
  };
}

describe("slug", () => {
  it("lowercases ASCII", () => {
    expect(slug("Hello World")).toBe("hello-world");
  });

  it("strips backticks", () => {
    expect(slug("`code` term")).toBe("code-term");
  });

  it("keeps Japanese characters", () => {
    expect(slug("ユビキタス言語")).toBe("ユビキタス言語");
  });

  it("collapses whitespace into hyphens", () => {
    expect(slug("  multiple   spaces  ")).toBe("-multiple-spaces-");
  });

  it("drops punctuation outside the allow-list", () => {
    expect(slug("foo, bar! baz.")).toBe("foo-bar-baz");
  });
});

describe("parseGlossary", () => {
  it("captures title from H1", () => {
    const md = "# Project Glossary\n\n## Section\n";
    const out = parseGlossary(md);
    expect(out.title).toBe("Project Glossary");
  });

  it("captures sections from H2", () => {
    const md = "## Domain\n\n## Tech\n";
    const out = parseGlossary(md);
    expect(out.sections).toEqual(["Domain", "Tech"]);
  });

  it("captures entries from H3 with body and anchor", () => {
    const md = [
      "## Domain",
      "",
      "### Aggregate",
      "Cluster of entities.",
      "",
      "### Repository",
      "Persistence boundary.",
    ].join("\n");
    const out = parseGlossary(md);
    expect(out.entries).toHaveLength(2);
    expect(out.entries[0]).toMatchObject({
      term: "Aggregate",
      section: "Domain",
      body: "Cluster of entities.",
      anchor: "aggregate",
      tags: [],
    });
    expect(out.entries[1]?.term).toBe("Repository");
  });

  it("captures hashtags from entry body into entry.tags", () => {
    const md = [
      "## Domain",
      "",
      "### Aggregate",
      "Cluster of entities. #ddd #core",
      "Used everywhere. #ddd",
    ].join("\n");
    const out = parseGlossary(md);
    expect(out.entries[0]?.tags).toEqual(["ddd", "core"]);
  });

  it("extracts Don't call it line into dontcall + aliases", () => {
    const md = [
      "## Domain",
      "",
      "### Aggregate",
      "Cluster of entities.",
      "**Don't call it:** group, bundle",
    ].join("\n");
    const out = parseGlossary(md);
    expect(out.entries[0]?.dontcall).toBe("group, bundle");
    expect(out.entries[0]?.aliases).toEqual(["group", "bundle"]);
    expect(out.entries[0]?.body).toBe("Cluster of entities.");
  });

  it("joins comma-terminated continuation lines into dontcall", () => {
    const md = [
      "## Domain",
      "",
      "### Aggregate",
      "Cluster of entities.",
      "- **Don't call it:** focused window, active window, frontmost window,",
      "  target app, フォーカスウィンドウ, アクティブウィンドウ",
    ].join("\n");
    const out = parseGlossary(md);
    expect(out.entries[0]?.aliases).toEqual([
      "focused window",
      "active window",
      "frontmost window",
      "target app",
      "フォーカスウィンドウ",
      "アクティブウィンドウ",
    ]);
    expect(out.entries[0]?.body).not.toContain("target app");
    expect(out.entries[0]?.body).not.toContain("アクティブウィンドウ");
  });

  it("stops continuation once a non-comma-terminated line lands", () => {
    const md = [
      "## Domain",
      "",
      "### Aggregate",
      "Cluster of entities.",
      "- **Don't call it:** a, b,",
      "  c, d",
      "  （補足: この行は body 扱い）",
    ].join("\n");
    const out = parseGlossary(md);
    expect(out.entries[0]?.aliases).toEqual(["a", "b", "c", "d"]);
    expect(out.entries[0]?.body).toContain("補足: この行は body 扱い");
  });

  it("does not treat a new bullet as dontcall continuation", () => {
    const md = [
      "## Domain",
      "",
      "### Aggregate",
      "- **Don't call it:** group,",
      "- 設定: `[domain]`",
    ].join("\n");
    const out = parseGlossary(md);
    expect(out.entries[0]?.aliases).toEqual(["group"]);
    expect(out.entries[0]?.body).toContain("設定:");
  });

  it("collects wikilinks from entry body", () => {
    const md = [
      "## Domain",
      "",
      "### Aggregate",
      "Composed of [[Entity]] and [[Value Object]].",
    ].join("\n");
    const out = parseGlossary(md);
    expect(out.entries[0]?.wikilinks).toEqual(["Entity", "Value Object"]);
  });

  it("strips display-text from wikilinks (keeps target only)", () => {
    const md = [
      "## Domain",
      "",
      "### Aggregate",
      "See [[Entity|エンティティ]] and [[Value Object | 値オブジェクト]].",
    ].join("\n");
    const out = parseGlossary(md);
    expect(out.entries[0]?.wikilinks).toEqual(["Entity", "Value Object"]);
  });

  it("captures section overview between H2 and first H3", () => {
    const md = [
      "## Domain",
      "",
      "Overview text spans multiple lines.",
      "",
      "More overview.",
      "",
      "### Aggregate",
      "body",
    ].join("\n");
    const out = parseGlossary(md);
    expect(out.sectionOverviews).toHaveLength(1);
    expect(out.sectionOverviews[0]).toMatchObject({
      name: "Domain",
      anchor: "domain",
    });
    expect(out.sectionOverviews[0]?.body).toContain("Overview text");
    expect(out.sectionOverviews[0]?.body).toContain("More overview");
  });

  it("captures mermaid diagrams with section label", () => {
    const md = ["## Architecture", "", "```mermaid", "graph LR; A-->B", "```", ""].join("\n");
    const out = parseGlossary(md);
    expect(out.diagrams).toHaveLength(1);
    expect(out.diagrams[0]).toMatchObject({
      sectionLabel: "Architecture",
      mermaid: "graph LR; A-->B",
    });
  });

  it("treats --- as section/overview separator", () => {
    const md = ["## A", "", "overview", "", "---", "", "## B"].join("\n");
    const out = parseGlossary(md);
    expect(out.sections).toEqual(["A", "B"]);
    expect(out.sectionOverviews[0]?.name).toBe("A");
  });
});

describe("extractTags", () => {
  it("captures single #tag in prose", () => {
    expect(extractTags("これは #perf に関する話")).toEqual(["perf"]);
  });

  it("captures multiple unique tags in source order", () => {
    expect(extractTags("see #perf and #a11y; also #perf again")).toEqual(["perf", "a11y"]);
  });

  it("ignores markdown headers (# space)", () => {
    expect(extractTags("# Title\n## Section")).toEqual([]);
  });

  it("ignores URL fragments", () => {
    expect(extractTags("link: https://ex.com/page#section")).toEqual([]);
  });

  it("ignores hashtags inside inline code", () => {
    expect(extractTags("config: `option #default` and #real")).toEqual(["real"]);
  });

  it("ignores hashtags inside fenced code blocks", () => {
    expect(extractTags("```\n#code\n#in_block\n```\n#outside")).toEqual(["outside"]);
  });

  it("supports nested tag separator `/`", () => {
    expect(extractTags("see #domain/aggregate")).toEqual(["domain/aggregate"]);
  });

  it("supports CJK in tag names", () => {
    expect(extractTags("see #要件")).toEqual(["要件"]);
  });
});

describe("findBrokenWikilinks", () => {
  it("returns empty when all wikilink targets resolve", () => {
    const g = makeGlossary([{ term: "Aggregate", wikilinks: ["Entity"] }, { term: "Entity" }]);
    expect(findBrokenWikilinks(g)).toEqual([]);
  });

  it("flags wikilinks whose target does not exist", () => {
    const g = makeGlossary([
      { term: "Aggregate", wikilinks: ["Entity", "GhostTerm"] },
      { term: "Entity" },
    ]);
    const broken = findBrokenWikilinks(g);
    expect(broken).toEqual([{ fromTerm: "Aggregate", target: "GhostTerm" }]);
  });

  it("resolves through aliases (Don't call it members)", () => {
    const g = makeGlossary([
      { term: "non-activating panel", aliases: ["panel"], wikilinks: [] },
      { term: "Other", wikilinks: ["panel"] },
    ]);
    expect(findBrokenWikilinks(g)).toEqual([]);
  });

  it("strips display text and resolves the target half", () => {
    const g = makeGlossary([
      { term: "Aggregate" },
      { term: "Caller", wikilinks: ["Aggregate|集約"] },
    ]);
    expect(findBrokenWikilinks(g)).toEqual([]);
  });
});
