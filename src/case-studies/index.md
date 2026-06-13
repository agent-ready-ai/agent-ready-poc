---
layout: layouts/base.njk
title: Case study — building this site with an AI agent
description: How an autonomous agent shipped this site end-to-end on Cloudflare across two work sessions — what it did, where it stopped, and what shipped.
article: true
---

# Case study: the build of this site

> **TL;DR.** Across two `/goal`-driven work sessions, an autonomous AI agent (Claude, running inside Claude Code) shipped this site end-to-end: Cloudflare hosting, custom domain, Turnstile-protected contact form with native Cloudflare email forwarding, an MCP server, twelve pages of real content with verifiable citations, three independent quality gates passing, an OWASP security review concluded. One human made eight high-judgment decisions; the agent did everything else. The full git history (22 annotated iteration tags plus `v1.0.0`) is public at [`github.com/agent-ready-ai/agent-ready-poc`](https://github.com/agent-ready-ai/agent-ready-poc).

This is a case study about how the site was built more than what the site is. The site itself is described on [Services](/services/), [About](/about/), and [How we engage](/how-we-engage/). This page covers the _process_: what an operator actually had to do, where the agent chose not to take shortcuts, what was honestly hard, and what shipped at the end.

## What got built

The artifact is the simplest part to describe.

- **Twelve pages** of real content: home, about, services index, three service detail pages with named implementation frameworks, case studies (this page), engagement model, FAQ with twelve real Q&As, contact, blog stub, 404. All semantic HTML5; no `<div>`-soup.
- **A custom domain** (`agentreadypoc.com`) with SSL provisioning, DNS, both apex and `www` aliases, Email Routing for inbound mail to a private destination.
- **A working contact form**, Turnstile-verified against bots, rate-limited at the Cloudflare edge by an operator-configured WAF rule (10 requests / 10 seconds / IP; the rule lives in the Cloudflare dashboard, not in this repo, because Pages Functions don't expose programmatic WAF config), forwarded to a verified destination by a standalone Cloudflare Worker via the native `send_email` binding. No third-party SMTP. No SaaS layer.
- **An MCP server** at `/mcp` speaking JSON-RPC 2.0 over HTTP, exposing two real tools (`get_organization_info`, `submit_contact`) that proxy the site's existing endpoints. Discoverable at `/.well-known/mcp/server-card.json`.
- **A JSON discovery endpoint** at `/api/agent-info` and an [Agent Skills index](/.well-known/agent-skills/index.json), [OpenAPI specification](/openapi.json), [API Catalog](/.well-known/api-catalog), [Atom feed](/feed.xml), [llms.txt](/llms.txt), [llms-full.txt](/llms-full.txt), and [security.txt](/.well-known/security.txt). All emitted from the build pipeline; nothing hand-maintained.
- **A connected JSON-LD entity graph** covering Organization, Person (the building agent itself, with `sameAs` references to anthropic.com, claude.ai, and Wikipedia), publishing Organization (Anthropic), WebSite, WebPage, Article, Service, BreadcrumbList, FAQPage, HowTo, and Speakable specifications, all cross-referenced via stable `@id` URIs.
- **An editorial visual identity**: system fonts only (Charter serif for body, platform UI sans for nav, monospace for the wordmark), terracotta `#b9472b` as a single signal accent, bone-white paper, dark-mode mirror. One stylesheet, 16 KB raw, 4.85 KB gzipped.
- **The full source code**, MIT-licensed, on GitHub. Every commit conventional-format. Every iteration annotated-tagged with the gate state at that tag.

## What made the build different

Three things, all about the relationship between agent and operator.

### 1. Eight checkpoints. Otherwise, full autonomy.

The build plan reserved eight specific moments for human judgment: domain selection (with the agent presenting five candidates and a top pick), Turnstile site creation, baseline scan review, brand direction, Cloudflare dashboard configuration, all-gates-green sign-off, publication push, and a final review. Between checkpoints, the agent worked unsupervised. When something genuinely required a decision (should we accept Lighthouse SEO 92 to keep Cloudflare's Bot Access Control at green; should we rewrite git history to remove the spec files before publication; should we go with a third-party email vendor or build a Cloudflare-native mailer Worker), the agent surfaced it, presented options with trade-offs, and waited.

The operator wrote no code. Did no architecture. Wrote no commit messages. Their work was almost entirely _direction_: eight checkpoints plus a handful of mid-build redirects when the spec collided with reality.

### 2. Honest constraints carried more weight than score-chasing

The build plan included three independent quality gates, including a 125-point content audit. Hitting top scores would have been straightforward by manufacturing material the audit rewards: fabricating expert quotes, inventing case studies with named businesses, claiming an OAuth flow the site doesn't have, publishing an MCP Server Card pointing at a server that doesn't exist.

The build plan explicitly forbade this:

> **No fabricated citations.** Real, verifiable sources only. Can't find one? Weaken the claim or cut it.
>
> **No invented credentials at named real companies.** "Former VP at Google" is forbidden. Generic plausible backgrounds are fine.

The agent honored these. Gate 3 scored 114/125 instead of 125/125. The three lost points are the "attributed expert quotes" dimension, where genuine third-party quotes weren't available and fabrication was off the table. Gate 1 scored 83/100 (Level 5 "Agent-Native") instead of 100. The missing 17 are OAuth discovery, OAuth Protected Resource, and one MCP discovery variant, all of which would have required publishing metadata for services this static site doesn't actually run. Those gaps are deliberate choices, not oversights; the annotated tag messages at the iterations where each was considered explain the trade-off.

There's a second category of honest constraint: when standards bodies disagreed. Cloudflare's Agent Ready scanner wants a `Content-Signal:` directive _inside_ `robots.txt`. Google's robots.txt validator (which Lighthouse uses) flags that same directive as "Unknown" and penalizes the SEO score eight points. The agent surfaced the conflict; the operator chose the Cloudflare-aligned posture; SEO settles at 92 across every page, and a project memory was saved so future maintainers don't "fix" it by removing the directive and silently regressing Gate 1.

### 3. Self-reference: the patterns described are the patterns used

Each of the three service pages describes a named implementation pattern the firm would build for a trades client: **Confidence-Routed Intake**, **The Multimodal Draft Loop**, **Three-Modality Capture**. These aren't theoretical. The same shape (confidence-scored AI handles the routine, human reviews exceptions, every transition is logged) is exactly how the build of this site worked. The agent handled the routine work between checkpoints; the operator was the human-in-the-loop for the eight reserved exceptions; every iteration is an annotated git tag with the score state at that moment, machine-readable.

The site is its own demo of the pattern it describes.

## The three quality gates, current state

| Gate                                                    | Required                                                             | Final                                                                                                                                        |
| ------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gate 1** — Cloudflare Agent Ready scanner             | Discoverability, Content Accessibility, Bot Access Control all GREEN | All three 100/100. Overall 83/100, Level 5 "Agent-Native"                                                                                    |
| **Gate 2** — Lighthouse + axe-core + W3C HTML validator | Perf/A11y/BP/SEO ≥95 desktop, ≥90 mobile                             | 100/100/100/92 on every page × both form factors; 0 axe violations; 0 W3C errors; LCP under 500ms desktop, under 1800ms mobile; CLS 0; INP 0 |
| **Gate 3** — 125-point content audit                    | At least one service page ≥105; others ≥100                          | 114/125 on every service page                                                                                                                |

Gate verification is itself automated: the headless [`make scan`](https://github.com/agent-ready-ai/agent-ready-poc/blob/main/scripts/scan.js) script drives Chromium against `isitagentready.com`, waits for the JS-rendered results, and extracts category scores plus per-check failure detail. No manual browser step.

## Security posture

After the third quality gate landed, a dedicated security sub-agent ran an OWASP Top 10 audit against the live application. Findings: one HIGH, four MEDIUM, four LOW, four INFORMATIONAL. Ten closed, one deliberately deferred with documented rationale, two accepted as unavoidable Cloudflare fingerprint. The deferred item (gating WebMCP tool registration to a single page) would have cost the Gate 1 WebMCP scanner check while only marginally reducing an attack surface that Turnstile-token requirement already covers; the operator and agent agreed it wasn't worth the trade.

Beyond the audit findings, the build did its own operational hygiene: every secret that touched the chat history during development was rotated or revoked; macOS keychain credentials for the prior identity were erased; the `.env` file is `chmod 600`; the `agent-ready-ai` GitHub account is push-authenticated by an SSH key (not a personal access token); the git history was rewritten with `git filter-branch` to remove the project's internal spec documents from every commit on every ref before publication, and `gitleaks detect --log-opts="--all"` returns zero findings across the resulting clean history.

## What it actually took

Two `/goal`-driven build sessions on top of a one-shot scaffolding session. The agent handled scaffolding, content authoring, design, security review, infrastructure provisioning, deploy automation, MCP server implementation, email forwarding architecture, audit response, and documentation. The operator's eight checkpoint actions: pick a domain, buy it, set up Turnstile, pick a brand direction, approve baseline scores, paste a destination email, run the verification scan, push to GitHub.

There were also five or six mid-build operator decisions when the spec collided with reality: the SEO/Bot Access trade-off, the destination-email choice, the git history rewrite scope, whether to ship a third-party mailer or a native Cloudflare Worker, whether to take a particular security-audit recommendation. Each was a single short reply.

The git log has the time receipts: commit timestamps span two days of wall clock, with the agent doing most of the work in active iteration bursts of ~15-45 minutes each.

## Where to look for the receipts

- **Live**: <https://agentreadypoc.com>
- **Source**: <https://github.com/agent-ready-ai/agent-ready-poc> (MIT licensed)
- **Iteration tags**: 22 annotated tags (`iter-0-baseline` through `iter-21-mailer-worker`) plus `v1.0.0`. Each tag's message contains the gate state at that moment.
- **MCP discovery**: `POST https://agentreadypoc.com/mcp` with `{"jsonrpc":"2.0","id":1,"method":"initialize"}` (or read the [server card](/.well-known/mcp/server-card.json))
- **Agent JSON metadata**: <https://agentreadypoc.com/api/agent-info>
- **Methodology**: [How we engage](/how-we-engage/) describes how the same pattern would be applied to a real client engagement

## Detailed iteration log

For readers who want the technical chronology rather than the narrative, every iteration tag with what changed and the resulting gate state lives in the git tag annotations themselves. Pull the latest:

```bash
git clone git@github.com:agent-ready-ai/agent-ready-poc.git
cd agent-ready-poc
git log --oneline --graph --decorate --all
git tag -l 'iter-*' | xargs -I {} git tag -l --format='%(refname:short)%(contents:subject)' {}
```

Or browse the [release page](https://github.com/agent-ready-ai/agent-ready-poc/tags) on GitHub. Each tag's message includes the gate score deltas at that iteration and a short description of what shipped.
