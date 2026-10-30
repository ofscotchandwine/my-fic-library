

(function () {
  var KEY = "kudos";
  function read() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function write(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
  var K = {
    all: read,
    has: function (slug) { return read().some(function (k) { return k.slug === slug; }); },
    add: function (item) {
      var list = read();
      if (list.some(function (k) { return k.slug === item.slug; })) return;
      item.added = Date.now();
      list.push(item);
      write(list);
    },
    remove: function (slug) { write(read().filter(function (k) { return k.slug !== slug; })); }
  };
  window.Kudos = K;

  function updateLink() {
    var link = document.getElementById("kudos-link");
    if (!link) return;
    var n = read().length;
    link.textContent = (n ? "\u2665" : "\u2661") + " kudos list" + (n ? " (" + n + ")" : "");
  }
  updateLink();

  // Button at the bottom of a fic
  var btn = document.getElementById("kudos-btn");
  if (btn) {
    var paint = function () {
      var on = K.has(btn.dataset.slug);
      btn.classList.toggle("on", on);
      btn.textContent = on ? "\u2665 on your kudos list \u2013 tap to remove" : "\u2661 add reminder to give author kudos";
    };
    btn.addEventListener("click", function () {
      if (K.has(btn.dataset.slug)) K.remove(btn.dataset.slug);
      else K.add({ slug: btn.dataset.slug, title: btn.dataset.title, author: btn.dataset.author, url: btn.dataset.url });
      paint();
      updateLink();
    });
    paint();
  }

  // The kudos list page
  var list = document.getElementById("kudos-list");
  if (list) {
    var empty = document.getElementById("kudos-empty");
    var renderList = function () {
      var items = read().slice().reverse();
      list.textContent = "";
      empty.hidden = items.length > 0;
      items.forEach(function (k) {
        var li = document.createElement("li");
        li.className = "work";
        var h = document.createElement("h3");
        var a = document.createElement("a");
        a.href = "fic/" + k.slug + ".html";
        a.textContent = k.title || k.slug;
        h.appendChild(a);
        li.appendChild(h);
        var by = document.createElement("div");
        by.className = "by";
        by.textContent = "by " + (k.author || "Unknown");
        li.appendChild(by);
        var row = document.createElement("div");
        row.className = "k-actions";
        if (k.url) {
          var ao3 = document.createElement("a");
          ao3.className = "pill";
          ao3.href = k.url;
          ao3.target = "_blank";
          ao3.rel = "noopener noreferrer";
          ao3.textContent = "Open on AO3 \u2197";
          row.appendChild(ao3);
        }
        var rm = document.createElement("button");
        rm.type = "button";
        rm.className = "pill";
        rm.textContent = "Remove";
        rm.addEventListener("click", function () { K.remove(k.slug); renderList(); });
        row.appendChild(rm);
        li.appendChild(row);
        list.appendChild(li);
      });
    };
    renderList();
  }
})();
