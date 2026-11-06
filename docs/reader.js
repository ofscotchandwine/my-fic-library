
/* reader.js - the fic page: chapters, bookmark, read marks, status, kudos */
(function () {
  "use strict";
  var S = window.State;
  var body = document.body, slug = body.dataset.slug;
  var sections = Array.prototype.slice.call(document.querySelectorAll(".chapter"));
  var N = sections.length;
  var prevs = Array.prototype.slice.call(document.querySelectorAll(".prev"));
  var nexts = Array.prototype.slice.call(document.querySelectorAll(".next"));
  var poss = Array.prototype.slice.call(document.querySelectorAll(".pos"));
  var current = 0, paraIdx = 0, saveTimer = null, ready = false;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function rec() { return S.get(slug) || {}; }
  function doneList() { return (rec().done || []).slice(); }
  function isDone(i) { return doneList().indexOf(i) !== -1; }

  /* ---------- drawing ---------- */
  function paragraphs() { return Array.prototype.slice.call(sections[current].querySelectorAll("p")); }

  function drawList() {
    var done = doneList(), list = $("chlist-items");
    list.textContent = "";
    sections.forEach(function (s, i) {
      var li = el("li");
      var b = el("button", "chitem" + (done.indexOf(i) !== -1 ? " read" : "") + (i === current ? " current" : ""));
      b.type = "button";
      b.appendChild(el("span", "badge", done.indexOf(i) !== -1 ? "✓" : String(i + 1)));
      b.appendChild(el("span", "name", s.dataset.title));
      if (i === current) b.appendChild(el("span", "here", "here"));
      b.addEventListener("click", function () { show(i, true); $("chlist").hidden = true; $("chtoggle").setAttribute("aria-expanded", "false"); });
      li.appendChild(b); list.appendChild(li);
    });
    $("cl-count").textContent = done.length + " of " + N + " read";
    $("cl-bar").style.width = Math.round(done.length / N * 100) + "%";
    $("ct-count").textContent = done.length + "/" + N + " read";
  }
  function drawFoot() {
    var b = $("markread"), on = isDone(current);
    b.textContent = on ? "✓ Chapter read" : "Mark chapter as read";
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  }
  function drawStatus() {
    var s = S.status(slug);
    Array.prototype.forEach.call(document.querySelectorAll("#statusseg button"), function (b) {
      b.setAttribute("aria-pressed", b.dataset.status === s ? "true" : "false");
    });
    var tick = $("mark-tick"); if (tick) tick.hidden = s !== "finished";
  }
  function drawKudos() {
    var on = !!rec().kudos, b = $("kudos-btn");
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
    var heart = $("mark-heart"); if (heart) heart.hidden = !on;
  }
  function drawAll() { drawList(); drawFoot(); drawStatus(); drawKudos(); }

  /* ---------- chapters ---------- */
  function show(i, userMove) {
    if (i < 0 || i >= N) return;
    current = i;
    sections.forEach(function (s, n) { s.hidden = n !== i; });
    var front = $("front"); if (front) front.hidden = i !== 0;   // fic summary + notes: first chapter only
    prevs.forEach(function (b) { b.disabled = i === 0; });
    nexts.forEach(function (b) { b.disabled = i === N - 1; });
    poss.forEach(function (p) { p.textContent = "Chapter " + (i + 1) + " of " + N; });
    paraIdx = 0;
    if (userMove) {
      if (ready) S.set(slug, { ch: i, p: 0, lr: Date.now() });
      $("reader").scrollIntoView();
    }
    drawList(); drawFoot();
  }
  function setDone(i, on) {
    var d = doneList(), k = d.indexOf(i);
    if (on && k === -1) d.push(i); else if (!on && k !== -1) d.splice(k, 1);
    d.sort(function (a, b) { return a - b; });
    var patch = { done: d, lr: Date.now() };
    S.set(slug, patch);
    if (on && i === N - 1 && S.status(slug) !== "finished") S.set(slug, { status: "finished" });
    drawAll();
  }

  prevs.forEach(function (b) { b.addEventListener("click", function () { show(current - 1, true); }); });
  nexts.forEach(function (b) {
    b.addEventListener("click", function () {
      if (!isDone(current)) setDone(current, true);   // moving on counts as having read it
      show(current + 1, true);
    });
  });
  $("markread").addEventListener("click", function () { setDone(current, !isDone(current)); });

  $("chtoggle").addEventListener("click", function () {
    var box = $("chlist"), open = box.hidden;
    box.hidden = !open;
    this.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { var cur = box.querySelector(".current"); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" }); }
  });

  /* ---------- status + kudos ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("#statusseg button"), function (b) {
    b.addEventListener("click", function () {
      var s = b.dataset.status;
      if (s === "unread") S.set(slug, { status: "unread", ch: 0, p: 0, done: [] });
      else if (s === "finished") {
        var all = []; for (var i = 0; i < N; i++) all.push(i);
        S.set(slug, { status: "finished", done: all, lr: Date.now() });
      } else S.set(slug, { status: "reading", lr: Date.now() });
      drawAll();
    });
  });
  $("totop").addEventListener("click", function () {
    var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  });
  $("kudos-btn").addEventListener("click", function () {
    var b = this;
    S.set(slug, rec().kudos ? { kudos: 0 } : { kudos: Date.now(), ti: b.dataset.title, au: b.dataset.author, url: b.dataset.url });
    drawKudos();
  });

  /* ---------- remembering the paragraph ---------- */
  function currentPara() {
    var ps = paragraphs();
    for (var i = 0; i < ps.length; i++) {
      if (ps[i].getBoundingClientRect().bottom > 12) return i;
    }
    return Math.max(0, ps.length - 1);
  }
  function savePos() {
    if (!ready) return;
    S.set(slug, { ch: current, p: paraIdx, lr: Date.now() });
  }
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ready || ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var top = sections[current].getBoundingClientRect().top;
      var idx = top > 0 ? 0 : currentPara();
      if (idx !== paraIdx) {
        paraIdx = idx;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(savePos, 3000);
      }
    });
  }, { passive: true });
  function flush() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; savePos(); } }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flush(); });
  window.addEventListener("pagehide", flush);

  /* ---------- start ---------- */
  var r0 = rec();
  var start = 0, resume = false;
  var m = location.hash.match(/^#ch(\d+)$/);
  if (m) start = parseInt(m[1], 10) - 1;
  else if (r0.ch >= 0 && r0.ch != null) start = r0.ch;
  if (!(start >= 0 && start < N)) start = 0;
  if (r0.ch === start && r0.p > 0) resume = true;
  show(start, false);
  drawAll();

  if (resume) {
    var ps = paragraphs(), target = ps[Math.min(r0.p, ps.length - 1)];
    if (target) {
      paraIdx = r0.p;
      var go = function () {
        setTimeout(function () {
          target.scrollIntoView({ block: "start" });
          target.classList.add("resumed");
          setTimeout(function () { target.classList.remove("resumed"); }, 2600);
        }, 60);
      };
      if (document.readyState === "complete") go(); else window.addEventListener("load", go);
    }
  }
  ready = true;
  // the first time a fic is opened it moves from Unread to Reading
  if (!r0.lr) S.set(slug, { status: r0.status || "reading", ch: start, p: 0, lr: Date.now() });
  else if (S.status(slug) === "unread" && !r0.status) S.set(slug, { status: "reading", lr: Date.now() });
  else S.set(slug, { lr: Date.now() });
  drawAll();

  S.on(function (kind) { if (kind === "remote") drawAll(); });
})();
