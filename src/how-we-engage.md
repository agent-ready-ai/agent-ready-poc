---
layout: layouts/base.njk
title: How we engage — Agent Ready POC
description: The methodology this site was built with, applied to a real engagement with a skilled-trades client.
---

# How we engage

## The build methodology

This site followed an eight-checkpoint plan with the agent working autonomously between checkpoints and the operator approving at each one. The same shape applies to a real client engagement: the agent does the volume of work, the operator owns the decisions.

### Checkpoint pattern

1. **Prereqs** — environment ready, credentials scoped, host tooling minimal.
2. **Domain / identity** — operator-purchased; agent provides shortlist with rationale.
3. **Account-level surfaces** — Turnstile site, API tokens, account-scoped resources. Operator clicks; agent records keys.
4. **Build environment** — Docker stack, gate scripts, baseline measurement deployed.
5. **Direction / brand** — operator picks among agent-presented options. No fabrication.
6. **Iterations** — agent ships against gates, tags every iteration. Operator approves before promoting.
7. **Publication / production handoff** — agent prepares documentation, license, changelog; operator authorizes push.
8. **Final report** — agent delivers a structured summary; operator owns external communications.

### Build cadence

Every iteration is annotated-tagged in git with the metric deltas. Every iteration is independently revertable. The Verification Loop after each deploy is: `scan`, `lighthouse`, `validate`, `a11y`, score the audit, log the artifact, tag. If a gate regresses, revert to the previous green tag and diagnose before re-attempting.

### What the operator does

- Approves at the eight checkpoints.
- Owns external actions the agent legitimately can't take (domain purchase, account-level dashboard work, GitHub push).
- Overrides the agent on judgment calls (brand selection, scope-boundary).
- **Does not edit code** unless they want to.

### What the agent does

- Authors files, scaffolds the build, configures the verification harness, runs gates, fixes regressions, tags iterations.
- Surfaces decisions that need a human (clearly framed, with recommendation).
- Stops at the eight checkpoint boundaries until explicitly resumed.
- Maintains an iteration log so the operator can review the full build history without watching it live.

## Applied to a real engagement

For a skilled-trades client adopting AI in one of the three patterns described in [Services](/services/), the same methodology produces a fixed-scope, fixed-fee, 4–8 week engagement:

### Week 1 — Diagnose

Agent + operator pair shadow the client's workflow. No questionnaires; ride the truck, sit on the phones, watch the estimator. Output: a one-pager describing the workflow's actual shape (which is rarely what the org chart says).

### Week 2 — Scope

Agent drafts the build plan against the diagnosed workflow. Operator reviews with the client. Output: a signed scope with explicit "done" criteria, gate metrics, and a fixed delivery date.

### Weeks 3–6 — Build

Agent ships against the scope. Daily git commits, weekly tagged iterations, weekly client check-in. Operator surfaces blockers. If a scope conflict emerges, the engagement pauses for a re-scope conversation — not for stealth scope expansion.

### Weeks 7–8 — Handoff

Production deploy, runbooks for routine operations, eval harness for regression testing, monitoring dashboards, training session. The client can operate the system without us.

## What you sign up for

- A fixed-fee invoice with a hard-coded delivery date. If we miss the date for reasons inside our control, the final invoice is reduced.
- Weekly check-ins. One communication channel of your choice (Slack, email, SMS).
- A handoff that includes the runbooks, the eval data, the monitoring dashboards, and a 30-day post-launch checkpoint. After that, you're the owner.

## What you do not sign up for

- A "pilot program" that drifts for six months.
- Ongoing managed-service retainer (unless you explicitly want one after handoff).
- A vendor relationship that locks your data into infrastructure you don't control.

## Pricing tiers

The build engagement pricing depends on three factors: existing FSM/CRM integration depth, historical data corpus size, and number of distinct workflows in scope. Diagnostic call is always free; if we can't ship in 4–8 weeks we say so and decline.

(Specific tier pricing is intentionally not on the public site — it depends on the diagnostic conversation.)
