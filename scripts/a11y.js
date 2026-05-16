#!/usr/bin/env node
// Runs axe-core via @axe-core/puppeteer against every page discovered from
// dist/sitemap.xml (or just "/" if no sitemap), rooted at BASE_URL. Uses
// puppeteer-core driving the system Chromium over CDP — avoids the
// chromedriver/selenium dependency that @axe-core/cli requires.
// Exits non-zero if any page reports violations.
import puppeteer from "puppeteer-core";
import { AxePuppeteer } from "@axe-core/puppeteer";
import { readFileSync, existsSync } from "node:fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";

let pages = ["/"];
if (existsSync("dist/sitemap.xml")) {
  const xml = readFileSync("dist/sitemap.xml", "utf8");
  pages = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

const args = (
  process.env.CHROME_FLAGS ?? "--no-sandbox --disable-dev-shm-usage --disable-gpu"
).split(" ");

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/usr/bin/chromium",
  args,
  headless: "new",
});

let failed = 0;
try {
  for (const path of pages) {
    const url = `${BASE_URL}${path}`;
    console.log(`\n─── axe: ${url} ───`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    const results = await new AxePuppeteer(page).analyze();
    await page.close();

    const violations = results.violations ?? [];
    console.log(`  ${violations.length} violation type(s)`);
    for (const v of violations) {
      console.log(`  - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? "" : "s"})`);
    }
    if (violations.length > 0) failed++;
  }
} finally {
  await browser.close();
}

if (failed > 0) {
  console.error(`\n${failed} page(s) had axe violations`);
  process.exit(1);
}
console.log("\nall pages: 0 violations");
