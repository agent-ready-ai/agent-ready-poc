#!/usr/bin/env node
// Gate 1 scanner. Cloudflare's isitagentready.com is a browser-rendered scanner
// without a documented JSON API, so for now this prints the scan URL for the
// user to open and the three categories to record into the iteration log.
const BASE_URL = process.env.BASE_URL;
if (!BASE_URL) {
  console.error("Set BASE_URL (e.g. https://your-project.pages.dev) and re-run.");
  process.exit(1);
}

let domain;
try {
  domain = new URL(BASE_URL).hostname;
} catch {
  console.error(`Invalid BASE_URL: ${BASE_URL}`);
  process.exit(1);
}

console.log(`Gate 1 scanner: https://isitagentready.com/${domain}`);
console.log("");
console.log("Open in the host browser. Record three category scores in the iteration log:");
console.log("  - Discoverability");
console.log("  - Content Accessibility");
console.log("  - Bot Access Control");
console.log("(Protocol Discovery + Commerce are N/A unless the stretch goal ships.)");
