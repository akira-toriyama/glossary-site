export type Entry = {
  term: string;
  section: string;
  body: string;
  dontcall: string;
  aliases: string[];
  wikilinks: string[];
  anchor: string;
  tags?: string[];
};

export type Diagram = {
  id: string;
  sectionLabel: string;
  svg: string;
};

export type SectionOverview = {
  name: string;
  body: string;
  anchor: string;
};

export type Glossary = {
  repo: string;
  title: string;
  generatedAt: string;
  sourceUrl: string;
  frontmatter: Record<string, unknown>;
  diagrams: Diagram[];
  sections: string[];
  sectionOverviews: SectionOverview[];
  entries: Entry[];
};
