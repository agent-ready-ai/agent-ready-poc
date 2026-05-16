#!/usr/bin/env node
// Runs Lighthouse against a URL across desktop and mobile form factors,
// reporting the 3-run median for each. GOAL.md Gate 2 thresholds differ
// per form factor (desktop ≥95 perf, mobile ≥90 perf), so both are tested.
// JSON written to lighthouse-reports/<slug>.json.
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
if (!flags.some((f) => f.startsWith("--headless"))) flags.push("--headless=new");

const desktopConfig = {
  extends: "lighthouse:default",
  settings: {
    formFactor: "desktop",
    screenEmulation: { disabled: true },
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },
  },
};

const chrome = await chromeLauncher.launch({
  chromeFlags: flags,
  chromePath: process.env.CHROME_PATH,
});

async function runAll(config) {
  const runs = [];
  for (let i = 0; i < 3; i++) {
    const r = await lighthouse(url, { port: chrome.port, output: "json" }, config);
    runs.push(r.lhr);
  }
  return runs;
}

const median = (arr) => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)];
const summarize = (runs) => ({
  performance: median(runs.map((r) => Math.round(r.categories.performance.score * 100))),
  accessibility: median(runs.map((r) => Math.round(r.categories.accessibility.score * 100))),
  bestPractices: median(runs.map((r) => Math.round(r.categories["best-practices"].score * 100))),
  seo: median(runs.map((r) => Math.round(r.categories.seo.score * 100))),
  cwv: {
    lcp: Math.round(median(runs.map((r) => r.audits["largest-contentful-paint"].numericValue))),
    cls: median(runs.map((r) => r.audits["cumulative-layout-shift"].numericValue)),
    inp: median(runs.map((r) => r.audits["interaction-to-next-paint"]?.numericValue ?? 0)),
  },
});

let result;
try {
  const mobileRuns = await runAll();
  const desktopRuns = await runAll(desktopConfig);
  result = {
    url,
    mobile: summarize(mobileRuns),
    desktop: summarize(desktopRuns),
  };
} finally {
  await chrome.kill();
}

console.log(JSON.stringify(result, null, 2));

mkdirSync("lighthouse-reports", { recursive: true });
const slug = url.replace(/https?:\/\//, "").replace(/[^\w.-]+/g, "_");
writeFileSync(join("lighthouse-reports", `${slug}.json`), JSON.stringify(result, null, 2));
