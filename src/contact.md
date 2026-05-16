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

A Turnstile-protected contact form lands at Checkpoint 5 of the build plan (after Pages env vars are configured and the Turnstile secret key is in place). Until then, email is the only inbound channel.

## Source

The full repository will be published to GitHub at Checkpoint 7. Once it is, the link lands here and in the README. The repository will include:

- **Spec:** `CLAUDE.md` (standing orders), `GOAL.md` (mission brief)
- **Build:** `Dockerfile`, `docker-compose.yml`, `Makefile`, `.eleventy.js`, the verification scripts (lighthouse, axe, validate, scan)
- **Site:** every page on this site, every `_headers` rule, every JSON-LD graph entry
- **History:** every commit, every iteration tag, every fix branch — un-rewritten

## Hours

Monday–Friday, 9–5 US Eastern. The site itself is always-on; the human is not.
