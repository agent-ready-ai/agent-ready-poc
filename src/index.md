---
layout: layouts/base.njk
title: Agent Ready POC — the proof-of-concept that built itself
description: Live demonstration of what an autonomous AI agent can ship end-to-end on Cloudflare for an AI-advancement firm targeting skilled trades.
---

# Agent Ready POC

> **TL;DR** — Every file on this site was authored by an autonomous agent under direction from a single human operator. The site is modern, secure, accessible (WCAG 2.1 AA), and agent-ready by every published criterion. It models what an AI-advancement firm would ship for a skilled-trades client.

## What this site proves

A single agent — Claude, running inside Claude Code — was handed a detailed mission brief and a host with only Docker installed. With minimal human intervention it: scaffolded the build environment in Docker, authored the 11ty static site, configured Cloudflare Pages, ran three independent quality gates against the live deployment, fixed regressions, and tagged each iteration's progress.

The point is not that the site is fancy. The point is that **nothing in the workflow required a human to write code, configure infrastructure, or hand-tune metrics**. The operator's role was approvals at the checkpoints the build plan deliberately reserved for human judgment.

## What we would build for you

The same agent stack — applied to a real services business — produces three concrete deliverables. They are not theoretical; their structure is on this site, and the iteration log records exactly how each was specified and shipped.

### Dispatch automation
Phone intake → scheduled job in seconds. Confidence-scored AI handles the routine, a human reviews the exceptions. [See details →](/services/dispatch-automation/)

### Estimate acceleration
Quote from a photo, a 30-second voice note, or a partial spec. The model drafts; the estimator approves. [See details →](/services/estimate-acceleration/)

### Field-tech copilot
Voice-first assistant for technicians in the truck. Manuals, job notes, callbacks — without typing on a phone in the rain. [See details →](/services/field-tech-copilot/)

## Who this is for

Operators in skilled trades and local services — plumbing, electrical, HVAC, roofing, pool service, real estate, title, home inspection, general contracting — who:

- Already feel the gap between what's possible with AI and what their tooling vendor is shipping.
- Want to see a complete agent-built artifact before agreeing to one for their own business.
- Have specific bottlenecks (dispatch, estimating, field documentation) where measurable improvement matters more than a glossy "AI strategy" deck.

## How this site was built

The full build is recorded in `git log` — every iteration tagged, every gate run, every score delta logged. See [Case studies](/case-studies/) for the iteration log or [How we engage](/how-we-engage/) for the methodology.

## Cited industry context

Demand for skilled-trades labor is forecast to outpace replacement through 2032 [^bls]. Small businesses in trades adopt new tooling slower than national SMB averages but invest more per-rollout when they do [^uschamber]. The bottleneck on AI adoption for SMBs is not interest; it is the shortage of implementation partners who ship to production rather than to pilot [^gs].

---

[^bls]: U.S. Bureau of Labor Statistics, *Occupational Outlook Handbook: Plumbers, Pipefitters, and Steamfitters*. <https://www.bls.gov/ooh/construction-and-extraction/plumbers-pipefitters-and-steamfitters.htm>
[^uschamber]: U.S. Chamber of Commerce, *Empowering Small Business: The Impact of Technology on U.S. Small Business* (annual). <https://www.uschamber.com/technology/empowering-small-business-the-impact-of-technology-on-u-s-small-business>
[^gs]: Goldman Sachs Research, *Small Business AI Adoption Survey*, 2024. <https://www.goldmansachs.com/insights/articles/small-businesses-and-ai-investment>
