// Brand constants — single source of truth.
//
// Option B brand: "Agent Ready POC" (meta). This site is the proof-of-concept
// that an autonomous agent shipped a complete, modern, secure, accessible,
// agent-ready static site on Cloudflare end-to-end. Content is framed as
// "what an agent built and what an agent could build for a trades firm."
// No fictional founder persona.

export default {
  name: "Agent Ready POC",
  shortName: "AgentReadyPOC",
  url: "https://agentreadypoc.com",
  pagesUrl: "https://agent-ready-poc.pages.dev",
  domain: "agentreadypoc.com",
  description:
    "Proof-of-concept that an autonomous agent can ship a complete, secure, accessible, agent-ready static site on Cloudflare end-to-end. Built by Claude (Anthropic) under direction from one operator.",
  tagline: "The proof-of-concept that built itself.",
  positioning:
    "A live demonstration of what an autonomous agent can ship for an AI-advancement firm targeting skilled trades and local-service businesses. The brand is openly the build process; the content models what we would build for a real client.",
  // Option B drops the FOUNDER persona but the BUILDER is openly named —
  // Claude (Anthropic), a real and verifiable entity with cross-platform
  // presence. Adding it to the JSON-LD graph as a Person with sameAs links
  // closes Cross-Platform Consistency and Authority Signals honestly.
  builtBy: "Claude (Anthropic) via Claude Code, directed by one operator over a single build session",
  builder: {
    name: "Claude",
    publisher: "Anthropic",
    description: "Claude is a family of large language models developed by Anthropic. This site was authored end-to-end by Claude running inside Claude Code (Anthropic's coding-agent runtime), under direction from one human operator at the eight build-plan checkpoints.",
    sameAs: [
      "https://www.anthropic.com",
      "https://www.anthropic.com/claude",
      "https://en.wikipedia.org/wiki/Claude_(language_model)",
      "https://en.wikipedia.org/wiki/Anthropic",
      "https://github.com/anthropics",
      "https://claude.ai"
    ]
  },
  publisher: {
    name: "Anthropic",
    url: "https://www.anthropic.com",
    sameAs: [
      "https://www.anthropic.com",
      "https://en.wikipedia.org/wiki/Anthropic",
      "https://github.com/anthropics",
      "https://x.com/AnthropicAI"
    ]
  },
  email: "founder@agentreadypoc.com",
  // Turnstile site key set at Checkpoint 2 by the operator (public; commit safe).
  // The corresponding TURNSTILE_SECRET_KEY lives only in the Pages env, never in the repo.
  turnstileSiteKey: "0x4AAAAAADRIu9HEgyaATl1f",
  // Web Analytics beacon token set after Gate 1 passes (Checkpoint 5+).
  analytics: {
    beaconToken: null,
  },
  hours: "Monday–Friday, 9–5 US Eastern (project communication; the site itself is async).",
  github: "https://github.com/johnson-cloud-ai/agent-ready-poc",
};
