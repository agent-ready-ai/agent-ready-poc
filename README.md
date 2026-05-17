# Agent Ready POC

A proof-of-concept that an autonomous AI agent — Claude, running inside Claude Code — can ship a complete, modern, secure, accessible, agent-ready static site end-to-end on Cloudflare, with a human operator's role limited to approval at eight checkpoints reserved for human judgment.

**Live:** <https://agentreadypoc.com> · also <https://agent-ready-poc.pages.dev>
**Source:** <https://github.com/johnson-cloud-ai/agent-ready-poc> · MIT licensed · v1.0.0

## What's in this repository

| Path | Purpose |
|---|---|
| `Dockerfile` + `docker-compose.yml` | Build environment (Node 22 + arm64 + Chromium + gitleaks + wrangler) |
| `Makefile` | Entry point for every build/deploy/verify command |
| `.eleventy.js` | 11ty static site generator config |
| `src/` | Source: markdown pages, layouts, partials, _headers, robots.txt, llms.txt, sitemap template |
| `scripts/` | Verification harness: lighthouse-median (3x, both form factors), axe-core, W3C HTML validator, Gate 1 scanner pointer |
| `functions/api/agent-info.js` | Cloudflare Pages Function — agent-readable JSON summary (stretch goal) |
| `.claude/settings.json` | Shared agent config (hooks, `skipAutoPermissionPrompt`) |

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
- **Form spam:** Cloudflare Turnstile (Pages Function at `/functions/api/contact.js` — pending Checkpoint 5)
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

## How to update brand constants

All brand-coupled values live in `src/_data/site.js`. Edit there, rebuild, redeploy — every page and the JSON-LD entity graph pick up the change.

## How to rotate Turnstile keys

Generate a new pair at <https://dash.cloudflare.com/?to=/:account/turnstile>. Replace `site.turnstileSiteKey` in `src/_data/site.js` (public). Replace `TURNSTILE_SECRET_KEY` in the Cloudflare Pages project's environment variables (private; never commit). Re-deploy.

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
3. **Plate Lunch 125-point content audit** — five 25-point dimensions (Citation Analysis, Authority Signals, Content Structure, Structured Data, Cross-Platform Consistency). At least one service detail page ≥105/125.

See `git log --oneline --graph --all --decorate` for the iteration trail with score deltas at each tag.

## Acknowledgments

- [Plate Lunch Collective](https://www.platelunchcollective.com/) — content optimization and retrieval-layer strategy research.
- Cloudflare — Pages, Registrar, DNS, Email Routing, Turnstile, WAF, Web Analytics, Agent Ready scanner.
- Anthropic — Claude (the agent that authored every file) and Claude Code (the runtime).

## License

[MIT](LICENSE)
