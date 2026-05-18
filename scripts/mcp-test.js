#!/usr/bin/env node
// MCP server test harness.
//
// Exercises the deployed /mcp endpoint end-to-end via JSON-RPC 2.0 per the
// Cloudflare guidance at:
//   https://developers.cloudflare.com/agents/guides/test-remote-mcp-server/
// The Cloudflare doc emphasizes interactive testing tools (MCP Inspector,
// Workers AI Playground, editor integrations). This script does the
// equivalent assertions headlessly so the same checks run in Docker, in CI,
// and as part of `make check-all`.
//
// Usage:
//   BASE_URL=https://agentreadypoc.com node scripts/mcp-test.js
//
// Exit 0 if every test passes, 1 on first failure. Per-test results stream
// to stdout; final summary is JSON for downstream consumption.

const BASE_URL = process.env.BASE_URL ?? "https://agentreadypoc.com";
const MCP_URL = new URL("/mcp", BASE_URL).toString();
const SERVER_CARD_URL = new URL(
  "/.well-known/mcp/server-card.json",
  BASE_URL,
).toString();
const AGENT_SKILLS_URL = new URL(
  "/.well-known/agent-skills/index.json",
  BASE_URL,
).toString();

const EXPECTED_PROTOCOL_VERSION = "2024-11-05";
const EXPECTED_TOOL_NAMES = ["get_organization_info", "submit_contact"];

const results = [];
let failed = false;

function record(name, ok, detail) {
  const entry = { name, ok, detail };
  results.push(entry);
  const status = ok ? "PASS" : "FAIL";
  console.log(`[${status}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed = true;
}

async function rpc(method, params = undefined, id = 1) {
  const body = { jsonrpc: "2.0", id, method };
  if (params !== undefined) body.params = params;
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, headers: res.headers, text, json };
}

// ---------------------------------------------------------------------------
// T1: GET /mcp returns a server descriptor (convenience for non-RPC crawlers)
// ---------------------------------------------------------------------------
try {
  const res = await fetch(MCP_URL, { headers: { Accept: "application/json" } });
  const body = await res.json();
  record(
    "GET /mcp returns 200 with server descriptor",
    res.status === 200 &&
      body.type === "mcp-server" &&
      body.protocolVersion === EXPECTED_PROTOCOL_VERSION,
    `status=${res.status} protocolVersion=${body?.protocolVersion ?? "?"}`,
  );
} catch (err) {
  record("GET /mcp returns 200 with server descriptor", false, err.message);
}

// ---------------------------------------------------------------------------
// T2: OPTIONS /mcp returns 204 with CORS headers
// ---------------------------------------------------------------------------
try {
  const res = await fetch(MCP_URL, { method: "OPTIONS" });
  const allowMethods = res.headers.get("access-control-allow-methods") ?? "";
  record(
    "OPTIONS /mcp returns 204 with POST in allow-methods",
    res.status === 204 && /POST/i.test(allowMethods),
    `status=${res.status} allow-methods="${allowMethods}"`,
  );
} catch (err) {
  record("OPTIONS /mcp returns 204 with POST in allow-methods", false, err.message);
}

// ---------------------------------------------------------------------------
// T3: initialize advertises the expected protocol version and server info
// ---------------------------------------------------------------------------
try {
  const { status, json } = await rpc("initialize", {
    protocolVersion: EXPECTED_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: "agent-ready-poc-test-harness", version: "1.0.0" },
  });
  const result = json?.result;
  record(
    "initialize → 200 with matching protocolVersion + serverInfo",
    status === 200 &&
      result?.protocolVersion === EXPECTED_PROTOCOL_VERSION &&
      typeof result?.serverInfo?.name === "string" &&
      typeof result?.serverInfo?.version === "string" &&
      result?.capabilities?.tools !== undefined,
    `status=${status} server=${result?.serverInfo?.name}@${result?.serverInfo?.version}`,
  );
} catch (err) {
  record("initialize → 200 with matching protocolVersion + serverInfo", false, err.message);
}

// ---------------------------------------------------------------------------
// T4: tools/list returns the expected tools, each with an inputSchema
// ---------------------------------------------------------------------------
try {
  const { status, json } = await rpc("tools/list");
  const tools = json?.result?.tools ?? [];
  const names = tools.map((t) => t.name).sort();
  const expected = [...EXPECTED_TOOL_NAMES].sort();
  const allHaveSchema = tools.every(
    (t) => t.inputSchema && t.inputSchema.type === "object",
  );
  record(
    "tools/list → both tools present with object inputSchema",
    status === 200 &&
      JSON.stringify(names) === JSON.stringify(expected) &&
      allHaveSchema,
    `tools=[${names.join(", ")}]`,
  );
} catch (err) {
  record("tools/list → both tools present with object inputSchema", false, err.message);
}

// ---------------------------------------------------------------------------
// T5: tools/call get_organization_info returns a valid content payload
// ---------------------------------------------------------------------------
try {
  const { status, json } = await rpc("tools/call", {
    name: "get_organization_info",
    arguments: {},
  });
  const result = json?.result;
  const firstText = result?.content?.[0]?.text;
  let parsed;
  try {
    parsed = JSON.parse(firstText ?? "");
  } catch {
    parsed = null;
  }
  record(
    "tools/call get_organization_info → JSON-parseable text content, not isError",
    status === 200 &&
      result?.isError !== true &&
      parsed !== null &&
      typeof parsed === "object",
    `status=${status} isError=${result?.isError} parsedKeys=[${
      parsed ? Object.keys(parsed).slice(0, 4).join(",") : "—"
    }]`,
  );
} catch (err) {
  record(
    "tools/call get_organization_info → JSON-parseable text content, not isError",
    false,
    err.message,
  );
}

// ---------------------------------------------------------------------------
// T6: ping returns an empty result object
// ---------------------------------------------------------------------------
try {
  const { status, json } = await rpc("ping");
  record(
    "ping → empty result object",
    status === 200 && json?.result !== undefined && json?.error === undefined,
    `status=${status}`,
  );
} catch (err) {
  record("ping → empty result object", false, err.message);
}

// ---------------------------------------------------------------------------
// T7: unknown method returns JSON-RPC error -32601
// ---------------------------------------------------------------------------
try {
  const { status, json } = await rpc("nonexistent/method");
  record(
    "unknown method → JSON-RPC error -32601 (method not found)",
    status === 200 && json?.error?.code === -32601,
    `status=${status} error.code=${json?.error?.code}`,
  );
} catch (err) {
  record("unknown method → JSON-RPC error -32601 (method not found)", false, err.message);
}

// ---------------------------------------------------------------------------
// T8: invalid JSON body returns -32700 parse error
// ---------------------------------------------------------------------------
try {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not valid json",
  });
  const body = await res.json().catch(() => ({}));
  record(
    "invalid JSON body → 400 with -32700 parse error",
    res.status === 400 && body?.error?.code === -32700,
    `status=${res.status} error.code=${body?.error?.code}`,
  );
} catch (err) {
  record("invalid JSON body → 400 with -32700 parse error", false, err.message);
}

// ---------------------------------------------------------------------------
// T9: server-card.json discovery file advertises /mcp
// ---------------------------------------------------------------------------
try {
  const res = await fetch(SERVER_CARD_URL);
  const body = await res.json();
  const advertisesMcp =
    JSON.stringify(body).includes(MCP_URL) ||
    JSON.stringify(body).includes("/mcp");
  record(
    ".well-known/mcp/server-card.json → 200, valid JSON, advertises /mcp",
    res.status === 200 && typeof body === "object" && advertisesMcp,
    `status=${res.status}`,
  );
} catch (err) {
  record(
    ".well-known/mcp/server-card.json → 200, valid JSON, advertises /mcp",
    false,
    err.message,
  );
}

// ---------------------------------------------------------------------------
// T10: agent-skills index advertises both tool names
// ---------------------------------------------------------------------------
try {
  const res = await fetch(AGENT_SKILLS_URL);
  const body = await res.json();
  const advertisedNames = (body?.skills ?? []).map((s) => s.name).sort();
  const expected = [...EXPECTED_TOOL_NAMES].sort();
  record(
    ".well-known/agent-skills/index.json → 200 with both tools advertised",
    res.status === 200 &&
      JSON.stringify(advertisedNames) === JSON.stringify(expected),
    `skills=[${advertisedNames.join(", ")}]`,
  );
} catch (err) {
  record(
    ".well-known/agent-skills/index.json → 200 with both tools advertised",
    false,
    err.message,
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const passed = results.filter((r) => r.ok).length;
const total = results.length;
console.log("");
console.log(`MCP test harness: ${passed}/${total} passed against ${MCP_URL}`);
console.log(
  JSON.stringify(
    {
      base_url: BASE_URL,
      mcp_endpoint: MCP_URL,
      passed,
      total,
      results,
    },
    null,
    2,
  ),
);

process.exit(failed ? 1 : 0);
