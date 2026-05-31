export type Entry = {
  term: string;
  section: string;
  body: string;
  dontcall: string;
  aliases: string[];
  wikilinks: string[];
  anchor: string;
};

export type Diagram = {
  id: string;
  sectionLabel: string;
  svg: string;
};

export type Glossary = {
  repo: string;
  title: string;
  generatedAt: string;
  sourceUrl: string;
  frontmatter: Record<string, unknown>;
  diagrams: Diagram[];
  sections: string[];
  entries: Entry[];
};
