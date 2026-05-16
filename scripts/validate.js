#!/usr/bin/env node
// W3C HTML validation against built dist/ pages via validator.w3.org/nu.
// Schema.org JSON-LD validation is a manual step at validator.schema.org
// (no stable public API); revisit when JSON-LD graph lands.
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, out);
    else if (entry.name.endsWith(".html")) out.push(p);
  }
  return out;
}

let files;
try {
  files = await walk("dist");
} catch {
  console.error("No dist/ directory. Run `make build` first.");
  process.exit(1);
}

if (files.length === 0) {
  console.error("dist/ has no HTML files. Run `make build` first.");
  process.exit(1);
}

let totalErrors = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [i, file] of files.entries()) {
  if (i > 0) await sleep(2000); // throttle: W3C nu validator rate-limits
  const html = await readFile(file);
  const res = await fetch("https://validator.w3.org/nu/?out=json", {
    method: "POST",
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: html,
  });
  if (!res.ok) {
    console.error(`${file}: validator returned ${res.status}`);
    totalErrors++;
    continue;
  }
  const json = await res.json();
  const errors = (json.messages || []).filter((m) => m.type === "error");
  console.log(`${file}: ${errors.length} error(s)`);
  for (const e of errors) {
    console.log(`  line ${e.lastLine}: ${e.message}`);
  }
  totalErrors += errors.length;
}

console.log(`\nTotal W3C HTML errors: ${totalErrors}`);
process.exit(totalErrors > 0 ? 1 : 0);
