#!/usr/bin/env node
/**
 * CLI entry for the glossary builder.
 * usage: tsx cli.ts --input <path> --output <path> --repo <name>
 */
import process from "node:process";
import { parseArgs } from "node:util";
import { build } from "./build.ts";

const { values } = parseArgs({
  options: {
    input: { type: "string", short: "i" },
    output: { type: "string", short: "o" },
    repo: { type: "string", short: "r" },
  },
});

const { input, output, repo } = values;
if (!input || !output || !repo) {
  console.error("usage: cli.ts --input <glossary.md> --output <glossary.json> --repo <name>");
  process.exit(2);
}

build({ input, output, repo })
  .then((result) => {
    console.error(`wrote: ${output}`);
    console.error(
      `  entries: ${result.entries.length}, diagrams: ${result.diagrams.length}, sections: ${result.sections.length}, overviews: ${result.sectionOverviews.length}`,
    );
  })
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
