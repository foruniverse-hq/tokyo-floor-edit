/* Tokyo Peak Time — no dependencies. No inline script anywhere (the pages carry a CSP without 'unsafe-inline').
 * 1. masthead nav disclosure (narrow widths)   2. age gate (localStorage flag only)
 * 3. reveal-once for rows/cards (IntersectionObserver, 200 ms opacity/transform, skipped under reduced-motion)
 * 4. home hero canvas: 3 moving-light fans + value-noise fog + rare low-amplitude strobe.
 *    Photosensitivity: at most 1 flash per 2.5 s (never > 2 / s), peak +7 % luminance, 120 ms decay.
 *    DPR-aware (capped at 2, rendered at half resolution), ~30 fps, pauses when the tab is hidden or the hero is
 *    off-screen, and under prefers-reduced-motion draws exactly one still frame.
 * 5. RA flyer fallback (was an inline onerror)   6. headliner strip length (was an inline style)
 * 7. list filters (home): area / type / genre family / fine genre, state in ?area=…&type=…&g=…&genre=… (language-neutral
 *    slugs, unknown values dropped), history.replaceState on every change, carried to the language switch and to the
 *    event pages’ “back to the list” links ([data-carry]). Without JS the panel stays hidden and every night is listed.
 */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  root.classList.add("js");
  var rmq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(rmq && rmq.matches); }

  // ---- 1. masthead: toggle the link list under 40rem (body.nav-open dims the page behind it)
  var nav = doc.querySelector(".mast");
  var toggle = nav && nav.querySelector(".mast__toggle");
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

  // ---- 3. reveal once. Two safety nets so rows can never stay hidden: anything already in the first screen is
  //         revealed at once, and after 2.5 s everything left is revealed without animation (an observer that never
  //         fires — seen under viewport emulation — must not blank the list).
  var items = doc.querySelectorAll(".reveal");
  if (items.length) {
    var showAll = function () { items.forEach(function (el) { el.classList.add("is-in"); }); };
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
      var vh = window.innerHeight || 800, k0 = 0;
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) { el.style.setProperty("--d", Math.min(k0++ * 30, 240) + "ms"); el.classList.add("is-in"); }
        else io.observe(el);
      });
      setTimeout(function () { io.disconnect(); showAll(); }, 2500);
    } else {
      showAll();
    }
  }

  // ---- 4. hero canvas
  // hero video: muted autoplay only when motion is allowed; fades in once frames are actually playing
  var hv = doc.querySelector(".hero__video");
  if (hv && !reduced()) {
    hv.addEventListener("playing", function () { hv.classList.add("is-playing"); }, { once: true });
    hv.preload = "auto";
    var p = hv.play();
    if (p && p.catch) p.catch(function () {});
  }
  if (rmq && hv && rmq.addEventListener) rmq.addEventListener("change", function () { if (reduced()) hv.pause(); });

  var cv = doc.querySelector(".hero__canvas");
  if (cv && cv.getContext && !cv.closest(".hero--video")) hero(cv);   // real footage replaces the drawn beams

  // ---- 5. RA flyer fallback: a broken flyer shows the venue's poster instead (or the frame without a flyer)
  function flyerFail(img) {
    if (img.getAttribute("data-failed")) return;
    img.setAttribute("data-failed", "1");
    var fb = img.getAttribute("data-fallback");
    if (fb) {
      img.src = fb;
      img.classList.add("is-fallback");
      var fig = img.closest("figure"), credit = fig && fig.querySelector(".credit");
      if (credit) credit.remove();
    } else {
      var box = img.closest("figure, .ev__art, a");
      if (box) box.classList.add("no-flyer");
      // 一覧の行: 箱の画像も無いなら、空の枠にせずイベント名を置く(フライヤーの無い行と同じ見た目)
      if (box && box.classList.contains("ev__art") && !box.querySelector(".ev__art-name")) {
        var li = box.closest("li"), t = li && li.querySelector(".ev__title");
        if (t) {
          var nm = doc.createElement("span");
          nm.className = "ev__art-name";
          nm.textContent = t.textContent;
          box.classList.add("ev__art--poster");
          box.appendChild(nm);
        }
      }
      img.remove();
    }
  }
  doc.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.matches && t.matches("img[data-flyer]")) flyerFail(t);
  }, true);
  doc.querySelectorAll("img[data-flyer]").forEach(function (img) {   // failed before this script ran
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) flyerFail(img);
  });

  // ---- 6. headliner strip: loop length follows the number of names
  var mt = doc.querySelector(".marquee__track[data-n]");
  if (mt) mt.style.setProperty("--n", mt.getAttribute("data-n"));

  // ---- 7. list filters
  var KEYS = ["area", "type", "g", "genre"];
  var SLUG = /^[a-z0-9-]{1,48}$/;
  // 受け付ける値(既知の ID)。どのページにも埋め込んである。継承キー(constructor 等)が通らないよう
  // プロトタイプの無いオブジェクトにする(review-deep S2)
  var IDS = Object.create(null), FAM_OF = Object.create(null);   // FAM_OF: ジャンル → 系統
  (function () {
    var n = doc.getElementById("filter-ids"), d = null;
    try { d = n ? JSON.parse(n.textContent) : null; } catch (err) { d = null; }
    KEYS.forEach(function (k) {
      IDS[k] = Object.create(null);
      ((d && d[k]) || []).forEach(function (v) { IDS[k][v] = 1; });
    });
    var fo = (d && d.fam_of) || {};
    Object.keys(fo).forEach(function (g) { if (typeof fo[g] === "string") FAM_OF[g] = fo[g]; });
  })();
  function isKnown(k, v) { return SLUG.test(v) && Object.prototype.hasOwnProperty.call(IDS[k], v); }
  function cleanQuery(search) {
    var p = new URLSearchParams(search), out = [];
    KEYS.forEach(function (k) {
      var v = (p.get(k) || "").split(",").filter(function (x) { return isKnown(k, x); });
      if (v.length) out.push(k + "=" + v.join(","));
    });
    return out.length ? "?" + out.join("&") : "";
  }
  function carry(q) {   // links that keep the conditions: language switch, event pages, back to the list
    doc.querySelectorAll("a[data-carry]").forEach(function (a) {
      var base = a.getAttribute("data-href");
      if (base === null) { base = a.getAttribute("href") || ""; a.setAttribute("data-href", base); }
      var hash = "", i = base.indexOf("#");
      if (i >= 0) { hash = base.slice(i); base = base.slice(0, i); }
      a.setAttribute("href", base.split("?")[0] + q + hash);
    });
  }
  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] !== undefined ? o[k] : m; }); }

  var F = doc.querySelector("[data-finder]");
  var dataEl = doc.getElementById("finder-data");
  var D = null;
  if (F && dataEl) { try { D = JSON.parse(dataEl.textContent); } catch (err) { D = null; } }
  if (F && D) finder(F, D);
  else carry(cleanQuery(window.location.search));

  function finder(F, D) {
    var T = D.t, EV = D.events || [];
    var rows = Array.prototype.slice.call(F.querySelectorAll("li.ev[data-id]"));
    var dayEls = Array.prototype.slice.call(F.querySelectorAll(".day[data-day]"));
    var credit = F.querySelector("p.credit");
    var chips = Array.prototype.slice.call(F.querySelectorAll(".chip[data-axis]"));
    function bag() { var o = Object.create(null); KEYS.forEach(function (k) { o[k] = Object.create(null); }); return o; }
    var known = bag(), labels = bag();
    chips.forEach(function (c) {
      var ax = c.getAttribute("data-axis"), v = c.getAttribute("data-value");
      if (!SLUG.test(v || "")) return;
      known[ax][v] = 1; labels[ax][v] = c.getAttribute("data-label");
    });
    Object.keys(D.genre_names || {}).forEach(function (g) {
      if (SLUG.test(g)) { known.genre[g] = 1; labels.genre[g] = D.genre_names[g]; }
    });
    var state = { area: [], type: [], g: [], genre: [] }, more = false;
    var p = new URLSearchParams(window.location.search);
    KEYS.forEach(function (k) {
      (p.get(k) || "").split(",").forEach(function (v) {
        if (Object.prototype.hasOwnProperty.call(known[k], v) && state[k].indexOf(v) < 0) state[k].push(v);
      });
    });

    var bar = F.querySelector("[data-bar]"), panel = F.querySelector("[data-panel]");
    var toggle = F.querySelector("[data-toggle]"), nActive = F.querySelector("[data-n-active]");
    var activeList = F.querySelector("[data-active]"), countEl = F.querySelector("[data-count]");
    var closeBtn = F.querySelector("[data-close]"), clearBtn = F.querySelector("[data-clear]");
    var emptyEl = F.querySelector("[data-empty]"), relax = F.querySelector("[data-relax]");
    var tonight = F.querySelector("[data-tonight]"), moreEl = F.querySelector("[data-more]");
    var genreBox = F.querySelector("[data-genre-chips]"), fineBox = el("div", "chips chips--fine");
    if (genreBox) genreBox.parentNode.insertBefore(fineBox, genreBox.nextSibling);

    function any(a, b) { for (var i = 0; i < a.length; i++) if (b.indexOf(a[i]) >= 0) return true; return false; }
    function inArea(e, s, m) {
      if (!s.area.length) return true;
      if (e.venue_note) return m;
      return s.area.indexOf(e.area) >= 0 || s.area.indexOf(e.group) >= 0;   // 郊外・日帰り・遠征は区分の ID で当てる
    }
    function inType(e, s) {
      if (!s.type.length) return true;
      for (var i = 0; i < s.type.length; i++) if (s.type[i] === "day" ? e.day : e.type === s.type[i]) return true;
      return false;
    }
    function inGenre(e, s, m) {
      if (!s.g.length && !s.genre.length) return true;
      if (!e.genres.length) return m;
      return any(e.fam, s.g) || any(e.genres, s.genre);
    }
    function count(s, m, test) {
      var n = 0;
      EV.forEach(function (e) { if (inArea(e, s, m) && inType(e, s) && inGenre(e, s, m) && (!test || test(e))) n++; });
      return n;
    }
    function copy(s) { return { area: s.area.slice(), type: s.type.slice(), g: s.g.slice(), genre: s.genre.slice() }; }
    function facet(ax, v) {   // nights if this chip were the only one on its axis (other axes as they are)
      var s = copy(state);
      if (ax === "g" || ax === "genre") { s.g = []; s.genre = []; }
      s[ax] = [v];
      return count(s, false);
    }
    function active() {
      var out = [];
      KEYS.forEach(function (k) { state[k].forEach(function (v) { out.push([k, v]); }); });
      return out;
    }
    function query() {
      var parts = [];
      KEYS.forEach(function (k) { if (state[k].length) parts.push(k + "=" + state[k].join(",")); });
      return parts.length ? "?" + parts.join("&") : "";
    }
    function removeBtn(k, v, extra) {
      var b = el("button", "chip chip--on", labels[k][v] + (extra || "") + " ×");
      b.type = "button";
      b.setAttribute("data-remove-axis", k);
      b.setAttribute("data-remove-value", v);
      b.setAttribute("aria-label", fmt(T.remove, { label: labels[k][v] }));
      return b;
    }

    function apply() {
      var vis = {}, total = 0, on = active();
      EV.forEach(function (e) {
        if (inArea(e, state, more) && inType(e, state) && inGenre(e, state, more)) { vis[e.id] = 1; total++; }
      });
      rows.forEach(function (li) { li.hidden = !vis[li.getAttribute("data-id")]; });
      dayEls.forEach(function (d) { d.hidden = !d.querySelector("li.ev:not([hidden])"); });
      // フライヤーの出典は、見えている行にフライヤーがあるときだけ出す(0件の画面に残さない)
      if (credit) credit.hidden = !rows.some(function (li) { return !li.hidden && li.querySelector(".ev__flyer"); });

      chips.forEach(function (c) {
        var ax = c.getAttribute("data-axis"), v = c.getAttribute("data-value"), pressed = state[ax].indexOf(v) >= 0;
        var n = facet(ax, v);
        c.setAttribute("aria-pressed", pressed ? "true" : "false");
        // 系統のチップ: その系統の細かいジャンルで絞っている間は印を付ける(同じ名前の系統が未選択に見えないように)
        c.classList.toggle("chip--part", ax === "g" && !pressed &&
          state.genre.some(function (g) { return FAM_OF[g] === v; }));
        var nEl = c.querySelector("[data-chip-n]");
        if (nEl) nEl.textContent = n;
        c.disabled = !pressed && n === 0;
      });
      fineBox.textContent = "";
      state.genre.forEach(function (g) { fineBox.appendChild(removeBtn("genre", g)); });

      nActive.textContent = on.length ? "(" + on.length + ")" : "";
      activeList.textContent = "";
      on.forEach(function (kv) { var li = el("li"); li.appendChild(removeBtn(kv[0], kv[1])); activeList.appendChild(li); });
      countEl.textContent = fmt(total === 1 && T.results_one ? T.results_one : T.results, { n: total });
      if (closeBtn) closeBtn.textContent = fmt(T.show_results, { n: total });

      // nothing matches: what removing one condition would give
      relax.textContent = "";
      // 条件を付けていない(今週そもそも0件)ときは出さない。サーバーの「載せる夜はありません」に任せる(review-deep B14)
      emptyEl.hidden = total > 0 || !on.length || !EV.length;
      if (!total && on.length) {
        on.forEach(function (kv) {
          var s = copy(state);
          s[kv[0]] = s[kv[0]].filter(function (x) { return x !== kv[1]; });
          var n = count(s, false);
          if (!n) return;
          var b = el("button", "btn", fmt(T.remove, { label: labels[kv[0]][kv[1]] }) + " · " + fmt(n === 1 && T.results_one ? T.results_one : T.results, { n: n }));
          b.type = "button";
          b.setAttribute("data-remove-axis", kv[0]);
          b.setAttribute("data-remove-value", kv[1]);
          relax.appendChild(b);
        });
        var hint = emptyEl.querySelector("[data-empty-hint]");
        if (hint) hint.hidden = !relax.children.length;   // 外せる条件が無いときはヒントを出さない
      }

      // tonight has none: point at the next night that does
      tonight.hidden = true;
      tonight.textContent = "";
      if (total) {
        var todayEl = F.querySelector('.day[data-day="' + D.today + '"]');
        if (!todayEl || todayEl.hidden) {
          var next = dayEls.filter(function (d) { return !d.hidden && d.getAttribute("data-day") > D.today; })[0];
          if (next) {
            var a = el("a", "", fmt(T.tonight_none, { date: next.querySelector("time").textContent + " " + next.querySelector(".day__wd").textContent }));
            a.href = "#" + next.id;
            tonight.appendChild(a);
            tonight.hidden = false;
          }
        }
      }

      // nights left out because their genre or venue is not known yet: say how many, offer to show them
      moreEl.textContent = "";
      if (!more) {
        var lines = [];
        var s0 = state;
        if (s0.g.length || s0.genre.length) {
          var gs = copy(s0); gs.g = []; gs.genre = [];
          var ntba = count(gs, true, function (e) { return !e.genres.length && e.genre_note === "tba"; });
          var nopen = count(gs, true, function (e) { return !e.genres.length && e.genre_note === "open"; });
          if (ntba) lines.push(fmt(T.more_genre_tba, { n: ntba }));
          if (nopen) lines.push(fmt(T.more_open, { n: nopen }));
        }
        if (s0.area.length) {
          var as = copy(s0); as.area = [];
          var nv = count(as, true, function (e) { return e.venue_note === "tba"; });
          var nu = count(as, true, function (e) { return e.venue_note === "unknown"; });
          if (nv) lines.push(fmt(T.more_venue_tba, { n: nv }));
          if (nu) lines.push(fmt(T.more_area_unknown, { n: nu }));
        }
        lines.forEach(function (txt) {
          var line = el("p", "finder__more-line", txt + " ");
          var b = el("button", "linkish", "[" + T.more_show + "]");
          b.type = "button";
          b.setAttribute("data-more-show", "1");
          line.appendChild(b);
          moreEl.appendChild(line);
        });
      }
      moreEl.hidden = !moreEl.firstChild;

      var q = query();
      try { history.replaceState(null, "", window.location.pathname + q + window.location.hash); } catch (err) { /* file:// */ }
      carry(q);
    }

    function setAxis(k, v, on) {
      var i = state[k].indexOf(v);
      if (on && i < 0) state[k].push(v);
      if (!on && i >= 0) state[k].splice(i, 1);
      more = false;
      apply();
    }

    // narrow widths: the bar's button opens the panel under the sticky bar (same pattern as the masthead menu)
    var wide = window.matchMedia ? window.matchMedia("(min-width: 60rem)") : null;
    function setPanel(open) {
      if (open && wide && wide.matches) open = false;
      F.classList.toggle("is-open", open);
      doc.body.classList.toggle("finder-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        // open from anywhere on the page: bring the list up first so the bar is stuck under the masthead
        var stuck = parseFloat(getComputedStyle(bar).top) || 0;
        if (Math.abs(bar.getBoundingClientRect().top - stuck) > 2) {
          window.scrollTo(0, window.pageYOffset + F.getBoundingClientRect().top - stuck);
        }
        panel.style.setProperty("--panel-top", Math.max(0, Math.round(bar.getBoundingClientRect().bottom)) + "px");
      }
    }
    toggle.addEventListener("click", function () { setPanel(!F.classList.contains("is-open")); });
    if (wide && wide.addEventListener) wide.addEventListener("change", function () { setPanel(false); });
    doc.addEventListener("click", function (e) {
      // 押したボタンが再描画で DOM から外れた(パネル内の × など)ときと、ファインダーの中のクリックでは閉じない(review-deep B13)
      if (!e.target.isConnected || F.contains(e.target)) return;
      if (F.classList.contains("is-open") && !panel.contains(e.target) && !bar.contains(e.target)) setPanel(false);
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && F.classList.contains("is-open")) { setPanel(false); toggle.focus(); }
    });
    if (closeBtn) closeBtn.addEventListener("click", function () { setPanel(false); bar.scrollIntoView({ block: "nearest" }); });
    if (clearBtn) clearBtn.addEventListener("click", function () {
      KEYS.forEach(function (k) { state[k] = []; });
      more = false;
      apply();
    });

    F.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("button, a") : null;
      if (!t || !F.contains(t)) return;
      if (t.matches(".chip[data-axis]")) {
        setAxis(t.getAttribute("data-axis"), t.getAttribute("data-value"), t.getAttribute("aria-pressed") !== "true");
      } else if (t.hasAttribute("data-remove-axis")) {
        setAxis(t.getAttribute("data-remove-axis"), t.getAttribute("data-remove-value"), false);
      } else if (t.hasAttribute("data-more-show")) {
        more = true;
        apply();
      } else if (t.matches("a.gtag[data-genre]")) {
        var g = t.getAttribute("data-genre");
        if (!known.genre[g]) return;
        e.preventDefault();
        // タグを押したら、そのジャンルだけで絞る(系統のチップと OR にしない。設計書「系統」・review-deep S5)
        state.g = []; state.genre = [];
        setAxis("genre", g, true);
        F.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" });
      }
    });

    apply();
  }

  function hero(cv) {
    // over a still photo the canvas must be transparent: an opaque canvas hides the photo even with mix-blend-mode: screen
    var onPhoto = !!cv.closest(".hero--photo");
    var ctx = cv.getContext("2d", { alpha: onPhoto });
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
      if (onPhoto) ctx.clearRect(0, 0, W, H);
      else { ctx.fillStyle = paper || "#0b0c14"; ctx.fillRect(0, 0, W, H); }
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
