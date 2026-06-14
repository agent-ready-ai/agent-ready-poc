// Pure MCP reasoning for Probe — no network. Unit-tested against fixtures.
//
// classifyTool decides whether a tool is safe for Probe to invoke. The rule is
// deliberately conservative: a tool is callable ONLY if the server explicitly
// annotates it read-only and non-destructive AND it needs no arguments. Anything
// unannotated, mutating, destructive, or argument-requiring is shown but never
// run — Probe will not guess that an unannotated tool is safe.
//
// The SERVER (probe-mcp.js) re-runs classifyTool before every invoke; the client
// never decides what is safe. This module is the single definition of "safe".

function requiredArgs(tool) {
  const req = tool && tool.inputSchema && tool.inputSchema.required;
  return Array.isArray(req) ? req.filter((x) => typeof x === "string") : [];
}

export function classifyTool(tool) {
  const reasons = [];
  if (!tool || typeof tool !== "object" || !tool.name) {
    return { safe: false, reasons: ["malformed tool entry"], requiredArgs: [] };
  }
  const ann = tool.annotations || {};
  const reqs = requiredArgs(tool);

  if (ann.readOnlyHint !== true) reasons.push("not annotated read-only");
  if (ann.destructiveHint === true) reasons.push("annotated destructive");
  if (reqs.length) reasons.push("requires arguments: " + reqs.join(", "));

  return { safe: reasons.length === 0, reasons, requiredArgs: reqs };
}

// Compare the static server-card's tool list against the live tools/list.
// Drift (a tool in one but not the other) is an authority/trust signal.
export function diffTools(cardTools, liveTools) {
  const names = (arr) =>
    (Array.isArray(arr) ? arr : [])
      .map((t) => t && t.name)
      .filter((n) => typeof n === "string");
  const card = new Set(names(cardTools));
  const live = new Set(names(liveTools));
  const cardOnly = [];
  const liveOnly = [];
  const inBoth = [];
  for (const n of card) (live.has(n) ? inBoth : cardOnly).push(n);
  for (const n of live) if (!card.has(n)) liveOnly.push(n);
  return {
    cardOnly: cardOnly.sort(),
    liveOnly: liveOnly.sort(),
    inBoth: inBoth.sort(),
    drift: cardOnly.length > 0 || liveOnly.length > 0,
  };
}
