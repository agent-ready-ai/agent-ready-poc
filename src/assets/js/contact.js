// Contact form handler — POSTs to /api/contact, shows status inline.
// Loaded only on /contact/ once site.turnstileSiteKey is set in site.js.

const form = document.getElementById("contact-form");
const status = document.getElementById("contact-status");

if (form && status) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Sending…";

    const data = new FormData(form);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: data,
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.ok) {
        status.textContent =
          "Message sent. We'll reply within one business day.";
        form.reset();
        // Reset the Turnstile widget so it can be re-challenged on a second submit.
        if (window.turnstile) {
          window.turnstile.reset();
        }
      } else {
        const reason = result.error || `submission failed (${response.status})`;
        status.textContent = `Couldn't send: ${reason}`;
      }
    } catch (err) {
      status.textContent =
        "Network error. Please try again or email founder@agentreadypoc.com directly.";
    }
  });
}
