#!/usr/bin/env node
// Shim that boots the TS entrypoint via tsx (avoids requiring callers to install tsx globally).
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, "..", "src", "cli.ts");

const child = spawn(process.execPath, ["--import", "tsx", target, ...process.argv.slice(2)], {
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
