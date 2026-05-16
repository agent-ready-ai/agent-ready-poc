---
layout: layouts/base.njk
title: Dispatch automation — {{ site.name }}
description: AI-assisted phone intake and scheduling for trades businesses. Hours-to-seconds latency on routine jobs.
---

# Dispatch automation

> TL;DR — Phone intake → scheduled job in seconds, not hours. Your dispatcher reviews exceptions instead of triaging every call.

## The pain point

Dispatchers spend most of their day re-keying information that callers already gave them. Citation + sizing for this lands at iter-3.

## What we build

Three components shipped as one engagement:

1. **AI intake** — a phone or web flow that captures the job in structured form.
2. **Routing logic** — write-back into your FSM (ServiceTitan, Housecall Pro, Jobber, etc.) with the right tech, time slot, and SKU.
3. **Exception queue** — only the calls the AI can't handle reach a human, prioritized by urgency.

## What you keep

- The intake automation, on your infrastructure or ours (your choice).
- Documented runbooks for the exception queue.
- Eval set so you can re-test the AI as your business changes.

## Pricing

Engagement size lands at iter-3 (after Checkpoint 4 brand selection — pricing model is brand-specific).

---

*Structural placeholder. Citations, statistics, expert quotes, and original framework ship with iter-3 to clear Gate 3.*
