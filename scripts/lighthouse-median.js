#!/usr/bin/env node
// Runs Lighthouse 3x against a URL, reports the median score per category,
// and writes the summary to lighthouse-reports/<slug>.json.
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const url = process.argv[2];
if (!url) {
  console.error("Usage: lighthouse-median.js <url>");
  process.exit(1);
}

const flags = (
  process.env.CHROME_FLAGS ?? "--no-sandbox --disable-dev-shm-usage --disable-gpu"
).split(" ");

const chrome = await chromeLauncher.launch({
  chromeFlags: flags,
  chromePath: process.env.CHROME_PATH,
});

const runs = [];
try {
  for (let i = 0; i < 3; i++) {
    const result = await lighthouse(url, { port: chrome.port, output: "json" });
    runs.push(result.lhr);
  }
} finally {
  await chrome.kill();
}

const median = (arr) => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)];
const score = (id) =>
  median(runs.map((r) => Math.round((r.categories[id]?.score ?? 0) * 100)));

const summary = {
  url,
  performance: score("performance"),
  accessibility: score("accessibility"),
  bestPractices: score("best-practices"),
  seo: score("seo"),
  cwv: {
    lcp: median(runs.map((r) => r.audits["largest-contentful-paint"]?.numericValue ?? 0)),
    cls: median(runs.map((r) => r.audits["cumulative-layout-shift"]?.numericValue ?? 0)),
    inp: median(runs.map((r) => r.audits["interaction-to-next-paint"]?.numericValue ?? 0)),
  },
};

console.log(JSON.stringify(summary, null, 2));

mkdirSync("lighthouse-reports", { recursive: true });
const slug = url.replace(/https?:\/\//, "").replace(/[^\w.-]+/g, "_");
writeFileSync(join("lighthouse-reports", `${slug}.json`), JSON.stringify(summary, null, 2));
