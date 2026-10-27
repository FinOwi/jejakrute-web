/* JEJAKRUTE — kerangka area anggota web (ronde 2).
   Semua data sosial dibaca/ditulis lewat Supabase yang sama dengan
   aplikasi. Berkas ini tidak menyimpan keadaan sosial apa pun di
   localStorage/sessionStorage; sesudah mutasi, halaman membaca ulang
   angka dan keadaan dari server.

   Format media server (komunitas_api.dart aplikasi):
   - Foto  : item objek {p: path, w: lebar, h: tinggi}; string path polos
             juga valid (warisan lama).
   - Replay: SATU item objek {gpx: path, judul, km, dur (detik), naik (m)};
             string path .gpx polos juga valid (warisan web ronde 1). */
(function () {
  "use strict";
  var APK_URL = "https://github.com/FinOwi/jejakrute/releases/download/v0.33.2/JEJAKRUTE-v0.33.2-universal.apk";
  function ic(paths, filled) {
    return '<svg viewBox="0 0 24 24" fill="' + (filled ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + "</svg>";
  }
  var ICONS = {
    home: ic('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>'),
    compass: ic('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
    shield: ic('<path d="M12 3 5 5.8v5.4c0 4.6 2.9 7.8 7 9.8 4.1-2 7-5.2 7-9.8V5.8z"/><path d="m9.2 12 2 2 3.8-4"/>'),
    user: ic('<circle cx="12" cy="8" r="4"/><path d="M4.5 21c1.4-3.6 4.1-5.4 7.5-5.4s6.1 1.8 7.5 5.4"/>'),
    bell: ic('<path d="M18 9.5a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/>'),
    heart: ic('<path d="M12 20.5C7 16.8 3.5 13.6 3.5 9.9 3.5 7.2 5.5 5 8.1 5c1.6 0 3 .8 3.9 2.1C12.9 5.8 14.3 5 15.9 5c2.6 0 4.6 2.2 4.6 4.9 0 3.7-3.5 6.9-8.5 10.6z"/>'),
    heartFill: ic('<path d="M12 20.5C7 16.8 3.5 13.6 3.5 9.9 3.5 7.2 5.5 5 8.1 5c1.6 0 3 .8 3.9 2.1C12.9 5.8 14.3 5 15.9 5c2.6 0 4.6 2.2 4.6 4.9 0 3.7-3.5 6.9-8.5 10.6z"/>', true),
    comment: ic('<path d="M21 12a8 8 0 0 1-8 8H4l2.3-2.9A8 8 0 1 1 21 12z"/>'),
    bookmark: ic('<path d="M6 3.5h12V21l-6-4-6 4z"/>'),
    bookmarkFill: ic('<path d="M6 3.5h12V21l-6-4-6 4z"/>', true),
    share: ic('<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="5.5" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4"/>'),
    flag: ic('<path d="M5 21V4"/><path d="M5 4c4-2.2 7 2.2 12 0v9c-5 2.2-8-2.2-12 0"/>'),
    trash: ic('<path d="M4 7h16M9 7V4h6v3M6.5 7l1 14h9l1-14"/><path d="M10 11v6M14 11v6"/>'),
    dots: ic('<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>'),
    play: ic('<path d="M7 4.8v14.4L19 12z"/>', true),
    multi: ic('<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>'),
    menu: ic('<path d="M4 7h16M4 12h16M4 17h16"/>')
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

  /* ---------- Media: pembaca format aplikasi {p,w,h} & {gpx,…} ---------- */
  function mediaArray(post) {
    var raw = post && post.media;
    if (!raw) return [];
    if (typeof raw === "string") {
      try { raw = JSON.parse(raw); } catch (_) { return [raw]; }
    }
    if (!Array.isArray(raw)) raw = [raw];
    return raw;
  }
  /* Mengembalikan daftar item ternormalisasi:
     {type:"foto"|"gpx"|"video", path, w, h, judul, km, dur, naik}. */
  function mediaItems(post) {
    var jenis = (post && post.jenis) || "";
    return mediaArray(post).map(function (x, idx) {
      if (!x) return null;
      if (typeof x === "string") {
        var isGpx = /\.gpx($|\?)/i.test(x) || jenis === "gpx";
        return { type: isGpx ? "gpx" : (jenis === "video" ? "video" : "foto"), path: x, w: 0, h: 0, idx: idx };
      }
      if (typeof x === "object") {
        if (x.gpx) {
          return {
            type: "gpx", path: String(x.gpx), w: 0, h: 0, idx: idx,
            judul: x.judul || "", km: Number(x.km || 0),
            dur: Number(x.dur || 0), naik: Number(x.naik || 0)
          };
        }
        var p = x.p || x.path || x.url || x.src || "";
        if (!p) return null;
        return { type: jenis === "video" ? "video" : "foto", path: String(p), w: Number(x.w || 0), h: Number(x.h || 0), idx: idx };
      }
      return null;
    }).filter(Boolean);
  }
  function photoItems(post) { return mediaItems(post).filter(function (i) { return i.type === "foto"; }); }
  function replayItemOf(post) {
    var items = mediaItems(post);
    for (var i = 0; i < items.length; i++) if (items[i].type === "gpx") return items[i];
    return null;
  }
  /* Rasio galeri aplikasi (rasioTampilIG): jepit w/h ke [0,8 … 1,91]. */
  function galleryRatio(item) {
    var r = item && item.w > 0 && item.h > 0 ? item.w / item.h : 1;
    if (!isFinite(r) || r <= 0) r = 1;
    return Math.max(0.8, Math.min(1.91, r));
  }

  function fmtNum(v) { return Number(v || 0).toLocaleString("id-ID"); }
  function fmtKm(v) { return Number(v || 0).toFixed(1).replace(".", ",") + " km"; }
  function fmtKm2(v) { return Number(v || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " km"; }
  function fmtM(v) { return Math.round(Number(v || 0)).toLocaleString("id-ID") + " m"; }
  /* Sama dengan fmtDur aplikasi (screens_record.dart): HH:MM:SS. */
  function fmtDurasi(sec) {
    sec = Math.max(0, Math.round(Number(sec || 0)));
    function p(x) { return String(x).padStart(2, "0"); }
    return p(Math.floor(sec / 3600)) + ":" + p(Math.floor((sec % 3600) / 60)) + ":" + p(sec % 60);
  }
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
    setTimeout(function () { el.remove(); }, 3200);
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
    if (url) return '<span class="avatar ' + (cls || "") + '"><img src="' + esc(url) + '" alt="" loading="lazy"></span>';
    return '<span class="avatar ' + (cls || "") + '">' + esc(name.charAt(0).toUpperCase() || "J") + "</span>";
  }
  function displayName(p) { return (p && p.nama) || "Pendaki JEJAKRUTE"; }
  function usernameLabel(p) { return p && p.username ? "@" + p.username : ""; }
  /* Label komentar aplikasi: @username bila ada, else nama, else "Pendaki". */
  function commentLabel(p) {
    if (p && p.username) return "@" + p.username;
    return (p && p.nama) || "Pendaki";
  }
  function verifiedMark(p) {
    return p && p.terverifikasi ? '<span class="vmark" title="Terverifikasi" aria-label="Terverifikasi">✓</span>' : "";
  }
  function nameHTML(p) { return esc(displayName(p)) + verifiedMark(p); }
  /* Label lencana toleran: string polos, atau objek berkunci label. */
  function badgeLabelOf(x) {
    if (!x) return "";
    if (typeof x === "string") return x.trim();
    if (typeof x === "object") return String(x.lokasi_nama || x.nama || x.label || x.name || x.judul || "").trim();
    return "";
  }
  /* Semua label dari lencana_terpasang (String, JSON string, atau List). */
  function badgeLabels(profile) {
    var v = profile ? profile.lencana_terpasang : null;
    if (typeof v === "string") {
      var t = v.trim();
      if (t.charAt(0) === "[") { try { v = JSON.parse(t); } catch (_) { v = [t]; } }
      else v = t ? [t] : [];
    }
    if (!Array.isArray(v)) return [];
    return v.map(badgeLabelOf).filter(Boolean);
  }
  function badgePillHTML(profile) {
    var labels = badgeLabels(profile);
    return labels.length ? '<span class="badge-pill">' + esc(labels[0]) + "</span>" : "";
  }

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

  /* ---------- Ikuti (follows: pengikut / diikuti) ---------- */
  var followSet = null;
  async function loadFollowSet(c, me) {
    var res = await c.from("follows").select("diikuti").eq("pengikut", me);
    if (res.error) throw res.error;
    followSet = new Set((res.data || []).map(function (r) { return r.diikuti; }));
    return followSet;
  }
  function isFollowing(authorId) { return !!(followSet && followSet.has(authorId)); }
  function followButtonHTML(authorId) {
    var f = isFollowing(authorId);
    return '<button type="button" class="follow-btn' + (f ? " on" : "") + '" data-follow-btn="' + esc(authorId) + '">' + (f ? "Mengikuti" : "Ikuti") + "</button>";
  }
  async function toggleFollow(c, me, authorId) {
    var was = isFollowing(authorId);
    var res = was
      ? await c.from("follows").delete().eq("pengikut", me).eq("diikuti", authorId)
      : await c.from("follows").insert({ pengikut: me, diikuti: authorId });
    if (res.error) throw res.error;
    var check = await c.from("follows").select("pengikut").eq("pengikut", me).eq("diikuti", authorId).maybeSingle();
    if (check.error) throw check.error;
    if (!followSet) followSet = new Set();
    if (check.data) followSet.add(authorId); else followSet.delete(authorId);
    return !!check.data;
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

  /* ---------- Media HTML: galeri & kartu Replay ala aplikasi ---------- */
  function galleryHTML(post) {
    var items = photoItems(post);
    if (!items.length) return "";
    var ratio = galleryRatio(items[0]);
    var slides = items.map(function (it, i) {
      return '<figure class="gal-slide"><img src="' + esc(mediaUrl(it.path)) + '" alt="Foto postingan ' + (i + 1) + " dari " + items.length + '" loading="lazy"></figure>';
    }).join("");
    var chrome = items.length > 1
      ? '<span class="gal-count" data-gal-count>1/' + items.length + '</span><div class="gal-dots" data-gal-dots>' +
        items.map(function (_, i) { return '<i class="' + (i === 0 ? "on" : "") + '"></i>'; }).join("") + "</div>"
      : "";
    return '<div class="gal" data-gal><div class="gal-track" style="aspect-ratio:' + ratio.toFixed(4) + '">' + slides + "</div>" + chrome + "</div>";
  }
  function replayStatsText(item) {
    if (!item) return "";
    var parts = [];
    if (item.km > 0) parts.push(fmtKm2(item.km));
    if (item.dur > 0) parts.push(fmtDurasi(item.dur));
    if (item.naik > 0) parts.push("+" + fmtM(item.naik));
    return parts.join(" • ");
  }
  function replayCardHTML(post) {
    var item = replayItemOf(post);
    var judul = (item && item.judul) || post.lokasi_nama || post.caption || "Jejak GPX";
    var stats = replayStatsText(item);
    return '<div class="rpcard">' +
      '<a class="rp-thumb" href="replay.html?post=' + encodeURIComponent(post.id) + '" aria-label="Putar Replay ' + esc(judul) + '">' +
      '<canvas class="rp-spark" data-rp-spark width="640" height="220" aria-hidden="true"></canvas>' +
      '<span class="rp-play">' + ICONS.play + "</span></a>" +
      '<div class="rp-title">▶ Replay — ' + esc(judul) + "</div>" +
      (stats
        ? '<div class="rp-stats">' + esc(stats) + "</div>"
        : '<div class="rp-stats" data-rp-stats data-rp-post="' + esc(post.id) + '">Menghitung statistik dari GPX…</div>') +
      "</div>";
  }
  function enhanceGalleries(root) {
    (root || document).querySelectorAll("[data-gal]").forEach(function (gal) {
      if (gal.dataset.bound) return;
      gal.dataset.bound = "1";
      var track = gal.querySelector(".gal-track");
      var count = gal.querySelector("[data-gal-count]");
      var dots = gal.querySelectorAll("[data-gal-dots] i");
      if (!track || !count) return;
      var total = track.children.length;
      track.addEventListener("scroll", function () {
        var idx = Math.min(total - 1, Math.max(0, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
        count.textContent = (idx + 1) + "/" + total;
        dots.forEach(function (d, i) { d.classList.toggle("on", i === idx); });
      }, { passive: true });
    });
  }
  /* Untuk postingan Replay warisan tanpa cuplikan statistik di item media:
     unduh GPX-nya (malas, saat kartu mendekati layar) lalu gambar
     sparkline + isi statistik — sama seperti aplikasi menghitung dari GPX. */
  function hydrateReplayCards(root, opts) {
    opts = opts || {};
    var scope = root || document;
    var postsById = opts.postsById || {};
    async function hydrate(card) {
      if (card.dataset.rpDone) return;
      card.dataset.rpDone = "1";
      var statsEl = card.querySelector("[data-rp-stats]");
      var postId = statsEl ? statsEl.getAttribute("data-rp-post") : "";
      var post = postsById[postId];
      var item = post ? replayItemOf(post) : null;
      if (!item) { if (statsEl) statsEl.textContent = "Statistik tidak tersedia."; return; }
      try {
        var a = await loadGPX(mediaUrl(item.path));
        var canvas = card.querySelector("[data-rp-spark]");
        if (canvas) drawSpark(canvas, a, 1);
        var parts = [fmtKm2(a.distanceKm)];
        var pts = a.points;
        if (pts.length > 1 && pts[0].time && pts[pts.length - 1].time) {
          var d = (new Date(pts[pts.length - 1].time).getTime() - new Date(pts[0].time).getTime()) / 1000;
          if (isFinite(d) && d > 0) parts.push(fmtDurasi(d));
        }
        if (a.gainM > 0) parts.push("+" + fmtM(a.gainM));
        if (statsEl) statsEl.textContent = parts.join(" • ");
      } catch (_) {
        if (statsEl) statsEl.textContent = "Statistik belum dapat dihitung dari GPX.";
      }
    }
    var cards = scope.querySelectorAll(".rpcard");
    if (opts.immediate || !("IntersectionObserver" in window)) {
      cards.forEach(function (card) { hydrate(card); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { hydrate(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: "320px" });
    cards.forEach(function (card) {
      if (card.querySelector("[data-rp-stats]")) io.observe(card);
      else if (card.querySelector("[data-rp-spark]")) io.observe(card);
    });
  }

  /* ---------- Kartu postingan: anatomi _PostCard aplikasi ---------- */
  function postCardHTML(post, opts) {
    opts = opts || {};
    var a = post._author || { id: post.user_id, nama: "Pendaki JEJAKRUTE" };
    var s = session();
    var me = s ? s.user.id : null;
    var own = post.user_id === me;
    var link = profileLink(a);
    var meta = [relTime(post.created_at)];
    if (post.lokasi_nama) meta.push(post.lokasi_nama);
    var media = "";
    if (post.jenis === "gpx") media = replayCardHTML(post);
    else if (post.jenis === "foto") media = galleryHTML(post);
    else if (post.jenis === "video") {
      var v = mediaItems(post)[0];
      if (v) media = '<video class="post-video" controls preload="metadata" src="' + esc(mediaUrl(v.path)) + '"></video>';
    }
    var commentControl = opts.commentsHref
      ? '<a class="pact" href="' + esc(opts.commentsHref) + '">' + ICONS.comment + '<span><b data-comment-count>' + fmtNum(post._commentCount) + "</b> komentar</span></a>"
      : '<button type="button" class="pact" data-act="comments">' + ICONS.comment + '<span><b data-comment-count>' + fmtNum(post._commentCount) + "</b> komentar</span></button>";
    return '<article class="pcard" data-post-card="' + esc(post.id) + '">' +
      '<div class="pcard-head">' +
      '<a class="pava-link" href="' + esc(link) + '">' + avatarHTML(a, "pava", s ? s.user : null) + "</a>" +
      '<div class="phead-main">' +
      '<div class="pname-row"><a class="pname" href="' + esc(link) + '">' + nameHTML(a) + "</a>" + badgePillHTML(a) + "</div>" +
      '<div class="pmeta">' + esc(meta.join(" · ")) + "</div>" +
      "</div>" +
      '<span class="phead-act">' +
      (own ? "" : followButtonHTML(post.user_id)) +
      '<span class="pop-wrap"><button type="button" class="menu-btn" data-menu-btn aria-label="Menu postingan" aria-haspopup="true">' + ICONS.dots + '</button>' +
      '<span class="pop-menu" data-pop-menu hidden>' +
      (own
        ? '<button type="button" data-menu-act="delete">Hapus Postingan</button>'
        : '<button type="button" data-menu-act="report">Laporkan</button>') +
      "</span></span></span></div>" +
      (post.status_moderasi && post.status_moderasi !== "tampil" ? '<div class="pmod"><span class="pill belum">' + esc(post.status_moderasi) + "</span></div>" : "") +
      (post.caption ? '<p class="pcaption">' + esc(post.caption) + "</p>" : "") +
      media +
      '<div class="pactions">' +
      '<button type="button" class="pact' + (post._liked ? " liked" : "") + '" data-act="like" aria-pressed="' + (post._liked ? "true" : "false") + '">' + (post._liked ? ICONS.heartFill : ICONS.heart) + "<b data-like-count>" + fmtNum(post._likeCount) + "</b></button>" +
      commentControl +
      '<button type="button" class="pact' + (post._saved ? " saved" : "") + '" data-act="save" aria-pressed="' + (post._saved ? "true" : "false") + '">' + (post._saved ? ICONS.bookmarkFill : ICONS.bookmark) + "<span>Simpan</span></button>" +
      '<span class="pactions-sp"></span>' +
      '<button type="button" class="pact" data-act="share">' + ICONS.share + "<span>Bagikan</span></button>" +
      "</div>" +
      (opts.commentsHref ? "" :
        '<section class="pcomments" data-comments hidden>' +
        '<div class="pcomment-list" data-comment-list></div>' +
        '<form class="pcomment-form" data-comment-form><input name="isi" maxlength="1000" placeholder="Tulis komentar…" autocomplete="off" aria-label="Tulis komentar"><button type="submit">Kirim</button></form>' +
        "</section>") +
      "</article>";
  }
  function skeletonCards(n) {
    var one = '<div class="pcard skel" aria-hidden="true"><div class="skel-row"><span class="skel-ava"></span><span class="skel-lines"><i></i><i class="w40"></i></span></div><div class="skel-media"></div><div class="skel-lines pad"><i class="w70"></i><i class="w40"></i></div></div>';
    var out = "";
    for (var i = 0; i < (n || 2); i++) out += one;
    return out;
  }

  /* ---------- Aksi kartu: delegasi terpusat (feed & detail) ---------- */
  function bindPostActions(root, hooks) {
    hooks = hooks || {};
    var c = client();
    var s = session();
    if (!root || !c || !s) return;
    var me = s.user.id;

    async function loadComments(card, postId) {
      var list = card.querySelector("[data-comment-list]");
      if (!list) return;
      list.innerHTML = '<p class="pcomment-load">Memuat komentar…</p>';
      try {
        var res = await c.from("comments").select("id,post_id,user_id,parent_id,isi,created_at").eq("post_id", postId).order("created_at", { ascending: true }).limit(300);
        if (res.error) throw res.error;
        var rows = res.data || [];
        if (!rows.length) { list.innerHTML = '<p class="pcomment-load">Belum ada komentar. Mulai percakapan jalur ini.</p>'; return; }
        var authors = await profilesByIds(rows.map(function (r) { return r.user_id; }));
        list.innerHTML = rows.map(function (cm) {
          var a = authors.get(cm.user_id) || { id: cm.user_id, nama: "Pendaki" };
          return '<div class="pcomment"><p><a class="pcomment-label" href="' + esc(profileLink(a)) + '">' + esc(commentLabel(a)) + "</a>: " + esc(cm.isi) + "</p>" +
            (cm.user_id === me ? '<button type="button" class="pcomment-del" data-del-comment="' + esc(cm.id) + '">Hapus</button>' : "") + "</div>";
        }).join("");
      } catch (err) {
        list.innerHTML = '<p class="pcomment-load error">Komentar gagal dimuat: ' + esc(err.message || err) + "</p>";
      }
    }
    async function syncCommentCount(card, postId) {
      try {
        var n = await countRows("comments", function (q) { return q.eq("post_id", postId); });
        var el = card.querySelector("[data-comment-count]");
        if (el) el.textContent = fmtNum(n);
      } catch (_) { /* angka lama dibiarkan; render berikutnya menyelaraskan */ }
    }
    async function refreshCard(card, postId, keepComments) {
      if (!hooks.refreshCard) return;
      var wasOpen = keepComments && card.querySelector("[data-comments]") && !card.querySelector("[data-comments]").hidden;
      await hooks.refreshCard(postId);
      if (wasOpen) {
        var neu = root.querySelector('[data-post-card="' + CSS.escape(postId) + '"]');
        if (neu) {
          var sec = neu.querySelector("[data-comments]");
          if (sec) { sec.hidden = false; loadComments(neu, postId); }
        }
      }
    }
    function closeMenus(except) {
      root.querySelectorAll("[data-pop-menu]").forEach(function (m) {
        if (m !== except) m.hidden = true;
      });
    }

    root.addEventListener("click", async function (e) {
      var card = e.target.closest("[data-post-card]");
      var followBtn = e.target.closest("[data-follow-btn]");
      if (followBtn) {
        e.preventDefault();
        var authorId = followBtn.getAttribute("data-follow-btn");
        var wasOn = followBtn.classList.contains("on");
        followBtn.disabled = true;
        followBtn.classList.toggle("on", !wasOn);
        followBtn.textContent = !wasOn ? "Mengikuti" : "Ikuti";
        try {
          var now = await toggleFollow(c, me, authorId);
          root.querySelectorAll('[data-follow-btn="' + CSS.escape(authorId) + '"]').forEach(function (b) {
            b.classList.toggle("on", now);
            b.textContent = now ? "Mengikuti" : "Ikuti";
            b.disabled = false;
          });
        } catch (err) {
          followBtn.classList.toggle("on", wasOn);
          followBtn.textContent = wasOn ? "Mengikuti" : "Ikuti";
          followBtn.disabled = false;
          toast("Ikuti gagal diubah di server: " + (err.message || err));
        }
        return;
      }
      var menuBtn = e.target.closest("[data-menu-btn]");
      if (menuBtn && card) {
        var menu = card.querySelector("[data-pop-menu]");
        var willOpen = menu && menu.hidden;
        closeMenus(menu);
        if (menu) menu.hidden = !willOpen;
        return;
      }
      var menuAct = e.target.closest("[data-menu-act]");
      if (menuAct && card) {
        var postId0 = card.getAttribute("data-post-card");
        closeMenus(null);
        if (menuAct.getAttribute("data-menu-act") === "delete") {
          if (!window.confirm("Hapus postingan ini dari server? Tindakan ini juga berlaku di aplikasi.")) return;
          menuAct.disabled = true;
          try {
            var rd = await c.from("posts").delete().eq("id", postId0).eq("user_id", me);
            if (rd.error) throw rd.error;
            if (hooks.onDeleted) hooks.onDeleted(postId0); else card.remove();
            toast("Postingan dihapus dari server.");
          } catch (err) {
            toast("Postingan gagal dihapus: " + (err.message || err));
            menuAct.disabled = false;
          }
        } else {
          var alasan = window.prompt("Tulis alasan laporan untuk moderator:");
          if (alasan && alasan.trim()) {
            try {
              var rr = await c.from("reports").insert({ pelapor: me, post_id: postId0, alasan: alasan.trim() });
              if (rr.error) throw rr.error;
              toast("Laporan terkirim ke server.");
            } catch (err) { toast("Laporan gagal dikirim: " + (err.message || err)); }
          }
        }
        return;
      }
      var delComment = e.target.closest("[data-del-comment]");
      if (delComment && card) {
        if (!window.confirm("Hapus komentar ini dari server?")) return;
        delComment.disabled = true;
        try {
          var rc = await c.from("comments").delete().eq("id", delComment.getAttribute("data-del-comment")).eq("user_id", me);
          if (rc.error) throw rc.error;
          await loadComments(card, card.getAttribute("data-post-card"));
          await syncCommentCount(card, card.getAttribute("data-post-card"));
        } catch (err) {
          toast("Komentar gagal dihapus: " + (err.message || err));
          delComment.disabled = false;
        }
        return;
      }
      var btn = e.target.closest("[data-act]");
      if (!btn || !card) { closeMenus(null); return; }
      var postId = card.getAttribute("data-post-card");
      var act = btn.getAttribute("data-act");
      if (act === "share") {
        var url = new URL("postingan.html?id=" + encodeURIComponent(postId), location.href).href;
        try { await navigator.clipboard.writeText(url); toast("Tautan postingan disalin."); }
        catch (_) { window.prompt("Salin tautan postingan:", url); }
        return;
      }
      if (act === "comments") {
        var sec = card.querySelector("[data-comments]");
        if (!sec) return;
        var opening = sec.hidden;
        sec.hidden = !opening;
        if (opening && !sec.dataset.loaded) {
          sec.dataset.loaded = "1";
          await loadComments(card, postId);
        }
        return;
      }
      if (act === "like" || act === "save") {
        var table = act === "like" ? "post_likes" : "post_saves";
        var active = btn.classList.contains(act === "like" ? "liked" : "saved");
        btn.disabled = true;
        try {
          var r = active
            ? await c.from(table).delete().eq("post_id", postId).eq("user_id", me)
            : await c.from(table).insert({ post_id: postId, user_id: me });
          if (r.error) throw r.error;
          await refreshCard(card, postId, true);
        } catch (err) {
          toast("Perubahan gagal disimpan ke server: " + (err.message || err));
          btn.disabled = false;
        }
        return;
      }
      closeMenus(null);
    });
    root.addEventListener("submit", async function (e) {
      var form = e.target.closest("[data-comment-form]");
      if (!form) return;
      e.preventDefault();
      var card = form.closest("[data-post-card]");
      if (!card) return;
      var postId = card.getAttribute("data-post-card");
      var input = form.querySelector('input[name="isi"]');
      var isi = (input.value || "").trim();
      if (!isi) return;
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        var res = await c.from("comments").insert({ post_id: postId, user_id: me, isi: isi });
        if (res.error) throw res.error;
        input.value = "";
        var sec = card.querySelector("[data-comments]");
        if (sec) sec.dataset.loaded = "1";
        await loadComments(card, postId);
        await syncCommentCount(card, postId);
      } catch (err) {
        toast("Komentar gagal dikirim ke server: " + (err.message || err));
      } finally { btn.disabled = false; }
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".pop-wrap")) closeMenus(null);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenus(null);
    });
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
      '<span class="member-left">' +
      '<button class="icon-btn" type="button" data-drawer-btn aria-label="Buka menu navigasi">' + ICONS.menu + "</button>" +
      '<a class="member-brand" href="index.html" aria-label="JEJAKRUTE — Beranda"><img src="assets/logo/logo-lockup-reversed.png" alt="JEJAKRUTE"></a>' +
      "</span>" +
      '<div class="member-actions">' +
      '<button class="icon-btn" type="button" data-notif-btn aria-label="Notifikasi">' + ICONS.bell + '<span class="notif-count" data-notif-count hidden>0</span></button>' +
      '<button class="member-account" type="button" data-jr-login>Masuk</button>' +
      '<div class="notif-panel" data-notif-panel hidden><h3>Notifikasi</h3><div class="notif-list" data-notif-list><p class="loading">Memuat notifikasi…</p></div><button class="mark-read" type="button" data-notif-read>Tandai semua dibaca</button></div>' +
      "</div></div></header>" +
      '<nav class="member-nav" aria-label="Navigasi anggota"><div class="member-nav-in">' +
      nav("feed", "feed.html", "Beranda", "home") +
      nav("jelajah", "jelajah.html", "Jelajah", "compass") +
      nav("aman", "aman.html", "Aman", "shield") +
      nav("profil", "profil.html", "Profil", "user") +
      "</div></nav>";
    var drawerBtn = host.querySelector("[data-drawer-btn]");
    if (drawerBtn) drawerBtn.addEventListener("click", function () {
      if (window.jrOpenDrawer) window.jrOpenDrawer();
    });
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
      try { await loadFollowSet(client(), s.user.id); } catch (_) { followSet = new Set(); }
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
    photoItems: photoItems,
    replayItemOf: replayItemOf,
    galleryHTML: galleryHTML,
    replayCardHTML: replayCardHTML,
    enhanceGalleries: enhanceGalleries,
    hydrateReplayCards: hydrateReplayCards,
    postCardHTML: postCardHTML,
    bindPostActions: bindPostActions,
    skeletonCards: skeletonCards,
    fmtNum: fmtNum,
    fmtKm: fmtKm,
    fmtKm2: fmtKm2,
    fmtM: fmtM,
    fmtDurasi: fmtDurasi,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    relTime: relTime,
    toast: toast,
    profileLink: profileLink,
    avatarUrl: avatarUrl,
    avatarHTML: avatarHTML,
    displayName: displayName,
    usernameLabel: usernameLabel,
    commentLabel: commentLabel,
    nameHTML: nameHTML,
    badgeLabels: badgeLabels,
    badgeLabelOf: badgeLabelOf,
    badgePillHTML: badgePillHTML,
    profilesByIds: profilesByIds,
    countRows: countRows,
    loadFollowSet: loadFollowSet,
    isFollowing: isFollowing,
    followButtonHTML: followButtonHTML,
    toggleFollow: toggleFollow,
    parseGPXText: parseGPXText,
    analyzePoints: analyzePoints,
    loadGPX: loadGPX,
    buildPublicGPX: buildPublicGPX,
    blurPublicPoints: blurPublicPoints,
    drawSpark: drawSpark,
    refreshNotifBadge: refreshNotifBadge,
    ready: ready,
    APK_URL: APK_URL
  };
})();

