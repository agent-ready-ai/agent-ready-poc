// Probe unit tests — deterministic parsers + report assembly over captured
// fixtures. Same input → same output. Run with `npm test` (node --test).
//
// Fixtures live in test/fixtures/{flatiron,agentreadypoc}/ and are real surfaces
// captured from the live sites: a rich 7/7 board (flatiron, including an
// api-catalog that advertises an openapi.json which 404s) and a 5/7 board
// (agentreadypoc — no OpenID auth, no pricing.md). The two contrast is itself a
// test of buildReport.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  parseLlms,
  parseCatalog,
  parseOpenApi,
  parseMcpCard,
  parseAgentSkills,
  parseRobots,
  parseOpenIdConfig,
  parsePricing,
} from "../functions/api/_probe/parsers.js";
import { buildReport } from "../functions/api/_probe/report.js";
import { buildSummaryPrompt } from "../functions/api/_probe/ai.js";
import { classifyTool, diffTools } from "../functions/api/_probe/mcp.js";
import {
  isBlockedHost,
  validateMcpEndpoint,
  normalizeTarget,
} from "../functions/api/_probe/ssrf.js";

const here = dirname(fileURLToPath(import.meta.url));
const fx = (site, file) =>
  readFileSync(join(here, "fixtures", site, file), "utf8");
const fxJson = (site, file) => JSON.parse(fx(site, file));

// ----------------------------------------------------------------------------
// Parsers: divergent real-world schemas
// ----------------------------------------------------------------------------

test("parseLlms extracts title, sections, and links", () => {
  const p = parseLlms(fx("flatiron", "llms.txt"));
  assert.equal(p.title, "Flatiron Building");
  assert.ok(p.sections.length >= 1);
  assert.ok(p.links.some((l) => l.url.includes("api-catalog")));
});

test("parseLlms captures relative links and resolves them against baseUrl", () => {
  const p = parseLlms(
    fx("agentreadypoc", "llms.txt"),
    "https://agentreadypoc.com",
  );
  assert.ok(p.links.length >= 10, "should find the relative page links");
  // Relative hrefs resolve against the base; external absolute links stay as-is.
  assert.ok(p.links.some((l) => l.url === "https://agentreadypoc.com/about/"));
  assert.ok(p.links.every((l) => /^https?:\/\//.test(l.url)));
  assert.ok(p.sections.some((s) => s.title === "Pages"));
});

test("parseCatalog handles the plain {endpoints:[]} shape (flatiron)", () => {
  const entries = parseCatalog(
    fxJson("flatiron", "api-catalog.json"),
    "https://flatironbuildingnyc.com",
  );
  assert.ok(entries.length >= 4);
  assert.ok(entries.some((e) => /openapi/i.test(e.href)));
  assert.ok(entries.every((e) => e.href.startsWith("https://")));
});

test("parseCatalog handles the RFC-9264 {linkset:[]} shape (agentreadypoc)", () => {
  const entries = parseCatalog(
    fxJson("agentreadypoc", "api-catalog.json"),
    "https://agentreadypoc.com",
  );
  assert.ok(
    entries.some(
      (e) => e.rel === "service-desc" && /openapi\.json/.test(e.href),
    ),
  );
});

test("parseOpenApi flattens paths into operations", () => {
  const p = parseOpenApi(fxJson("agentreadypoc", "openapi.json"));
  assert.ok(p.operations.length >= 1);
  for (const op of p.operations) {
    assert.match(op.method, /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/);
    assert.ok(op.path.startsWith("/"));
  }
});

test("parseMcpCard handles top-level serverInfo+tools (agentreadypoc)", () => {
  const p = parseMcpCard(fxJson("agentreadypoc", "mcp-server-card.json"));
  assert.ok(p.tools.length >= 2);
  assert.ok(p.tools.some((t) => t.name === "get_organization_info"));
});

test("parseMcpCard handles the mcpServers[] shape (flatiron)", () => {
  const p = parseMcpCard(fxJson("flatiron", "mcp-server-card.json"));
  assert.equal(p.name, "Flatiron Building");
  assert.ok(p.endpoint.includes("/api/mcp"));
});

test("parseAgentSkills handles url-keyed skills (agentreadypoc)", () => {
  const p = parseAgentSkills(
    fxJson("agentreadypoc", "agent-skills.json"),
    "https://agentreadypoc.com",
  );
  assert.ok(
    p.skills.some(
      (s) => s.name === "get_organization_info" && s.url.startsWith("https://"),
    ),
  );
});

test("parseAgentSkills handles path-keyed skills (flatiron)", () => {
  const p = parseAgentSkills(
    fxJson("flatiron", "agent-skills.json"),
    "https://flatironbuildingnyc.com",
  );
  assert.equal(p.skills.length, 1);
  assert.ok(p.skills[0].url.startsWith("https://flatironbuildingnyc.com/"));
});

test("parseRobots reads sitemaps and content-signals", () => {
  const p = parseRobots(fx("agentreadypoc", "robots.txt"));
  assert.ok(p.sitemaps.length >= 1);
});

test("parseOpenIdConfig reports presence only (no endpoints invoked)", () => {
  const p = parseOpenIdConfig(fxJson("flatiron", "openid-configuration.json"));
  assert.equal(p.issuer, "https://flatironbuildingnyc.com");
  assert.equal(p.hasAuthorization, true);
  assert.ok(p.grantTypes.includes("authorization_code"));
});

test("parsePricing extracts a title and summary", () => {
  const p = parsePricing(fx("flatiron", "pricing.md"));
  assert.match(p.title, /Pricing/i);
  assert.ok(p.summary.length > 0);
});

// ----------------------------------------------------------------------------
// Robustness: malformed / missing / wrong-typed input must never throw
// ----------------------------------------------------------------------------

test("parsers return empty shapes on garbage input instead of throwing", () => {
  const garbage = [null, undefined, 42, "", "{not json", [], {}];
  for (const g of garbage) {
    assert.doesNotThrow(() => parseLlms(g));
    assert.doesNotThrow(() => parseCatalog(g));
    assert.doesNotThrow(() => parseOpenApi(g));
    assert.doesNotThrow(() => parseMcpCard(g));
    assert.doesNotThrow(() => parseAgentSkills(g));
    assert.doesNotThrow(() => parseRobots(g));
    assert.doesNotThrow(() => parseOpenIdConfig(g));
    assert.doesNotThrow(() => parsePricing(g));
  }
  assert.deepEqual(parseCatalog({}), []);
  assert.deepEqual(parseOpenApi({}).operations, []);
});

// ----------------------------------------------------------------------------
// buildReport: the rich-vs-sparse contrast over assembled fetch results
// ----------------------------------------------------------------------------

function ok(extra = {}) {
  return {
    ok: true,
    status: 200,
    contentType: "",
    text: "",
    url: "",
    ...extra,
  };
}
const miss = {
  ok: false,
  status: 404,
  contentType: "text/html",
  text: "<!doctype html><title>404</title>",
  url: "",
};

test("buildReport scores flatiron 7/7 (incl. advertised-but-404 openapi)", () => {
  const target = "https://flatironbuildingnyc.com";
  const report = buildReport(target, {
    llms: ok({
      text: fx("flatiron", "llms.txt"),
      contentType: "text/plain",
      url: target + "/llms.txt",
    }),
    robots: ok({
      text: fx("flatiron", "robots.txt"),
      contentType: "text/plain",
      url: target + "/robots.txt",
    }),
    catalog: ok({
      json: fxJson("flatiron", "api-catalog.json"),
      url: target + "/.well-known/api-catalog.json",
    }),
    // catalog advertises /openapi.json, but it 404s — Probe must still mark API present
    openapi: {
      ok: false,
      status: 404,
      contentType: "text/html",
      text: fx("flatiron", "openapi-404.html"),
      url: target + "/openapi.json",
    },
    mcp: ok({
      json: fxJson("flatiron", "mcp-server-card.json"),
      url: target + "/.well-known/mcp/server-card.json",
    }),
    skills: ok({
      json: fxJson("flatiron", "agent-skills.json"),
      url: target + "/.well-known/agent-skills/index.json",
    }),
    openid: ok({
      json: fxJson("flatiron", "openid-configuration.json"),
      url: target + "/.well-known/openid-configuration",
    }),
    pricing: ok({
      text: fx("flatiron", "pricing.md"),
      contentType: "text/markdown",
      url: target + "/pricing.md",
    }),
    homeMd: ok({
      contentType: "text/markdown; charset=utf-8",
      url: target + "/",
    }),
    llmsFull: ok({
      text: "# Flatiron full text",
      contentType: "text/plain",
      url: target + "/llms-full.txt",
    }),
  });

  assert.equal(report.scoreValue, 7);
  assert.equal(report.score, "7/7");
  for (const k of report.order)
    assert.equal(report.coverage[k], true, `${k} should be present`);
  // The advertised-but-broken openapi is surfaced honestly:
  assert.match(report.surfaces.api.summary, /catalog/i);
});

test("buildReport scores agentreadypoc 5/7 (no auth, no pricing)", () => {
  const target = "https://agentreadypoc.com";
  const report = buildReport(target, {
    llms: ok({
      text: fx("agentreadypoc", "llms.txt"),
      contentType: "text/plain",
      url: target + "/llms.txt",
    }),
    robots: ok({
      text: fx("agentreadypoc", "robots.txt"),
      contentType: "text/plain",
      url: target + "/robots.txt",
    }),
    catalog: ok({
      json: fxJson("agentreadypoc", "api-catalog.json"),
      url: target + "/.well-known/api-catalog",
    }),
    openapi: ok({
      json: fxJson("agentreadypoc", "openapi.json"),
      url: target + "/openapi.json",
    }),
    mcp: ok({
      json: fxJson("agentreadypoc", "mcp-server-card.json"),
      url: target + "/.well-known/mcp/server-card.json",
    }),
    skills: ok({
      json: fxJson("agentreadypoc", "agent-skills.json"),
      url: target + "/.well-known/agent-skills/index.json",
    }),
    openid: miss, // no OpenID
    pricing: miss, // no pricing.md
    homeMd: ok({
      contentType: "text/markdown; charset=utf-8",
      url: target + "/",
    }),
    llmsFull: ok({
      text: "# full text",
      contentType: "text/plain",
      url: target + "/llms-full.txt",
    }),
  });

  assert.equal(report.score, "5/7");
  assert.equal(report.coverage.auth, false);
  assert.equal(report.coverage.pricing, false);
  for (const k of ["discoverable", "readable", "mcp", "skills", "api"]) {
    assert.equal(report.coverage[k], true, `${k} should be present`);
  }
  // Absent surfaces carry a "what publishing this adds" hint.
  assert.ok(report.surfaces.auth.hint.length > 0);
  assert.ok(report.surfaces.pricing.hint.length > 0);
});

test("buildReport degrades to 0/7 when everything is missing", () => {
  const report = buildReport("https://example.com", {
    llms: miss,
    robots: miss,
    catalog: miss,
    openapi: miss,
    mcp: miss,
    skills: miss,
    openid: miss,
    pricing: miss,
    homeMd: miss,
    llmsFull: miss,
  });
  assert.equal(report.scoreValue, 0);
  for (const k of report.order) assert.equal(report.coverage[k], false);
});

// ----------------------------------------------------------------------------
// AI summary prompt builder (pure; the network call is not unit-tested)
// ----------------------------------------------------------------------------

test("buildSummaryPrompt grounds the prompt in the report facts only", () => {
  const report = {
    target: "https://example.com",
    score: "2/7",
    order: ["discoverable", "mcp", "auth"],
    surfaces: {
      discoverable: {
        label: "Discoverable",
        present: true,
        summary: "llms.txt — 5 links",
      },
      mcp: { label: "MCP", present: true, summary: "2 tools" },
      auth: { label: "Auth", present: false, summary: "" },
    },
  };
  const msgs = buildSummaryPrompt(report);
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].role, "system");
  assert.equal(msgs[1].role, "user");
  // The system prompt forbids invention and asks for grounded narration.
  assert.match(msgs[0].content, /ONLY the facts/i);
  // The user message carries the target, the present surfaces, and the absent one.
  assert.match(msgs[1].content, /example\.com/);
  assert.match(msgs[1].content, /llms\.txt — 5 links/);
  assert.match(msgs[1].content, /Auth: absent/);
});

// ----------------------------------------------------------------------------
// MCP safety classification + drift (pure)
// ----------------------------------------------------------------------------

test("classifyTool: read-only, no-arg tool is safe", () => {
  const t = {
    name: "get_organization_info",
    annotations: { readOnlyHint: true, destructiveHint: false },
    inputSchema: { type: "object", properties: {} },
  };
  const v = classifyTool(t);
  assert.equal(v.safe, true);
  assert.deepEqual(v.reasons, []);
  assert.deepEqual(v.requiredArgs, []);
});

test("classifyTool: a tool requiring args (e.g. submit_contact) is never safe", () => {
  const t = {
    name: "submit_contact",
    annotations: { readOnlyHint: false, destructiveHint: false },
    inputSchema: {
      type: "object",
      required: ["name", "email", "message", "cf_turnstile_response"],
    },
  };
  const v = classifyTool(t);
  assert.equal(v.safe, false);
  assert.ok(v.reasons.some((r) => /not annotated read-only/.test(r)));
  assert.ok(v.reasons.some((r) => /requires arguments/.test(r)));
});

test("classifyTool: unannotated no-arg tool is NOT auto-trusted", () => {
  const v = classifyTool({ name: "mystery", inputSchema: { type: "object" } });
  assert.equal(v.safe, false);
  assert.deepEqual(v.reasons, ["not annotated read-only"]);
});

test("classifyTool: an explicitly destructive tool is unsafe even if read-only-ish", () => {
  const v = classifyTool({
    name: "wipe",
    annotations: { readOnlyHint: true, destructiveHint: true },
  });
  assert.equal(v.safe, false);
  assert.ok(v.reasons.some((r) => /destructive/.test(r)));
});

test("diffTools detects card-vs-live drift", () => {
  const card = [{ name: "a" }, { name: "b" }];
  const live = [{ name: "b" }, { name: "c" }];
  const d = diffTools(card, live);
  assert.deepEqual(d.cardOnly, ["a"]);
  assert.deepEqual(d.liveOnly, ["c"]);
  assert.deepEqual(d.inBoth, ["b"]);
  assert.equal(d.drift, true);
});

test("diffTools: identical lists report no drift", () => {
  const d = diffTools([{ name: "x" }], [{ name: "x" }]);
  assert.equal(d.drift, false);
});

// ----------------------------------------------------------------------------
// SSRF guard (security-critical; shared by probe.js and probe-mcp.js)
// ----------------------------------------------------------------------------

test("isBlockedHost blocks private, loopback, link-local, and metadata hosts", () => {
  for (const h of [
    "localhost",
    "127.0.0.1",
    "10.0.0.5",
    "192.168.1.1",
    "172.16.0.1",
    "169.254.169.254",
    "::1",
    "foo.internal",
    "100.64.0.1",
  ]) {
    assert.equal(isBlockedHost(h), true, `${h} should be blocked`);
  }
});

test("isBlockedHost allows public hosts", () => {
  for (const h of [
    "agentreadypoc.com",
    "flatironbuildingnyc.com",
    "1.1.1.1",
    "8.8.8.8",
  ]) {
    assert.equal(isBlockedHost(h), false, `${h} should be allowed`);
  }
});

test("validateMcpEndpoint requires https to a public host", () => {
  assert.ok(validateMcpEndpoint("https://agentreadypoc.com/mcp"));
  assert.equal(validateMcpEndpoint("http://agentreadypoc.com/mcp"), null); // http rejected
  assert.equal(validateMcpEndpoint("https://127.0.0.1/mcp"), null); // private rejected
  assert.equal(validateMcpEndpoint("https://169.254.169.254/mcp"), null); // metadata rejected
  assert.equal(validateMcpEndpoint("not a url"), null);
});

test("normalizeTarget defaults to https origin and blocks private hosts", () => {
  assert.equal(
    normalizeTarget("agentreadypoc.com").origin,
    "https://agentreadypoc.com",
  );
  assert.equal(normalizeTarget("http://localhost:9000"), null);
});

// ----------------------------------------------------------------------------
// SSRF guard — IPv6 bypass hardening (regression tests for the security review)
// ----------------------------------------------------------------------------

test("isBlockedHost blocks IPv4-mapped IPv6 and NAT64 wrappers", () => {
  for (const h of [
    "::ffff:169.254.169.254", // metadata, dotted-mapped
    "::ffff:a9fe:a9fe", // metadata, hex-mapped (WHATWG serialization)
    "::ffff:127.0.0.1", // loopback mapped
    "::ffff:7f00:1", // loopback mapped, hex
    "::ffff:10.0.0.1", // RFC1918 mapped
    "64:ff9b::a9fe:a9fe", // NAT64 of metadata
    "64:ff9b::169.254.169.254", // NAT64, dotted
    "::1", // loopback
    "::", // unspecified
    "fe80::1", // link-local
    "fc00::1", // ULA
  ]) {
    assert.equal(isBlockedHost(h), true, `${h} should be blocked`);
  }
});

test("isBlockedHost still allows global unicast IPv6", () => {
  for (const h of ["2606:4700:4700::1111", "2001:4860:4860::8888"]) {
    assert.equal(isBlockedHost(h), false, `${h} should be allowed`);
  }
});

test("validateMcpEndpoint rejects mapped/NAT64 IPv6 endpoints", () => {
  assert.equal(
    validateMcpEndpoint("https://[::ffff:169.254.169.254]/mcp"),
    null,
  );
  assert.equal(validateMcpEndpoint("https://[64:ff9b::a9fe:a9fe]/mcp"), null);
  assert.equal(validateMcpEndpoint("https://[::1]/mcp"), null);
});

test("normalizeTarget rejects mapped-IPv6 metadata targets", () => {
  assert.equal(normalizeTarget("http://[::ffff:169.254.169.254]"), null);
  assert.equal(normalizeTarget("https://[::ffff:127.0.0.1]"), null);
});
