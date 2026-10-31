
(function () {
  var root = document.documentElement;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var ICON = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var SUN = '<svg ' + ICON + '><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';
  var MOON = '<svg ' + ICON + '><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>';
  var btn = document.getElementById("theme-toggle");
  // Shows the icon of the mode you will switch TO: sun while dark, moon while light.
  function label() {
    if (!btn) return;
    var light = root.dataset.theme === "light";
    btn.innerHTML = light ? MOON : SUN;
    var t = light ? "Switch to dark mode" : "Switch to light mode";
    btn.title = t;
    btn.setAttribute("aria-label", t);
  }
  if (btn) {
    btn.addEventListener("click", function () {
      root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
      set("theme", root.dataset.theme);
      label();
    });
  }
  // Until you press the button, follow the phone/computer setting (and any change to it).
  try {
    var mq = window.matchMedia("(prefers-color-scheme: light)");
    var follow = function () {
      if (get("theme")) return;
      root.dataset.theme = mq.matches ? "light" : "dark";
      label();
    };
    if (mq.addEventListener) mq.addEventListener("change", follow);
    else if (mq.addListener) mq.addListener(follow);
  } catch (e) {}
  label();

  var fs = parseFloat(get("fs")) || 1;
  function applyFs() { root.style.setProperty("--fs", fs); }
  applyFs();
  var minus = document.getElementById("font-minus"), plus = document.getElementById("font-plus");
  if (minus) minus.addEventListener("click", function () { fs = Math.max(0.8, +(fs - 0.1).toFixed(2)); set("fs", fs); applyFs(); });
  if (plus) plus.addEventListener("click", function () { fs = Math.min(1.6, +(fs + 0.1).toFixed(2)); set("fs", fs); applyFs(); });
})();
