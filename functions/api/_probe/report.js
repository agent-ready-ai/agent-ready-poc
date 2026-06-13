// Probe report assembler — pure and deterministic.
//
// buildReport() takes the raw results of fetching a target's agent surfaces and
// produces the scorecard the UI renders. It is separated from the network code
// in ../probe.js so it can be unit-tested: feed it fixture-derived `fetched`
// maps and assert the coverage board. The flatiron (7/7) vs agentreadypoc (5/7)
// contrast in test/probe.test.js is exactly this function over captured surfaces.
//
// `fetched` is a map of surface key → { ok, url, status, contentType, text, json }.
// `json` is the pre-parsed body for JSON surfaces (null if parse failed); `text`
// is the raw body for text surfaces. Missing/failed fetches pass { ok:false }.

import {
  parseLlms,
  parseCatalog,
  parseOpenApi,
  parseMcpCard,
  parseAgentSkills,
  parseRobots,
  parseOpenIdConfig,
  parsePricing,
} from "./parsers.js";

// The seven coverage dimensions, in display order, with the one-line nudge shown
// when the surface is absent ("what publishing this adds").
const SURFACE_ORDER = [
  "discoverable",
  "readable",
  "mcp",
  "skills",
  "api",
  "auth",
  "pricing",
];

const HINTS = {
  discoverable:
    "Publishing /llms.txt gives agents a one-page map of your site and its key URLs.",
  readable:
    "Serving Markdown (Accept: text/markdown, or .md alternates) lets agents read content without parsing HTML.",
  mcp: "A /.well-known/mcp/server-card.json advertises callable tools to MCP clients.",
  skills:
    "An /.well-known/agent-skills/index.json lists discrete skills an agent can invoke.",
  api: "An OpenAPI document (/openapi.json) or an api-catalog describes your HTTP API to agents.",
  auth: "An /.well-known/openid-configuration lets agents discover how to authenticate.",
  pricing:
    "A /pricing.md (or priced API) tells agents what an action costs before they take it.",
};

const LABELS = {
  discoverable: "Discoverable",
  readable: "Readable",
  mcp: "MCP",
  skills: "Skills",
  api: "API",
  auth: "Auth",
  pricing: "Pricing",
};

function get(fetched, key) {
  return (fetched && fetched[key]) || { ok: false };
}

function looksLikeHtml(text) {
  return (
    typeof text === "string" && /<(!doctype|html)\b/i.test(text.slice(0, 200))
  );
}

export function buildReport(target, fetched) {
  const surfaces = {};

  // ---- Discoverable: llms.txt (primary) or robots.txt with a sitemap ----
  {
    const llms = get(fetched, "llms");
    const robots = get(fetched, "robots");
    const hasLlms = !!(
      llms.ok &&
      typeof llms.text === "string" &&
      llms.text.trim() &&
      !looksLikeHtml(llms.text)
    );
    const robotsParsed =
      robots.ok && typeof robots.text === "string"
        ? parseRobots(robots.text)
        : null;
    const hasSitemap = !!(robotsParsed && robotsParsed.sitemaps.length);
    const items = [];
    let summary = "";
    let url = null;
    if (hasLlms) {
      const p = parseLlms(llms.text, target);
      url = llms.url;
      summary =
        `llms.txt — ${p.links.length} link${p.links.length === 1 ? "" : "s"}` +
        (p.sections.length
          ? `, ${p.sections.length} section${p.sections.length === 1 ? "" : "s"}`
          : "");
      if (p.title) items.push({ label: "Title", value: p.title });
      for (const s of p.sections.slice(0, 8))
        items.push({ label: "Section", value: s.title });
    } else if (hasSitemap) {
      url = robots.url;
      summary = "No llms.txt, but robots.txt advertises a sitemap";
      items.push({ label: "Sitemap", value: robotsParsed.sitemaps[0] });
    }
    surfaces.discoverable = {
      present: hasLlms || hasSitemap,
      url,
      summary,
      items,
      hint: HINTS.discoverable,
    };
  }

  // ---- Readable: Markdown content negotiation, or a full-text dump ----
  {
    const homeMd = get(fetched, "homeMd");
    const llmsFull = get(fetched, "llmsFull");
    const negotiated = !!(
      homeMd.ok && /text\/markdown/i.test(homeMd.contentType || "")
    );
    const hasFull = !!(
      llmsFull.ok &&
      typeof llmsFull.text === "string" &&
      llmsFull.text.trim() &&
      !looksLikeHtml(llmsFull.text)
    );
    const items = [];
    if (negotiated)
      items.push({
        label: "Negotiation",
        value: "GET / with Accept: text/markdown → text/markdown",
      });
    if (hasFull) items.push({ label: "Full text", value: llmsFull.url });
    surfaces.readable = {
      present: negotiated || hasFull,
      url: negotiated ? homeMd.url : hasFull ? llmsFull.url : null,
      summary: negotiated
        ? "Serves Markdown via content negotiation"
        : hasFull
          ? "Exposes a concatenated full-text document"
          : "",
      items,
      hint: HINTS.readable,
    };
  }

  // ---- MCP: server-card ----
  {
    const mcp = get(fetched, "mcp");
    const p = mcp.ok && mcp.json ? parseMcpCard(mcp.json) : null;
    const present = !!(p && (p.name || p.tools.length || p.endpoint));
    const items = [];
    if (p) {
      if (p.endpoint) items.push({ label: "Endpoint", value: p.endpoint });
      for (const t of p.tools.slice(0, 12))
        items.push({ label: t.name, value: t.description });
    }
    surfaces.mcp = {
      present,
      url: present ? mcp.url : null,
      summary: present
        ? (p.name ? `${p.name} — ` : "") +
          `${p.tools.length} tool${p.tools.length === 1 ? "" : "s"}`
        : "",
      items,
      hint: HINTS.mcp,
    };
  }

  // ---- Skills: agent-skills index ----
  {
    const skills = get(fetched, "skills");
    const p =
      skills.ok && skills.json ? parseAgentSkills(skills.json, target) : null;
    const present = !!(p && p.skills.length);
    const items = [];
    if (p)
      for (const s of p.skills.slice(0, 12))
        items.push({ label: s.name, value: s.description });
    surfaces.skills = {
      present,
      url: present ? skills.url : null,
      summary: present
        ? `${p.skills.length} skill${p.skills.length === 1 ? "" : "s"}`
        : "",
      items,
      hint: HINTS.skills,
    };
  }

  // ---- API: OpenAPI doc and/or an api-catalog that advertises one ----
  {
    const openapi = get(fetched, "openapi");
    const catalog = get(fetched, "catalog");
    const op = openapi.ok && openapi.json ? parseOpenApi(openapi.json) : null;
    const catEntries =
      catalog.ok && catalog.json ? parseCatalog(catalog.json, target) : [];
    const advertisesApi = catEntries.some(
      (e) =>
        /service-desc|openapi/i.test(e.rel || "") ||
        /openapi/i.test(e.type || "") ||
        /openapi/i.test(e.href || ""),
    );
    const hasOps = !!(op && op.operations.length);
    const present = hasOps || advertisesApi || catEntries.length > 0;
    const items = [];
    if (hasOps) {
      for (const o of op.operations.slice(0, 12)) {
        items.push({ label: `${o.method} ${o.path}`, value: o.summary });
      }
    }
    for (const e of catEntries.slice(0, 8)) {
      items.push({ label: `catalog: ${e.rel || "link"}`, value: e.href });
    }
    let summary = "";
    if (hasOps) {
      summary = `OpenAPI — ${op.operations.length} operation${op.operations.length === 1 ? "" : "s"}`;
    } else if (advertisesApi && openapi.url && !openapi.ok) {
      summary = `api-catalog advertises an OpenAPI doc, but it returned ${openapi.status || "no response"}`;
    } else if (catEntries.length) {
      summary = `api-catalog with ${catEntries.length} entr${catEntries.length === 1 ? "y" : "ies"}`;
    }
    surfaces.api = {
      present,
      url: present ? (hasOps ? openapi.url : catalog.url) : null,
      summary,
      items,
      hint: HINTS.api,
    };
  }

  // ---- Auth: OpenID configuration (presence only; never called) ----
  {
    const openid = get(fetched, "openid");
    const p = openid.ok && openid.json ? parseOpenIdConfig(openid.json) : null;
    const present = !!(p && p.issuer);
    const items = [];
    if (p) {
      if (p.issuer) items.push({ label: "Issuer", value: p.issuer });
      if (p.grantTypes.length)
        items.push({ label: "Grant types", value: p.grantTypes.join(", ") });
    }
    surfaces.auth = {
      present,
      url: present ? openid.url : null,
      summary: present ? "OpenID configuration present (not invoked)" : "",
      items,
      hint: HINTS.auth,
    };
  }

  // ---- Pricing: pricing.md ----
  {
    const pricing = get(fetched, "pricing");
    const usable = !!(
      pricing.ok &&
      typeof pricing.text === "string" &&
      pricing.text.trim() &&
      !looksLikeHtml(pricing.text)
    );
    const p = usable ? parsePricing(pricing.text) : null;
    const items = [];
    if (p) {
      if (p.title) items.push({ label: "Title", value: p.title });
      if (p.summary) items.push({ label: "Summary", value: p.summary });
    }
    surfaces.pricing = {
      present: usable,
      url: usable ? pricing.url : null,
      summary: usable ? p.title || "Pricing document present" : "",
      items,
      hint: HINTS.pricing,
    };
  }

  const coverage = {};
  let scoreValue = 0;
  for (const key of SURFACE_ORDER) {
    coverage[key] = !!surfaces[key].present;
    surfaces[key].label = LABELS[key];
    if (coverage[key]) scoreValue += 1;
  }

  return {
    target,
    coverage,
    score: `${scoreValue}/${SURFACE_ORDER.length}`,
    scoreValue,
    order: SURFACE_ORDER,
    surfaces,
  };
}

export { SURFACE_ORDER, LABELS, HINTS };
