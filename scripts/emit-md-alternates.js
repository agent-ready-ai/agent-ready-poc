#!/usr/bin/env node
// Emit markdown alternates for every page, parallel to the HTML output.
//
//   src/about.md                          → dist/about/index.md
//   src/services/index.md                 → dist/services/index.md
//   src/services/dispatch-automation.md   → dist/services/dispatch-automation/index.md
//   src/index.md                          → dist/index.md
//
// Source markdown is read verbatim; the YAML front-matter block is stripped.
// Agents that prefer markdown (Accept: text/markdown, or following the
// rel="alternate" Link on the HTML page) get clean source content.
//
// Runs as a postbuild step in package.json.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, basename } from "node:path";

const pages = [
  "src/index.md",
  "src/about.md",
  "src/contact.md",
  "src/how-we-engage.md",
  "src/faq.md",
  "src/blog/index.md",
  "src/case-studies/index.md",
  "src/services/index.md",
  "src/services/dispatch-automation.md",
  "src/services/estimate-acceleration.md",
  "src/services/field-tech-copilot.md",
];

function outputPath(inputPath) {
  if (inputPath === "src/index.md") return "dist/index.md";
  if (inputPath.endsWith("/index.md")) {
    return inputPath.replace(/^src\//, "dist/");
  }
  const name = basename(inputPath, ".md");
  const dir = dirname(inputPath).replace(/^src/, "dist");
  return `${dir}/${name}/index.md`;
}

let emitted = 0;
for (const inputPath of pages) {
  if (!existsSync(inputPath)) {
    console.warn(`skip: ${inputPath} (not found)`);
    continue;
  }
  const raw = await readFile(inputPath, "utf8");
  const stripped = raw.replace(/^---\n[\s\S]*?\n---\n+/, "").replace(/\n+$/, "") + "\n";
  const out = outputPath(inputPath);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, stripped);
  emitted++;
}

console.log(`emitted ${emitted} markdown alternate(s)`);
