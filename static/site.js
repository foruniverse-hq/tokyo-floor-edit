/* Tokyo Peak Time — nav disclosure (narrow widths) + age gate (localStorage flag only). */
(function () {
  "use strict";

  // nav pill: toggle the link list under 40rem
  var nav = document.querySelector(".nav-pill");
  var toggle = nav && nav.querySelector(".nav-pill__toggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target) && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open"); document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open"); document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  // age gate: shown once per browser; the flag never leaves localStorage
  var KEY = "tpt-age-ok";
  var gate = document.getElementById("gate");
  if (!gate || typeof gate.showModal !== "function") return;
  var ok = false;
  try { ok = localStorage.getItem(KEY) === "1"; } catch (err) { ok = false; }
  if (!ok) gate.showModal();
  gate.addEventListener("cancel", function (e) { e.preventDefault(); }); // Esc does not dismiss
  gate.addEventListener("click", function (e) {
    var b = e.target.closest("[data-gate]");
    if (!b) return;
    if (b.getAttribute("data-gate") === "ok") {
      try { localStorage.setItem(KEY, "1"); } catch (err) { /* private mode: gate shows again next visit */ }
      gate.close();
    } else {
      window.location.href = "https://www.google.com";
    }
  });
})();
