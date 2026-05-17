// Contact form handler — Turnstile-verified, then forwarded.
//
// Inert until env vars are set at Checkpoint 5:
//   TURNSTILE_SECRET_KEY  required for verification
//   CONTACT_FORWARD_TO    optional, falls back to founder@agentreadypoc.com
//
// Response shape:
//   { ok: true }            → 200; valid Turnstile, form fields captured
//   { error: "<reason>" }   → 400 (validation) | 405 (method) | 503 (not configured)

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", Allow: "POST" },
    });
  }

  if (!env.TURNSTILE_SECRET_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "Form not yet configured. The TURNSTILE_SECRET_KEY env var lands at Checkpoint 5; until then, email founder@agentreadypoc.com directly.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid form data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = form.get("cf-turnstile-response");
  const name = (form.get("name") ?? "").toString().trim().slice(0, 200);
  const email = (form.get("email") ?? "").toString().trim().slice(0, 200);
  const message = (form.get("message") ?? "").toString().trim().slice(0, 5000);
  const honeypot = (form.get("website") ?? "").toString();

  if (honeypot) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (!name || !email || !message) {
    return new Response(JSON.stringify({ error: "Name, email, and message are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "Invalid email format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!token) {
    return new Response(JSON.stringify({ error: "Turnstile token missing" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "";
  const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip,
    }),
  });

  const result = await verify.json();
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: "Turnstile verification failed", codes: result["error-codes"] ?? [] }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Submission is valid. Persistence + forwarding lands at Checkpoint 5+ once
  // Email Workers is wired. For now log a PII-free heartbeat to the Pages
  // Function log so the operator can confirm end-to-end during Checkpoint 5
  // testing without storing name, email, or IP in Cloudflare logs.
  console.log("[contact] valid submission", {
    ts: new Date().toISOString(),
    messageLength: message.length,
    hasName: Boolean(name),
    hasEmail: Boolean(email),
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
