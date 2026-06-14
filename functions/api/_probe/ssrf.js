// Shared SSRF guard for Probe. One source of truth used by both the discovery
// function (probe.js) and the live MCP session (probe-mcp.js). Pure and
// unit-tested — security-critical code should not be duplicated.
//
// A Pages Function on Cloudflare's edge has no route to an operator's internal
// network, but we refuse obvious SSRF targets regardless: private, loopback,
// link-local, CGNAT, multicast, and the cloud metadata address.

export function isBlockedHost(hostname) {
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

// Discovery target: accept a hostname or URL, default to https, allow http,
// return the origin (Probe's discovery paths hang off the origin). Null if bad.
export function normalizeTarget(input) {
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
  return new URL(url.origin);
}

// MCP endpoint: must be an absolute https URL to a public host. The full URL
// (path included) is preserved — unlike discovery, the MCP path matters. Used to
// validate the endpoint both before connecting and after each redirect hop.
export function validateMcpEndpoint(raw) {
  const s = String(raw || "").trim();
  if (!s || s.length > 2048) return null;
  let url;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null; // https only for live invoke
  if (isBlockedHost(url.hostname)) return null;
  return url;
}
