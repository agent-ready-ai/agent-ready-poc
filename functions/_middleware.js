// Markdown content negotiation. When a request comes in with
// `Accept: text/markdown`, transparently serve the `.md` alternate
// emitted by scripts/emit-md-alternates.js — preserving the URL the
// client requested but switching the Content-Type.
//
// Without this middleware, Cloudflare Pages serves /<page>/ as
// index.html regardless of Accept header; the rel=alternate Link and
// /<page>/index.md alternate exist but real Accept-based negotiation
// requires server-side dispatch. This middleware closes the gap.
//
// Avoids infinite recursion via an internal X-Md-Negotiated marker
// on the subrequest.

export async function onRequest(context) {
  const { request, next } = context;

  // Honor an internal-loop marker so the subrequest below doesn't
  // re-trigger this middleware.
  if (request.headers.get("X-Md-Negotiated") === "1") {
    return next();
  }

  const accept = request.headers.get("Accept") || "";
  if (!accept.toLowerCase().includes("text/markdown")) {
    return next();
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // API + static asset routes are not markdown-negotiable.
  if (path.startsWith("/api/") || path.startsWith("/.well-known/") || path.startsWith("/assets/")) {
    return next();
  }
  if (path.endsWith(".md") || path.endsWith(".json") || path.endsWith(".xml") || path.endsWith(".txt")) {
    return next();
  }

  // Map the requested path to its .md alternate.
  let mdPath;
  if (path === "/" || path === "") {
    mdPath = "/index.md";
  } else if (path.endsWith("/")) {
    mdPath = path + "index.md";
  } else {
    mdPath = path + "/index.md";
  }

  const mdUrl = new URL(mdPath, url.origin).toString();
  const subrequest = new Request(mdUrl, {
    method: "GET",
    headers: { "X-Md-Negotiated": "1" },
  });

  const upstream = await fetch(subrequest);
  if (!upstream.ok) {
    return next();
  }

  const body = await upstream.text();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept",
      "Cache-Control": "public, max-age=300",
      "Link": `<${path}>; rel="canonical"`,
    },
  });
}
