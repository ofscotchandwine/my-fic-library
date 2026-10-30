
(function () {
  var sections = Array.prototype.slice.call(document.querySelectorAll(".chapter"));
  var selects = Array.prototype.slice.call(document.querySelectorAll(".chapter-select"));
  var prevs = Array.prototype.slice.call(document.querySelectorAll(".prev"));
  var nexts = Array.prototype.slice.call(document.querySelectorAll(".next"));
  var key = "pos:" + document.body.dataset.slug;
  var current = 0;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function show(i, scroll) {
    if (i < 0 || i >= sections.length) return;
    current = i;
    sections.forEach(function (s, n) { s.hidden = n !== i; });
    selects.forEach(function (s) { s.value = String(i); });
    prevs.forEach(function (b) { b.disabled = i === 0; });
    nexts.forEach(function (b) { b.disabled = i === sections.length - 1; });
    history.replaceState(null, "", "#ch" + (i + 1));
    set(key, i);
    if (scroll) document.getElementById("reader").scrollIntoView();
  }

  selects.forEach(function (s) { s.addEventListener("change", function () { show(parseInt(s.value, 10), true); }); });
  prevs.forEach(function (b) { b.addEventListener("click", function () { show(current - 1, true); }); });
  nexts.forEach(function (b) { b.addEventListener("click", function () { show(current + 1, true); }); });

  var start = 0;
  var m = location.hash.match(/^#ch(\d+)$/);
  if (m) start = parseInt(m[1], 10) - 1;
  else if (get(key)) start = parseInt(get(key), 10) || 0;
  if (!(start >= 0 && start < sections.length)) start = 0;
  show(start, false);
})();
