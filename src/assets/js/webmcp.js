// Note: registration runs on every page (intentional — Cloudflare Agent Ready
// scanner checks navigator.modelContext on the root). submit_contact's
// cfTurnstileToken requirement is the real gate; a fresh token can only be
// obtained from the widget on /contact/.
//
// WebMCP tool registration. Exposes this site's HTTP endpoints to AI
// agents through the emerging navigator.modelContext API.
//
// If the browser doesn't ship navigator.modelContext natively yet, the
// polyfill below installs a minimal API so the registration can still
// be observed by an agent (or by an automated scanner) that explicitly
// looks for the surface.
//
// Spec reference: WebMCP (webmachinelearning.github.io), Chrome explainer
// (developer.chrome.com). Tools registered here mirror the skills in
// /.well-known/agent-skills/index.json and the OpenAPI spec.

(function () {
  if (typeof navigator === "undefined") return;

  if (!navigator.modelContext) {
    // Minimal polyfill — captures registrations so they can be inspected
    // by an agent (or automated scanner) that knows to look here.
    navigator.modelContext = {
      _tools: [],
      provideContext(input) {
        const tools = (input && input.tools) || [];
        navigator.modelContext._tools.push(...tools);
        return { ok: true, registered: tools.length };
      },
    };
  }

  navigator.modelContext.provideContext({
    tools: [
      {
        name: "get_organization_info",
        description:
          "Returns a JSON summary of Agent Ready POC: organization metadata, three services with their named implementation frameworks, contact info, and discovery URLs.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        execute: async function () {
          const r = await fetch("/api/agent-info", {
            headers: { Accept: "application/json" },
          });
          return await r.json();
        },
      },
      {
        name: "submit_contact",
        description:
          "Submit a Turnstile-verified contact-form message. The Turnstile token must come from the widget rendered on /contact/.",
        inputSchema: {
          type: "object",
          required: ["name", "email", "message", "cfTurnstileToken"],
          properties: {
            name: { type: "string", maxLength: 200 },
            email: { type: "string", format: "email", maxLength: 200 },
            message: { type: "string", maxLength: 5000 },
            cfTurnstileToken: {
              type: "string",
              description:
                "Cloudflare Turnstile widget token captured on /contact/",
            },
          },
        },
        execute: async function (args) {
          const form = new FormData();
          form.append("name", args.name);
          form.append("email", args.email);
          form.append("message", args.message);
          form.append("cf-turnstile-response", args.cfTurnstileToken);
          const r = await fetch("/api/contact", { method: "POST", body: form });
          return { status: r.status, body: await r.json().catch(() => ({})) };
        },
      },
    ],
  });
})();
