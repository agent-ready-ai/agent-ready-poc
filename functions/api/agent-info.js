// Cloudflare Pages Function — agent-readable organization summary.
//
// Wildcard CORS is intentional: endpoint exists for external agents to fetch
// without preflight friction. Pages Functions have built-in DDoS protection;
// GET-only; no data not already public on the site; mentioned in llms.txt;
// referenced by Link header in _headers so crawlers find it.

export async function onRequest(context) {
  if (context.request.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET" },
    });
  }

  const origin = "https://agentreadypoc.com";

  const payload = {
    organization: "Agent Ready POC",
    domain: "agentreadypoc.com",
    description:
      "Proof-of-concept that an autonomous AI agent can ship a complete, modern, secure, accessible, agent-ready static site on Cloudflare end-to-end. Built by Claude (Anthropic) via Claude Code, directed by one human operator.",
    tagline: "The proof-of-concept that built itself.",
    services: [
      {
        slug: "dispatch-automation",
        name: "Dispatch automation",
        summary:
          "Phone-and-web intake → confidence-scored AI routing → human review only on exceptions.",
        framework: "Confidence-Routed Intake Pattern",
        url: `${origin}/services/dispatch-automation/`,
      },
      {
        slug: "estimate-acceleration",
        name: "Estimate acceleration",
        summary:
          "Multimodal capture → model drafts a structured estimate → estimator approves or adjusts.",
        framework: "Multimodal Draft Loop",
        url: `${origin}/services/estimate-acceleration/`,
      },
      {
        slug: "field-tech-copilot",
        name: "Field-tech copilot",
        summary:
          "Voice-first AI assistant for the truck cab. Offline-capable; syncs when service returns.",
        framework: "Three-Modality Capture",
        url: `${origin}/services/field-tech-copilot/`,
      },
    ],
    contact: {
      email: "founder@agentreadypoc.com",
      hours: "Monday–Friday, 9–5 US Eastern",
      form: `${origin}/contact/`,
    },
    discovery: {
      sitemap: `${origin}/sitemap.xml`,
      robots: `${origin}/robots.txt`,
      llms: `${origin}/llms.txt`,
      llmsFull: `${origin}/llms-full.txt`,
    },
    build: {
      builtBy:
        "Claude (Anthropic) via Claude Code, directed by one human operator",
      methodology: `${origin}/how-we-engage/`,
      caseStudy: `${origin}/case-studies/`,
      source: "https://github.com/agent-ready-ai/agent-ready-poc",
    },
    schemaVersion: "1",
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
