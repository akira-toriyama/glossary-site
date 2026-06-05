/**
 * Minimal markdown renderer for entry bodies.
 * Subset only: paragraphs / `- ` lists / **bold** / `code` / [text](url) /
 *              ![alt](url) images / [[wikilink]].
 * Wikilinks become <a class="wikilink" data-term="..."> for the App-level click handler.
 * Relative images / links resolve to https://github.com/akira-toriyama/<repo>/raw|blob/main/...
 */
export function renderMarkdown(md: string, repo: string): string {
  const lines = md.split("\n");
  let html = "";
  let inList = false;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      html += `<p>${inlineMd(para.join(" "), repo)}</p>`;
      para = [];
    }
  };

  for (const line of lines) {
    const lm = line.match(/^\s*-\s+(.+)$/);
    if (lm) {
      flushPara();
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${inlineMd(lm[1], repo)}</li>`;
    } else if (line.trim() === "") {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      flushPara();
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      para.push(line.trim());
    }
  }
  if (inList) html += "</ul>";
  flushPara();
  return html;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMd(s: string, repo: string): string {
  s = escapeHtml(s);
  // ![alt](url) — image (must run BEFORE the link regex, since !\[…\]\(…\) overlaps)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, url) => {
    const src = resolveAsset(url, repo, "raw");
    const a = escapeHtml(alt);
    return `<img src="${src}" alt="${a}" loading="lazy" />`;
  });
  // ![[term]] or ![[term|display]] — Obsidian embed; render as highlighted reference
  s = s.replace(/!\[\[([^\]]+)\]\]/g, (_m, ref: string) => {
    const [rawTarget, rawDisplay] = ref.split("|");
    const target = (rawTarget ?? "").trim();
    const display = (rawDisplay ?? target).trim();
    const t = escapeHtml(target);
    const d = escapeHtml(display);
    return `<aside class="embed"><a href="#${slug(target)}" class="wikilink embed-link" data-term="${t}">📌 ${d}</a></aside>`;
  });
  // [[wikilink]] or [[wikilink|display]] — App handles click via delegation
  s = s.replace(/\[\[([^\]]+)\]\]/g, (_m, ref: string) => {
    const [rawTarget, rawDisplay] = ref.split("|");
    const target = (rawTarget ?? "").trim();
    const display = (rawDisplay ?? target).trim();
    const t = escapeHtml(target);
    const d = escapeHtml(display);
    return `<a href="#${slug(target)}" class="wikilink" data-term="${t}">${d}</a>`;
  });
  // [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    if (/^https?:/.test(url)) {
      return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
    }
    return `<a href="${resolveAsset(url, repo, "blob")}" target="_blank" rel="noopener">${text}</a>`;
  });
  // **bold**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // `code`
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

function resolveAsset(url: string, repo: string, kind: "raw" | "blob"): string {
  if (/^https?:/.test(url)) return url;
  const prefix = `https://github.com/akira-toriyama/${repo}/${kind}/main`;
  if (url.startsWith("../")) return `${prefix}/${url.slice(3)}`;
  if (url.startsWith("/")) return `https://github.com/akira-toriyama/${repo}${url}`;
  // glossary.md lives under docs/, so plain-relative resolves under docs/
  return `${prefix}/docs/${url.replace(/^\.\//, "")}`;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w぀-ヿ一-鿿 -]/g, "")
    .replace(/\s+/g, "-");
}
