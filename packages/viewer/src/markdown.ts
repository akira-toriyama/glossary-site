/**
 * Minimal markdown renderer for entry bodies.
 * Subset only: paragraphs / `- ` lists / **bold** / `code` / [text](url) / [[wikilink]].
 * Wikilinks become <a class="wikilink" data-term="..."> for the App-level click handler.
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
  // [[wikilink]] — App handles click via delegation
  s = s.replace(/\[\[([^\]]+)\]\]/g, (_m, term) => {
    const t = escapeHtml(term);
    return `<a href="#${slug(term)}" class="wikilink" data-term="${t}">${t}</a>`;
  });
  // [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    if (/^https?:/.test(url)) {
      return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
    }
    let abs: string;
    if (url.startsWith("../")) {
      abs = `https://github.com/akira-toriyama/${repo}/blob/main/${url.slice(3)}`;
    } else if (url.startsWith("/")) {
      abs = `https://github.com/akira-toriyama/${repo}${url}`;
    } else {
      abs = `https://github.com/akira-toriyama/${repo}/blob/main/docs/${url.replace(/^\.\//, "")}`;
    }
    return `<a href="${abs}" target="_blank" rel="noopener">${text}</a>`;
  });
  // **bold**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // `code`
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w぀-ヿ一-鿿 -]/g, "")
    .replace(/\s+/g, "-");
}
