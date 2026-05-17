// agent-ready-poc-mailer — a standalone Cloudflare Worker that forwards
// /api/contact submissions to a Cloudflare-verified destination address
// via the native `send_email` binding. The Pages Function reaches this
// Worker over a Service Binding (private; no public route required).
//
// Inputs (POST JSON):
//   { name, email, message, ip }
//
// Outputs:
//   200 { ok: true }                     — message accepted and sent
//   400 { error: <reason> }              — bad input (validation / CRLF)
//   405                                  — wrong method
//   502 { error, detail }                — send_email rejected the send
//   503 { error }                        — DESTINATION_ADDRESS missing
//
// Security posture:
//   - This Worker has NO public route (workers_dev = false in wrangler.toml).
//     The only way to reach it is via the MAILER Service Binding from the
//     Pages Function.
//   - The Pages Function is the trust boundary that verifies Turnstile;
//     this Worker re-validates inputs as defense-in-depth (CRLF injection
//     in name/email is rejected before headers are built).
//   - From/To/Reply-To headers are constructed line-by-line; user-supplied
//     fields go into the Reply-To value and the body only, never into
//     header NAMES or boundary values.

import { EmailMessage } from "cloudflare:email";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function rejectIfCrlf(value, fieldName) {
  if (/[\r\n]/.test(value)) {
    return `Invalid characters in ${fieldName}`;
  }
  return null;
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "POST" },
      });
    }

    if (!env.DESTINATION_ADDRESS || !env.SEND_EMAIL) {
      return jsonResponse(
        { error: "Mailer not configured (missing DESTINATION_ADDRESS or SEND_EMAIL binding)" },
        503,
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const name = String(payload.name ?? "").trim().slice(0, 200);
    const email = String(payload.email ?? "").trim().slice(0, 200);
    const message = String(payload.message ?? "").trim().slice(0, 5000);
    const ip = String(payload.ip ?? "").trim().slice(0, 64);

    if (!name || !email || !message) {
      return jsonResponse({ error: "name, email, and message are required" }, 400);
    }

    // Header-injection defense — reject CR/LF in fields that feed headers.
    const crlfError = rejectIfCrlf(name, "name") || rejectIfCrlf(email, "email");
    if (crlfError) {
      return jsonResponse({ error: crlfError }, 400);
    }

    // Email format sanity check — same regex the Pages Function uses; cheap
    // backstop against malformed inputs that somehow bypass the upstream
    // check.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: "Invalid email format" }, 400);
    }

    const fromAddress = env.SENDER_ADDRESS || "contact@agentreadypoc.com";
    const subject = `[agentreadypoc] Contact from ${name}`.slice(0, 200);
    const messageId = `${crypto.randomUUID()}@agentreadypoc.com`;

    const rfc822 = [
      `From: agentreadypoc.com contact <${fromAddress}>`,
      `Reply-To: ${name} <${email}>`,
      `To: ${env.DESTINATION_ADDRESS}`,
      `Subject: ${subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${messageId}>`,
      `Content-Type: text/plain; charset="utf-8"`,
      `MIME-Version: 1.0`,
      ``,
      `New contact form submission from agentreadypoc.com.`,
      ``,
      `Name:       ${name}`,
      `Email:      ${email}`,
      `IP:         ${ip || "unknown"}`,
      `Submitted:  ${new Date().toISOString()}`,
      ``,
      `Message:`,
      `--------`,
      message,
      ``,
    ].join("\r\n");

    try {
      const emailMessage = new EmailMessage(
        fromAddress,
        env.DESTINATION_ADDRESS,
        rfc822,
      );
      await env.SEND_EMAIL.send(emailMessage);
    } catch (err) {
      // Surface the underlying reason for operator-side debugging without
      // exposing message bodies. Common failures: destination not verified,
      // rate limit, malformed MIME (shouldn't happen given our construction).
      const detail = err && err.message ? err.message : String(err);
      console.error("[mailer] send_email failed:", detail);
      return jsonResponse({ error: "Email send failed", detail }, 502);
    }

    return jsonResponse({ ok: true }, 200);
  },
};
