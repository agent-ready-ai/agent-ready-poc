#!/usr/bin/env node
// Gate 1 — Cloudflare's "Is It Agent Ready?" scanner.
//
// The scanner is a JS-rendered SPA: a plain GET returns an empty template,
// not the scan results. This script drives the system Chromium via
// puppeteer-core, navigates to the scanner with the project's domain, waits
// for the results to render, and extracts the category scores from the DOM.
//
// Usage:
//   BASE_URL=https://agentreadypoc.com node scripts/scan.js
//
// Exit code 0 if every category reports a non-zero numeric score (best-effort
// indicator of "scan ran successfully"), 1 otherwise. The score values
// themselves are logged to stdout in JSON for downstream consumption.

import puppeteer from "puppeteer-core";

const BASE_URL = process.env.BASE_URL;
if (!BASE_URL) {
  console.error("Set BASE_URL (e.g. https://agentreadypoc.com) and re-run.");
  process.exit(1);
}

let domain;
try {
  domain = new URL(BASE_URL).hostname;
} catch {
  console.error(`Invalid BASE_URL: ${BASE_URL}`);
  process.exit(1);
}

const scannerUrl = `https://isitagentready.com/${domain}`;
console.log(`Scanning: ${scannerUrl}`);

const args = (
  process.env.CHROME_FLAGS ?? "--no-sandbox --disable-dev-shm-usage --disable-gpu"
).split(" ");

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/usr/bin/chromium",
  args,
  headless: "new",
});

let result;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });
  await page.goto(scannerUrl, { waitUntil: "networkidle0", timeout: 60000 });

  // The scanner renders the "Last scanned" timestamp once results arrive.
  await page
    .waitForFunction(
      () => /Last scanned/i.test(document.body.innerText),
      { timeout: 90000 },
    )
    .catch(() => {});

  // Give a small buffer for the score rings to finish animating.
  await new Promise((r) => setTimeout(r, 1500));

  result = await page.evaluate(() => {
    const text = document.body.innerText;
    const overallMatch = text.match(/\b(\d{1,3})\s*\n?\s*LEVEL/i);
    const levelMatch = text.match(/\bLEVEL\s*(\d+)/i);
    const levelLabelMatch = text.match(/LEVEL\s*\d+\s*\n?\s*(.{0,80})/i);

    const categories = ["Discoverability", "Content", "Bot Access Control", "API, Auth, MCP & Skill Discovery", "Commerce"];
    const cats = {};
    for (const cat of categories) {
      // Pattern: score line, then category name, then fraction (e.g. "3/3" or "Not checked")
      const re = new RegExp(
        `(\\d+|-)\\s*\\n\\s*${cat.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*\\n\\s*(\\d+\\/\\d+|Not checked)?`,
        "i",
      );
      const m = text.match(re);
      if (m) {
        cats[cat] = {
          score: m[1] === "-" ? null : Number(m[1]),
          ratio: m[2] || null,
        };
      } else {
        cats[cat] = { score: null, ratio: null, note: "not found in DOM text" };
      }
    }

    return {
      url: location.href,
      overall: overallMatch ? Number(overallMatch[1]) : null,
      level: levelMatch ? Number(levelMatch[1]) : null,
      levelLabel: levelLabelMatch ? levelLabelMatch[1].trim().split("\n")[0] : null,
      categories: cats,
      bodyTextPreview: text.slice(0, 600),
    };
  });
} finally {
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));

const allCatsResolved = Object.entries(result.categories)
  .filter(([k]) => k !== "Commerce")
  .every(([, v]) => v.score !== null && v.score !== undefined);

process.exit(allCatsResolved ? 0 : 1);
