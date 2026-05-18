# Final Report — Agent Ready POC

> Updated through **iter-21-mailer-worker + WAF rate-limit landing** (2026-05-17). Two operator decisions still on the page (domain cost / expiration tracking) — flagged inline as **TBD-operator**.

## Deployment Summary

| | |
|---|---|
| Domain | `agentreadypoc.com` (purchased via Cloudflare Registrar) |
| Domain cost (year 1) | **TBD-operator** (dash.cloudflare.com → Domains) |
| Domain expiry | **TBD-operator** — annual renewal date |
| Live URLs | <https://agentreadypoc.com> · <https://www.agentreadypoc.com> · <https://agent-ready-poc.pages.dev> |
| GitHub repo | <https://github.com/johnson-cloud-ai/agent-ready-poc> · MIT · 23 tags · default branch `main` |
| Cloudflare Pages project | `agent-ready-poc` |
| Cloudflare Worker | `agent-ready-poc-mailer` (standalone; no public route; Service Binding only) |
| Cloudflare account | `Johnson.chris@gmail.com's Account` (`747b4d05bb700eebcef964259fb3e58c`) — free tier |
| Total Cloudflare cost (year 1) | Domain only (Pages, Workers, DNS, Email Routing, Turnstile, WAF Custom Rules, WAF Rate Limiting, Web Analytics all free tier) |
| Iterations to all gates | 22 (iter-0-baseline → iter-21-mailer-worker) across two `/goal`-driven build sessions |
| Docker image size | `agent-ready-poc:dev`  ·  1.91 GB |

## Cloudflare Configuration

| Surface | Status |
|---|---|
| Pages project | `agent-ready-poc` · 30+ deployments shipped |
| Custom domains | `agentreadypoc.com` + `www.agentreadypoc.com` · `status: active`, SSL provisioned |
| CNAME records | both proxied (apex + www) → `agent-ready-poc.pages.dev` |
| Pages env vars | ✅ `TURNSTILE_SECRET_KEY` (rotated 2026-05-17, encrypted) |
| Pages Service Bindings | ✅ `MAILER` → `agent-ready-poc-mailer` (production) |
| Mailer Worker | ✅ deployed; `send_email` binding to `chris@johnson.cloud`, `[vars] DESTINATION_ADDRESS` + `SENDER_ADDRESS`; `workers_dev = false` |
| Email Routing | ✅ destination `chris@johnson.cloud` verified; routes inbound `founder@agentreadypoc.com` |
| WAF Custom Rules | None active (none required) |
| WAF Rate Limiting | ✅ `Rate-limit /api/contact and /mcp` — 10 req / 10s / IP, Block. Verified 429 on burst. Closes audit M2 |
| Bot Fight Mode | OFF (required by build — keep off) |
| Speed | **TBD-operator** — Brotli, Early Hints, HTTP/3 ON; Auto Minify + Rocket Loader OFF |
| SSL/TLS | **TBD-operator** — Full (strict), Always Use HTTPS, Min TLS 1.2 |
| Web Analytics site | **TBD-operator** (optional; Gate 1 already passes without it) |
| Turnstile site | ✅ created (Checkpoint 2); site key in `src/_data/site.js`; secret in Pages env |
| Stretch goal | ✅ exceeded — `/api/agent-info` JSON endpoint, `/mcp` JSON-RPC 2.0 server with two real tools, `/.well-known/mcp/server-card.json`, `/.well-known/agent-skills/index.json`, `/.well-known/api-catalog`, `/.well-known/security.txt`, `/openapi.json`, `/feed.xml` |

## Gate 1 — Cloudflare Agent Ready

Verified live by `make scan` (puppeteer-driven; no manual browser step needed since iter-11).

| Category | Baseline (iter-0) | Iter-21 (current) | GOAL.md target |
|---|---|---|---|
| Discoverability | 0/3 | **3/3** (100/100) ✅ | GREEN |
| Content Accessibility | 0/1 | **1/1** (100/100) ✅ | GREEN |
| Bot Access Control | 0/2 | **2/2** (100/100) ✅ | GREEN |
| API/Auth/MCP/Skill Discovery | 0/6 | **4/6** (67/100) ✅ above N/A | N/A (stretch) |
| Agentic Commerce | N/A | N/A | N/A |
| **Overall score** | 33/100 (Level 1 Basic) | **83/100 (Level 5 Agent-Native)** | GREEN on required 3 |

API/MCP gap of 2/6: OAuth discovery + OAuth Protected Resource. Both require a real OAuth flow this static site doesn't have; implementing fake metadata would violate the GOAL.md hard rule against fabrication. Honest ceiling.

## Gate 2 — Lighthouse + Security + Accessibility

3-run median, post-iter-20 (after CSP tightening), tested via the headless `make lighthouse` harness against the production custom-domain URL.

| Page | Perf-D | Perf-M | A11y-D | A11y-M | BP | SEO | LCP-D | LCP-M | CLS | INP |
|---|---|---|---|---|---|---|---|---|---|---|
| / | 100 | 100 | 100 | 100 | 100 | **92*** | 494ms | 1737ms | 0 | 0 |
| /about/ | 100 | 100 | 100 | 100 | 100 | 92* | — | — | 0 | 0 |
| /services/ | 100 | 100 | 100 | 100 | 100 | 92* | — | — | 0 | 0 |
| /services/dispatch-automation/ | 100 | 100 | 100 | 100 | 100 | 92* | — | — | 0 | 0 |
| /services/estimate-acceleration/ | 100 | 100 | 100 | 100 | 100 | 92* | — | — | 0 | 0 |
| /services/field-tech-copilot/ | 100 | 100 | 100 | 100 | 100 | 92* | — | — | 0 | 0 |
| /case-studies/ | 100 | 100 | 100 | 100 | 100 | 92* | — | — | 0 | 0 |
| /how-we-engage/ | 100 | 100 | 100 | 100 | 100 | 92* | — | — | 0 | 0 |
| /blog/ | 100 | 100 | 100 | 100 | 100 | 92* | — | — | 0 | 0 |
| /faq/ | 100 | 100 | 100 | 100 | 100 | 92* | — | — | 0 | 0 |
| /contact/ | 100 | 100 | 100 | 100 | 100 | 92* | — | — | 0 | 0 |

CWVs sit well under thresholds (LCP target <2.5s, CLS target <0.1, INP target <200ms).

**\*SEO 92 is a deliberate, documented trade-off.** Lighthouse's robots.txt validator (Google's strict RFC parser) flags `Content-Signal:` as "Unknown directive" — and that exact directive is what the Cloudflare Agent Ready scanner requires *in* robots.txt to score Bot Access Control 2/2 GREEN. Operator chose the Cloudflare-aligned posture; SEO settles at 92. See Gotcha #9.

| External validator | Expected | Verified |
|---|---|---|
| SSL Labs grade | A/A+ | **TBD-operator** (browser test) |
| securityheaders.com | A/A+ | **TBD-operator** (browser test) |
| W3C HTML errors | 0 | ✅ 0 across all 12 pages |
| axe-core violations | 0 | ✅ 0 across all 12 pages, live and local |

## Gate 3 — 125-Point Audit (self-scored, post-iter-19)

| Dimension (25 pts each) | dispatch-automation | estimate-acceleration | field-tech-copilot |
|---|---|---|---|
| Citation Analysis | 22 (6 verifiable citations to BLS, NFIB, US Chamber, ServiceTitan, Goldman Sachs, Intuit, McKinsey) | 22 | 22 |
| Authority Signals | 23 (named author Claude/Anthropic with Wikipedia + GitHub + claude.ai sameAs refs; `author` byline on every WebPage; `dateModified` shows ongoing maintenance) | 23 | 23 |
| Content Structure | 25 (TL;DR, H2 standalone, ~200-word sections, named framework per service, HowTo schema on /how-we-engage, Speakable selectors on TL;DR/H1/blockquote) | 25 | 25 |
| Structured Data | 25 (Organization + Person + Anthropic Org + WebSite + WebPage + BreadcrumbList + Service + FAQPage + Article + HowTo + Speakable, all @id cross-referenced) | 25 | 25 |
| Cross-Platform Consistency | 19 (sameAs to 6 platforms — anthropic.com, anthropic.com/claude, two Wikipedia entries, github.com/anthropics, claude.ai; plus Atom feed at /feed.xml; OG image; live GitHub repo at v1.0.0+) | 19 | 19 |
| **Total** | **114 / 125** ✅ (target ≥105) | **114 / 125** ✅ (target ≥100) | **114 / 125** ✅ (target ≥100) |

**Gate 3: GREEN.** All service detail pages exceed both the lighthouse-page target (≥105) and the floor (≥100).

The 11-point gap to 125/125:
- **Citation Analysis −3** — 6 citations per page is at the spec's ceiling already; additional within-2-years primaries could push 22→24.
- **Authority Signals −2** — expert-quotes dimension still unfilled per the GOAL.md hard rule against fabricated attributed quotes; the named-author boost covers the rest.
- **Cross-Platform Consistency −6** — would lift further with paid platforms (LinkedIn, X, Mastodon) that the project deliberately doesn't operate.

## JSON-LD Entity Graph

```
                                  Anthropic (Organization)
                                  (@id: anthropic.com/#organization)
                                       │ sameAs[]: wikipedia,
                                       │           github, x.com
                                       │
                                       │ worksFor
                                       │
                                  Claude (Person)
                                  (@id: …/#builder)
                                       │ sameAs[]: anthropic.com,
                                       │           wikipedia (2),
                                       │           github, claude.ai
                                       │
                              ┌────────┼─────── founder
                              │        │
                              │        │
                       Agent Ready POC (Organization)
                       (@id: …/#organization)
                              │
                              │ publisher
                              │
              ┌───────────────┴──────────────┐
              │                              │
       WebSite                                │
       (@id: …/#website)                      │
       publisher → Organization               │
              │                               │
              │ isPartOf                      │
              │                               │
       WebPage (per page) ── author → Person  │
       (@id: …<page>)         speakable {     │
              │                 cssSelector:  │
              │                   h1,.tldr,   │
              │                   blockquote  │
              │                 }             │
              │                               │
              ├── Article (content pages) ────┤
              │     author → Person           │
              │     publisher → Org           │
              │     datePublished/Modified    │
              │                               │
              ├── HowTo (/how-we-engage only)─┤
              │     name, totalTime P56D      │
              │     step[1..4]                │
              │                               │
              ├── Service (service detail)────┘
              │     (@id: …<page>#service)
              │     provider → Organization
              │     additionalProperty: Framework
              │
              ├── BreadcrumbList (non-home pages)
              │     itemListElement[1..N]
              │
              └── FAQPage (/faq/ only)
                    mainEntity → 12 × Question/Answer
```

## Git History Summary

```
Commits on main:     ~50 across 18 feature/fix/chore/docs branches
                     (final-state count post-iter-22; exact via `git rev-list --count main`)
Iteration tags:      22 (iter-0-baseline → iter-21-mailer-worker)
Release tag:         v1.0.0
Merge style:         --no-ff everywhere (branch topology preserved)
Commit message style: conventional commits, imperative subject <72 chars
WIP / fixup commits: none
History rewrite:     git filter-branch removed CLAUDE.md and GOAL.md from
                     every commit on every ref before publication (iter-14 in
                     git-history terms; happened between iter-13-spec-private
                     and v1.0.0)
gitleaks:            0 findings across the full rewritten history (33+ commits scanned)
Direct-to-main:      initial scaffold + doc-only/release commits; all
                     feature work on feat/fix/chore branches
```

Sample of `git log --oneline --graph --decorate --all` (selected tags):
```
*   (HEAD -> main, tag: iter-21-mailer-worker)  Merge feat/iter-21-mailer-worker
*   (tag: iter-20-security-hardening)            Merge feat/iter-20-security-hardening
*   (tag: iter-19-feed-dates-og)                 Merge feat/iter-19-feed-dates-og
*   (tag: iter-18-mcp-server)                    Merge feat/iter-18-mcp-server
*   (tag: iter-17-google-additions)              Merge feat/iter-17-google-ai-additions
*   (tag: iter-16-design)                        Merge feat/iter-16-design
*   (tag: iter-15-published)                     Merge feat/iter-15-published-references
*   (tag: v1.0.0)                                chore(release): v1.0.0
*   (tag: iter-13-spec-private)                  Merge chore/iter-13-scrub-spec-references
*   (tag: iter-12-gate-3-green)                  Merge feat/iter-12-author-authority
*   (tag: iter-11-gate-1-green)                  Merge feat/iter-11-auto-scan-and-gate1-fixes
*   (tag: iter-10-md-middleware)                 Merge feat/iter-10-md-middleware
*   (tag: iter-9-gate-1-fix)                     Merge feat/iter-9-gate-1-fix
*   (tag: iter-8-turnstile-live)                 Merge feat/iter-8-turnstile-live
*   (tag: iter-7-form-analytics)                 Merge feat/iter-7-form-analytics-prestage
*   (tag: iter-6-graph-enrichment)               Merge feat/iter-6-graph-enrichment
*   (tag: iter-5-publication-prep)               chore: gitleaks allowlist + CHANGELOG
*   (tag: iter-4-stretch)                        Merge feat/iter-4-stretch-and-publication-prep
*   (tag: iter-3-content)                        Merge feat/iter-3-content
*   (tag: iter-2-structure)                      Merge feat/iter-2-page-tree
*   (tag: iter-1-defaults)                       Merge feat/iter-1-discoverability
*   (tag: iter-0-baseline)                       Merge fix/gate-tooling
```

## Iteration Log

| # | Tag | Key Change | Gate state at tag |
|---|---|---|---|
| 0 | iter-0-baseline | Placeholder deployed; Cloudflare default floor measured | Gate 2: 100/94/100/92, axe 0 / W3C 0 |
| 1 | iter-1-defaults | `_headers` + robots + llms + sitemap + JSON-LD stub + CSS target-size fix | Gate 2: 100/100/100/100 |
| 2 | iter-2-structure | 11-page tree + nav partial + FAQPage schema | Gate 2 green across all pages × 2 form factors |
| 3 | iter-3-content | Brand Option B (meta); real content with verifiable citations; custom domain attached | Gate 3 building |
| 4 | iter-4-stretch | `/api/agent-info` stretch goal; README; LICENSE | Gate 1 protocol discovery lit |
| 5 | iter-5-publication-prep | CHANGELOG; gitleaks allowlist; secret-scan clean | Checkpoint 7 ready |
| 6 | iter-6-graph-enrichment | Service + BreadcrumbList entities; LICENSE PII scrub | Gate 3 Structured Data 25/25 |
| 7 | iter-7-form-analytics | Contact form Pages Function + analytics partial (inert until env vars set) | Checkpoint 5 ready |
| 8 | iter-8-turnstile-live | Turnstile site key + secret env wired; form active | Contact form functional end-to-end |
| 9 | iter-9-gate-1-fix | Markdown alternates + API catalog + security.txt | Gate 1 Content 1/1; Protocol Discovery 1/6 |
| 10 | iter-10-md-middleware | Accept-based markdown negotiation Pages middleware | Gate 1 Content negotiation actually wired |
| 11 | iter-11-gate-1-green | Headless puppeteer scanner + Content-Signal in robots.txt + Agent Skills + WebMCP | Gate 1: 50→75/100, Level 4 |
| 12 | iter-12-gate-3-green | Person entity (Claude) + Anthropic Org + sameAs[] | Gate 3 self-scored 112/125 |
| 13 | iter-13-spec-private | CLAUDE.md/GOAL.md untracked + public references scrubbed; .gitignore extended | Operator-private methodology |
| — | (history rewrite) | git filter-branch removed CLAUDE.md and GOAL.md from every commit on every ref | gitleaks clean across all history |
| — | v1.0.0 | First public release; pushed to GitHub via inline PAT (one-shot, since revoked) | Publication |
| 15 | iter-15-published | Live GitHub URL referenced in `/api/agent-info`, README, contact, llms.txt | Cross-platform reference |
| 16 | iter-16-design | Editorial design pass via frontend-design sub-agent — terracotta accent, system serif body, dark-mode mirror | Gate 2 unchanged at 100/100/100/92 |
| 17 | iter-17-google-additions | Article + HowTo + Speakable + `author`/`publisher` per WebPage (Google AI Optimization Guide) | Gate 3 Authority +1 |
| 18 | iter-18-mcp-server | Real Model Context Protocol HTTP server at `/mcp` + `/.well-known/mcp/server-card.json` | **Gate 1: 75→83/100, Level 5 "Agent-Native"** |
| 19 | iter-19-feed-dates-og | `/feed.xml` Atom + `datePublished`/`dateModified` on Articles + 1200×630 OG image rendered by puppeteer | Gate 3 Cross-Platform 14→20 |
| 20 | iter-20-security-hardening | OWASP audit fix-batch: `jsonInHtml` filter (H1), PII removed from logs (M1), CSP tightened (M4), CORS doc (L1), Accept q-values (L2), gitleaks tightened (L4), Node engine pinned (I4), dashboard checklist extended (I2) | Audit findings H1/M1/M4/L1/L2/L4/I2/I4 closed |
| 21 | iter-21-mailer-worker | Cloudflare-native email forwarding via standalone `agent-ready-poc-mailer` Worker + Service Binding from Pages | Email forwarding live, verified inbound at `chris@johnson.cloud` |
| — | (WAF rate-limit) | Free-tier rate-limiting rule on `/api/contact` + `/mcp` — 10 req / 10s / IP, Block. Verified 429 on 10+ burst | **Audit finding M2 closed** |

## Security Posture

Post-iter-20 OWASP review by a dedicated security sub-agent; all findings closed or deliberately deferred.

| Sev | ID | Finding | Status |
|---|---|---|---|
| HIGH | H1 | `</script>` injection path in `dump\|safe` JSON-LD blocks | ✅ Closed (iter-20 — `jsonInHtml` Nunjucks filter) |
| MED | M1 | PII (name/email/IP) in Pages Function logs | ✅ Closed (iter-20 — redacted to ts/messageLength/hasName/hasEmail) |
| MED | M2 | No application-level rate limit | ✅ Closed (WAF Rate Limiting rule on `/api/contact` + `/mcp`, verified 429 on burst) |
| MED | M3 | Email path CRLF / header injection | ✅ Closed (iter-21 — CRLF defense at both Pages Function and Mailer Worker layers) |
| MED | M4 | CSP missing `object-src`, `frame-ancestors`, `upgrade-insecure-requests` | ✅ Closed (iter-20) |
| LOW | L1 | Global wildcard `Access-Control-Allow-Origin: *` from CF default | ✅ Documented as accepted state (iter-20; no credentialed surfaces exist) |
| LOW | L2 | Markdown middleware ignored `Accept` quality values | ✅ Closed (iter-20 — `preferred()` parser) |
| LOW | L3 | WebMCP registers on every page (potential XSS chain) | ⏸ Deferred (gating to /contact/ would cost Gate 1 WebMCP check; Turnstile token requirement is the equivalent defense) |
| LOW | L4 | gitleaks allowlist could mask leaks if `git add -f` | ✅ Closed (iter-20 — tightened to only `.env`) |
| INFO | I1 | `founder@agentreadypoc.com` enumerated publicly | Accepted (designed — Email Routing handles spam) |
| INFO | I2 | No 2FA / token-expiration tracking in checklist | ✅ Closed (iter-20 — section 9 of dashboard checklist) |
| INFO | I3 | `Server: cloudflare` header exposed | Accepted (unavoidable) |
| INFO | I4 | Node engine `>=22` permits drift | ✅ Closed (iter-20 — pinned to `22`) |

Plus the day-1 hygiene cleanup: all three exposed-in-chat secrets (a GitHub PAT, a Cloudflare API token, a Turnstile secret) revoked and rotated; macOS keychain `johnson-chris` HTTPS credential erased; SSH-key push path established for `johnson-cloud-ai`; `.env` chmod 600.

## Gotchas

1. **Wrangler 4.x dropped Node 20 support mid-build.** GOAL.md pinned Node 20; the published wrangler refused to run. Bumped Dockerfile to Node 22 (still LTS). Spec updated in lockstep.
2. **`CF_API_TOKEN` was deprecated in favor of `CLOUDFLARE_API_TOKEN`.** Renamed across `.env`, `docker-compose.yml`, `CLAUDE.md`, `GOAL.md`.
3. **Plate Lunch 125-point framework is the spec author's adaptation.** WebFetched both referenced articles; neither contains a 125-point rubric. Gate 3 audited against GOAL.md's structure literally.
4. **chrome-launcher 1.x default flags don't include `--headless`.** Caused ECONNREFUSED on first lighthouse run. Added `--headless=new` fallback.
5. **@axe-core/cli requires chromedriver.** Not installed in the Debian Chromium package; swapped to `@axe-core/puppeteer` (CDP-direct, no chromedriver).
6. **W3C nu validator rate-limits.** Twelve sequential POSTs in 30s trips a 403. Added 2s throttle in `scripts/validate.js`.
7. **Custom domain CNAMEs don't auto-create on Pages domain attach.** Wrangler's `pages domain` subcommand doesn't exist; used the Cloudflare API directly to attach + create proxied CNAMEs.
8. **Gate 1 scanner is JS-rendered.** Closed in iter-11 by writing a puppeteer-driven scanner (`scripts/scan.js`) that drives the system Chromium, waits for results to render, and extracts category scores + per-check failure detail.
9. **`Content-Signal:` in robots.txt triggers a Lighthouse SEO penalty.** Google's strict robots.txt parser flags it as "Unknown directive"; Cloudflare's Agent Ready scanner requires it. Operator chose Cloudflare-aligned posture; SEO settles at 92 across all pages.
10. **Cloudflare Pages doesn't support the `send_email` binding.** The Pages dashboard's bindings list (KV, Queue, Service, Stream, Vectorize, Workers AI, R2) omits Send Email; the underlying Pages project API silently drops `send_email` from the config. **Resolution:** built a standalone Cloudflare Worker (`agent-ready-poc-mailer`) with `workers_dev = false` and the binding, reached from Pages via a Service Binding (`MAILER`).
11. **Resend.com was the recommended pragmatic alternative briefly considered.** Free tier handles 3000 emails/month, would work cleanly. Operator chose Cloudflare-native (Path B) to keep the entire stack on one vendor; both architectures meet the privacy requirement.
12. **Cloudflare WAF Rate Limiting API is paid-tier-only.** Free-tier accounts can manage rate-limit rules only via dashboard. Returned 403 to a Rulesets API probe even with `Zone WAF: Edit` scope on the token. Resolved by dashboard configuration. The over-broad scope was rolled back after the rule landed.
13. **"Custom rules" with Block ≠ "Rate Limiting rules" with Block.** Both have a Block action but Custom rules apply unconditionally; Rate Limiting rules apply only when a threshold is exceeded. Initial dashboard navigation landed in the wrong section, briefly blocking `/api/contact` and `/mcp` unconditionally. Operator-recoverable in one click via the row's ⋮ → Disable.
14. **Pages env-var changes don't apply to existing deployments.** New env bindings only take effect for *subsequent* deploys. When wiring `MAILER` Service Binding via the dashboard, a fresh `make deploy` was required to pick it up.
15. **`make deploy` from a feature branch lands on a preview URL, not production.** Wrangler infers the branch from current git context. Made this mistake three times across the build (iter-16, iter-18, iter-21) — saved as a project memory at `~/.claude/projects/.../memory/deploy-only-from-main-branch.md` so future sessions catch it.

## Handoff Notes

**Day-2 operational tasks for the operator:**

- **Deploy changes:** push to `main` via SSH (`git push origin main`); if you later connect the repo for Git-driven Cloudflare Pages builds (Pages → Settings → Builds & deployments → Source → Connect to Git), pushes will auto-deploy.
- **Local dev:** `make up && make dev` → http://localhost:8080
- **Build + verify:** `make check-all` runs validate + lighthouse + a11y + scan
- **Deploy:** **always** `git branch --show-current` first; only run `make deploy` from `main`
- **Mailer Worker deploy:** `make deploy-mailer` (separate from Pages deploy)
- **Add a service page:** see `README.md → How to add a service page`
- **Update brand constants:** edit `src/_data/site.js`; rebuild propagates to every page including JSON-LD
- **Rotate Turnstile keys:** new pair from <https://dash.cloudflare.com/?to=/:account/turnstile>; site key → `src/_data/site.js`; secret key → Pages env var via dashboard
- **Rotate `CLOUDFLARE_API_TOKEN`:** new token at <https://dash.cloudflare.com/profile/api-tokens> with matching scopes; update `.env`; `make whoami` to confirm; `make down && make up` to refresh container env; revoke old token
- **Rotate destination email:** add new address in Email Routing destinations → verify → update `workers/mailer/wrangler.toml` (gitignored) → `make deploy-mailer`
- **Token expiration tracking:** track in calendar; reminder ~14 days before expiry per `docs/cloudflare-dashboard-checklist.md` §9

**Pre-Checkpoint 7 state (all done):**

- ✅ Local git config — `agent-ready-poc operator <founder@agentreadypoc.com>` for this repo; global config untouched
- ✅ Git history rewrite — `CLAUDE.md` and `GOAL.md` removed from every commit via `git filter-branch`; gitleaks clean across all 33+ commits
- ✅ `make secret-scan` — passes on working tree and full history (with justified `.env` allowlist)
- ✅ `chore(release): prepare v1.0.0` commit + `v1.0.0` annotated tag
- ✅ GitHub repo created at <https://github.com/johnson-cloud-ai/agent-ready-poc> · MIT · public
- ✅ Push path via SSH (`~/.ssh/id_ed25519` registered on `johnson-cloud-ai`); macOS keychain stale credential erased
- ✅ 23 tags pushed (`iter-0-baseline` → `iter-21-mailer-worker` + `v1.0.0`)

**Optional, outstanding:**

- ☐ Cloudflare Pages dashboard config items still marked **TBD-operator** in §1, 2, 5, 6 of `docs/cloudflare-dashboard-checklist.md` (Build branch settings, custom domain redirect direction, Speed toggles, SSL/TLS settings). The site is operational without these but a few minutes of clicks tightens posture.
- ☐ GitHub org 2FA verification per checklist §9.
- ☐ SSL Labs and securityheaders.com external grades (browser test).
- ☐ Calendar reminder for `CLOUDFLARE_API_TOKEN` expiry (~14 days before).

**Connecting the repo for Git-driven Pages builds (optional):**

Pages → `agent-ready-poc` → Settings → Builds & deployments → Source → Connect to Git → select `johnson-cloud-ai/agent-ready-poc` → production branch `main` → build command `npm run build` → output directory `dist`. After connection, every `git push origin main` auto-deploys. Existing `make deploy` continues to work in parallel; choose one as the canonical path.
