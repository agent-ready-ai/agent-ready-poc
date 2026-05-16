---
layout: layouts/base.njk
title: Field-tech copilot — Agent Ready POC
description: Voice-first AI assistant for trades technicians. Hands-free manuals, job logging, callback scheduling, offline-capable.
---

# Field-tech copilot

> **TL;DR** — The pattern: a voice-first assistant in the truck cab. Pull manuals, log job notes, schedule callbacks, capture before/after photos — without typing on a phone in the rain. Offline-capable; syncs when service returns.

## The pain point

Field technicians lose time and revenue at the same point: data capture in the field. Job notes get logged hours late (or not at all). Equipment manuals get looked up on the customer's couch, with the homeowner watching. Callback scheduling defaults to "I'll text dispatch when I get back to the truck," and that text is forgotten by the third call of the day.

The U.S. Chamber of Commerce identifies mobile-first workforce tools as the second-most-cited near-term technology investment among small businesses in service trades [^uschamber]. The bottleneck is rarely the technology stack — most FSMs already offer mobile apps. The bottleneck is interaction modality. Typing on a phone with greasy hands, in cold weather, or under a sink, fails as an input method.

NFIB's *Small Business Economic Trends* reports that quality-of-labor-retention is consistently a top-three reported challenge among small service businesses [^nfib]. Senior technicians who feel like the back-office tooling adds work — rather than removing it — leave at higher rates. The cost of a missed job-note is not the missed note; it is the senior tech who quits because their tooling fights them.

## The pattern: Three-Modality Capture

The copilot is built around three input modalities used in combination, with an offline-first sync layer underneath.

### Modality 1 — Voice

The technician speaks job notes during the work or between visits. The model structures the speech into the FSM's required fields — work performed, parts replaced, time on site, customer concerns surfaced. Confidence-scored output; uncertain fields prompt a 5-second clarification. Voice is the primary modality because it works hands-free, with gloves, in poor lighting, and through a respirator.

### Modality 2 — Camera

Photos of nameplates, model numbers, panel labels, before/after states. The model extracts model numbers and matches against your equipment library. A photo of an inscrutable boiler nameplate becomes a structured equipment record in the FSM in under 10 seconds. Camera is the strongest modality for inputs that voice can't reliably capture (long alphanumeric codes, visual states, signatures).

### Modality 3 — Position and context

GPS, time of day, current job, customer history. These auto-populate fields the technician would otherwise type. Position context also enables "schedule a callback near here next Tuesday" without the tech specifying the location — the model knows.

### Offline-first sync layer

Service drops in basements, in steel-framed industrial buildings, in rural service areas. The copilot operates fully offline against a local model and a cached customer database, then syncs on a schedule when service returns. The McKinsey AI adoption surveys note that offline capability is a determining factor for AI tooling adoption in field-service contexts [^mckinsey].

## What you keep

- The copilot, your equipment library, your structured job-note schema — all in your environment.
- Offline mode that doesn't depend on our infrastructure being reachable.
- Per-technician usage metrics: which modalities each tech uses most, where capture failures cluster, what the audit trail shows.

## What we measure

1. **Job-note completeness rate, end-of-shift.** Target: ≥90% of jobs have structured notes before the technician's day ends.
2. **Time-on-site overhead from documentation.** Target: <2 minutes per job, voice-captured.
3. **Senior-tech retention 6 months after rollout.** Tracked but not used as build acceptance — too noisy in <30-employee shops, but directionally meaningful.

ServiceTitan's industry reports identify field-data capture quality as the highest-leverage workflow improvement for residential service businesses with 5–50 technicians [^st]. The pattern's value compounds with use: every successful capture is training data for the next, sharpening field-model accuracy without requiring an explicit retraining step.

## How this maps to the build of this site

The build agent operates against the same constraint the field tech does: limited bandwidth, intermittent operator attention, a need to capture intent without forcing the human into a structured input form. The operator gave free-form direction; the agent structured it into Checkpoint-conformant deliverables and routed exceptions back. Three-Modality Capture's "voice + camera + context" generalizes to "free-text intent + reference docs + project state."

## Pricing

Engagement size depends on technician count, equipment library complexity, and FSM integration depth. Fixed-scope, fixed-fee. Diagnostic call free.

---

## References

[^uschamber]: U.S. Chamber of Commerce, *Empowering Small Business: The Impact of Technology on U.S. Small Business*. <https://www.uschamber.com/technology/empowering-small-business-the-impact-of-technology-on-u-s-small-business>
[^nfib]: National Federation of Independent Business, *Small Business Economic Trends*. <https://www.nfib.com/surveys/small-business-economic-trends/>
[^mckinsey]: McKinsey & Company, *The State of AI* annual survey series. <https://www.mckinsey.com/capabilities/quantumblack/our-insights>
[^st]: ServiceTitan, *State of the Trades* industry reports. <https://www.servicetitan.com/blog>
[^gs]: Goldman Sachs Research, *Small Businesses and AI*, 2024. <https://www.goldmansachs.com/insights/articles/small-businesses-and-ai-investment>
[^bls-hvac]: U.S. Bureau of Labor Statistics, *Occupational Outlook Handbook: Heating, Air Conditioning, and Refrigeration Mechanics and Installers*. <https://www.bls.gov/ooh/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm>
