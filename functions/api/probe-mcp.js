// Probe — live MCP session (consented, read-only). Cloudflare Pages Function.
//
// Opens a JSON-RPC 2.0 session against a target's MCP endpoint to show the LIVE
// truth (initialize → tools/list) and cross-check it against the static server-
// card (drift = an authority signal). It will invoke a tool ONLY when:
//   - the caller passed consent: true (the page never calls on load), AND
//   - action: "call" names a specific tool, AND
//   - that tool passes classifyTool() server-side (re-checked every call): the
//     server annotates it read-only + non-destructive AND it needs no arguments.
// Mutating / auth / arg-requiring tools (e.g. submit_contact) are listed with a
// reason and never called. The client never decides what is safe.
//
// Safety: https-only endpoints; SSRF host blocking (shared ssrf.js), re-checked
// after redirects; per-request timeouts; response size cap; no credentials ever
// forwarded; naturally call-capped (≤1 tools/call per request). No PII/response
// is stored or logged.

import {
  validateMcpEndpoint,
  normalizeTarget,
  isBlockedHost,
} from "./_probe/ssrf.js";
import { parseMcpCard } from "./_probe/parsers.js";
import { classifyTool, diffTools } from "./_probe/mcp.js";

const TIMEOUT_MS = 8000;
const MAX_BYTES = 256 * 1024;
const UA = "AgentReadyPOC-Probe/1.0 (+https://agentreadypoc.com/probe/)";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}

// One JSON-RPC call over Streamable-HTTP. Never throws — returns a tagged shape.
async function rpc(endpoint, method, params, id, sessionId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "User-Agent": UA,
    };
    if (sessionId) headers["Mcp-Session-Id"] = sessionId;
    const payload = { jsonrpc: "2.0", method, params: params || {} };
    if (id !== undefined && id !== null) payload.id = id; // omit for notifications
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal,
    });
    // Re-validate the post-redirect URL: refuse a redirect into a blocked host.
    try {
      const fu = new URL(res.url);
      if (fu.protocol !== "https:" || isBlockedHost(fu.hostname)) {
        return { transportError: "redirected to a blocked host" };
      }
    } catch {
      /* res.url not parseable — fall through */
    }
    const sid = res.headers.get("mcp-session-id") || sessionId || null;
    if (res.status === 405) {
      return {
        transportError: "endpoint requires the SSE transport",
        status: 405,
        sessionId: sid,
      };
    }
    const ct = res.headers.get("content-type") || "";
    let text = await res.text();
    if (text.length > MAX_BYTES) text = text.slice(0, MAX_BYTES);
    let raw = text;
    if (ct.includes("text/event-stream")) {
      const m = text.match(/^data: (.*)$/m);
      raw = m ? m[1] : "";
    }
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    return { ok: res.ok, status: res.status, json: parsed, sessionId: sid };
  } catch (e) {
    return {
      transportError:
        e && e.name === "AbortError" ? "timeout" : "connection failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

// Fetch + parse the target's MCP server-card → { endpoint, cardTools } or null.
async function loadCard(origin) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = new URL("/.well-known/mcp/server-card.json", origin).toString();
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    let text = await res.text();
    if (text.length > MAX_BYTES) text = text.slice(0, MAX_BYTES);
    let cardJson;
    try {
      cardJson = JSON.parse(text);
    } catch {
      return null;
    }
    const parsed = parseMcpCard(cardJson);
    const cardTools = Array.isArray(cardJson.tools)
      ? cardJson.tools
      : Array.isArray(cardJson.mcpServers) && cardJson.mcpServers[0]
        ? cardJson.mcpServers[0].tools || []
        : [];
    return { endpoint: parsed.endpoint, name: parsed.name, cardTools };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// initialize (+ best-effort initialized notification) → tools/list.
async function openAndList(endpoint) {
  const init = await rpc(
    endpoint,
    "initialize",
    {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "agentreadypoc-probe", version: "1.0" },
    },
    1,
  );
  if (init.transportError)
    return { transportError: init.transportError, status: init.status };
  if (!init.json || !init.json.result)
    return { transportError: "no initialize result" };
  const sid = init.sessionId;
  // Notify initialized (notification: no id, no response expected).
  await rpc(endpoint, "notifications/initialized", {}, undefined, sid);
  const list = await rpc(endpoint, "tools/list", {}, 2, sid);
  if (list.transportError)
    return { transportError: list.transportError, status: list.status };
  const result = list.json && list.json.result;
  return {
    sessionId: sid,
    protocolVersion: init.json.result.protocolVersion || null,
    serverInfo: init.json.result.serverInfo || null,
    liveTools: result && Array.isArray(result.tools) ? result.tools : [],
  };
}

function describeTool(tool) {
  const c = classifyTool(tool);
  return {
    name: tool.name,
    description: (typeof tool.description === "string"
      ? tool.description
      : ""
    ).slice(0, 300),
    requiredArgs: c.requiredArgs,
    safe: c.safe,
    reasons: c.reasons,
  };
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
      { error: "Method not allowed. POST { target, consent: true }." },
      405,
    );
  }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4096)
      return json({ error: "Request body too large." }, 413);
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  // Explicit consent is mandatory — the page never sends this on load.
  if (body.consent !== true) {
    return json(
      {
        error: "Live MCP inspection requires explicit consent (consent: true).",
      },
      403,
    );
  }

  const origin = normalizeTarget(body.target);
  if (!origin)
    return json({ error: "Provide a valid public http(s) target." }, 400);

  const card = await loadCard(origin.origin);
  if (!card || !card.endpoint) {
    return json(
      {
        present: false,
        message: "No MCP server-card with a transport endpoint found.",
      },
      200,
    );
  }

  const endpoint = validateMcpEndpoint(card.endpoint);
  if (!endpoint) {
    return json(
      {
        present: true,
        endpoint: card.endpoint,
        error: "MCP endpoint is not a public https URL; not contacted.",
      },
      200,
    );
  }

  const session = await openAndList(endpoint.toString());
  if (session.transportError) {
    // e.g. SSE-only endpoints: listed (from the card), not invoked.
    return json({
      present: true,
      endpoint: endpoint.toString(),
      transport: "unsupported",
      transportError: session.transportError,
      cardTools: card.cardTools.map((t) => t.name).filter(Boolean),
      message:
        "MCP endpoint advertised, but Probe could not open a JSON-RPC session over it.",
    });
  }

  const action = body.action === "call" ? "call" : "list";

  if (action === "call") {
    const wanted = String(body.tool || "");
    const tool = session.liveTools.find((t) => t && t.name === wanted);
    if (!tool)
      return json({ error: "Tool not found in the live tools/list." }, 404);
    const verdict = classifyTool(tool); // re-check safety server-side, every call
    if (!verdict.safe) {
      return json(
        { refused: true, tool: wanted, reasons: verdict.reasons },
        403,
      );
    }
    const started = Date.now();
    const call = await rpc(
      endpoint.toString(),
      "tools/call",
      { name: wanted, arguments: {} },
      3,
      session.sessionId,
    );
    const latencyMs = Date.now() - started;
    if (call.transportError) {
      return json({ tool: wanted, error: call.transportError, latencyMs });
    }
    const result = (call.json && call.json.result) || null;
    const rpcError = (call.json && call.json.error) || null;
    let preview = "";
    if (result && Array.isArray(result.content)) {
      const firstText = result.content.find((c) => c && c.type === "text");
      if (firstText && typeof firstText.text === "string")
        preview = firstText.text.slice(0, 800);
    }
    return json({
      tool: wanted,
      args: {},
      httpStatus: call.status,
      latencyMs,
      isError: result ? result.isError === true : !!rpcError,
      responseKeys: result ? Object.keys(result) : rpcError ? ["error"] : [],
      preview,
    });
  }

  // action: "list" — show live truth + drift + classification. No tool is called.
  const drift = diffTools(card.cardTools, session.liveTools);
  return json({
    present: true,
    endpoint: endpoint.toString(),
    transport: "streamable-http",
    protocolVersion: session.protocolVersion,
    serverInfo: session.serverInfo,
    tools: session.liveTools.map(describeTool),
    drift,
  });
}
