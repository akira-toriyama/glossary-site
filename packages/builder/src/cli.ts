#!/usr/bin/env node
/**
 * CLI entry for the glossary builder.
 * usage: tsx cli.ts --input <path> --output <path> --repo <name> [--strict]
 */
import process from "node:process";
import { parseArgs } from "node:util";
import { build, findBrokenWikilinks } from "./build.ts";

const { values } = parseArgs({
  options: {
    input: { type: "string", short: "i" },
    output: { type: "string", short: "o" },
    repo: { type: "string", short: "r" },
    strict: { type: "boolean", default: false },
  },
});

const { input, output, repo, strict } = values;
if (!input || !output || !repo) {
  console.error(
    "usage: cli.ts --input <glossary.md> --output <glossary.json> --repo <name> [--strict]",
  );
  process.exit(2);
}

build({ input, output, repo })
  .then((result) => {
    console.error(`wrote: ${output}`);
    console.error(
      `  entries: ${result.entries.length}, diagrams: ${result.diagrams.length}, sections: ${result.sections.length}, overviews: ${result.sectionOverviews.length}`,
    );

    const broken = findBrokenWikilinks(result);
    if (broken.length > 0) {
      console.error(`\nbroken wikilinks (${broken.length}):`);
      for (const b of broken) {
        console.error(`  - in "${b.fromTerm}" → [[${b.target}]]`);
      }
      const strictMode = strict || process.env["GLOSSARY_STRICT"] === "1";
      if (strictMode) {
        console.error("\n(--strict / GLOSSARY_STRICT=1) failing build.");
        process.exit(3);
      }
    }
  })
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
