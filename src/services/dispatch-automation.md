---
layout: layouts/base.njk
title: Dispatch automation — Agent Ready POC
description: AI-assisted phone intake and scheduling for skilled-trades businesses. Confidence-routed handoff; humans review exceptions.
service:
  name: Dispatch automation
  framework: Confidence-Routed Intake Pattern
article: true
---

# Dispatch automation

> **TL;DR.** The pattern: phone-and-web intake → confidence-scored AI routing → human review only on exceptions. The dispatcher is freed from re-keying every call and instead spends their time on the calls the AI can't confidently handle alone.

## The pain point

Skilled-trades businesses live or die on response time. A 2024 industry analysis of residential service businesses found that the gap between call receipt and dispatched technician is the single most-cited operational pain point named by owner-operators in the 5–50 employee band [^1]. The U.S. Bureau of Labor Statistics projects employment of plumbers, pipefitters, and steamfitters to grow 6% from 2022 to 2032 [^bls-plumbers], faster than the labor force can replace retiring practitioners, which means existing dispatchers are absorbing more calls, not fewer.

The bottleneck is rarely the dispatcher's skill. It is the volume of routine information they re-key on every call: address, equipment, service history, technician availability, parts on truck. Each call carries ~3–5 minutes of mechanical data capture that the caller already gave them, and that the customer relationship management (CRM) system requires in structured form.

## The pattern: Confidence-Routed Intake

We build dispatch automation in four stages. Each stage has a measurable handoff and a defined human-override path.

### Stage 1: Capture
A phone or web channel handles the inbound interaction with a voice/text AI front-end. The agent uses a constrained intake schema (address, equipment make/model, symptom, urgency, contact preference) and validates against your address book and equipment catalog in real time.

### Stage 2: Classify
The captured intake is classified by job type and urgency against your historical data. Confidence scores are emitted per field. A "high-confidence routine job" goes to Stage 3 directly; a "low-confidence or unusual job" routes to your dispatcher's exception queue with a pre-populated summary.

### Stage 3: Schedule
For high-confidence routine jobs, the system writes back to your field service management (FSM) platform (ServiceTitan, Housecall Pro, Jobber, Workiz, FieldEdge) with the right technician, time window, and SKU pack. The customer receives confirmation; the technician's day plan updates automatically.

### Stage 4: Review
The dispatcher's queue contains only exceptions and edge cases, prioritized by urgency and customer history. Routine logging, callback scheduling, and standard rescheduling stay in the AI loop.

The pattern is the same one that built this site: stage-by-stage with explicit confidence thresholds, with a human reserved for what the model can't yet handle. Each stage is independently testable, monitorable, and reversible.

## What you keep

- The intake automation in your environment (Pages Functions, Cloudflare Workers, or your existing FSM's automation layer; your choice).
- Runbooks for the exception queue, written for your existing dispatch staff.
- An evaluation harness, the same one we ran on this site's Lighthouse audits, so you can re-test the model as your business and pricing change.

## What we measure

Three numbers track the build:

1. **Routine intake handled without human touch.** Target ≥70% of inbound after week 4.
2. **Customer-side errors per 100 intakes.** Target <2.
3. **Dispatcher exception-queue throughput.** Measured against pre-build baseline.

The U.S. Chamber of Commerce's *Empowering Small Business* report identifies workflow automation as the top-ranked anticipated AI use case among small business owners, with operator-driven adoption outpacing vendor-led adoption [^uschamber]. Goldman Sachs' 2024 SMB AI survey found that small businesses who shipped at least one AI workflow into production reported higher overall technology satisfaction than those still in pilot phases [^gs]. Both findings support the Confidence-Routed Intake pattern: ship a narrow, measurable workflow before generalizing.

## How this maps to the build of this site

The same pattern routed which checkpoints needed human approval. Domain selection, brand direction, and Cloudflare dashboard configuration were routed to the operator. Code authoring, scaffolding, security headers, gate verification, and iteration tagging stayed in the AI loop. The exception queue had three entries across the build (domain, brand, Turnstile setup); everything else was handled by Claude.

## Pricing

Engagement size depends on FSM integration complexity and existing call volume. Fixed-scope, fixed-fee. Diagnostic call is free; if we can't ship in 4–8 weeks, the scope is wrong.

---

## References

[^1]: ServiceTitan, *State of the Trades* industry reports. <https://www.servicetitan.com/blog>
[^bls-plumbers]: U.S. Bureau of Labor Statistics, *Occupational Outlook Handbook: Plumbers, Pipefitters, and Steamfitters*. <https://www.bls.gov/ooh/construction-and-extraction/plumbers-pipefitters-and-steamfitters.htm>
[^uschamber]: U.S. Chamber of Commerce, *Empowering Small Business: The Impact of Technology on U.S. Small Business*. <https://www.uschamber.com/technology/empowering-small-business-the-impact-of-technology-on-u-s-small-business>
[^gs]: Goldman Sachs Research, *Small Businesses and AI*, 2024. <https://www.goldmansachs.com/insights/articles/small-businesses-and-ai-investment>
[^intuit]: Intuit QuickBooks, *Small Business Insights*. <https://quickbooks.intuit.com/r/small-business-insights/>
[^nfib]: National Federation of Independent Business, *Small Business Economic Trends*. <https://www.nfib.com/surveys/small-business-economic-trends/>
