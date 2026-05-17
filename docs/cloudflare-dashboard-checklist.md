# Cloudflare Dashboard Configuration Checklist

This checklist is the **Checkpoint 5** deliverable per `GOAL.md`. The agent provides it; the operator clicks through it.

URL prefix: `https://dash.cloudflare.com/<account-id>/`  ·  Account ID: `747b4d05bb700eebcef964259fb3e58c`

Status legend:  ☐ = needs your action  ·  ✅ = already configured by the agent  ·  ⏸ = wait until specified gate passes

---

## 1. Pages project — `agent-ready-poc`

Path: **Pages → agent-ready-poc → Settings**

- ✅ Project name: `agent-ready-poc`
- ✅ Custom domains attached: `agentreadypoc.com` + `www.agentreadypoc.com`
- ☐ **Build & deployments → Production branch:** set to `main` (only after Checkpoint 7 GitHub push connects the repo for Git-based builds).
- ☐ **Build & deployments → Build command:** `npm run build`
- ☐ **Build & deployments → Output directory:** `dist`
- ☐ **Build & deployments → Environment variables (Production):**
  - `NODE_VERSION` = `22`
  - `TURNSTILE_SECRET_KEY` = `<paste your Turnstile secret here>` (from Checkpoint 2)

> `TURNSTILE_SECRET_KEY` was rotated on 2026-05-17 as part of the post-launch security cleanup. Track future rotations in this file.

(Until GitHub is connected, deploys happen via `make deploy` and these settings don't apply. After Checkpoint 7, the Git-driven builds use them.)

---

## 2. Custom domain redirect

Path: **Pages → agent-ready-poc → Custom domains**

- ☐ Decide redirect direction. Recommendation: **www → apex** (canonical `agentreadypoc.com`, no www).
- ☐ Add a Page Rule or `_redirects` file with `www.agentreadypoc.com/* → https://agentreadypoc.com/:splat 301`.

(Per `GOAL.md`: "pick apex→www or www→apex redirect, be consistent". Both CNAMEs serve identical content today — picking a canonical avoids duplicate-content SEO penalties.)

---

## 3. Email Routing

Path: **agentreadypoc.com → Email → Email Routing**

- ☐ Enable Email Routing on the zone (one-time toggle).
- ☐ Verify destination address: enter your real email; Cloudflare emails you a confirmation link; click it.
- ☐ Add routing rule:
  - **Match:** `founder@agentreadypoc.com`
  - **Action:** Send to → your verified destination address
- ☐ Verify by sending a test email to `founder@agentreadypoc.com` and confirming it arrives.

---

## 4. WAF

Path: **agentreadypoc.com → Security → WAF**

- ☐ **Managed Rules → Cloudflare Managed Ruleset:** Enable, sensitivity Medium.
- ❌ **DO NOT enable Bot Fight Mode.** (Conflicts with `content-signals` and the non-blanket robots policy.)
- ❌ **DO NOT enable Super Bot Fight Mode.**

---

## 5. Speed

Path: **agentreadypoc.com → Speed → Optimization**

- ☐ **Brotli:** ON
- ☐ **Early Hints:** ON
- ☐ **HTTP/3 (with QUIC):** ON
- ❌ **Auto Minify:** OFF for all (HTML/CSS/JS — eleventy already emits minimal markup; minification can break valid HTML edge cases).
- ❌ **Rocket Loader:** OFF (adds inline JS — violates this project's CSP `script-src 'self' …` policy).

---

## 6. SSL/TLS

Path: **agentreadypoc.com → SSL/TLS → Overview**

- ☐ **Encryption mode:** Full (strict)
- ☐ **Always Use HTTPS:** ON  (SSL/TLS → Edge Certificates → Always Use HTTPS)
- ☐ **Automatic HTTPS Rewrites:** ON
- ☐ **Minimum TLS Version:** 1.2

---

## 7. Web Analytics  ⏸

Path: **agentreadypoc.com → Analytics & Logs → Web Analytics**

⏸ **Wait until Gate 1 passes green** before adding (per `GOAL.md` operating philosophy — baseline measures defaults, then this is added).

- ☐ Add a Web Analytics site for `agentreadypoc.com`.
- ☐ Copy the **beacon token** from the resulting snippet.
- ☐ Paste into `src/_data/site.js` as `analytics.beaconToken`.
- ☐ Update `src/_includes/partials/analytics.njk` (will be created in iter-7) to render the beacon `<script>` only in production.
- ☐ Verify after redeploy that the analytics request appears in DevTools network tab on `agentreadypoc.com`, but NOT on `*.pages.dev` previews.

---

## 8. Turnstile (Checkpoint 2 prerequisite for the contact form)

Path: **dash.cloudflare.com → Turnstile → Add site**

- ☐ Add site with hostnames `agentreadypoc.com` and `www.agentreadypoc.com`.
- ☐ Widget mode: Managed.
- ☐ Copy the **site key** → paste into `src/_data/site.js` as `turnstileSiteKey` (public, committed).
- ☐ Hold the **secret key** → paste into Pages env var `TURNSTILE_SECRET_KEY` (see section 1 above).

Without both keys, the contact form at `/contact/` stays info-only. The Pages Function at `functions/api/contact.js` is gated on `TURNSTILE_SECRET_KEY` being set.

---

## 9. Security ongoing

Recurring hygiene that isn't a one-time toggle. Revisit on every iteration / quarterly.

- ☐ Verify **GitHub org 2FA is enforced** for `johnson-cloud-ai` at <https://github.com/organizations/johnson-cloud-ai/settings/security> (or the personal-account equivalent). Push access to this repo can deploy to Pages once Git-driven builds are connected; protect it.
- ☐ **Calendar reminder** for `CLOUDFLARE_API_TOKEN` expiration. Current token expiration is visible at <https://dash.cloudflare.com/profile/api-tokens>. Set a reminder ~14 days before expiry to rotate cleanly.
- ☐ **WAF rate-limit rule** on `/api/contact` and `/mcp`: Security → WAF → Rate limiting rules → Create rule, match `(http.request.uri.path eq "/api/contact" or http.request.uri.path eq "/mcp")`, threshold 10 requests / 1 minute / IP, action `Block`. Free tier allows one rule; this is the right one to use it on. Closes audit finding M2.
- ☐ Confirm `functions/api/contact.js` does not log PII (audit finding M1 — fixed in iter-20).

---

## 10. After all of the above is done — verify

- ☐ `make whoami` — confirms the API token still validates.
- ☐ Re-run `make scan` / Gate 1 scanner at <https://isitagentready.com/agentreadypoc.com> — expected all green.
- ☐ Run securityheaders.com against `agentreadypoc.com` — expected A or A+.
- ☐ Run SSL Labs <https://www.ssllabs.com/ssltest/analyze.html?d=agentreadypoc.com> — expected A or A+.
- ☐ Confirm `founder@agentreadypoc.com` receives test email.

When all of the above are checked, the build is ready for **Checkpoint 6 (all gates green)** approval, which gates **Checkpoint 7 (publication push to GitHub)**.
