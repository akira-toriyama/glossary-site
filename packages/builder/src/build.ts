/**
 * glossary builder (library)
 *   parse:  docs/glossary.md (Obsidian-friendly markdown)
 *   render: ```mermaid blocks → SVG (pre-rendered via @mermaid-js/mermaid-cli)
 *   emit:   glossary.json consumed by packages/viewer
 *
 * CLI entry is src/cli.ts (boots via bin/glossary-build.mjs).
 */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { run as mmdcRun } from "@mermaid-js/mermaid-cli";
import matter from "gray-matter";
import type {
  DiagramInput,
  DiagramOutput,
  Entry,
  GlossaryJson,
  ParsedGlossary,
  SectionOverview,
} from "./types.ts";

export type BuildOptions = {
  input: string;
  output: string;
  repo: string;
};

export type WikilinkIssue = {
  fromTerm: string;
  target: string;
};

/**
 * Returns the list of wikilinks whose target term cannot be resolved among
 * known entry terms / aliases. Used by the CLI to warn (or fail in strict
 * mode) on dangling `[[refs]]`.
 */
export function findBrokenWikilinks(result: GlossaryJson): WikilinkIssue[] {
  const known = new Set<string>();
  for (const e of result.entries) {
    known.add(e.term);
    for (const a of e.aliases) known.add(a);
  }
  const broken: WikilinkIssue[] = [];
  for (const e of result.entries) {
    for (const link of e.wikilinks) {
      const target = link.split("|", 1)[0]?.trim() ?? link;
      if (!known.has(target)) {
        broken.push({ fromTerm: e.term, target });
      }
    }
  }
  return broken;
}

export async function build({ input, output, repo }: BuildOptions): Promise<GlossaryJson> {
  const raw = await fs.readFile(input, "utf8");
  const { content, data: frontmatter } = matter(raw);

  const parsed = parseGlossary(content);

  const diagrams: DiagramOutput[] = [];
  for (const [idx, d] of parsed.diagrams.entries()) {
    const svg = await renderMermaid(d.mermaid, idx);
    diagrams.push({
      id: `diagram-${idx + 1}`,
      sectionLabel: d.sectionLabel,
      svg,
    });
  }

  const result: GlossaryJson = {
    repo,
    title: parsed.title || `${repo} のユビキタス言語`,
    generatedAt: new Date().toISOString(),
    sourceUrl: `https://github.com/akira-toriyama/${repo}/blob/main/docs/glossary.md`,
    frontmatter: frontmatter as Record<string, unknown>,
    diagrams,
    sections: parsed.sections,
    sectionOverviews: parsed.sectionOverviews,
    entries: parsed.entries,
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(result, null, 2));
  return result;
}

export function parseGlossary(content: string): ParsedGlossary {
  const lines = content.split("\n");
  const out: ParsedGlossary = {
    title: "",
    sections: [],
    entries: [],
    diagrams: [],
    sectionOverviews: [],
  };
  let section = "";
  let i = 0;
  let collectingOverview = false;
  let overviewLines: string[] = [];

  const flushOverview = (): void => {
    if (section && overviewLines.length > 0) {
      const body = overviewLines.join("\n").trim();
      if (body) {
        const existing = out.sectionOverviews.find((s) => s.name === section);
        if (existing) {
          existing.body = body;
        } else {
          const overview: SectionOverview = { name: section, body, anchor: slug(section) };
          out.sectionOverviews.push(overview);
        }
      }
    }
    overviewLines = [];
    collectingOverview = false;
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (/^# [^#]/.test(line)) {
      flushOverview();
      if (!out.title) {
        out.title = line.slice(2).trim();
      }
      i++;
      continue;
    }

    if (/^## [^#]/.test(line)) {
      flushOverview();
      section = line.slice(3).trim();
      if (!out.sections.includes(section)) {
        out.sections.push(section);
      }
      collectingOverview = true;
      i++;
      continue;
    }

    if (/^### /.test(line)) {
      flushOverview();
      const term = line.slice(4).trim();
      const bodyLines: string[] = [];
      i++;
      while (i < lines.length) {
        const nxt = lines[i] ?? "";
        if (/^#{1,3} /.test(nxt) || nxt.trim() === "---") break;
        bodyLines.push(nxt);
        i++;
      }
      let dontcall = "";
      const bodyNoDc: string[] = [];
      let dontcallContinuing = false;
      let since: string | undefined;
      let deprecated: string | boolean | undefined;
      let related: string[] | undefined;
      for (let bi = 0; bi < bodyLines.length; bi++) {
        const bl = bodyLines[bi] ?? "";

        // Dataview-style inline metadata at line start: `key:: value`
        const meta = bl.match(/^\s*([a-zA-Z][\w-]*)::\s*(.+)$/);
        if (meta?.[1] && meta?.[2]) {
          const key = meta[1].toLowerCase();
          const value = meta[2].trim();
          if (key === "since") {
            since = value;
            continue;
          }
          if (key === "deprecated") {
            deprecated = /^(true|yes)$/i.test(value) ? true : value;
            continue;
          }
          if (key === "related") {
            related = [...value.matchAll(/\[\[([^\]]+)\]\]/g)]
              .map((m) => m[1]?.split("|", 1)[0]?.trim())
              .filter((s): s is string => Boolean(s));
            continue;
          }
        }

        // Obsidian callout: > [!ban] / > [!dontcall] / > [!noncall] (with optional title)
        // Body lines (`> …`) are gathered as comma-separated alias source.
        const callout = bl.match(/^\s*>\s*\[!(ban|dontcall|noncall)\][^\n]*$/i);
        if (callout) {
          const aliasLines: string[] = [];
          let bj = bi + 1;
          while (bj < bodyLines.length) {
            const next = bodyLines[bj] ?? "";
            const cont = next.match(/^\s*>\s?(.*)$/);
            if (!cont) break;
            const piece = (cont[1] ?? "").trim();
            if (piece) aliasLines.push(piece);
            bj++;
          }
          dontcall = aliasLines.join(", ");
          dontcallContinuing = false;
          bi = bj - 1;
          continue;
        }

        const m = bl.match(/\*\*Don'?t call it:\*\*\s*(.+)$/);
        if (m?.[1]) {
          dontcall = m[1].trim();
          dontcallContinuing = dontcall.endsWith(",") || dontcall.endsWith("、");
          continue;
        }
        // continuation: indented (not blank, not a new bullet) AND previous dontcall line
        // ended with a separator comma. Stops as soon as a non-comma-trailing line lands.
        if (dontcallContinuing && /^\s+\S/.test(bl) && !/^\s*-\s+/.test(bl)) {
          const cont = bl.trim();
          dontcall = `${dontcall} ${cont}`;
          dontcallContinuing = cont.endsWith(",") || cont.endsWith("、");
          continue;
        }
        dontcallContinuing = false;
        bodyNoDc.push(bl);
      }
      const aliases = dontcall
        .split(/[,、]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const fullBody = bodyLines.join("\n");
      const wikilinks = [...fullBody.matchAll(/\[\[([^\]]+)\]\]/g)]
        .map((m) => m[1]?.split("|", 1)[0]?.trim())
        .filter((s): s is string => Boolean(s));
      const tags = extractTags(fullBody);
      const entry: Entry = {
        term,
        section,
        body: bodyNoDc.join("\n").trim(),
        dontcall,
        aliases,
        wikilinks,
        anchor: slug(term),
        tags,
        ...(since !== undefined && { since }),
        ...(deprecated !== undefined && { deprecated }),
        ...(related !== undefined && { related }),
      };
      out.entries.push(entry);
      continue;
    }

    if (line.startsWith("```mermaid")) {
      i++;
      const ml: string[] = [];
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        ml.push(lines[i] ?? "");
        i++;
      }
      i++; // closing ```
      const diagram: DiagramInput = {
        sectionLabel: section || "overview",
        mermaid: ml.join("\n"),
      };
      out.diagrams.push(diagram);
      continue;
    }

    if (line.trim() === "---") {
      flushOverview();
      i++;
      continue;
    }

    if (collectingOverview && section) {
      overviewLines.push(line);
    }
    i++;
  }
  flushOverview();
  return out;
}

/**
 * Extract Obsidian-style `#tag` tokens from entry body.
 * - Must follow start-of-line or whitespace (so Markdown headers `# foo`,
 *   URL fragments `…#anchor`, and inline code `…#x` after non-space don't match).
 * - First char must be a letter (incl. CJK) or digit; subsequent chars allow
 *   `\-`, `_`, `/` (Obsidian nested tag separator).
 * - Inside `code spans` and fenced code blocks, tags are NOT extracted.
 * - Returns unique, source-order preserved.
 */
export function extractTags(text: string): string[] {
  // Strip fenced code blocks
  const noFenced = text.replace(/```[\s\S]*?```/g, "");
  // Strip inline code spans
  const noCode = noFenced.replace(/`[^`]*`/g, "");
  const re = /(?<=^|\s)#([\p{L}\p{N}][\p{L}\p{N}\-_/]*)/gu;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of noCode.matchAll(re)) {
    const t = m[1];
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w぀-ヿ一-鿿 -]/g, "")
    .replace(/\s+/g, "-");
}

async function renderMermaid(source: string, idx: number): Promise<string> {
  const tmpDir = `/tmp/glossary-mermaid-${process.pid}`;
  await fs.mkdir(tmpDir, { recursive: true });
  const inFile = path.join(tmpDir, `in-${idx}.mmd`);
  const outFile = path.join(tmpDir, `out-${idx}.svg`);
  await fs.writeFile(inFile, source);
  try {
    await mmdcRun(inFile as `${string}.mmd`, outFile as `${string}.svg`, {
      puppeteerConfig: { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
      parseMMDOptions: {
        mermaidConfig: { theme: "default", flowchart: { useMaxWidth: true } },
      },
    });
    return await fs.readFile(outFile, "utf8");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`mermaid render failed (diagram ${idx}): ${message}`);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="40"><text x="10" y="25" fill="#c00">mermaid render failed</text></svg>`;
  }
}
