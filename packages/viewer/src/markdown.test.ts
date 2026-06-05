import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown.ts";

describe("renderMarkdown", () => {
  it("renders a single paragraph", () => {
    expect(renderMarkdown("hello world", "wand")).toBe("<p>hello world</p>");
  });

  it("renders bold and code", () => {
    const out = renderMarkdown("a **bold** and `code`", "wand");
    expect(out).toBe("<p>a <strong>bold</strong> and <code>code</code></p>");
  });

  it("renders unordered list items", () => {
    const out = renderMarkdown("- one\n- two", "wand");
    expect(out).toBe("<ul><li>one</li><li>two</li></ul>");
  });

  it("separates paragraphs by blank line", () => {
    const out = renderMarkdown("first\n\nsecond", "wand");
    expect(out).toBe("<p>first</p><p>second</p>");
  });

  it("renders external links with target=_blank", () => {
    const out = renderMarkdown("see [docs](https://example.com)", "wand");
    expect(out).toContain('<a href="https://example.com" target="_blank" rel="noopener">docs</a>');
  });

  it("rewrites relative links to repo blob URLs", () => {
    const out = renderMarkdown("see [arch](architecture.md)", "wand");
    expect(out).toContain(
      'href="https://github.com/akira-toriyama/wand/blob/main/docs/architecture.md"',
    );
  });

  it("rewrites parent-relative links to repo root", () => {
    const out = renderMarkdown("see [readme](../README.md)", "wand");
    expect(out).toContain('href="https://github.com/akira-toriyama/wand/blob/main/README.md"');
  });

  it("renders wikilinks with data-term attribute", () => {
    const out = renderMarkdown("see [[Aggregate]]", "wand");
    expect(out).toContain('class="wikilink"');
    expect(out).toContain('data-term="Aggregate"');
    expect(out).toContain('href="#aggregate"');
  });

  it("renders display-text wikilinks but routes by target", () => {
    const out = renderMarkdown("see [[Aggregate|集約]]", "wand");
    expect(out).toContain('data-term="Aggregate"');
    expect(out).toContain('href="#aggregate"');
    expect(out).toContain(">集約</a>");
    expect(out).not.toContain(">Aggregate</a>");
  });

  it("trims whitespace around the `|` separator", () => {
    const out = renderMarkdown("see [[Aggregate | 集約 ]]", "wand");
    expect(out).toContain('data-term="Aggregate"');
    expect(out).toContain(">集約</a>");
  });

  it("renders images with lazy loading and resolved src", () => {
    const out = renderMarkdown("![diagram](images/flow.png)", "wand");
    expect(out).toContain(
      '<img src="https://github.com/akira-toriyama/wand/raw/main/docs/images/flow.png" alt="diagram" loading="lazy" />',
    );
  });

  it("escapes raw HTML in text content", () => {
    const out = renderMarkdown("dangerous <script>alert(1)</script>", "wand");
    expect(out).toContain("&lt;script&gt;");
    expect(out).not.toContain("<script>");
  });
});
