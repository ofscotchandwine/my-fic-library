
/* state.js - everything the site remembers about YOU (not about the fics):
   favorites (kudos), read status, last chapter + paragraph, chapters read,
   reading history. Saved in this browser, and optionally synced between
   devices through a private GitHub Gist (see sync.html).
   Each field of each fic has its own timestamp, so a kudos given on your phone
   and a bookmark saved on your computer never overwrite each other. */
(function () {
  "use strict";
  var KEY = "archive.state.v2", CFG = "archive.sync.v1", MIG = "archive.migrated.v2";
  var MARK = "my-archive-state", FILE = "state.json";
  var listeners = [], timer = null, busy = false, again = false;
  var info = { last: 0, error: "" };

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function parse(s, d) { try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }

  /* a record looks like { kudos: 1700000000000, status: "reading", ch: 2, p: 14,
     done: [0,1], lr: 1700000000000, t: { kudos: 17..., status: 17..., ... } } */
  function normalize(r) {
    if (!r || typeof r !== "object") return { t: {} };
    if (typeof r.t === "number") {          // older single-timestamp format
      var all = {};
      Object.keys(r).forEach(function (k) { if (k !== "t") all[k] = r.t; });
      r.t = all;
    }
    if (!r.t || typeof r.t !== "object") r.t = {};
    return r;
  }
  function normalizeAll(obj) {
    var out = { v: 2, fics: {} };
    if (obj && obj.fics) Object.keys(obj.fics).forEach(function (s) { out.fics[s] = normalize(obj.fics[s]); });
    return out;
  }

  var data = normalizeAll(parse(lsGet(KEY), null));
  var cfg = parse(lsGet(CFG), null); // { token, gist, api }

  function save() { lsSet(KEY, JSON.stringify(data)); }
  function emit(kind) {
    updateLink();
    listeners.forEach(function (fn) { try { fn(kind); } catch (e) {} });
  }

  function kudosCount() {
    var n = 0;
    Object.keys(data.fics).forEach(function (k) { if (data.fics[k].kudos) n++; });
    return n;
  }
  function updateLink() { /* the top-bar Kudos list link was removed */ }

  /* ---------- one-time import of the older, simpler storage keys ---------- */
  function migrate() {
    if (lsGet(MIG)) return;
    var changed = false, now = Date.now();
    function rec(slug) { return data.fics[slug] || (data.fics[slug] = { t: {} }); }
    var old = parse(lsGet("kudos"), []);
    if (Array.isArray(old)) {
      old.forEach(function (k) {
        if (!k || !k.slug) return;
        var r = rec(k.slug);
        if (r.kudos) return;
        var ts = k.added || now;
        r.kudos = ts; r.ti = k.title || ""; r.au = k.author || ""; r.url = k.url || "";
        r.t.kudos = ts; r.t.ti = ts; r.t.au = ts; r.t.url = ts;
        changed = true;
      });
    }
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf("pos:") === 0) {
          var slug = key.slice(4), n = parseInt(localStorage.getItem(key), 10);
          var r2 = rec(slug);
          if (r2.ch == null && n >= 0) { r2.ch = n; r2.t.ch = now; changed = true; }
        }
      }
    } catch (e) {}
    if (changed) save();
    lsSet(MIG, "1");
  }
  migrate();

  /* ---------- reading and writing records ---------- */
  function get(slug) { return data.fics[slug] || null; }
  function status(slug) { var r = data.fics[slug]; return (r && r.status) || "unread"; }
  function set(slug, patch) {
    var r = data.fics[slug] || (data.fics[slug] = { t: {} });
    var now = Date.now();
    Object.keys(patch).forEach(function (k) { r[k] = patch[k]; r.t[k] = now; });
    save();
    emit("local");
    schedule();
    return r;
  }

  /* ---------- merging two copies (newest value per field wins) ---------- */
  function merge(remote) {
    var changed = false;
    if (!remote || !remote.fics) return false;
    Object.keys(remote.fics).forEach(function (slug) {
      var r = normalize(remote.fics[slug]);
      var l = data.fics[slug] || (data.fics[slug] = { t: {} });
      Object.keys(r.t).forEach(function (k) {
        if (!l.t[k] || r.t[k] > l.t[k]) { l[k] = r[k]; l.t[k] = r.t[k]; changed = true; }
      });
    });
    return changed;
  }
  function remoteLacks(remote) {
    var lacks = false;
    Object.keys(data.fics).forEach(function (slug) {
      var l = data.fics[slug], r = remote && remote.fics && remote.fics[slug];
      r = r ? normalize(r) : { t: {} };
      Object.keys(l.t).forEach(function (k) { if (!r.t[k] || r.t[k] < l.t[k]) lacks = true; });
    });
    return lacks;
  }

  /* ---------- GitHub Gist sync ---------- */
  function configured() { return !!(cfg && cfg.token && cfg.gist); }

  function api(path, opts) {
    opts = opts || {};
    var base = (cfg && cfg.api) || "https://api.github.com";
    return fetch(base + path, {
      method: opts.method || "GET",
      headers: {
        "Authorization": "Bearer " + cfg.token,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      if (res.status === 401) throw new Error("GitHub did not accept the token. Create a new one and connect again.");
      if (res.status === 403 || res.status === 429) throw new Error("GitHub is limiting requests right now. It will try again later.");
      if (res.status === 404) throw new Error("The sync storage was not found. Disconnect and connect again.");
      if (!res.ok) throw new Error("GitHub error " + res.status + ".");
      return res.json();
    }, function () {
      throw new Error("Can't reach GitHub. Are you offline?");
    });
  }
  function readRemote() {
    return api("/gists/" + cfg.gist).then(function (g) {
      var f = g.files && g.files[FILE];
      if (!f) return { fics: {} };
      if (f.truncated && f.raw_url) {
        return fetch(f.raw_url).then(function (r) { return r.text(); }).then(function (t) { return parse(t, { fics: {} }); });
      }
      return parse(f.content, { fics: {} });
    });
  }
  function writeRemote(obj) {
    var files = {}; files[FILE] = { content: JSON.stringify(obj) };
    return api("/gists/" + cfg.gist, { method: "PATCH", body: { files: files } });
  }

  function syncNow() {
    if (!configured()) return Promise.resolve(false);
    if (busy) { again = true; return Promise.resolve(false); }
    busy = true; info.error = "";
    emit("sync");
    return readRemote().then(function (remote) {
      if (merge(remote)) { save(); emit("remote"); }
      return remoteLacks(remote) ? writeRemote(data) : null;
    }).then(function () {
      info.last = Date.now();
    }).catch(function (e) {
      info.error = (e && e.message) || String(e);
    }).then(function () {
      busy = false;
      emit("sync");
      if (again) { again = false; schedule(); }
      return !info.error;
    });
  }
  function schedule() {
    if (!configured()) return;
    clearTimeout(timer);
    timer = setTimeout(syncNow, 2500);
  }

  function connect(token, apiBase) {
    token = (token || "").trim();
    if (!token) return Promise.reject(new Error("Paste your token first."));
    var previous = cfg;
    cfg = { token: token, api: apiBase || undefined };
    function find(page) {
      return api("/gists?per_page=100&page=" + page).then(function (list) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].description === MARK && list[i].files && list[i].files[FILE]) return list[i].id;
        }
        if (list.length === 100 && page < 5) return find(page + 1);
        return null;
      });
    }
    return find(1).then(function (id) {
      if (id) return id;
      var files = {}; files[FILE] = { content: JSON.stringify(data) };
      return api("/gists", { method: "POST", body: { description: MARK, public: false, files: files } })
        .then(function (g) { return g.id; });
    }).then(function (id) {
      cfg.gist = id;
      lsSet(CFG, JSON.stringify(cfg));
      return syncNow();
    }).then(function (ok) {
      if (!ok) throw new Error(info.error || "Could not sync.");
      return true;
    }).catch(function (e) {
      cfg = previous;
      if (!previous) lsDel(CFG);
      throw e;
    });
  }
  function disconnect() { cfg = null; lsDel(CFG); info.error = ""; emit("sync"); }

  /* ---------- manual sync code (no account needed) ---------- */
  function exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(data)))); }
  function importCode(str) {
    var obj;
    try { obj = JSON.parse(decodeURIComponent(escape(atob((str || "").replace(/\s+/g, ""))))); } catch (e) { obj = null; }
    if (!obj || !obj.fics) throw new Error("That doesn't look like a sync code.");
    var changed = merge(obj);
    save(); emit("remote"); schedule();
    return changed;
  }

  window.State = {
    get: get, status: status, set: set, all: function () { return data.fics; },
    on: function (fn) { listeners.push(fn); },
    kudosCount: kudosCount,
    configured: configured,
    syncInfo: function () { return { configured: configured(), busy: busy, last: info.last, error: info.error }; },
    syncNow: syncNow, connect: connect, disconnect: disconnect,
    exportCode: exportCode, importCode: importCode
  };

  updateLink();
  if (configured()) {
    syncNow();
    var lastSeen = Date.now();
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && Date.now() - lastSeen > 15000) { lastSeen = Date.now(); syncNow(); }
    });
  }
})();
