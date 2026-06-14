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

    // Move focus to the result heading so screen-reader and keyboard users land
    // on the new content rather than staying on the submit button.
    heading.focus();
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
