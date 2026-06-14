# Agent Ready POC

A proof-of-concept that an autonomous AI agent — Claude, running inside Claude Code — can ship a complete, modern, secure, accessible, agent-ready static site end-to-end on Cloudflare, with a human operator's role limited to approval at eight checkpoints reserved for human judgment.

**Live:** <https://agentreadypoc.com> · also <https://agent-ready-poc.pages.dev>
**Source:** <https://github.com/agent-ready-ai/agent-ready-poc> · MIT licensed · v1.0.0

## What's in this repository

| Path                                | Purpose                                                                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `Dockerfile` + `docker-compose.yml` | Build environment (Node 22 + arm64 + Chromium + gitleaks + wrangler)                                                  |
| `Makefile`                          | Entry point for every build/deploy/verify command                                                                     |
| `.eleventy.js`                      | 11ty static site generator config                                                                                     |
| `src/`                              | Source: markdown pages, layouts, partials, \_headers, robots.txt, llms.txt, sitemap template                          |
| `scripts/`                          | Verification harness: lighthouse-median (3x, both form factors), axe-core, W3C HTML validator, Gate 1 scanner pointer |
| `functions/api/agent-info.js`       | Cloudflare Pages Function — agent-readable JSON summary (stretch goal)                                                |
| `.claude/settings.json`             | Shared agent config (hooks, `skipAutoPermissionPrompt`)                                                               |

## Prerequisites

The host machine needs **only**:

- Docker Desktop (8GB+ allocated, arm64 architecture)
- `git`
- `jq`
- `make`
- A `CLOUDFLARE_API_TOKEN` (Custom token with scopes: Pages Edit, Workers Scripts Edit, Zone DNS Edit, Zone Settings Edit, Zone Read, User Details Read, Memberships Read)

The token is sourced from a project-local `.env` (gitignored). See `.env.example` for the template.

Everything else — Node, npm, wrangler, Chromium, axe-core, lighthouse, gitleaks — runs inside the Docker container. No global installs on the host.

## Quickstart

```bash
make bootstrap        # First time only — build the Docker image
make install-fresh    # First time only — generates package-lock.json
make up               # Start the long-running container (do once per session)
make dev              # Eleventy dev server on http://localhost:8080
```

## All make targets

```
make help                 # List every target with one-line description
make build                # Build the site to dist/
make dev                  # Run eleventy --serve at :8080
make deploy               # Build + deploy to Cloudflare Pages
make whoami               # Verify Cloudflare API token + scopes

make validate             # W3C HTML validation against built dist/
make lighthouse           # Lighthouse 3-run median, both desktop and mobile
make a11y                 # axe-core a11y check, all pages
make scan                 # Gate 1 — Cloudflare Agent Ready scanner URL (manual)
make check-all            # Run validate + lighthouse + a11y + scan
make secret-scan          # gitleaks (working tree + full history)

make changelog            # Generate CHANGELOG.md from conventional commits
make logs                 # Tail container logs
make shell                # Bash inside the container
make down                 # Stop the container
make clean                # Stop, remove volumes, dist, node_modules
make nuke                 # clean + remove the Docker image
```

## Architecture

- **Static site:** 11ty (Nunjucks templates over markdown source)
- **Hosting:** Cloudflare Pages (static assets + Pages Functions)
- **DNS / TLS / CDN / WAF:** Cloudflare (Universal SSL, HTTP/3, Free WAF)
- **Form spam:** Cloudflare Turnstile (Pages Function at `/functions/api/contact.js`)
- **Email:** Cloudflare Email Routing (`founder@agentreadypoc.com` → operator inbox)
- **Analytics:** Cloudflare Web Analytics (cookieless; enabled after Gate 1 confirmation)
- **Verification:** Lighthouse + axe-core + W3C nu validator + Cloudflare Agent Ready scan + content audit

## How to add a service page

1. Create `src/services/<kebab-slug>.md` with front matter `layout: layouts/base.njk`, `title`, `description`.
2. Add the page link in `src/_includes/partials/nav.njk` if the page should appear in the primary nav.
3. Append the page to `src/llms.txt` and `src/llms-full.txt`.
4. `make build && make validate && make a11y && make lighthouse` locally.
5. Commit on a `feat/<kebab>` branch; merge to `main` with `--no-ff`.
6. `make deploy`. Re-run all gates against the deploy URL. Tag the iteration.

## How Probe works

Probe (`/probe/`) is a read-only agent-readiness inspector. You give it a URL; it
reports which agent-ready surfaces that site exposes on a seven-point board —
Discoverable, Readable, MCP, Skills, API, Auth, Pricing.

- **`functions/api/probe.js`** — the Pages Function. Owns the untrusted-input
  boundary: it accepts `POST { "target": "<url>" }`, validates the URL, blocks
  private/loopback/link-local/metadata hosts (SSRF), then issues capped, timed
  `GET`s to the target's well-known discovery paths. It is strictly read-only —
  there is no code path that calls a discovered endpoint, authenticates, or
  transacts — and it stores/logs nothing about a scan.
- **`functions/api/_probe/parsers.js`** — pure, deterministic parsers (no
  network, no clock). Each tolerates divergent real-world schemas and malformed
  input, returning an empty shape rather than throwing.
- **`functions/api/_probe/report.js`** — pure coverage assembly: turns the fetch
  results into the `{ target, coverage, score, surfaces }` report the UI renders.
- **`src/assets/js/probe.js`** — the browser widget (external, no inline JS).
  Renders results via `textContent` only (scanned output is untrusted).
- **`src/probe.md`** — the page. Ships a static worked example so it is useful
  with JavaScript disabled; the widget upgrades it when JS runs.

Determinism makes it testable: `npm test` runs the parsers and report assembly
against captured fixtures in `test/fixtures/` (a rich 7/7 site and a sparse 5/7
site) — same input, same output.

### Optional live AI summary (NVIDIA)

The scan is deterministic and zero-token. There is one opt-in, non-deterministic
extra: an **Explain with AI** button that narrates the finished report.

- **`functions/api/_probe/ai.js`** — `buildSummaryPrompt(report)` (pure, tested)
  turns the report into chat messages; `summarizeWithNvidia(report, env)` POSTs
  them to NVIDIA NIM (OpenAI-compatible, model `nvidia/nemotron-3-ultra-550b-a55b`)
  and returns the narration. The model only ever sees the report Probe already
  produced — it never decides what to fetch and never touches the scanned site.
- **Trigger:** the function runs inference **only** when the request body is
  `{ "target": ..., "summarize": true }`, which the widget sends only on an
  explicit button click. A normal scan never calls the model, so the default
  path stays zero-token and is not exposed to per-request inference cost/abuse.
- **Cost & vendor note:** this is the one place the project leaves the
  single-vendor Cloudflare path and incurs token cost. It is feature-flagged by
  the presence of the key — if `NVIDIA_API_KEY` is unset, `aiAvailable` is false
  and the button does not render.

**Configure / rotate the key.** Get a key at <https://build.nvidia.com>. It is a
secret — never commit it.

- **Local dev:** put `NVIDIA_API_KEY=...` in `.env` (gitignored). `wrangler pages
dev` loads it.
- **Production:** set it as a Pages environment variable (Settings → Environment
  variables) or `wrangler pages secret put NVIDIA_API_KEY`. Optionally override
  the model with `NVIDIA_MODEL`.
- **Rotate:** revoke the old key at build.nvidia.com, then replace it in both
  places above. The key never enters the repo, a commit, or `.env.example`.

### How to add a parser

1. Write a pure `parseX(input, baseUrl?)` in `functions/api/_probe/parsers.js`
   that returns a normalized shape and never throws on bad input.
2. Capture a real fixture under `test/fixtures/<site>/` and assert the parser's
   output in `test/probe.test.js`.
3. Wire the surface into the fetch list in `functions/api/probe.js` and map it to
   a coverage dimension in `functions/api/_probe/report.js` (add a `HINTS` entry
   for the absent case).
4. `npm test`, then `make build` and re-run the gates.

## How to update brand constants

All brand-coupled values live in `src/_data/site.js`. Edit there, rebuild, redeploy — every page and the JSON-LD entity graph pick up the change.

## How to rotate Turnstile keys

Generate a new keypair at <https://dash.cloudflare.com/?to=/:account/turnstile>. The two halves rotate independently and live in different places:

**Site key (public, commit-safe).** Replace `site.turnstileSiteKey` in `src/_data/site.js`, commit, and re-deploy via `make deploy`. This value is rendered into the page's HTML; it is meant to be public and is not a secret.

**Secret key (private, never commit).** In the Cloudflare Pages project's settings → Environment variables, replace `TURNSTILE_SECRET_KEY` for the production environment and save. Trigger a redeploy from the dashboard so the new value attaches to the running Function. The secret never enters the repository, the `.env` file, or any commit message.

After both halves are rotated, submit a test message through `/contact/` and confirm the email forwards through to the configured destination. If verification fails, the keys are mismatched — re-check that both halves come from the same Turnstile widget.

## How to rotate `CLOUDFLARE_API_TOKEN`

The token used at this repo's build time has an expiration date; tracking the date is the operator's responsibility. To rotate: create a new token at <https://dash.cloudflare.com/profile/api-tokens> with the same scopes (see Prerequisites above), update `.env`, run `make whoami` to confirm, then revoke the old token in the dashboard.

## Verification gates

Three independent gates the build was held to:

1. **Cloudflare Agent Ready scan** — <https://isitagentready.com/agentreadypoc.com>. Discoverability, Content Accessibility, Bot Access Control all green.
2. **Lighthouse + axe + W3C + securityheaders + SSL Labs**
   - Desktop: Performance, Accessibility, Best Practices, SEO all ≥95 (targeting 100)
   - Mobile: Performance ≥90, Accessibility ≥95, Best Practices ≥95, SEO ≥95
   - 0 axe violations · 0 W3C HTML errors
   - Cloudflare's default headers + this repo's `_headers` deliver SSL Labs A/A+ and securityheaders.com A/A+ posture
3. **125-point content audit** — a 5×25 rubric adapted by the build plan from Plate Lunch Collective's published themes on AI-surface content optimization (Citation Analysis, Authority Signals, Content Structure, Structured Data, Cross-Platform Consistency). The 125-point form is the build plan's adaptation, not a Plate Lunch product. At least one service detail page ≥105/125.

See `git log --oneline --graph --all --decorate` for the iteration trail with score deltas at each tag.

## Acknowledgments

- [Plate Lunch Collective](https://www.platelunchcollective.com/) — content optimization and retrieval-layer strategy research.
- Cloudflare — Pages, Registrar, DNS, Email Routing, Turnstile, WAF, Web Analytics, Agent Ready scanner.
- Anthropic — Claude (the agent that authored every file) and Claude Code (the runtime).

## License

[MIT](LICENSE)
