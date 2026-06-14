// Probe — agent-readiness inspector (read-only, single-vendor).
//
// POST { "target": "<url-or-hostname>" } → JSON coverage report over the target's
// agent-ready surfaces (llms.txt, Markdown negotiation, MCP, agent-skills,
// OpenAPI/api-catalog, OpenID, pricing). The function fetches and parses
// server-side (avoids CORS, keeps everything on Cloudflare). The INSPECTION is
// strictly READ-ONLY and model-free: it issues GETs to well-known discovery
// paths, never calls a discovered endpoint, never authenticates, never
// transacts. No PII captured, logged, or stored.
//
// Optional: POST { "target": ..., "summarize": true } adds an AI-written
// narration of the finished report via NVIDIA NIM (see _probe/ai.js). This is
// the only non-deterministic path; it costs tokens and fires only on explicit
// request, so the default scan stays zero-token. The LLM narrates already-
// collected facts — it never decides what to fetch or touches the scanned site.
//
// Parsing lives in _probe/parsers.js (pure, unit-tested); coverage assembly in
// _probe/report.js (pure, unit-tested). This file owns only the untrusted-input
// boundary: method/size validation, SSRF host filtering, capped/timed fetches.

import { buildReport } from "./_probe/report.js";
import { summarizeWithNvidia } from "./_probe/ai.js";

const MAX_BODY_BYTES = 2 * 1024; // request body cap — a URL is tiny
const MAX_SURFACE_BYTES = 256 * 1024; // per-surface response cap
const FETCH_TIMEOUT_MS = 6000;
const UA = "AgentReadyPOC-Probe/1.0 (+https://agentreadypoc.com/probe/)";

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

// Block private, loopback, link-local, CGNAT, and metadata hosts. Defense in
// depth: a Pages Function on Cloudflare's edge has no route to an operator's
// internal network, but we refuse obvious SSRF targets regardless.
function isBlockedHost(hostname) {
  const h = (hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal")
  )
    return true;
  // IPv6 loopback / link-local (fe80::/10) / unique-local (fc00::/7)
  if (
    h === "::1" ||
    h.startsWith("fe8") ||
    h.startsWith("fe9") ||
    h.startsWith("fea") ||
    h.startsWith("feb")
  )
    return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
  }
  return false;
}

// Parse user input into a safe origin URL, or null if invalid/blocked.
function normalizeTarget(input) {
  let raw = String(input || "").trim();
  if (!raw || raw.length > 2048) return null;
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (isBlockedHost(url.hostname)) return null;
  return new URL(url.origin); // probe paths hang off the origin only
}

async function readCapped(res, maxBytes) {
  if (!res.body) {
    const t = await res.text();
    return t.length > maxBytes ? t.slice(0, maxBytes) : t;
  }
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
    if (total >= maxBytes) {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      break;
    }
  }
  const out = new Uint8Array(Math.min(total, maxBytes));
  let off = 0;
  for (const c of chunks) {
    if (off >= out.length) break;
    const slice = c.subarray(0, out.length - off);
    out.set(slice, off);
    off += slice.length;
  }
  return new TextDecoder().decode(out);
}

// One capped, timed, redirect-following GET. Never throws: failures resolve to
// { ok:false }. Parses JSON when asked. Treats all bytes as untrusted.
async function fetchSurface(url, { accept = "*/*", parseJson = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: accept, "User-Agent": UA },
      redirect: "follow",
      signal: controller.signal,
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    const contentType = res.headers.get("content-type") || "";
    const text = await readCapped(res, MAX_SURFACE_BYTES);
    const result = { ok: res.ok, status: res.status, contentType, text, url };
    if (parseJson && res.ok) {
      try {
        result.json = JSON.parse(text);
      } catch {
        result.json = null;
      }
    }
    return result;
  } catch (e) {
    return {
      ok: false,
      status: 0,
      contentType: "",
      text: "",
      url,
      error: e && e.name === "AbortError" ? "timeout" : "fetch-failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function inspect(origin) {
  const u = (path) => new URL(path, origin).toString();

  // Fixed surface probes, run concurrently. The api-catalog is served with or
  // without a .json extension across the ecosystem, so we try both.
  const [
    llms,
    robots,
    catalogA,
    catalogB,
    mcp,
    skills,
    openid,
    openapi,
    pricing,
    homeMd,
    llmsFull,
  ] = await Promise.all([
    fetchSurface(u("/llms.txt"), { accept: "text/plain, text/markdown" }),
    fetchSurface(u("/robots.txt"), { accept: "text/plain" }),
    fetchSurface(u("/.well-known/api-catalog"), { parseJson: true }),
    fetchSurface(u("/.well-known/api-catalog.json"), { parseJson: true }),
    fetchSurface(u("/.well-known/mcp/server-card.json"), { parseJson: true }),
    fetchSurface(u("/.well-known/agent-skills/index.json"), {
      parseJson: true,
    }),
    fetchSurface(u("/.well-known/openid-configuration"), { parseJson: true }),
    fetchSurface(u("/openapi.json"), { parseJson: true }),
    fetchSurface(u("/pricing.md"), { accept: "text/markdown, text/plain" }),
    fetchSurface(origin.toString(), { accept: "text/markdown" }),
    fetchSurface(u("/llms-full.txt"), { accept: "text/plain" }),
  ]);

  const catalog = catalogA.ok && catalogA.json ? catalogA : catalogB;

  return buildReport(origin.origin, {
    llms,
    robots,
    catalog,
    openapi,
    mcp,
    skills,
    openid,
    pricing,
    homeMd,
    llmsFull,
  });
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return json(
      {
        error:
          'Method not allowed. POST a JSON body: { "target": "example.com" }.',
      },
      405,
      { Allow: "POST" },
    );
  }

  // Cap the request body before reading it.
  const len = Number(request.headers.get("content-length") || "0");
  if (len > MAX_BODY_BYTES) {
    return json({ error: "Request body too large." }, 413);
  }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES)
      return json({ error: "Request body too large." }, 413);
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const origin = normalizeTarget(body && body.target);
  if (!origin) {
    return json(
      {
        error:
          'Provide a valid public http(s) target, e.g. { "target": "example.com" }.',
      },
      400,
    );
  }

  try {
    const report = await inspect(origin);
    report.fetchedAt = new Date().toISOString();
    report.readOnly = true;
    report.aiAvailable = !!(context.env && context.env.NVIDIA_API_KEY);

    // Optional, explicit-only AI narration of the finished report. The scan
    // above is already done and deterministic; this never changes the facts.
    // A failure here degrades gracefully — the report still returns.
    if (body && body.summarize === true) {
      try {
        report.aiSummary = await summarizeWithNvidia(report, context.env);
      } catch (e) {
        report.aiSummary = {
          error:
            e && e.code === "not-configured"
              ? "AI summary is not configured on this deployment."
              : "AI summary is temporarily unavailable.",
        };
      }
    }

    return json(report, 200);
  } catch {
    // Never leak internals; degrade to a clean error.
    return json(
      { error: "Probe failed to complete. The target may be unreachable." },
      502,
    );
  }
}
