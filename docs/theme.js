
(function () {
  var root = document.documentElement;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var btn = document.getElementById("theme-toggle");
  function label() { if (btn) btn.textContent = root.dataset.theme === "light" ? "Dark mode" : "Light mode"; }
  if (btn) {
    btn.addEventListener("click", function () {
      root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
      set("theme", root.dataset.theme);
      label();
    });
  }
  label();
  var fs = parseFloat(get("fs")) || 1;
  function applyFs() { root.style.setProperty("--fs", fs); }
  applyFs();
  var minus = document.getElementById("font-minus"), plus = document.getElementById("font-plus");
  if (minus) minus.addEventListener("click", function () { fs = Math.max(0.8, +(fs - 0.1).toFixed(2)); set("fs", fs); applyFs(); });
  if (plus) plus.addEventListener("click", function () { fs = Math.min(1.6, +(fs + 0.1).toFixed(2)); set("fs", fs); applyFs(); });
})();
