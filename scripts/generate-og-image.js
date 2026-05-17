#!/usr/bin/env node
// Render an Open Graph / Twitter Card image (1200×630 PNG) using the
// site's design tokens — bone-white paper, oil-black ink, terracotta
// signal accent, mono wordmark, serif headline. Output:
// src/assets/og.png. Eleventy's existing src/assets passthrough copies
// it into dist on the next build.

import puppeteer from "puppeteer-core";
import { writeFile, mkdir } from "node:fs/promises";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        --paper: #fbfaf7;
        --ink: #14110f;
        --accent: #b9472b;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: var(--paper);
        color: var(--ink);
        font-family: "Charter", "Iowan Old Style", "Cambria", "Georgia", serif;
        width: 1200px;
        height: 630px;
        overflow: hidden;
      }
      .canvas {
        position: relative;
        width: 1200px;
        height: 630px;
        padding: 64px 80px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .wordmark {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 26px;
        letter-spacing: -0.01em;
        color: var(--ink);
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .wordmark::before {
        content: "";
        display: inline-block;
        width: 14px;
        height: 14px;
        background: var(--accent);
        border-radius: 50%;
      }
      .stack { max-width: 980px; }
      .eyebrow {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 14px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--accent);
        margin: 0 0 24px 0;
      }
      h1 {
        font-family: "Charter", "Iowan Old Style", "Cambria", "Georgia", serif;
        font-weight: 600;
        font-size: 72px;
        line-height: 1.04;
        letter-spacing: -0.025em;
        margin: 0 0 28px 0;
        text-wrap: balance;
      }
      .tagline {
        font-size: 28px;
        line-height: 1.32;
        color: var(--ink);
        opacity: 0.78;
        margin: 0;
        max-width: 880px;
      }
      .meta {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 16px;
        color: var(--ink);
        opacity: 0.72;
      }
      .meta .left { display: flex; flex-direction: column; gap: 4px; }
      .meta .right { text-align: right; }
      .rule {
        height: 1px;
        background: var(--ink);
        opacity: 0.18;
        margin: 0 0 14px 0;
      }
    </style>
  </head>
  <body>
    <div class="canvas">
      <div class="wordmark">AgentReadyPOC</div>
      <div class="stack">
        <p class="eyebrow">Proof of concept</p>
        <h1>The proof-of-concept that built itself.</h1>
        <p class="tagline">A complete, modern, accessible, agent-ready site shipped end-to-end by an autonomous AI agent. Modeled for skilled-trades and local-service businesses.</p>
      </div>
      <div>
        <div class="rule"></div>
        <div class="meta">
          <div class="left">
            <span>agentreadypoc.com</span>
            <span>Built by Claude (Anthropic)</span>
          </div>
          <div class="right">v1.0.0 · MIT</div>
        </div>
      </div>
    </div>
  </body>
</html>
`;

const args = (process.env.CHROME_FLAGS ?? "--no-sandbox --disable-dev-shm-usage --disable-gpu").split(" ");

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/usr/bin/chromium",
  args,
  headless: "new",
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle0" });
  const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await mkdir("src/assets", { recursive: true });
  await writeFile("src/assets/og.png", png);
  console.log(`og.png written — ${png.length} bytes (1200×630)`);
} finally {
  await browser.close();
}
