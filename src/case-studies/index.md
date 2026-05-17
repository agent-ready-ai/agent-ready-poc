---
layout: layouts/base.njk
title: Case studies — Agent Ready POC
description: The real iteration log of how an autonomous agent built this site end-to-end on Cloudflare.
article: true
---

# Case studies

The case study **is** this site. Every iteration is annotated-tagged in the git history with the gate scores at that iteration. This page summarizes them; the authoritative source is `git log --oneline --decorate --graph`.

## iter-0-baseline — Cloudflare defaults floor

**Tag:** `iter-0-baseline` · **What changed:** placeholder index deployed to `agent-ready-poc.pages.dev`

The first measurement: a single-page placeholder, no JSON-LD, no `_headers`, no `robots.txt`. Establishes which points come free from Cloudflare's defaults versus what the build adds.

- Performance: 100  ·  Accessibility: 94  ·  Best Practices: 100  ·  SEO: 92
- axe-core: 0 violations  ·  W3C HTML: 0 errors
- LCP: 800 ms  ·  CLS: 0  ·  INP: 0

**Free wins identified:** HTTPS, HTTP/3, `referrer-policy`, `x-content-type-options`, `access-control-allow-origin: *`.

**Gaps identified:** missing `_headers`, `robots.txt`, `llms.txt`, `sitemap.xml`, content-signals, JSON-LD entity graph, WCAG 2.5.8 touch-target sizing.

## iter-1-defaults — discoverability and bot access

**Tag:** `iter-1-defaults` · **What changed:** added the Cloudflare-can't-infer-this files

Added `_headers` (CSP, HSTS, Permissions-Policy, content-signals), `robots.txt` (non-blanket AI bot rules), `llms.txt` (page list), `sitemap.xml` (generated from eleventy collections), JSON-LD entity graph stub in `base.njk`, and a CSS touch-target fix for WCAG 2.5.8.

- Performance: 100  ·  Accessibility: 100 (+6)  ·  Best Practices: 100  ·  SEO: 100 (+8)
- axe-core: 0 violations  ·  W3C HTML: 0 errors
- Gate 2: GREEN at ceiling

## iter-2-structure — full page tree

**Tag:** `iter-2-structure` · **What changed:** scaffolded 11 crawlable pages + 1 404

Added /about, /services (index + 3 detail pages), /case-studies, /how-we-engage, /blog, /faq (with FAQPage schema), /contact, /404. Created a nav partial with aria-current handling, added a Nunjucks `startswith` filter for prefix matching. Lighthouse harness updated to run both desktop and mobile per Gate 2 spec.

- Per-page Lighthouse: 100/100/100/100 on both mobile and desktop, across all 11 pages
- axe-core: 0 violations across all pages
- W3C HTML: 0 errors across all pages
- Gate 2: GREEN on the full page tree

## iter-3-content — real content with citations

**Tag:** `iter-3-content` · **What changed:** brand selection (Option B: meta) and real content shipped

Adopted "Agent Ready POC" as the brand — meta, openly the build process. Wrote real content for home, about, three service pages, case studies (this page), how-we-engage, FAQ, contact. Each service detail page now carries 5–6 verifiable citations to industry sources, two-to-three statistics per major section, and an original named framework. No fabricated expert quotes — better to leave that Gate 3 dimension partial than to fabricate.

Custom domain `agentreadypoc.com` attached.

(Gate scores logged at the iter-3 tag annotation in `git log`.)

## What the iteration log proves

Three things:

1. **The agent can ship the structural and quality bar without human authoring.** Iterations 0–2 are entirely structural; the operator approved each tag but did not edit code.
2. **Brand and content decisions remain a checkpoint.** The operator picked the brand direction at Checkpoint 4 (Option B). No autonomous brand fabrication.
3. **The verification harness scales.** Adding pages from 1 → 12 did not require rewriting the gate scripts; lighthouse, axe, validate, and the sitemap all picked up new pages automatically.
