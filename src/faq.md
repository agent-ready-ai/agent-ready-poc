---
layout: layouts/base.njk
title: FAQ — Agent Ready POC
description: Common questions about how this site was built, what it proves, and how the methodology applies to a real engagement.
faqs:
  - q: "What is this site, exactly?"
    a: "A proof-of-concept that an autonomous AI agent — Claude, running inside Claude Code — can ship a complete, modern, secure, accessible, agent-ready static website end-to-end on Cloudflare, with a human operator's role limited to approval at the eight checkpoints reserved for human judgment."
  - q: "How long did the build take?"
    a: "The iteration log in git tags the exact wall-clock time per iteration. The first deploy went live on the same day the prereqs check completed. The detailed timing is in the case-studies page and the git history."
  - q: "What did the operator actually do?"
    a: "Eight things, none of them coding. Approved domain shortlist, purchased the domain on Cloudflare Registrar, set up the Turnstile site, picked the brand direction (Option B — meta), pasted the Turnstile secret into the Pages env at the dashboard configuration step, ran the manual Gate 1 scanner check, approved publication, and pushed to GitHub. Everything else — scaffolding, content, gate scripts, fix branches, merges, tags — was the agent."
  - q: "Is this site a real business?"
    a: "No. The 'firm' is openly the build process. The services pages describe patterns we would build for a real client, supported by real industry data, but there is no active engagement pipeline. The contact email forwards to the operator for inquiries about the project itself."
  - q: "What does 'agent-ready' mean here?"
    a: "A site is agent-ready when an AI agent can discover, read, and respect the access rules of the site without human intervention. Concretely — robots.txt plus sitemap.xml plus llms.txt plus Link headers for discovery; semantic HTML5 plus JSON-LD entity graph for reading; non-blanket bot rules plus content-signals header for access policy."
  - q: "Why these three services?"
    a: "They are the highest-leverage workflows we see in 5–50 employee skilled-trades businesses where the owner is still operationally involved. All three share the same architectural commitment — confidence-scored AI handles the routine, human handles the exceptions, every transition is logged — which is also the commitment this site itself was built with."
  - q: "What was hardest about building this?"
    a: "Reconciling spec inconsistencies that emerged from a build plan written against tooling which has since shifted. wrangler 4.x dropped Node 20 support; CF_API_TOKEN was deprecated in favor of CLOUDFLARE_API_TOKEN; the Plate Lunch 125-point audit framework cited in the spec is an adaptation rather than a verbatim published rubric. The agent flagged each, proposed a resolution, the operator approved, and the spec was updated in lockstep with the build."
  - q: "What didn't work on the first try?"
    a: "Three things, all logged in the git history under fix/ branches. First — wrangler 4.x refused to run on Node 20 because the published Node engine requirement changed mid-build; bumped Dockerfile to Node 22. Second — chrome-launcher 1.x doesn't include --headless in its defaultFlags, so the lighthouse harness's first run hit ECONNREFUSED; added --headless=new. Third — @axe-core/cli needs chromedriver, which isn't in the Debian Chromium package; swapped to @axe-core/puppeteer which talks to Chrome over CDP directly."
  - q: "Is the code open source?"
    a: "Yes, MIT-licensed at github.com/agent-ready-ai/agent-ready-poc. Includes the Docker stack, the build scripts, the verification harness, and every iteration's commit history."
  - q: "Could this methodology run for my real business?"
    a: "Yes. The methodology is described in detail on the How we engage page. The diagnostic call is free; the engagement is fixed-scope, fixed-fee, 4–8 weeks. The contact page has the inbound channel."
  - q: "How much does an engagement cost?"
    a: "Engagement pricing depends on three factors — existing FSM/CRM integration depth, the size of the historical data corpus, and the number of distinct workflows in scope. Specific pricing is intentionally not on the public site because it depends on the diagnostic conversation. We will tell you on the diagnostic call whether we are the right fit, and what the engagement would cost, before you sign anything."
  - q: "What gates does this site actually pass?"
    a: "Gate 1 (Cloudflare Agent Ready scanner) — all green categories. Gate 2 (Lighthouse plus accessibility plus security) — Performance, Accessibility, and Best Practices at 100/100 on both desktop and mobile across all pages; SEO at 92/100, an intentional 8-point gap because the robots.txt Content-Signal directive Cloudflare requires is flagged 'Unknown' by Google's parser; axe-core reports zero violations; W3C HTML reports zero errors; HSTS, CSP, X-Frame-Options, Permissions-Policy, COOP, Referrer-Policy, content-signals all set. Gate 3 (content audit) — service detail pages carry 5–6 verifiable citations each, original named frameworks, structured for retrieval per published research on content optimization for AI surfaces."
---

# FAQ

{% for faq in faqs %}
## {{ faq.q }}

{{ faq.a }}

{% endfor %}
