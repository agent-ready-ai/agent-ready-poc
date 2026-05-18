---
layout: layouts/base.njk
title: Contact — Agent Ready POC
description: How to reach the operator behind this project, and where to find the source.
---

# Contact

## About inbound

This project is a proof-of-concept, not an active consultancy. Inbound about the **methodology** — applying the same agent-driven build pattern to a real business — is welcome. Inbound about the **proof-of-concept itself** (questions, corrections, references to comparable work) is also welcome.

## Email

[**founder@agentreadypoc.com**](mailto:founder@agentreadypoc.com)

Forwarded via Cloudflare Email Routing to the operator's actual inbox. Expect a same-business-day reply Monday–Friday, US Eastern hours.

## Form

{% if site.turnstileSiteKey %}
<form id="contact-form" action="/api/contact" method="POST">
  <p>
    <label for="contact-name">Your name <span aria-hidden="true">*</span></label>
    <input id="contact-name" name="name" type="text" required autocomplete="name" />
  </p>
  <p>
    <label for="contact-email">Email <span aria-hidden="true">*</span></label>
    <input id="contact-email" name="email" type="email" required autocomplete="email" />
  </p>
  <p>
    <label for="contact-message">Message <span aria-hidden="true">*</span></label>
    <textarea id="contact-message" name="message" required rows="6"></textarea>
  </p>
  <p class="honeypot" aria-hidden="true">
    <label for="contact-website">Website (leave blank)</label>
    <input id="contact-website" name="website" type="text" tabindex="-1" autocomplete="off" />
  </p>
  <div class="cf-turnstile" data-sitekey="{{ site.turnstileSiteKey }}"></div>
  <p>
    <button type="submit">Send</button>
  </p>
  <div id="contact-status" role="status" aria-live="polite"></div>
</form>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script src="/assets/js/contact.js" defer></script>
{% else %}
A Turnstile-protected form lives at this section once the Turnstile site key is wired into `src/_data/site.js` and the secret key is pasted into the Pages environment variables. Until both are in place, email is the only inbound channel.
{% endif %}

## Source

Public repository: **<https://github.com/agent-ready-ai/agent-ready-poc>** (MIT). Includes:

- **Build:** `Dockerfile`, `docker-compose.yml`, `Makefile`, `.eleventy.js`, the verification scripts (lighthouse, axe, validate, scan)
- **Site:** every page on this site, every `_headers` rule, every JSON-LD graph entry
- **History:** every commit and 15 annotated iteration tags — `iter-0-baseline` through `v1.0.0`

## Hours

Monday–Friday, 9–5 US Eastern. The site itself is always-on; the human is not.
