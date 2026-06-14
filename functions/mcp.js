// Model Context Protocol server — HTTP transport over a Cloudflare Pages
// Function. Speaks JSON-RPC 2.0 per the MCP spec (2024-11-05).
//
// Exposes two real tools that wrap this site's existing HTTP endpoints:
//   get_organization_info  → GET  /api/agent-info
//   submit_contact         → POST /api/contact
//
// Honest implementation — no fabricated tools, no fake capabilities.
// Discovery: /.well-known/mcp/server-card.json (static) advertises this
// endpoint; agent-skills.json mirrors the tool list.

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "agent-ready-poc";
const SERVER_VERSION = "1.0.0";

const TOOLS = [
  {
    name: "get_organization_info",
    description:
      "Returns a JSON summary of Agent Ready POC: organization metadata, three services with their named implementation frameworks, contact info, discovery URLs, and build provenance. Wraps GET https://agentreadypoc.com/api/agent-info.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      title: "Get organization info",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "submit_contact",
    description:
      "Submit a Turnstile-verified contact message to the operator. Wraps POST https://agentreadypoc.com/api/contact. Requires a Cloudflare Turnstile token captured by the widget rendered on /contact/.",
    inputSchema: {
      type: "object",
      required: ["name", "email", "message", "cf_turnstile_response"],
      properties: {
        name: { type: "string", maxLength: 200 },
        email: { type: "string", format: "email", maxLength: 200 },
        message: { type: "string", maxLength: 5000 },
        cf_turnstile_response: {
          type: "string",
          description: "Cloudflare Turnstile widget token from /contact/.",
        },
      },
      additionalProperties: false,
    },
    annotations: {
      title: "Submit contact message",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
    },
  });
}

function rpcResult(id, result) {
  return jsonResponse({ jsonrpc: "2.0", id, result });
}

function rpcError(id, code, message, data) {
  const err = { code, message };
  if (data !== undefined) err.data = data;
  return jsonResponse({ jsonrpc: "2.0", id, error: err });
}

async function callTool(name, args, originUrl) {
  if (name === "get_organization_info") {
    const r = await fetch(new URL("/api/agent-info", originUrl).toString(), {
      headers: { Accept: "application/json" },
    });
    const data = await r.json().catch(() => ({}));
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      isError: !r.ok,
    };
  }

  if (name === "submit_contact") {
    const form = new FormData();
    if (args.name) form.append("name", args.name);
    if (args.email) form.append("email", args.email);
    if (args.message) form.append("message", args.message);
    if (args.cf_turnstile_response)
      form.append("cf-turnstile-response", args.cf_turnstile_response);

    const r = await fetch(new URL("/api/contact", originUrl).toString(), {
      method: "POST",
      body: form,
    });
    const data = await r.json().catch(() => ({}));
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      isError: !r.ok,
    };
  }

  return null;
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

  if (request.method === "GET") {
    // Convenience: GET returns a minimal server descriptor so discovery
    // crawlers that don't speak JSON-RPC can still confirm "something
    // MCP-shaped lives here" without needing to POST.
    return jsonResponse({
      type: "mcp-server",
      protocolVersion: PROTOCOL_VERSION,
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      transport: {
        type: "http",
        endpoint: new URL("/mcp", request.url).toString(),
      },
      capabilities: { tools: {} },
      hint: "POST JSON-RPC 2.0 here. Methods: initialize, tools/list, tools/call. See /.well-known/mcp/server-card.json.",
    });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST, GET, OPTIONS" },
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      },
      400,
    );
  }

  const { id = null, method, params = {} } = payload || {};

  if (!method || typeof method !== "string") {
    return rpcError(id, -32600, "Invalid Request: missing or invalid 'method'");
  }

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions:
          "Two tools exposed: get_organization_info (no args) returns the org summary; submit_contact (requires Turnstile token from /contact/) sends a message to the operator.",
      });

    case "notifications/initialized":
      // Notifications have no id and expect no reply, but we return 204
      // for HTTP compliance.
      return new Response(null, { status: 204 });

    case "tools/list":
      return rpcResult(id, { tools: TOOLS });

    case "tools/call": {
      const toolName = params?.name;
      const args = params?.arguments ?? {};
      if (!toolName) {
        return rpcError(id, -32602, "Invalid params: missing 'name'");
      }
      const result = await callTool(toolName, args, request.url);
      if (result === null) {
        return rpcError(id, -32601, `Unknown tool: ${toolName}`);
      }
      return rpcResult(id, result);
    }

    case "ping":
      return rpcResult(id, {});

    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}
