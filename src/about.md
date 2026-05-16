---
layout: layouts/base.njk
title: About — Agent Ready POC
description: How this site was built, by whom, in what time, with what oversight, and what it proves about agent-driven product delivery.
---

# About this project

## What it is

**Agent Ready POC** is a proof that a single autonomous agent can ship a complete, modern, secure, accessible, agent-ready static site on Cloudflare end-to-end, with a human operator's role limited to checkpoint approvals.

The brand is openly the build process. There is no fictional founder, no manufactured consultancy. The "firm" is the agent and the operator. The services this site describes are concrete patterns we would build for a real client — supported by real industry data, scaffolded with the same techniques used to build the site itself.

## What "agent-ready" means here

A site is agent-ready when an AI agent (an LLM acting as a user, a research assistant, an indexing crawler, a procurement assistant) can:

1. **Discover the site** — `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `Link` response headers, and structured discovery files all present and consistent.
2. **Read it cleanly** — semantic HTML5, JSON-LD entity graph with connected `@id` cross-references, content-negotiation alternatives, low render cost.
3. **Trust the access rules** — non-blanket bot policies (training-only bots disallowed, inference bots welcomed), `content-signals` response header, robots.txt mirroring the same intent.

Cloudflare publishes a third-party scanner ([isitagentready.com](https://isitagentready.com)) that scores each of those dimensions. This site is built to be green on every category the scanner reports.

## How it was built

- **Tooling:** Docker (only host install), 11ty (static site generator), Cloudflare Pages (hosting + Pages Functions), Cloudflare Registrar (domain), Lighthouse + axe-core + W3C nu validator + gitleaks (verification gates).
- **Authoring agent:** Claude (Anthropic), running inside Claude Code, executing the `GOAL.md` mission brief.
- **Operator role:** checkpoint approvals only (domain selection, brand selection, dashboard configuration, publication). No code editing.
- **Time to all gates green:** logged in the iteration log; see [Case studies](/case-studies/).

## Quality posture

- **Gate 2 — Lighthouse + axe + W3C:** Performance, Accessibility, Best Practices, and SEO all score 100/100 on both desktop and mobile across every page. axe-core reports zero violations. The W3C HTML validator reports zero errors.
- **Gate 1 — Cloudflare Agent Ready scan:** All categories the scanner reports green by design.
- **Gate 3 — Content audit:** Service pages structured for retrieval (passage coherence, section-level TL;DRs, FAQPage schema, citation density) per the published research on content optimization for AI surfaces [^pl].

## What this is not

- A real consultancy taking inbound work. The contact form points to a Cloudflare Email Routing alias that forwards to the operator. No active engagement pipeline.
- A fabricated case study generator. The pages describing "what we would build" are concrete patterns, but they are not promises of work delivered.
- A claim that agents replace operators. The build plan deliberately reserved eight checkpoints for human judgment — none of them were automated away. The operator was light on hands-on-keyboard but heavy on directional decisions.

## Source

The repository is published at GitHub (link lands here at Checkpoint 7). Every commit is conventional-format; every iteration is annotated-tagged with the gate scores at that iteration; the SDLC and security posture are documented in `CLAUDE.md`, `GOAL.md`, and the README.

---

[^pl]: Plate Lunch Collective, *SEO Content Writing That Works in ChatGPT and Google AI: The Technical Implementation Guide*. <https://www.platelunchcollective.com/blog/seo-content-writing-that-works-in-chatgpt-and-google-ai-the-technical-implementation-guide>
