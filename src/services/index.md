---
layout: layouts/base.njk
title: Services — Agent Ready POC
description: Three concrete AI-implementation patterns for skilled-trades businesses, modeled by the same agent that built this site.
---

# Services

> Three deliverables an Agent-Ready-POC-style firm would ship for a real skilled-trades client. Each is fixed-scope, fixed-fee, 4–8 weeks, with a production handoff. The patterns are described against real industry data; the build mechanics are the same ones that produced this site.

## Dispatch automation

Phone-and-web intake → confidence-scored AI routing → human review only on exceptions. The dispatcher stops re-keying every call and starts handling only the ones that need judgment.

**[See details →](/services/dispatch-automation/)**

## Estimate acceleration

Multimodal capture (photo, voice, free text, partial CAD) → model drafts a structured estimate against your price history → estimator approves or adjusts. Senior estimator time shifts from grinding line items to closing jobs.

**[See details →](/services/estimate-acceleration/)**

## Field-tech copilot

Voice-first AI assistant for the truck cab. Pull manuals, log notes, schedule callbacks, capture before/after photos — without typing on a phone in the rain. Offline-capable; syncs when service returns.

**[See details →](/services/field-tech-copilot/)**

## How these patterns relate

The three services share a single architectural commitment: **confidence-scored AI handles the routine, a human handles the exceptions, and every transition is logged**. That same commitment shaped this site: routine scaffolding stayed in the agent loop, brand selection and Turnstile setup routed to the operator, and every step is tagged in the git history.

The pattern generalizes. The same approach — narrow workflow, measurable handoff, audit trail, ship to production — is what we would build for a real client.
