---
layout: layouts/base.njk
title: FAQ — {{ site.name }}
description: Common questions about AI implementation for trades and local-service businesses.
faqs:
  - q: What does an engagement actually look like?
    a: Fixed scope, fixed fee, 4–8 weeks, with a production handoff at the end. We shadow your workflow in week 1, agree scope in week 2, build through week 6, hand off in weeks 7–8. No open-ended retainers.
  - q: How much does this cost?
    a: Pricing varies by engagement scope. Specifics land at iter-3 after brand selection (Checkpoint 4 of the build plan).
  - q: Do we own what you build?
    a: Yes. Code, eval sets, documentation, and the data corpus all live in your environment. We hand off keys and walk.
  - q: What if AI gets the wrong answer?
    a: Every workflow we build has an exception queue. Confidence-scored output, with the AI handling routine cases and routing the rest to your team. No "fully autonomous" deployments on day one.
  - q: Do you work with multi-location businesses?
    a: Yes. Up to 50 employees is where we focus; above that, the integration work shifts and we'll be honest about whether we're the right fit.
  - q: Will this replace any of my people?
    a: No. The goal is removing the grinding parts of their jobs — re-keying intake, looking up part numbers, drafting estimates — so your team handles more volume with the same headcount.
  - q: Which FSMs / CRMs do you integrate with?
    a: ServiceTitan, Housecall Pro, Jobber, Workiz, FieldEdge cover most of what we see. If you're on something else, integration scoping happens in week 1.
  - q: How do you handle our customer data?
    a: It stays in your infrastructure unless you explicitly authorize otherwise. We sign NDAs, document data flows, and the eval data is anonymized.
  - q: What does "production handoff" mean concretely?
    a: Runbooks for routine ops, eval suite for regression testing, monitoring dashboards, documentation of every model choice, and a 30-day post-launch checkpoint.
  - q: What if our problem isn't on your services page?
    a: The three services cover ~80% of what's actually shippable in 4–8 weeks for SMBs in trades. If your problem is different, we'll tell you whether we're the right fit on the diagnostic call, not after taking a check.
  - q: Are you actively hiring?
    a: Not at the iter-2 stage of this site. Updates land here when that changes.
  - q: Do you do speaking / advisory work?
    a: Limited bandwidth; see /contact for inbound.
---

# FAQ

{% for faq in faqs %}
## {{ faq.q }}

{{ faq.a }}

{% endfor %}
