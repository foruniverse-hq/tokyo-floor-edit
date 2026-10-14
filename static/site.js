/* Tokyo Peak Time — no dependencies.
 * 1. nav disclosure (narrow widths)   2. age gate (localStorage flag only)
 * 3. reveal-once for rows/cards (IntersectionObserver, 200 ms opacity/transform, skipped under reduced-motion)
 * 4. home hero canvas: 3 moving-light fans + value-noise fog + rare low-amplitude strobe.
 *    Photosensitivity: at most 1 flash per 2.5 s (never > 2 / s), peak +7 % luminance, 120 ms decay.
 *    DPR-aware (capped at 2, rendered at half resolution), ~30 fps, pauses when the tab is hidden or the hero is
 *    off-screen, and under prefers-reduced-motion draws exactly one still frame.
 */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  root.classList.add("js");
  var rmq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(rmq && rmq.matches); }

  // ---- 1. nav pill: toggle the link list under 40rem
  var nav = doc.querySelector(".nav-pill");
  var toggle = nav && nav.querySelector(".nav-pill__toggle");
  if (nav && toggle) {
    var setNav = function (open) {
      nav.classList.toggle("is-open", open);
      doc.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    };
    toggle.addEventListener("click", function () { setNav(!nav.classList.contains("is-open")); });
    doc.addEventListener("click", function (e) {
      if (!nav.contains(e.target) && nav.classList.contains("is-open")) setNav(false);
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setNav(false); toggle.focus(); }
    });
  }

  // ---- 2. age gate: shown once per browser; the flag never leaves localStorage
  var KEY = "tpt-age-ok";
  var gate = doc.getElementById("gate");
  if (gate && typeof gate.showModal === "function") {
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
  }

  // ---- 3. reveal once
  var items = doc.querySelectorAll(".reveal");
  if (items.length) {
    if ("IntersectionObserver" in window && !reduced()) {
      var io = new IntersectionObserver(function (entries) {
        var k = 0;
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.style.setProperty("--d", Math.min(k++ * 30, 240) + "ms");
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        });
      }, { rootMargin: "0px 0px -4% 0px", threshold: 0.05 });
      items.forEach(function (el) { io.observe(el); });
    } else {
      items.forEach(function (el) { el.classList.add("is-in"); });
    }
  }

  // ---- 4. hero canvas
  var cv = doc.querySelector(".hero__canvas");
  if (cv && cv.getContext) hero(cv);

  function hero(cv) {
    var ctx = cv.getContext("2d", { alpha: false });
    if (!ctx) return;
    var W = 0, H = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.5;   // half resolution: soft light does not need pixels
    var paper = (getComputedStyle(root).getPropertyValue("--color-paper") || "").trim();
    function pa(a) { // paper with alpha
      return paper.indexOf("oklch(") === 0 ? paper.replace(")", " / " + a + ")") : "rgba(11,12,20," + a + ")";
    }
    var INDIGO = "122,124,255", WHITE = "243,241,234";
    var beams = [
      { x: 0.16, a: 1.64, amp: 0.30, per: 13.0, ph: 0.0, w: 0.17, c: INDIGO, al: 0.30 },
      { x: 0.50, a: 1.52, amp: 0.26, per: 17.0, ph: 2.1, w: 0.13, c: WHITE, al: 0.15 },
      { x: 0.84, a: 1.70, amp: 0.34, per: 11.0, ph: 4.0, w: 0.15, c: INDIGO, al: 0.26 }
    ];
    var fogA = fogTile(96, INDIGO), fogB = fogTile(96, WHITE);
    var raf = 0, last = 0, hidden = false, offscreen = false;
    var nextFlash = 4, flashAt = -1;

    function fogTile(n, rgb) {   // value noise, one tile, tinted; alpha carries the density
      var c = doc.createElement("canvas"); c.width = c.height = n;
      var x = c.getContext("2d"), img = x.createImageData(n, n), d = img.data;
      var g = 5, grid = [], i, j;
      for (i = 0; i < (g + 1) * (g + 1); i++) grid.push(Math.random());
      var parts = rgb.split(",").map(Number);
      for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
        var fx = i / n * g, fy = j / n * g, ix = Math.floor(fx), iy = Math.floor(fy);
        var tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        var g00 = grid[iy * (g + 1) + ix], g10 = grid[iy * (g + 1) + ix + 1];
        var g01 = grid[(iy + 1) * (g + 1) + ix], g11 = grid[(iy + 1) * (g + 1) + ix + 1];
        var v = (g00 * (1 - tx) + g10 * tx) * (1 - ty) + (g01 * (1 - tx) + g11 * tx) * ty;
        var o = (j * n + i) * 4;
        d[o] = parts[0]; d[o + 1] = parts[1]; d[o + 2] = parts[2]; d[o + 3] = Math.round(v * v * 255);
      }
      x.putImageData(img, 0, 0);
      return c;
    }

    function resize() {
      var r = cv.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
      cv.width = W; cv.height = H;
      draw(reduced() ? 7.3 : performance.now() / 1000);
    }

    function fog(tile, f, alpha, y) {
      var s = Math.max(W, H) * 1.3;
      ctx.globalAlpha = alpha;
      ctx.drawImage(tile, -f * s, y, s, s * 0.8);
      ctx.drawImage(tile, -f * s + s, y, s, s * 0.8);
      ctx.globalAlpha = 1;
    }

    function draw(t) {
      var i, b;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#0b0c14"; ctx.fillStyle = paper || "#0b0c14";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      fog(fogA, (t * 0.011) % 1, 0.13, H * 0.05);
      fog(fogB, 1 - (t * 0.007) % 1, 0.05, -H * 0.1);
      for (i = 0; i < beams.length; i++) {
        b = beams[i];
        var ang = b.a + b.amp * Math.sin(2 * Math.PI * t / b.per + b.ph);
        var ox = b.x * W, oy = -H * 0.04, len = H * 1.6, half = b.w / 2;
        var x1 = ox + Math.cos(ang - half) * len, y1 = oy + Math.sin(ang - half) * len;
        var x2 = ox + Math.cos(ang + half) * len, y2 = oy + Math.sin(ang + half) * len;
        var gr = ctx.createLinearGradient(ox, oy, (x1 + x2) / 2, (y1 + y2) / 2);
        gr.addColorStop(0, "rgba(" + b.c + "," + b.al + ")");
        gr.addColorStop(0.55, "rgba(" + b.c + "," + (b.al * 0.35).toFixed(3) + ")");
        gr.addColorStop(1, "rgba(" + b.c + ",0)");
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath(); ctx.fill();
        var lamp = ctx.createRadialGradient(ox, 2, 0, ox, 2, H * 0.06);
        lamp.addColorStop(0, "rgba(" + WHITE + ",0.55)"); lamp.addColorStop(1, "rgba(" + WHITE + ",0)");
        ctx.fillStyle = lamp; ctx.fillRect(ox - H * 0.06, -2, H * 0.12, H * 0.08);
      }
      if (!reduced()) {   // strobe: one soft flash every 2.5–7 s, +7 % at peak, gone in 120 ms
        if (t >= nextFlash) { flashAt = t; nextFlash = t + 2.5 + Math.random() * 4.5; }
        if (flashAt >= 0) {
          var dt = t - flashAt;
          if (dt < 0.12) { ctx.fillStyle = "rgba(" + WHITE + "," + (0.07 * Math.exp(-dt / 0.04)).toFixed(3) + ")"; ctx.fillRect(0, 0, W, H); }
          else flashAt = -1;
        }
      }
      ctx.globalCompositeOperation = "source-over";
      var R = Math.max(W, H);   // narrow phones: radius from the longer side, or the vignette swallows the beams
      var vg = ctx.createRadialGradient(W * 0.5, H * 0.42, R * 0.12, W * 0.5, H * 0.42, R * 0.8);
      vg.addColorStop(0, pa(0)); vg.addColorStop(1, pa(0.72));
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }

    function frame(now) {
      raf = 0;
      if (now - last >= 32) { last = now; draw(now / 1000); }   // ~30 fps is plenty for fog
      schedule();
    }
    function schedule() { if (!raf && !hidden && !offscreen && !reduced()) raf = requestAnimationFrame(frame); }
    function halt() { if (raf) cancelAnimationFrame(raf); raf = 0; }

    resize();
    schedule();
    if ("ResizeObserver" in window) new ResizeObserver(function () { resize(); }).observe(cv);
    else window.addEventListener("resize", resize);
    doc.addEventListener("visibilitychange", function () { hidden = doc.hidden; if (hidden) halt(); else schedule(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { offscreen = !en[0].isIntersecting; if (offscreen) halt(); else schedule(); }).observe(cv);
    }
    if (rmq && rmq.addEventListener) rmq.addEventListener("change", function () { halt(); resize(); schedule(); });
  }
})();
