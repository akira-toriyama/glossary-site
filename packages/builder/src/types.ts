export type Entry = {
  term: string;
  section: string;
  body: string;
  dontcall: string;
  aliases: string[];
  wikilinks: string[];
  anchor: string;
};

export type SectionOverview = {
  name: string;
  body: string;
  anchor: string;
};

export type DiagramInput = {
  sectionLabel: string;
  mermaid: string;
};

export type DiagramOutput = {
  id: string;
  sectionLabel: string;
  svg: string;
};

export type ParsedGlossary = {
  title: string;
  sections: string[];
  entries: Entry[];
  diagrams: DiagramInput[];
  sectionOverviews: SectionOverview[];
};

export type GlossaryJson = {
  repo: string;
  title: string;
  generatedAt: string;
  sourceUrl: string;
  frontmatter: Record<string, unknown>;
  diagrams: DiagramOutput[];
  sections: string[];
  sectionOverviews: SectionOverview[];
  entries: Entry[];
};
