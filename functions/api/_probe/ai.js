// Optional live AI summary for Probe (NVIDIA NIM, OpenAI-compatible).
//
// This is the ONLY place Probe leaves the deterministic path. The inspection
// itself stays read-only and model-free: buildReport() has already produced the
// facts. summarizeWithNvidia() sends that finished report to the model and asks
// for a short, grounded narration — it never decides what to fetch and never
// touches the scanned site. Paid inference fires only on explicit request, so
// the default scan remains zero-token and abuse-safe.
//
// The key lives in env (NVIDIA_API_KEY), never in the repo. buildSummaryPrompt
// is pure and unit-tested; the fetch is isolated below it.

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";
const MAX_TOKENS = 500;
const TIMEOUT_MS = 25000;

// Pure: turn a deterministic report into the chat messages. No network.
export function buildSummaryPrompt(report) {
  const present = [];
  const absent = [];
  for (const key of report.order || []) {
    const s = report.surfaces[key];
    if (!s) continue;
    if (s.present) present.push(`- ${s.label}: ${s.summary || "present"}`);
    else absent.push(`- ${s.label}: absent`);
  }
  const facts = [
    `Target: ${report.target}`,
    `Agent-readiness score: ${report.score}`,
    "",
    "Surfaces present:",
    present.length ? present.join("\n") : "- (none)",
    "",
    "Surfaces absent:",
    absent.length ? absent.join("\n") : "- (none)",
  ].join("\n");

  return [
    {
      role: "system",
      content:
        "You explain the result of a deterministic agent-readiness scan to a technical practitioner. " +
        "Use ONLY the facts provided — never invent a capability that is not listed. " +
        "Plain, direct voice; no marketing words. Write 2–4 sentences: first what an AI agent can and " +
        "cannot do with this site given these surfaces, then the single highest-value surface to add next " +
        "and why. Do not restate the score number.",
    },
    { role: "user", content: facts },
  ];
}

// Network: call NVIDIA NIM. Returns { text, model, provider } or throws.
export async function summarizeWithNvidia(report, env) {
  const key = env && env.NVIDIA_API_KEY;
  if (!key) {
    const e = new Error("not-configured");
    e.code = "not-configured";
    throw e;
  }
  const model = (env && env.NVIDIA_MODEL) || DEFAULT_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: buildSummaryPrompt(report),
        temperature: 0.3,
        top_p: 0.95,
        max_tokens: MAX_TOKENS,
        stream: false,
        // Keep it tight and cheap: no extended thinking budget for a summary.
        chat_template_kwargs: { enable_thinking: false },
      }),
    });
    if (!res.ok) {
      const e = new Error(`nvidia-${res.status}`);
      e.code = `nvidia-${res.status}`;
      throw e;
    }
    const data = await res.json();
    const text = (
      (data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content) ||
      ""
    ).trim();
    if (!text) {
      const e = new Error("empty");
      e.code = "empty";
      throw e;
    }
    return { text, model, provider: "NVIDIA NIM" };
  } finally {
    clearTimeout(timer);
  }
}

export { DEFAULT_MODEL };
