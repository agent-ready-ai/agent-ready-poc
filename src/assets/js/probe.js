// Probe widget — posts a target URL to /api/probe and renders the coverage
// board. Progressive enhancement: the page ships a static worked example inside
// #probe-results; this script replaces it with a live report once JS runs.
//
// Every value that comes back from the scanned site is untrusted, so it is only
// ever inserted via createTextNode (never innerHTML). URLs are rendered as plain
// text, not clickable links — Probe reports what a site exposes; it never invites
// a click through to a third-party endpoint.

(function () {
  "use strict";

  var form = document.getElementById("probe-form");
  var input = document.getElementById("probe-target");
  var statusEl = document.getElementById("probe-status");
  var results = document.getElementById("probe-results");
  if (!form || !input || !statusEl || !results) return;

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        if (k === "class") node.className = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    for (var i = 2; i < arguments.length; i++) {
      var kid = arguments[i];
      if (kid === null || kid === undefined) continue;
      node.appendChild(
        kid.nodeType ? kid : document.createTextNode(String(kid)),
      );
    }
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function renderReport(data) {
    clear(results);

    var heading = el("p", { class: "probe-score", tabindex: "-1" });
    heading.appendChild(el("strong", null, data.score));
    heading.appendChild(document.createTextNode(" agent-ready surfaces on "));
    heading.appendChild(el("code", null, data.target));
    results.appendChild(heading);

    var board = el("ul", { class: "probe-board" });
    var order = data.order || Object.keys(data.surfaces || {});
    for (var i = 0; i < order.length; i++) {
      var key = order[i];
      var s = data.surfaces[key];
      if (!s) continue;

      var li = el("li", {
        class: "probe-item " + (s.present ? "is-present" : "is-absent"),
      });
      var head = el("p", { class: "probe-item-head" });
      head.appendChild(
        el(
          "span",
          { class: "probe-badge" },
          s.present ? "✓ Present" : "✗ Absent",
        ),
      );
      head.appendChild(document.createTextNode(" "));
      head.appendChild(el("strong", null, s.label || key));
      li.appendChild(head);

      var desc = s.present ? s.summary : s.hint;
      if (desc) li.appendChild(el("p", { class: "probe-item-desc" }, desc));

      if (s.present && s.items && s.items.length) {
        var ul = el("ul", { class: "probe-items" });
        for (var j = 0; j < s.items.length; j++) {
          var it = s.items[j];
          var item = el("li", null);
          item.appendChild(
            el("span", { class: "probe-k" }, (it.label || "") + ": "),
          );
          item.appendChild(el("span", { class: "probe-v" }, it.value || ""));
          ul.appendChild(item);
        }
        li.appendChild(ul);
      }
      board.appendChild(li);
    }
    results.appendChild(board);

    results.appendChild(
      el(
        "p",
        { class: "probe-note" },
        "Read-only inspection: Probe fetched these public discovery files and parsed them. It did not call, authenticate to, or transact with any endpoint.",
      ),
    );

    // Optional live AI narration of the finished report. Off the deterministic
    // path: costs tokens and runs only when the visitor clicks. Shown only where
    // the deployment has an inference key configured.
    if (data.aiAvailable) {
      var aiWrap = el("div", { class: "probe-ai" });
      var aiBtn = el(
        "button",
        { type: "button", class: "probe-ai-btn" },
        "Explain with AI",
      );
      var aiOut = el("div", {
        class: "probe-ai-out",
        role: "status",
        "aria-live": "polite",
      });
      aiBtn.addEventListener("click", function () {
        requestSummary(data.target, aiBtn, aiOut);
      });
      aiWrap.appendChild(aiBtn);
      aiWrap.appendChild(aiOut);
      results.appendChild(aiWrap);
    }

    // Live MCP session — consented, never automatic. Shown only when the scan
    // found an MCP surface. Opening the session and running each tool are both
    // separate, explicit clicks; the server re-checks safety on every call.
    if (data.coverage && data.coverage.mcp) {
      var mcpWrap = el("section", {
        class: "probe-mcp",
        "aria-label": "Live MCP session",
      });
      mcpWrap.appendChild(el("h3", null, "Live MCP session"));
      mcpWrap.appendChild(
        el(
          "p",
          { class: "probe-mcp-intro" },
          "Probe can open a JSON-RPC session with this site's MCP endpoint to show the live tool list and how it compares to the published card. It will run a tool only if you click Run, and only tools the server marks read-only with no required arguments. Nothing runs until you choose.",
        ),
      );
      var mcpBtn = el(
        "button",
        { type: "button", class: "probe-mcp-consent" },
        "Open MCP session with " + data.target,
      );
      var mcpOut = el("div", {
        class: "probe-mcp-out",
        role: "log",
        "aria-live": "polite",
      });
      mcpBtn.addEventListener("click", function () {
        openMcpSession(data.target, mcpBtn, mcpOut);
      });
      mcpWrap.appendChild(mcpBtn);
      mcpWrap.appendChild(mcpOut);
      results.appendChild(mcpWrap);
    }

    // Move focus to the result heading so screen-reader and keyboard users land
    // on the new content rather than staying on the submit button.
    heading.focus();
  }

  function openMcpSession(target, btn, out) {
    btn.disabled = true;
    clear(out);
    out.appendChild(
      el(
        "p",
        { class: "probe-mcp-status" },
        "Opening MCP session with " + target + "…",
      ),
    );
    fetch("/api/probe-mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: target, action: "list", consent: true }),
    })
      .then(function (res) {
        return res.json().catch(function () {
          return {};
        });
      })
      .then(function (d) {
        clear(out);
        if (d.transportError) {
          out.appendChild(
            el(
              "p",
              { class: "probe-mcp-status" },
              "MCP endpoint advertised, but no JSON-RPC session: " +
                d.transportError +
                ".",
            ),
          );
          return;
        }
        if (!d.tools) {
          out.appendChild(
            el(
              "p",
              { class: "probe-mcp-status" },
              d.message || d.error || "No live MCP tools found.",
            ),
          );
          return;
        }
        var meta = el("p", { class: "probe-mcp-meta" });
        meta.appendChild(
          el(
            "span",
            null,
            "Live session — protocol " + (d.protocolVersion || "?"),
          ),
        );
        if (d.serverInfo && d.serverInfo.name)
          meta.appendChild(el("span", null, " · " + d.serverInfo.name));
        out.appendChild(meta);
        if (d.drift) {
          var drift = d.drift.drift
            ? "Drift: card-only [" +
              d.drift.cardOnly.join(", ") +
              "], live-only [" +
              d.drift.liveOnly.join(", ") +
              "]"
            : "Live tools match the published card.";
          out.appendChild(el("p", { class: "probe-mcp-drift" }, drift));
        }
        var ul = el("ul", { class: "probe-mcp-tools" });
        for (var i = 0; i < d.tools.length; i++) {
          ul.appendChild(renderTool(target, d.tools[i]));
        }
        out.appendChild(ul);
      })
      .catch(function () {
        clear(out);
        out.appendChild(
          el(
            "p",
            { class: "probe-mcp-status" },
            "Network error opening the MCP session.",
          ),
        );
        btn.disabled = false;
      });
  }

  function renderTool(target, tool) {
    var li = el("li", {
      class: "probe-mcp-tool " + (tool.safe ? "is-safe" : "is-unsafe"),
    });
    var head = el("p", { class: "probe-mcp-tool-head" });
    head.appendChild(el("code", null, tool.name));
    head.appendChild(
      el(
        "span",
        { class: "probe-mcp-tag" },
        tool.safe ? "safe to run" : "not run",
      ),
    );
    li.appendChild(head);
    if (tool.description)
      li.appendChild(
        el("p", { class: "probe-mcp-tool-desc" }, tool.description),
      );
    if (tool.safe) {
      var runBtn = el(
        "button",
        { type: "button", class: "probe-mcp-run" },
        "Run " + tool.name,
      );
      var runOut = el("div", {
        class: "probe-mcp-run-out",
        role: "status",
        "aria-live": "polite",
      });
      runBtn.addEventListener("click", function () {
        runMcpTool(target, tool.name, runBtn, runOut);
      });
      li.appendChild(runBtn);
      li.appendChild(runOut);
    } else {
      li.appendChild(
        el(
          "p",
          { class: "probe-mcp-reason" },
          "Not run: " + (tool.reasons || []).join("; "),
        ),
      );
    }
    return li;
  }

  function runMcpTool(target, toolName, btn, out) {
    btn.disabled = true;
    out.textContent = "Running " + toolName + "…";
    fetch("/api/probe-mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: target,
        action: "call",
        tool: toolName,
        consent: true,
      }),
    })
      .then(function (res) {
        return res.json().catch(function () {
          return {};
        });
      })
      .then(function (d) {
        out.textContent = "";
        if (d.refused) {
          out.appendChild(
            el("p", null, "Refused by Probe: " + (d.reasons || []).join("; ")),
          );
          return;
        }
        if (d.error) {
          out.appendChild(el("p", null, "Call failed: " + d.error));
          btn.disabled = false;
          return;
        }
        out.appendChild(
          el(
            "p",
            { class: "probe-mcp-facts" },
            "status " +
              d.httpStatus +
              " · " +
              d.latencyMs +
              "ms · isError " +
              d.isError +
              " · keys [" +
              (d.responseKeys || []).join(", ") +
              "]",
          ),
        );
        if (d.preview) {
          var pre = el("pre", { class: "probe-mcp-preview", tabindex: "0" });
          pre.appendChild(document.createTextNode(d.preview));
          out.appendChild(pre);
        }
      })
      .catch(function () {
        out.textContent = "Network error running the tool.";
        btn.disabled = false;
      });
  }

  function requestSummary(target, btn, out) {
    btn.disabled = true;
    out.textContent = "Asking NVIDIA Nemotron…";
    fetch("/api/probe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: target, summarize: true }),
    })
      .then(function (res) {
        return res.json().catch(function () {
          return {};
        });
      })
      .then(function (data) {
        var s = data && data.aiSummary;
        if (s && s.text) {
          out.textContent = "";
          out.appendChild(el("p", { class: "probe-ai-text" }, s.text));
          out.appendChild(
            el(
              "p",
              { class: "probe-ai-attr" },
              "— " +
                (s.model || "model") +
                " via " +
                (s.provider || "NVIDIA") +
                ". AI-generated, not deterministic.",
            ),
          );
        } else {
          out.textContent = s && s.error ? s.error : "AI summary unavailable.";
          btn.disabled = false;
        }
      })
      .catch(function () {
        out.textContent = "Network error requesting the summary.";
        btn.disabled = false;
      });
  }

  function run(target) {
    if (!target) {
      statusEl.textContent = "Enter a URL to inspect.";
      return;
    }
    statusEl.textContent = "Inspecting " + target + "…";
    fetch("/api/probe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: target }),
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            return { ok: res.ok, status: res.status, data: data };
          });
      })
      .then(function (r) {
        if (!r.ok) {
          statusEl.textContent =
            r.data && r.data.error
              ? "Probe error: " + r.data.error
              : "Probe error (" + r.status + ").";
          return;
        }
        renderReport(r.data);
        statusEl.textContent =
          "Found " +
          r.data.score +
          " agent-ready surfaces on " +
          r.data.target +
          ".";
      })
      .catch(function () {
        statusEl.textContent = "Network error. Check the URL and try again.";
      });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    run(input.value.trim());
  });

  var presets = document.querySelectorAll("[data-probe-target]");
  for (var p = 0; p < presets.length; p++) {
    presets[p].addEventListener("click", function () {
      var t = this.getAttribute("data-probe-target");
      input.value = t;
      run(t);
    });
  }
})();
