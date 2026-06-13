// Probe parsers — pure, deterministic, side-effect-free.
//
// Each parser takes already-fetched text or JSON and returns a normalized shape.
// No network, no Date, no runtime-specific APIs: this module is imported by both
// the Pages Function (Workers runtime) and the Node test runner, and every export
// is unit-tested against captured fixtures (same input → same output).
//
// Robustness is a hard requirement: agent surfaces in the wild use divergent
// schemas (RFC-9264 linksets vs. plain endpoint arrays; MCP cards with a
// top-level serverInfo vs. an mcpServers array; skills keyed on `url` vs `path`).
// Every parser tolerates partial, missing, or malformed input and returns its
// empty shape rather than throwing. Callers still wrap in try/catch as defense in
// depth, but a parser that throws on bad data is a bug.
//
// To add a parser: write a pure `parseX(input, baseUrl?)` here, add a fixture
// under test/fixtures/, assert its output in test/probe.test.js, then wire it
// into the fetch orchestration in ../probe.js. See README "How Probe works".

function asArray(v) {
  return Array.isArray(v) ? v : v == null ? [] : [v];
}

function str(v, max = 300) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function resolveUrl(href, baseUrl) {
  if (!href || typeof href !== "string") return "";
  try {
    return new URL(href, baseUrl || undefined).toString();
  } catch {
    return href;
  }
}

// 1. llms.txt — a Markdown map. Pull the H1 title, the H2 section headings, and
//    every link (Markdown `[label](url)` and bare `- Label: url` forms), keeping
//    both absolute https links and root-relative paths. Relative hrefs resolve
//    against baseUrl so the report shows absolute URLs.
export function parseLlms(text, baseUrl = "") {
  const out = { title: "", sections: [], links: [] };
  if (typeof text !== "string") return out;
  let current = null;
  const add = (label, href) => {
    const link = {
      label: String(label).trim().slice(0, 120),
      url: resolveUrl(href, baseUrl),
    };
    out.links.push(link);
    if (current) current.links.push(link);
  };
  for (const line of text.split(/\r?\n/)) {
    const h1 = /^#\s+(.+)/.exec(line);
    if (h1 && !out.title) {
      out.title = h1[1].trim().slice(0, 200);
      continue;
    }
    const h2 = /^##\s+(.+)/.exec(line);
    if (h2) {
      current = { title: h2[1].trim().slice(0, 120), links: [] };
      out.sections.push(current);
      continue;
    }
    const md = /\[([^\]]+)\]\((\/[^\s)]*|https?:\/\/[^\s)]+)\)/g;
    let m;
    let matchedMd = false;
    while ((m = md.exec(line))) {
      add(m[1], m[2]);
      matchedMd = true;
    }
    // Bare "- Label: url" form. The label excludes brackets/parens so this never
    // re-fires on a Markdown-link line (whose embedded "https:" colon would
    // otherwise split the line in the wrong place).
    if (!matchedMd) {
      const bare = /^[-*]\s+([^:[\]()]+):\s*(\/\S+|https?:\/\/\S+)/.exec(line);
      if (bare) add(bare[1], bare[2]);
    }
  }
  return out;
}

// 2. api-catalog — RFC 9264 linkset `{linkset:[{anchor,<rel>:[{href,type}]}]}`
//    OR a plain `{endpoints:[{path|href,rel,type}]}`. Returns normalized
//    `[{href, rel, type}]` with hrefs resolved against baseUrl.
export function parseCatalog(json, baseUrl = "") {
  const out = [];
  if (!json || typeof json !== "object") return out;

  for (const e of asArray(json.endpoints)) {
    if (!e || typeof e !== "object") continue;
    const href = e.href || e.path || e.url;
    if (!href) continue;
    out.push({
      href: resolveUrl(href, baseUrl),
      rel: str(e.rel, 80),
      type: str(e.type, 120),
    });
  }

  for (const ctx of asArray(json.linkset)) {
    if (!ctx || typeof ctx !== "object") continue;
    for (const [rel, val] of Object.entries(ctx)) {
      if (rel === "anchor") continue;
      for (const link of asArray(val)) {
        if (link && link.href) {
          out.push({
            href: resolveUrl(link.href, baseUrl),
            rel,
            type: str(link.type, 120),
          });
        }
      }
    }
  }
  return out;
}

// 3. OpenAPI — flatten `paths` into operations `[{method, path, summary, params}]`.
export function parseOpenApi(json) {
  const out = { title: "", version: "", operations: [] };
  if (!json || typeof json !== "object") return out;
  out.title = str(json.info && json.info.title, 200);
  out.version = str(json.info && json.info.version, 40);
  const methods = ["get", "post", "put", "patch", "delete", "head", "options"];
  const paths = json.paths && typeof json.paths === "object" ? json.paths : {};
  for (const [path, item] of Object.entries(paths)) {
    if (!item || typeof item !== "object") continue;
    for (const method of methods) {
      const op = item[method];
      if (!op || typeof op !== "object") continue;
      const params = asArray(op.parameters)
        .map((p) => (p && p.name ? str(p.name, 60) : ""))
        .filter(Boolean);
      out.operations.push({
        method: method.toUpperCase(),
        path: str(path, 200),
        summary: str(op.summary || op.operationId, 200),
        params,
      });
    }
  }
  return out;
}

// 4. MCP server-card — `{serverInfo, tools:[…]}` OR `{mcpServers:[{…}]}`.
export function parseMcpCard(json) {
  const out = { name: "", endpoint: "", tools: [] };
  if (!json || typeof json !== "object") return out;

  const pushTools = (tools) => {
    for (const t of asArray(tools)) {
      if (t && t.name)
        out.tools.push({
          name: str(t.name, 80),
          description: str(t.description, 300),
        });
    }
  };

  if (Array.isArray(json.mcpServers)) {
    const s = json.mcpServers[0] || {};
    out.name = str((s.serverInfo && s.serverInfo.name) || s.name, 120);
    out.endpoint = str(
      s.transport && (s.transport.url || s.transport.endpoint),
      300,
    );
    pushTools(s.tools);
  } else {
    out.name = str(json.serverInfo && json.serverInfo.name, 120);
    out.endpoint = str(
      json.transport && (json.transport.endpoint || json.transport.url),
      300,
    );
    pushTools(json.tools);
  }
  return out;
}

// 5. agent-skills — `{publisher, skills:[{name, description, url|path, method?, triggers?}]}`.
export function parseAgentSkills(json, baseUrl = "") {
  const out = { publisher: "", skills: [] };
  if (!json || typeof json !== "object") return out;
  out.publisher = str(json.publisher && json.publisher.name, 120);
  for (const s of asArray(json.skills)) {
    if (!s || !s.name) continue;
    out.skills.push({
      name: str(s.name, 80),
      description: str(s.description, 300),
      url: resolveUrl(s.url || s.path, baseUrl),
      method: str(s.method, 10),
      triggers: asArray(s.triggers)
        .map((t) => str(t, 80))
        .filter(Boolean),
    });
  }
  return out;
}

// 6. robots.txt — sitemaps, content-signals line, blanket-disallow flag, agents.
export function parseRobots(text) {
  const out = {
    sitemaps: [],
    contentSignals: "",
    disallowsAll: false,
    agents: [],
  };
  if (typeof text !== "string") return out;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const sm = /^sitemap:\s*(\S+)/i.exec(line);
    if (sm) out.sitemaps.push(sm[1]);
    const cs = /^content-signals?:\s*(.+)/i.exec(line);
    if (cs) out.contentSignals = cs[1].trim().slice(0, 200);
    if (/^disallow:\s*\/\s*$/i.test(line)) out.disallowsAll = true;
    const ua = /^user-agent:\s*(.+)/i.exec(line);
    if (ua) out.agents.push(ua[1].trim().slice(0, 80));
  }
  return out;
}

// 7. openid-configuration — presence only. We NOTE that auth exists and surface
//    the issuer; Probe never calls these endpoints (read-only boundary).
export function parseOpenIdConfig(json) {
  const out = {
    issuer: "",
    hasAuthorization: false,
    hasToken: false,
    grantTypes: [],
  };
  if (!json || typeof json !== "object") return out;
  out.issuer = str(json.issuer, 200);
  out.hasAuthorization = typeof json.authorization_endpoint === "string";
  out.hasToken = typeof json.token_endpoint === "string";
  out.grantTypes = asArray(json.grant_types_supported)
    .map((g) => str(g, 40))
    .filter(Boolean);
  return out;
}

// 8. pricing.md — title + a one-line summary (first prose line, skipping the
//    heading and any leading table rows).
export function parsePricing(text) {
  const out = { title: "", summary: "" };
  if (typeof text !== "string") return out;
  const h = /^#\s+(.+)/m.exec(text);
  out.title = h ? h[1].trim().slice(0, 200) : "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line && !line.startsWith("#") && !line.startsWith("|")) {
      out.summary = line.slice(0, 300);
      break;
    }
  }
  return out;
}
