---
layout: layouts/base.njk
title: Probe — agent-readiness inspector — Agent Ready POC
description: Probe inspects any site's agent-ready surfaces — llms.txt, Markdown, MCP, agent-skills, OpenAPI, OpenID, pricing — and reports what it exposes to AI agents. Read-only, zero-token, deterministic.
---

# Probe

> **TL;DR.** Probe inspects any public site and reports the agent-ready surfaces it exposes — whether agents can **discover** it, **read** it as Markdown, call it over **MCP**, find its **skills**, read its **API**, see how to **authenticate**, and learn what actions **cost**. It fetches and parses public discovery files only; it never calls, authenticates to, or transacts with anything it finds. Same input, same output; no model in the loop; zero tokens per scan.

## What Probe does

An agent arriving at a site cold has to answer a few questions before it can do anything useful. Is there a map of the site it can read? Can it get the content as Markdown instead of scraping HTML? Are there tools it can call? An API it can read? A way to authenticate? Probe asks those questions for you and lays the answers out on a seven-point board.

Probe runs server-side in a Cloudflare Pages Function: you hand it a URL, it fetches that site's well-known discovery files, parses each one, and returns a coverage report. Every site — whether it exposes all seven surfaces or none — comes back in the same shape, so you can compare a richly instrumented site against a bare one at a glance.

It is strictly read-only. Probe issues `GET` requests to standard discovery paths (`/llms.txt`, `/.well-known/api-catalog`, `/openapi.json`, and so on), reads what is published there, and stops. It does not invoke a discovered tool, complete an OpenID flow, or send anything to a priced endpoint. Nothing about a scan is stored or logged.

## Inspect a site

<div id="probe">
  <form id="probe-form">
    <p>
      <label for="probe-target">Site URL</label>
      <input id="probe-target" name="target" type="text" inputmode="url" autocomplete="off" spellcheck="false" placeholder="example.com" />
    </p>
    <p>
      <button type="submit">Inspect</button>
    </p>
    <p class="probe-presets">Try:
      <button type="button" data-probe-target="agentreadypoc.com">this site</button>
      <button type="button" data-probe-target="flatironbuildingnyc.com">flatironbuildingnyc.com</button>
    </p>
  </form>

  <div id="probe-status" role="status" aria-live="polite"></div>

  <section id="probe-results" aria-label="Inspection results" aria-live="polite">
    <p class="probe-score"><strong>5/7</strong> agent-ready surfaces on <code>agentreadypoc.com</code> <span class="probe-eg">(example result — enable JavaScript to inspect any site)</span></p>
    <ul class="probe-board">
      <li class="probe-item is-present">
        <p class="probe-item-head"><span class="probe-badge">✓ Present</span> <strong>Discoverable</strong></p>
        <p class="probe-item-desc">An <code>llms.txt</code> maps every page with a one-line description, in three sections.</p>
      </li>
      <li class="probe-item is-present">
        <p class="probe-item-head"><span class="probe-badge">✓ Present</span> <strong>Readable</strong></p>
        <p class="probe-item-desc">Requesting any page with <code>Accept: text/markdown</code> returns clean Markdown; a concatenated <code>llms-full.txt</code> is also published.</p>
      </li>
      <li class="probe-item is-present">
        <p class="probe-item-head"><span class="probe-badge">✓ Present</span> <strong>MCP</strong></p>
        <p class="probe-item-desc">A server-card advertises two tools: <code>get_organization_info</code> and <code>submit_contact</code>.</p>
      </li>
      <li class="probe-item is-present">
        <p class="probe-item-head"><span class="probe-badge">✓ Present</span> <strong>Skills</strong></p>
        <p class="probe-item-desc">An agent-skills index lists the same two capabilities as discrete, callable skills.</p>
      </li>
      <li class="probe-item is-present">
        <p class="probe-item-head"><span class="probe-badge">✓ Present</span> <strong>API</strong></p>
        <p class="probe-item-desc">An OpenAPI document describes <code>GET /api/agent-info</code> and <code>POST /api/contact</code>; an api-catalog points to it.</p>
      </li>
      <li class="probe-item is-absent">
        <p class="probe-item-head"><span class="probe-badge">✗ Absent</span> <strong>Auth</strong></p>
        <p class="probe-item-desc">No <code>/.well-known/openid-configuration</code>. Publishing one lets agents discover how to authenticate.</p>
      </li>
      <li class="probe-item is-absent">
        <p class="probe-item-head"><span class="probe-badge">✗ Absent</span> <strong>Pricing</strong></p>
        <p class="probe-item-desc">No <code>/pricing.md</code>. Publishing one tells agents what an action costs before they take it.</p>
      </li>
    </ul>
    <p class="probe-note">Read-only inspection: Probe fetched these public discovery files and parsed them. It did not call, authenticate to, or transact with any endpoint.</p>
  </section>
</div>

## The seven surfaces

Each surface is one standard way a site can make itself legible to agents. None is required; together they describe how far a site has gone.

- **Discoverable** — a `/llms.txt` map (or a `robots.txt` sitemap) so an agent can find the site's pages without crawling blind.
- **Readable** — content available as Markdown, via `Accept: text/markdown` negotiation or `.md` alternates, so an agent reads structure instead of parsing HTML.
- **MCP** — a Model Context Protocol server-card at `/.well-known/mcp/server-card.json` advertising callable tools.
- **Skills** — an agent-skills index at `/.well-known/agent-skills/index.json` listing discrete, named capabilities.
- **API** — an OpenAPI document or an api-catalog describing the site's HTTP operations.
- **Auth** — an `/.well-known/openid-configuration`, which tells an agent how to authenticate. Probe notes its presence only; it never starts a flow.
- **Pricing** — a `/pricing.md` (or priced API) stating what actions cost.

## Robust by design

Surfaces in the wild disagree with each other. An api-catalog might use the RFC 9264 linkset shape or a plain endpoint array. An MCP card might put tools at the top level or nest them under a server entry. A skill might key its URL as `url` or as `path`. A catalog might advertise an OpenAPI document that returns a 404. Probe's parsers tolerate all of this: a malformed or missing surface degrades to "absent" or to an honest note, and never crashes the report. The parsers are pure functions with no network and no clock, tested against captured fixtures from real sites — same input, same output.

## Optional: explain with AI

The scan is deterministic and costs nothing. After a result renders, an optional **Explain with AI** button sends the finished report to a hosted model (NVIDIA Nemotron, via NVIDIA's OpenAI-compatible inference) and shows a short plain-English readiness assessment. This is the one path that uses a model and costs tokens, so it runs only when you click it — never automatically. The model narrates facts the deterministic scan already collected; it does not decide what to fetch and never touches the inspected site. The button appears only where an inference key is configured for the deployment.

## What read-only means here

Probe is an inspector, not an actor. It reads the public files a site chooses to publish for agents and reports them back. It is the safe first step of any agent interaction: see what is on offer before deciding whether to engage. The boundary is deliberate and enforced in code — the inspection has no path that calls a discovered endpoint. The optional AI narration above is the only model in the loop, and it only ever sees the report Probe already produced.

<script src="/assets/js/probe.js" defer></script>
