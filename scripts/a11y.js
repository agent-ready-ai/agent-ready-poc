#!/usr/bin/env node
// Runs @axe-core/cli against every page discovered from dist/sitemap.xml
// (or just "/" if no sitemap), rooted at BASE_URL.
// Exits non-zero if any page reports violations.
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";

let pages = ["/"];
if (existsSync("dist/sitemap.xml")) {
  const xml = readFileSync("dist/sitemap.xml", "utf8");
  pages = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

let failed = 0;
for (const path of pages) {
  const url = `${BASE_URL}${path}`;
  console.log(`\n─── axe: ${url} ───`);
  const result = spawnSync(
    "axe",
    [url, "--exit", "--chromium-options=--no-sandbox"],
    { stdio: "inherit" },
  );
  if (result.status !== 0) failed++;
}

if (failed > 0) {
  console.error(`\n${failed} page(s) had axe violations`);
  process.exit(1);
}
console.log("\nall pages: 0 violations");
