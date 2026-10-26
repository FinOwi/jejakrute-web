/* JEJAKRUTE — kerangka area anggota web.
   Semua data sosial dibaca/ditulis lewat Supabase yang sama dengan
   aplikasi. Berkas ini tidak menyimpan keadaan sosial apa pun di
   localStorage/sessionStorage; sesudah mutasi, halaman membaca ulang
   angka dan keadaan dari server. */
(function () {
  "use strict";
  var APK_URL = "https://github.com/FinOwi/jejakrute/releases/download/v0.27.3/JEJAKRUTE-Pratinjau-v0.27.3-arm64.apk";
  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/></svg>',
    compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
    record: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 5 5.8v5.4c0 4.6 2.9 7.8 7 9.8 4.1-2 7-5.2 7-9.8V5.8z"/><path d="m9.2 12 2 2 3.8-4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c1.4-3.6 4.1-5.4 7.5-5.4s6.1 1.8 7.5 5.4"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 9.5a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5C7 16.8 3.5 13.6 3.5 9.9 3.5 7.2 5.5 5 8.1 5c1.6 0 3 .8 3.9 2.1C12.9 5.8 14.3 5 15.9 5c2.6 0 4.6 2.2 4.6 4.9 0 3.7-3.5 6.9-8.5 10.6z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H4l2.3-2.9A8 8 0 1 1 21 12z"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5h12V21l-6-4-6 4z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="5.5" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4c4-2.2 7 2.2 12 0v9c-5 2.2-8-2.2-12 0"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 14h9l1-14"/><path d="M10 11v6M14 11v6"/></svg>'
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function client() { return window.jr ? window.jr.client() : null; }
  function session() { return window.jr ? window.jr.session() : null; }
  function authProfile() { return window.jr ? window.jr.profile() : null; }
  function baseUrl() { return window.jr ? window.jr.baseUrl : ""; }
  function mediaUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return baseUrl() + "/storage/v1/object/public/media/" + String(path).split("/").map(encodeURIComponent).join("/");
  }
  function mediaItems(post) {
    var raw = post && post.media;
    if (!raw) return [];
    if (typeof raw === "string") {
      try { raw = JSON.parse(raw); } catch (_) { return [raw]; }
    }
    if (!Array.isArray(raw)) raw = [raw];
    return raw.map(function (x) {
      if (!x) return "";
      if (typeof x === "string") return x;
      return x.path || x.url || x.src || "";
    }).filter(Boolean);
  }
  function fmtNum(v) { return Number(v || 0).toLocaleString("id-ID"); }
  function fmtKm(v) { return Number(v || 0).toFixed(1).replace(".", ",") + " km"; }
  function fmtM(v) { return Math.round(Number(v || 0)).toLocaleString("id-ID") + " m"; }
  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  }
  function fmtDateTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) + ", " +
      d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }
  function relTime(iso) {
    if (!iso) return "";
    var sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (sec < 60) return "baru saja";
    if (sec < 3600) return Math.floor(sec / 60) + " menit lalu";
    if (sec < 86400) return Math.floor(sec / 3600) + " jam lalu";
    if (sec < 604800) return Math.floor(sec / 86400) + " hari lalu";
    return fmtDate(iso);
  }
  function toast(msg) {
    var old = document.querySelector(".jr-toast");
    if (old) old.remove();
    var el = document.createElement("div");
    el.className = "jr-toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2800);
  }
  function profileLink(p) {
    if (!p) return "profil.html";
    if (p.username) return "profil.html?u=" + encodeURIComponent(p.username);
    return "profil.html?id=" + encodeURIComponent(p.id || "");
  }
  function googleAvatar(user) {
    var m = user && user.user_metadata;
    return (m && (m.avatar_url || m.picture)) || "";
  }
  function avatarUrl(p, user) {
    if (p && p.avatar_path) return mediaUrl(p.avatar_path);
    if (user && p && user.id === p.id) return googleAvatar(user);
    return "";
  }
  function avatarHTML(p, cls, user) {
    var url = avatarUrl(p, user);
    var name = (p && p.nama) || "J";
    if (url) return '<span class="avatar ' + (cls || "") + '"><img src="' + esc(url) + '" alt=""></span>';
    return '<span class="avatar ' + (cls || "") + '">' + esc(name.charAt(0).toUpperCase() || "J") + "</span>";
  }
  function displayName(p) { return (p && p.nama) || "Pendaki JEJAKRUTE"; }
  function usernameLabel(p) { return p && p.username ? "@" + p.username : ""; }

  async function profilesByIds(ids) {
    var map = new Map();
    var uniq = Array.from(new Set((ids || []).filter(Boolean)));
    if (!uniq.length) return map;
    var c = client();
    var res = await c.from("profiles").select("id,nama,username,bio,avatar_path,cover_path,sosial,lencana_terpasang,terverifikasi").in("id", uniq);
    if (res.error) throw res.error;
    (res.data || []).forEach(function (p) { map.set(p.id, p); });
    return map;
  }
  async function countRows(table, build) {
    var c = client();
    var q = c.from(table).select("id", { count: "exact", head: true });
    q = build(q);
    var res = await q;
    if (res.error) throw res.error;
    return res.count || 0;
  }

  /* ---------- GPX: parsing & statistik selalu dari berkas server ---------- */
  function haversine(a, b) {
    var R = 6371000, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function parseGPXText(text) {
    var xml = new DOMParser().parseFromString(text, "application/xml");
    if (xml.querySelector("parsererror")) throw new Error("Berkas GPX tidak dapat dibaca.");
    var nodes = Array.prototype.slice.call(xml.querySelectorAll("trkpt"));
    if (!nodes.length) nodes = Array.prototype.slice.call(xml.querySelectorAll("rtept"));
    var pts = nodes.map(function (n) {
      var eleNode = n.querySelector("ele");
      var timeNode = n.querySelector("time");
      return {
        lat: parseFloat(n.getAttribute("lat")),
        lon: parseFloat(n.getAttribute("lon")),
        ele: eleNode ? parseFloat(eleNode.textContent) : null,
        time: timeNode ? timeNode.textContent : null
      };
    }).filter(function (p) { return isFinite(p.lat) && isFinite(p.lon); });
    if (pts.length < 2) throw new Error("GPX tidak memiliki jalur dengan minimal dua titik.");
    return pts;
  }
  function analyzePoints(points) {
    var cumulative = [0], gain = 0;
    for (var i = 1; i < points.length; i++) {
      cumulative.push(cumulative[i - 1] + haversine(points[i - 1], points[i]));
      var a = points[i - 1].ele, b = points[i].ele;
      if (a != null && b != null && isFinite(a) && isFinite(b) && b > a) gain += b - a;
    }
    return {
      points: points,
      cumulative: cumulative,
      distanceKm: (cumulative[cumulative.length - 1] || 0) / 1000,
      gainM: gain,
      totalM: cumulative[cumulative.length - 1] || 0
    };
  }
  async function loadGPX(url) {
    var r = await fetch(url);
    if (!r.ok) throw new Error("GPX gagal dimuat (HTTP " + r.status + ").");
    return analyzePoints(parseGPXText(await r.text()));
  }
  function buildPublicGPX(points) {
    var body = points.map(function (p) {
      var ele = p.ele != null && isFinite(p.ele) ? "<ele>" + Number(p.ele).toFixed(1) + "</ele>" : "";
      var time = p.time ? "<time>" + esc(p.time) + "</time>" : "";
      return '<trkpt lat="' + p.lat.toFixed(7) + '" lon="' + p.lon.toFixed(7) + '">' + ele + time + "</trkpt>";
    }).join("");
    return '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="JEJAKRUTE Web" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Replay JEJAKRUTE</name><trkseg>' + body + "</trkseg></trk></gpx>";
  }
  function blurPublicPoints(points) {
    var analysis = analyzePoints(points);
    var total = analysis.totalM;
    if (total <= 400) throw new Error("Jalur ini terlalu pendek untuk dibuat publik dengan aman: totalnya tidak lebih dari 400 meter, sedangkan 200 meter di kedua ujung wajib diburamkan.");
    var kept = points.filter(function (_, i) {
      var d = analysis.cumulative[i];
      return d >= 200 && (total - d) >= 200;
    });
    if (kept.length < 2) throw new Error("Sesudah pemburaman 200 meter di kedua ujung, jalur tidak menyisakan cukup titik untuk dibagikan.");
    return kept;
  }
  function drawSpark(canvas, analysis, fraction) {
    if (!canvas || !analysis || !analysis.points.length) return;
    fraction = fraction == null ? 1 : Math.max(0, Math.min(1, fraction));
    var rectW = canvas.clientWidth || 600, rectH = canvas.clientHeight || 92;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rectW * dpr); canvas.height = Math.round(rectH * dpr);
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, rectW, rectH);
    var eles = analysis.points.map(function (p) { return p.ele != null && isFinite(p.ele) ? p.ele : null; });
    var valid = eles.filter(function (e) { return e != null; });
    ctx.strokeStyle = "rgba(255,255,255,.16)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, rectH - 8); ctx.lineTo(rectW, rectH - 8); ctx.stroke();
    if (!valid.length) {
      ctx.fillStyle = "#9AA0A3"; ctx.font = "12px Inter, sans-serif";
      ctx.fillText("GPX ini tidak membawa data elevasi.", 10, rectH / 2);
      return;
    }
    var min = Math.min.apply(null, valid), max = Math.max.apply(null, valid);
    if (max - min < 1) max = min + 1;
    var last = null;
    eles.forEach(function (e, i) { if (e != null) last = e; eles[i] = last == null ? min : last; });
    function xy(i) {
      var x = analysis.totalM ? (analysis.cumulative[i] / analysis.totalM) * (rectW - 16) + 8 : 8 + i;
      var y = 10 + (1 - (eles[i] - min) / (max - min)) * (rectH - 24);
      return [x, y];
    }
    ctx.beginPath();
    eles.forEach(function (_, i) { var p = xy(i); if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
    ctx.strokeStyle = "rgba(168,240,208,.38)"; ctx.lineWidth = 2; ctx.stroke();
    var upto = Math.max(1, Math.ceil(eles.length * fraction));
    ctx.beginPath();
    for (var i = 0; i < upto; i++) { var p2 = xy(i); if (i === 0) ctx.moveTo(p2[0], p2[1]); else ctx.lineTo(p2[0], p2[1]); }
    ctx.strokeStyle = "#17CE8F"; ctx.lineWidth = 2.4; ctx.stroke();
    var cur = xy(upto - 1);
    ctx.beginPath(); ctx.arc(cur[0], cur[1], 4, 0, Math.PI * 2); ctx.fillStyle = "#A8F0D0"; ctx.fill();
  }

  /* ---------- Kerangka halaman ---------- */
  function renderShell() {
    var host = document.querySelector("[data-member-shell]");
    if (!host) return;
    var active = document.body.getAttribute("data-member-page") || "";
    function nav(name, href, label, icon) {
      return '<a href="' + href + '" class="' + (active === name ? "active" : "") + '">' + ICONS[icon] + "<span>" + label + "</span></a>";
    }
    host.innerHTML =
      '<header class="member-top"><div class="member-top-in">' +
      '<a class="member-brand" href="index.html" aria-label="JEJAKRUTE — Beranda"><img src="assets/logo/logo-lockup-reversed.png" alt="JEJAKRUTE"></a>' +
      '<div class="member-actions">' +
      '<button class="icon-btn" type="button" data-notif-btn aria-label="Notifikasi">' + ICONS.bell + '<span class="notif-count" data-notif-count hidden>0</span></button>' +
      '<button class="member-account" type="button" data-jr-login>Masuk</button>' +
      '<div class="notif-panel" data-notif-panel hidden><h3>Notifikasi</h3><div class="notif-list" data-notif-list><p class="loading">Memuat notifikasi…</p></div><button class="mark-read" type="button" data-notif-read>Tandai semua dibaca</button></div>' +
      "</div></div></header>" +
      '<nav class="member-nav" aria-label="Navigasi anggota"><div class="member-nav-in">' +
      nav("feed", "feed.html", "Beranda", "home") +
      nav("jelajah", "jelajah.html", "Jelajah", "compass") +
      '<a class="record" href="' + APK_URL + '">' + ICONS.record + "<span>Rekam di Aplikasi</span></a>" +
      nav("aman", "aman.html", "Aman", "shield") +
      nav("profil", "profil.html", "Profil", "user") +
      "</div></nav>";
    var panel = host.querySelector("[data-notif-panel]");
    host.querySelector("[data-notif-btn]").addEventListener("click", function () {
      var open = panel.hidden;
      panel.hidden = !open;
      if (open) loadNotifications();
    });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !e.target.closest(".member-actions")) panel.hidden = true;
    });
    host.querySelector("[data-notif-read]").addEventListener("click", markAllNotificationsRead);
  }
  function showLock(type) {
    var main = document.querySelector("[data-member-main]");
    if (main) main.hidden = true;
    var lock = document.querySelector("[data-member-lock]");
    if (!lock) return;
    lock.hidden = false;
    if (type === "profil") {
      lock.innerHTML = '<div class="lock-card"><img src="assets/logo/logo-symbol-reversed.png" alt=""><p class="kicker">satu langkah lagi</p><h1>Lengkapi Profil Dulu</h1><p>Akun Google-mu sudah masuk, tetapi pendaftaran JEJAKRUTE belum lengkap. Lengkapi nama dan username agar area anggota, postingan, dan unduh GPX memakai identitas server yang sama dengan aplikasi.</p><button class="btn" type="button" data-lock-action>Lengkapi Profil</button><p class="hand" style="font-size:21px;margin-top:16px">identitasnya satu, di aplikasi dan web.</p></div>';
    } else {
      lock.innerHTML = '<div class="lock-card"><img src="assets/logo/logo-symbol-reversed.png" alt=""><p class="kicker">area anggota</p><h1>Masuk untuk Melanjutkan</h1><p>Feed, Jelajah, Aman, dan Profil di web memakai akun serta data server yang sama dengan aplikasi JEJAKRUTE. Masuk dulu untuk melihat isinya.</p><button class="btn" type="button" data-lock-action>Masuk dengan Google</button><p class="hand" style="font-size:21px;margin-top:16px">tidak ada cuplikan di balik gerbang ini.</p></div>';
    }
    var btn = lock.querySelector("[data-lock-action]");
    if (btn) btn.addEventListener("click", function () { if (window.jr) window.jr.openLogin(""); });
  }
  function hideLock() {
    var lock = document.querySelector("[data-member-lock]");
    if (lock) { lock.hidden = true; lock.innerHTML = ""; }
    var main = document.querySelector("[data-member-main]");
    if (main) main.hidden = false;
  }

  /* ---------- Notifikasi: selalu dibaca dari server ---------- */
  function notifText(n) {
    switch (n.jenis) {
      case "suka": return "menyukai postinganmu.";
      case "komentar": return "mengomentari postinganmu.";
      case "pengikut": return "mulai mengikutimu.";
      case "moderasi": return "mengirim pembaruan moderasi untuk kontenmu.";
      case "tenggat": return "mengirim pengingat batas waktu turun.";
      default: return "mengirim notifikasi baru.";
    }
  }
  function notifHref(n, actor) {
    if (n.post_id) return "postingan.html?id=" + encodeURIComponent(n.post_id);
    if (n.community_route_id) return "rute-komunitas.html";
    if (n.jenis === "pengikut" && actor) return profileLink(actor);
    return "#";
  }
  async function refreshNotifBadge() {
    var s = session(), c = client(), badge = document.querySelector("[data-notif-count]");
    if (!s || !c || !badge) return;
    try {
      var n = await countRows("notifications", function (q) { return q.eq("user_id", s.user.id).eq("dibaca", false); });
      badge.hidden = n === 0;
      badge.textContent = n > 99 ? "99+" : String(n);
    } catch (_) { badge.hidden = true; }
  }
  async function loadNotifications() {
    var list = document.querySelector("[data-notif-list]");
    var s = session(), c = client();
    if (!list || !s || !c) return;
    list.innerHTML = '<p class="loading">Memuat notifikasi…</p>';
    try {
      var res = await c.from("notifications").select("*").eq("user_id", s.user.id).order("created_at", { ascending: false }).limit(30);
      if (res.error) throw res.error;
      var rows = res.data || [];
      if (!rows.length) { list.innerHTML = '<div class="empty">Belum ada notifikasi.</div>'; return; }
      var actors = await profilesByIds(rows.map(function (n) { return n.aktor; }));
      list.innerHTML = rows.map(function (n) {
        var a = actors.get(n.aktor);
        var href = notifHref(n, a);
        return '<a class="notif-item' + (n.dibaca ? "" : " unread") + '" href="' + esc(href) + '">' + avatarHTML(a, "small") +
          '<span><strong>' + esc(displayName(a)) + "</strong> " + esc(notifText(n)) + "<small>" + esc(relTime(n.created_at)) + "</small></span></a>";
      }).join("");
    } catch (err) {
      list.innerHTML = '<div class="empty error">Notifikasi gagal dimuat: ' + esc(err.message || err) + "</div>";
    }
  }
  async function markAllNotificationsRead() {
    var s = session(), c = client();
    if (!s || !c) return;
    var res = await c.from("notifications").update({ dibaca: true }).eq("user_id", s.user.id).eq("dibaca", false);
    if (res.error) { toast("Gagal menandai notifikasi: " + res.error.message); return; }
    await refreshNotifBadge();
    await loadNotifications();
  }

  var readyPromise = null;
  function ready() {
    if (readyPromise) return readyPromise;
    readyPromise = (async function () {
      if (!window.jrReady) { showLock("masuk"); return null; }
      await window.jrReady;
      var s = session();
      if (!s) { showLock("masuk"); return null; }
      var p = authProfile();
      if (!p || !p.username) { showLock("profil"); return null; }
      hideLock();
      refreshNotifBadge();
      return { client: client(), session: s, profile: p, user: s.user };
    })();
    return readyPromise;
  }

  renderShell();

  window.MemberKit = {
    icons: ICONS,
    esc: esc,
    client: client,
    session: session,
    authProfile: authProfile,
    baseUrl: baseUrl,
    mediaUrl: mediaUrl,
    mediaItems: mediaItems,
    fmtNum: fmtNum,
    fmtKm: fmtKm,
    fmtM: fmtM,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    relTime: relTime,
    toast: toast,
    profileLink: profileLink,
    avatarUrl: avatarUrl,
    avatarHTML: avatarHTML,
    displayName: displayName,
    usernameLabel: usernameLabel,
    profilesByIds: profilesByIds,
    countRows: countRows,
    parseGPXText: parseGPXText,
    analyzePoints: analyzePoints,
    loadGPX: loadGPX,
    buildPublicGPX: buildPublicGPX,
    blurPublicPoints: blurPublicPoints,
    drawSpark: drawSpark,
    refreshNotifBadge: refreshNotifBadge,
    ready: ready
  };
})();
