#!/usr/bin/env node
/**
 * glossary builder
 *   parse:  docs/glossary.md (Obsidian-friendly markdown)
 *   render: ```mermaid blocks → SVG (pre-rendered via @mermaid-js/mermaid-cli)
 *   emit:   glossary.json consumed by packages/viewer
 *
 * usage: node build.mjs --input <path> --output <path> --repo <name>
 */
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { run as mmdcRun } from "@mermaid-js/mermaid-cli";
import matter from "gray-matter";

const { values } = parseArgs({
  options: {
    input: { type: "string", short: "i" },
    output: { type: "string", short: "o" },
    repo: { type: "string", short: "r" },
  },
});

const { input, output, repo } = values;
if (!input || !output || !repo) {
  console.error("usage: build.mjs --input <glossary.md> --output <glossary.json> --repo <name>");
  process.exit(2);
}

async function main() {
  const raw = await fs.readFile(input, "utf8");
  const { content, data: frontmatter } = matter(raw);

  const parsed = parseGlossary(content);

  const diagrams = [];
  for (const [idx, d] of parsed.diagrams.entries()) {
    const svg = await renderMermaid(d.mermaid, idx);
    diagrams.push({
      id: `diagram-${idx + 1}`,
      sectionLabel: d.sectionLabel,
      svg,
    });
  }

  const result = {
    repo,
    title: parsed.title || `${repo} のユビキタス言語`,
    generatedAt: new Date().toISOString(),
    sourceUrl: `https://github.com/akira-toriyama/${repo}/blob/main/docs/glossary.md`,
    frontmatter,
    diagrams,
    sections: parsed.sections,
    sectionOverviews: parsed.sectionOverviews,
    entries: parsed.entries,
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(result, null, 2));
  console.error(`wrote: ${output}`);
  console.error(
    `  entries: ${result.entries.length}, diagrams: ${result.diagrams.length}, sections: ${result.sections.length}, overviews: ${result.sectionOverviews.length}`,
  );
}

function parseGlossary(content) {
  const lines = content.split("\n");
  const out = { title: "", sections: [], entries: [], diagrams: [], sectionOverviews: [] };
  let section = "";
  let i = 0;
  let collectingOverview = false;
  let overviewLines = [];
  const flushOverview = () => {
    if (section && overviewLines.length) {
      const body = overviewLines.join("\n").trim();
      if (body) {
        const existing = out.sectionOverviews.find((s) => s.name === section);
        if (existing) existing.body = body;
        else out.sectionOverviews.push({ name: section, body, anchor: slug(section) });
      }
    }
    overviewLines = [];
    collectingOverview = false;
  };
  while (i < lines.length) {
    const line = lines[i];
    if (/^# [^#]/.test(line)) {
      flushOverview();
      if (!out.title) out.title = line.slice(2).trim();
      i++;
      continue;
    }
    if (/^## [^#]/.test(line)) {
      flushOverview();
      section = line.slice(3).trim();
      if (!out.sections.includes(section)) out.sections.push(section);
      collectingOverview = true;
      i++;
      continue;
    }
    if (/^### /.test(line)) {
      flushOverview();
      const term = line.slice(4).trim();
      const bodyLines = [];
      i++;
      while (i < lines.length) {
        const nxt = lines[i];
        if (/^#{1,3} /.test(nxt) || nxt.trim() === "---") break;
        bodyLines.push(nxt);
        i++;
      }
      let dontcall = "";
      const bodyNoDc = [];
      for (const bl of bodyLines) {
        const m = bl.match(/\*\*Don'?t call it:\*\*\s*(.+)$/);
        if (m) dontcall = m[1].trim();
        else bodyNoDc.push(bl);
      }
      const aliases = dontcall
        .split(/[,、]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const fullBody = bodyLines.join("\n");
      const wikilinks = [...fullBody.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
      out.entries.push({
        term,
        section,
        body: bodyNoDc.join("\n").trim(),
        dontcall,
        aliases,
        wikilinks,
        anchor: slug(term),
      });
      continue;
    }
    if (line.startsWith("```mermaid")) {
      i++;
      const ml = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        ml.push(lines[i]);
        i++;
      }
      i++; // closing ```
      out.diagrams.push({ sectionLabel: section || "overview", mermaid: ml.join("\n") });
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

function slug(s) {
  return s
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w぀-ヿ一-鿿 -]/g, "")
    .replace(/\s+/g, "-");
}

async function renderMermaid(source, idx) {
  const tmpDir = `/tmp/glossary-mermaid-${process.pid}`;
  await fs.mkdir(tmpDir, { recursive: true });
  const inFile = path.join(tmpDir, `in-${idx}.mmd`);
  const outFile = path.join(tmpDir, `out-${idx}.svg`);
  await fs.writeFile(inFile, source);
  try {
    await mmdcRun(inFile, outFile, {
      puppeteerConfig: { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
      mermaidConfig: { theme: "default", flowchart: { useMaxWidth: true } },
    });
    return await fs.readFile(outFile, "utf8");
  } catch (e) {
    console.error(`mermaid render failed (diagram ${idx}): ${e.message}`);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="40"><text x="10" y="25" fill="#c00">mermaid render failed</text></svg>`;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
