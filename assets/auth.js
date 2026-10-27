/* JEJAKRUTE web — autentikasi langsung di website.
   Supabase Auth proyek JKR (sama dengan aplikasi): login TUNGGAL Google.
   Pengguna baru: baris profiles dibuat otomatis oleh trigger server;
   "daftar" di web = melengkapi nama + username (unik) lewat modal ini,
   sama seperti gerbang form daftar di aplikasi.
   Kunci anon publik-by-design (RLS menjaga data) — service_role TIDAK
   PERNAH dipakai di web. */
(function () {
  "use strict";
  var SB_URL = "https://qykzrcygsyeznzmsdohp.supabase.co";
  var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a3pyY3lnc3llem56bXNkb2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NDM3MjAsImV4cCI6MjEwODQxOTcyMH0.T4y-jdD9OJK8LSNE26mydKXWDzCKoIeCy_BBvm57LlA";
  var client = null, session = null, profile = null, lastCtx = "", lastFocus = null;
  var pendingGo = "";
  var readyResolve = null;
  var jrReady = new Promise(function (resolve) { readyResolve = resolve; });
  function selesaikanReady() {
    if (!readyResolve) return;
    var done = readyResolve;
    readyResolve = null;
    done({ session: session, profile: profile });
  }

  function assetBase() {
    /* auth.js selalu di assets/ dan semua halaman ada di root repo. */
    return "assets/logo/logo-symbol-reversed.png";
  }
  function currentPageUrl() {
    return location.href.split("#")[0];
  }
  function ensureClient() {
    if (client) return true;
    if (!window.supabase || !window.supabase.createClient) return false;
    client = window.supabase.createClient(SB_URL, SB_KEY);
    return true;
  }

  /* ---------- Modal (disuntikkan ke semua halaman) ---------- */
  var CSS = [
    ".jr-ov{position:fixed;inset:0;z-index:300;background:rgba(9,11,12,.72);display:flex;align-items:center;justify-content:center;padding:18px}",
    ".jr-ov[hidden]{display:none}",
    ".jr-card{position:relative;background:#24272B;border:1px solid #33373C;border-radius:20px;box-shadow:0 24px 48px -24px rgba(0,0,0,.75);max-width:410px;width:100%;padding:30px 28px 24px;color:#F4F5F3;font-family:'Inter',system-ui,sans-serif;text-align:left}",
    ".jr-x{position:absolute;top:12px;right:12px;width:38px;height:38px;border-radius:50%;border:1px solid #33373C;background:#2B2E33;color:#F4F5F3;cursor:pointer;font-size:16px;line-height:1}",
    ".jr-x:hover{border-color:#17CE8F;color:#17CE8F}",
    ".jr-sym{width:52px;height:52px;object-fit:contain;margin-bottom:12px}",
    ".jr-kick{color:#17CE8F;font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}",
    ".jr-card h3{font-family:'Oswald',sans-serif;font-size:24px;font-weight:600;margin:8px 0 8px;letter-spacing:.02em;color:#F4F5F3}",
    ".jr-sub{color:#9AA0A3;font-size:14.3px;line-height:1.6}",
    ".jr-sub strong{color:#F4F5F3}",
    ".jr-gbtn{display:flex;align-items:center;justify-content:center;gap:11px;width:100%;margin-top:18px;background:#fff;color:#1F2328;border:1px solid #33373C;border-radius:999px;padding:13px 20px;font-family:'Oswald',sans-serif;font-weight:600;font-size:15px;letter-spacing:.03em;cursor:pointer}",
    ".jr-gbtn svg{width:19px;height:19px;flex:none}",
    ".jr-note{color:#9AA0A3;font-size:13.3px;line-height:1.65;margin-top:17px;border-top:1px dashed #33373C;padding-top:14px}",
    ".jr-note strong{color:#17CE8F}",
    ".jr-err{color:#FF5A52;font-size:13.5px;line-height:1.5;margin-top:10px;min-height:18px}",
    ".jr-who{display:flex;gap:13px;align-items:center;margin-top:6px}",
    ".jr-ava{width:50px;height:50px;border-radius:50%;background:#17CE8F;color:#052A1D;display:flex;align-items:center;justify-content:center;font-family:'Oswald',sans-serif;font-weight:700;font-size:21px;flex:none;overflow:hidden}",
    ".jr-ava img{width:100%;height:100%;object-fit:cover}",
    ".jr-nm{font-weight:700;font-size:16.5px;color:#F4F5F3}",
    ".jr-un{color:#9AA0A3;font-size:13.5px}",
    ".jr-row{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}",
    ".jr-btn{flex:1;min-width:130px;text-align:center;border-radius:999px;padding:12px 18px;font-family:'Oswald',sans-serif;font-weight:600;font-size:14.5px;letter-spacing:.03em;cursor:pointer;border:1px solid #17CE8F;background:#17CE8F;color:#052A1D}",
    ".jr-btn.ghost{background:transparent;color:#17CE8F}",
    ".jr-btn.plain{background:#2B2E33;border-color:#33373C;color:#F4F5F3}",
    ".jr-f label{display:block;font-size:12.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9AA0A3;margin:14px 0 6px}",
    ".jr-f input{width:100%;background:#17191C;border:1px solid #33373C;border-radius:11px;padding:12px 14px;color:#F4F5F3;font-size:15px;font-family:inherit}",
    ".jr-f input:focus{outline:2px solid #17CE8F;outline-offset:1px}",
    ".jr-hint{font-size:12.8px;color:#9AA0A3;margin-top:5px;line-height:1.5}",
    /* Laci navigasi (garis 3) — disuntikkan ke semua halaman */
    ".jr-burger{width:42px;height:42px;border-radius:50%;border:1px solid #33373C;background:#24272B;color:#F4F5F3;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none;padding:0}",
    ".jr-burger:hover{border-color:#17CE8F;color:#17CE8F}",
    ".jr-burger svg{width:20px;height:20px}",
    ".topbar-in.jr-has-burger{grid-template-columns:auto 1fr auto 1fr}",
    "@media (max-width:640px){.topbar-in.jr-has-burger{grid-template-columns:auto 1fr auto}}",
    ".jr-scrim{position:fixed;inset:0;z-index:290;background:rgba(9,11,12,.66);opacity:0;pointer-events:none;transition:opacity .25s ease}",
    ".jr-scrim.open{opacity:1;pointer-events:auto}",
    ".jr-drawer{position:fixed;top:0;left:0;bottom:0;z-index:295;width:min(320px,86vw);background:#1E2124;border-right:1px solid #33373C;color:#F4F5F3;font-family:'Inter',system-ui,sans-serif;transform:translateX(-105%);transition:transform .25s ease;display:flex;flex-direction:column;padding:18px 18px 22px;overflow-y:auto;visibility:hidden}",
    ".jr-drawer.open{transform:none;visibility:visible}",
    ".jr-drawer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}",
    ".jr-drawer-lockup{height:40px;width:auto}",
    ".jr-drawer-x{position:static;flex:none}",
    ".jr-menu{display:flex;flex-direction:column;margin-top:20px;border-top:1px solid #33373C}",
    ".jr-menu a{color:#F4F5F3;text-decoration:none;font-family:'Oswald',sans-serif;font-weight:500;font-size:15.5px;letter-spacing:.06em;text-transform:uppercase;padding:12px 6px;border-bottom:1px solid #33373C;display:flex;align-items:center;justify-content:space-between;gap:10px}",
    ".jr-menu a:hover{color:#17CE8F}",
    ".jr-menu a .jr-lock{font-family:'Inter',sans-serif;font-size:10.5px;font-weight:700;letter-spacing:.05em;color:#9AA0A3;border:1px solid #33373C;border-radius:999px;padding:2px 8px;text-transform:none}",
    ".jr-drawer-acc{margin-top:auto;padding-top:20px}",
    ".jr-drawer-note{color:#9AA0A3;font-size:13.5px;line-height:1.6;margin-bottom:12px}",
    ".jr-drawer .jr-who{margin-top:0;margin-bottom:14px}",
    ".jr-drawer .jr-row{margin-top:0}"
  ].join("\n");

  var styleInjected = false;
  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    var st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  var modal = null;
  function buildModal() {
    if (modal) return modal;
    injectStyle();
    var ov = document.createElement("div");
    ov.className = "jr-ov";
    ov.setAttribute("hidden", "");
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.innerHTML =
      '<div class="jr-card">' +
      '<button class="jr-x" type="button" aria-label="Tutup dialog">&times;</button>' +
      '<img class="jr-sym" src="' + assetBase() + '" alt="">' +
      '<p class="jr-kick">Akun JEJAKRUTE</p>' +
      /* keadaan: belum masuk */
      '<div class="jr-pane" data-pane="out">' +
      "<h3>Masuk ke JEJAKRUTE</h3>" +
      '<p class="jr-sub" data-jr-ctx>Masuk memakai <strong>akun Google yang sama</strong> dengan yang kamu pakai di aplikasi JEJAKRUTE — tidak perlu daftar ulang.</p>' +
      '<button class="jr-gbtn" type="button" data-jr-google>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.58v2.97h3.87c2.26-2.09 3.57-5.16 3.57-8.74z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-2.97c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.07A11.99 11.99 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.27 14.31A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.58.38-2.31V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.07z"/><path fill="#EA4335" d="M12 4.73c1.76 0 3.35.61 4.6 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l3.98 3.07C6.22 6.84 8.87 4.73 12 4.73z"/></svg>' +
      "Lanjutkan dengan Google</button>" +
      '<div data-jr-gis hidden style="display:flex;justify-content:center;margin-top:4px"></div>' +
      '<p class="jr-err" data-jr-err></p>' +
      '<p class="jr-note"><strong>Baru di JEJAKRUTE?</strong> Login pertama otomatis mendaftarkanmu — setelah itu kamu tinggal melengkapi nama &amp; username. Satu akun untuk aplikasi &amp; website, <strong>gratis</strong>.</p>' +
      "</div>" +
      /* keadaan: sudah masuk */
      '<div class="jr-pane" data-pane="in" hidden>' +
      "<h3>Akun Saya</h3>" +
      '<div class="jr-who"><span class="jr-ava" data-jr-ava>?</span><span><span class="jr-nm" data-jr-nm></span><br><span class="jr-un" data-jr-un></span></span></div>' +
      '<p class="jr-sub" data-jr-innote style="margin-top:14px"></p>' +
      '<div class="jr-row">' +
      '<button class="jr-btn" type="button" data-jr-lengkapi hidden>Lengkapi Profil</button>' +
      '<button class="jr-btn plain" type="button" data-jr-keluar>Keluar</button>' +
      "</div>" +
      '<p class="jr-err" data-jr-err2></p>' +
      "</div>" +
      /* keadaan: form lengkapi profil (daftar) */
      '<div class="jr-pane" data-pane="form" hidden>' +
      "<h3>Lengkapi Profil</h3>" +
      '<p class="jr-sub">Satu langkah terakhir pendaftaran — nama &amp; username ini yang tampil di profil dan kontribusimu, sama seperti di aplikasi.</p>' +
      '<form class="jr-f" data-jr-form>' +
      '<label for="jrNama">Nama tampil</label>' +
      '<input id="jrNama" name="nama" type="text" maxlength="60" autocomplete="name" required>' +
      '<label for="jrUser">Username</label>' +
      '<input id="jrUser" name="username" type="text" maxlength="24" autocomplete="username" required>' +
      '<p class="jr-hint">Huruf kecil, angka, titik, atau garis bawah — 3–24 karakter, unik untukmu.</p>' +
      '<p class="jr-err" data-jr-ferr></p>' +
      '<div class="jr-row"><button class="jr-btn" type="submit">Simpan &amp; Selesai</button></div>' +
      "</form>" +
      "</div>" +
      "</div>";
    document.body.appendChild(ov);
    modal = ov;
    ov.querySelector(".jr-x").addEventListener("click", closeModal);
    ov.addEventListener("click", function (e) { if (e.target === ov) closeModal(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !ov.hasAttribute("hidden")) closeModal();
    });
    ov.querySelector("[data-jr-google]").addEventListener("click", loginGoogleOAuth);
    siapkanGIS(ov);
    ov.querySelector("[data-jr-keluar]").addEventListener("click", logout);
    ov.querySelector("[data-jr-lengkapi]").addEventListener("click", function () { showPane("form"); });
    ov.querySelector("[data-jr-form]").addEventListener("submit", simpanProfil);
    return ov;
  }
  function showPane(name) {
    if (!modal) return;
    modal.querySelectorAll(".jr-pane").forEach(function (p) {
      p.hidden = p.getAttribute("data-pane") !== name;
    });
  }
  function setErr(sel, msg) {
    var el = modal && modal.querySelector(sel);
    if (el) el.textContent = msg || "";
  }
  function openModal(ctx) {
    buildModal();
    lastCtx = ctx || "";
    lastFocus = document.activeElement;
    renderState();
    modal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    var x = modal.querySelector(".jr-x");
    if (x) x.focus();
  }
  function closeModal() {
    if (!modal) return;
    modal.setAttribute("hidden", "");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function renderState() {
    if (!modal) return;
    if (!session) {
      showPane("out");
      var ctxEl = modal.querySelector("[data-jr-ctx]");
      if (ctxEl) {
        ctxEl.innerHTML = lastCtx
          ? lastCtx + ' Masuk memakai <strong>akun Google yang sama</strong> dengan aplikasi JEJAKRUTE.'
          : 'Masuk memakai <strong>akun Google yang sama</strong> dengan yang kamu pakai di aplikasi JEJAKRUTE — tidak perlu daftar ulang.';
      }
      setErr("[data-jr-err]", "");
      return;
    }
    var u = session.user;
    var meta = u.user_metadata || {};
    var nama = (profile && profile.nama) || meta.full_name || meta.name || "";
    var uname = profile && profile.username ? "@" + profile.username : (u.email || "");
    var ava = modal.querySelector("[data-jr-ava]");
    if (meta.avatar_url) ava.innerHTML = '<img src="' + meta.avatar_url + '" alt="">';
    else ava.textContent = (nama || "J").charAt(0).toUpperCase();
    modal.querySelector("[data-jr-nm]").textContent = nama || "Pendaki JEJAKRUTE";
    modal.querySelector("[data-jr-un]").textContent = uname;
    var lengkap = !!(profile && profile.username);
    modal.querySelector("[data-jr-lengkapi]").hidden = lengkap;
    modal.querySelector("[data-jr-innote]").innerHTML = lengkap
      ? "Kamu sudah masuk. Unduh GPX rute komunitas kini terbuka untukmu, dan akun ini sama dengan yang di aplikasi."
      : "<strong>Profilmu belum lengkap.</strong> Lengkapi nama &amp; username dulu — itu pendaftaranmu di JEJAKRUTE, dan syarat untuk mengunduh GPX.";
    showPane("in");
  }

  /* ---------- Laci navigasi (garis 3) ---------- */
  var drawer = null, scrim = null;
  var BURGER_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var MENU_ITEMS = [
    { label: "Beranda", href: "index.html" },
    { label: "Feed Komunitas", href: "feed.html", gated: true },
    { label: "Jelajah", href: "jelajah.html", gated: true },
    { label: "Katalog", href: "katalog.html" },
    { label: "Rute Komunitas", href: "rute-komunitas.html" },
    { label: "Live Share", href: "live.html" },
    { label: "Donasi", href: "donasi.html" },
    { label: "Aman", href: "aman.html", gated: true },
    { label: "Profil", href: "profil.html", gated: true }
  ];
  function buildChrome() {
    if (drawer) return;
    injectStyle();
    scrim = document.createElement("div");
    scrim.className = "jr-scrim";
    scrim.setAttribute("data-jr-scrim", "");
    document.body.appendChild(scrim);
    drawer = document.createElement("aside");
    drawer.className = "jr-drawer";
    drawer.setAttribute("aria-label", "Menu navigasi");
    drawer.innerHTML =
      '<div class="jr-drawer-head">' +
      '<img class="jr-drawer-lockup" src="assets/logo/logo-lockup-reversed.png" alt="JEJAKRUTE">' +
      '<button class="jr-x jr-drawer-x" type="button" data-jr-drawer-close aria-label="Tutup menu">&times;</button>' +
      "</div>" +
      '<nav class="jr-menu">' + MENU_ITEMS.map(function (it) {
        return '<a href="' + it.href + '"' + (it.gated ? ' data-drawer-go="' + it.href + '"' : "") + ">" + it.label +
          (it.gated ? '<span class="jr-lock" data-jr-lock>Anggota</span>' : "") + "</a>";
      }).join("") + "</nav>" +
      '<div class="jr-drawer-acc" data-jr-drawer-acc></div>';
    document.body.appendChild(drawer);
    scrim.addEventListener("click", closeDrawer);
    drawer.querySelector("[data-jr-drawer-close]").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDrawer();
    });
    drawer.querySelectorAll("[data-drawer-go]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var target = a.getAttribute("data-drawer-go");
        if (session) return; /* sudah masuk: tautan berjalan biasa */
        e.preventDefault();
        pendingGo = target;
        try { sessionStorage.setItem("jr_go_after_login", target); } catch (_) {}
        closeDrawer();
        openModal("Bagian ini khusus anggota. Masuk dulu — setelah itu kamu langsung diarahkan ke sana.");
      });
    });
    segarkanLaci();
    /* Tombol garis 3 di header halaman publik. Halaman anggota punya
       tombolnya sendiri dari member.js (data-member-shell). */
    if (!document.querySelector("[data-member-shell]")) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "jr-burger";
      btn.setAttribute("aria-label", "Buka menu navigasi");
      btn.innerHTML = BURGER_SVG;
      btn.addEventListener("click", openDrawer);
      var host = document.querySelector(".topbar-in") || document.querySelector("header.site .nav");
      if (host) {
        host.insertBefore(btn, host.firstChild);
        host.classList.add("jr-has-burger");
      }
    }
  }
  function openDrawer() {
    buildChrome();
    segarkanLaci();
    drawer.classList.add("open");
    scrim.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("open");
    if (scrim) scrim.classList.remove("open");
    if (!modal || modal.hasAttribute("hidden")) document.body.style.overflow = "";
  }
  function segarkanLaci() {
    if (!drawer) return;
    var acc = drawer.querySelector("[data-jr-drawer-acc]");
    drawer.querySelectorAll("[data-jr-lock]").forEach(function (el) { el.hidden = !!session; });
    if (!session) {
      acc.innerHTML = '<p class="jr-drawer-note">Masuk untuk membuka Feed Komunitas, Jelajah, Aman &amp; Profil — satu akun untuk aplikasi &amp; website.</p>' +
        '<button class="jr-btn" type="button" data-jr-drawer-login style="width:100%">Masuk / Daftar</button>';
      acc.querySelector("[data-jr-drawer-login]").addEventListener("click", function () {
        closeDrawer();
        openModal("");
      });
      return;
    }
    var u = session.user, meta = u.user_metadata || {};
    var nama = (profile && profile.nama) || meta.full_name || meta.name || "Pendaki JEJAKRUTE";
    var uname = profile && profile.username ? "@" + profile.username : (u.email || "");
    var lengkap = !!(profile && profile.username);
    var ava = meta.avatar_url
      ? '<img src="' + meta.avatar_url + '" alt="">'
      : (nama || "J").charAt(0).toUpperCase();
    acc.innerHTML =
      '<div class="jr-who"><span class="jr-ava">' + ava + '</span><span><span class="jr-nm"></span><br><span class="jr-un"></span></span></div>' +
      (lengkap ? "" : '<p class="jr-drawer-note"><strong style="color:#F4F5F3">Profilmu belum lengkap.</strong> Lengkapi nama &amp; username untuk membuka semua fitur anggota.</p>') +
      '<div class="jr-row">' +
      (lengkap
        ? '<a class="jr-btn plain" href="profil.html" style="text-decoration:none">Profil Saya</a>'
        : '<button class="jr-btn" type="button" data-jr-drawer-lengkapi>Lengkapi Profil</button>') +
      '<button class="jr-btn plain" type="button" data-jr-drawer-keluar>Keluar</button>' +
      "</div>";
    acc.querySelector(".jr-nm").textContent = nama;
    acc.querySelector(".jr-un").textContent = uname;
    var lgk = acc.querySelector("[data-jr-drawer-lengkapi]");
    if (lgk) lgk.addEventListener("click", function () { closeDrawer(); openModal(""); showPane("form"); });
    acc.querySelector("[data-jr-drawer-keluar]").addEventListener("click", function () { closeDrawer(); logout(); });
  }

  /* ---------- Login Google via GIS (tanpa redirect supabase.co) ----------
     Tombol resmi Google Identity Services dirender di domain kita sendiri;
     token id dari Google ditukar langsung ke sesi Supabase
     (signInWithIdToken — pola yang sama seperti aplikasi Android).
     Bila GIS tak tersedia (script terblokir / origin belum diizinkan),
     tombol kustom lama tetap ada sebagai cadangan jalur OAuth. */
  var JR_GOOGLE_WEB_ID = "497702504202-nn8j21iu5bl5hht6s5vkclqhtadic4qe.apps.googleusercontent.com";
  function muatGIS() {
    return new Promise(function (resolve) {
      if (window.google && google.accounts && google.accounts.id) return resolve(true);
      var s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true; s.defer = true;
      s.onload = function () { resolve(!!(window.google && google.accounts && google.accounts.id)); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
  }
  function terimaKredensialGoogle(resp) {
    if (!resp || !resp.credential || !ensureClient()) return;
    if (pendingGo) {
      try { sessionStorage.setItem("jr_go_after_login", pendingGo); } catch (_) {}
    }
    client.auth.signInWithIdToken({ provider: "google", token: resp.credential })
      .then(function (res) {
        if (res.error) {
          setErr("[data-jr-err]", "Gagal masuk: " + res.error.message);
          return;
        }
        location.reload();
      });
  }
  function siapkanGIS(ov) {
    muatGIS().then(function (ok) {
      if (!ok) return;
      try {
        google.accounts.id.initialize({
          client_id: JR_GOOGLE_WEB_ID,
          ux_mode: "popup",
          callback: terimaKredensialGoogle
        });
        var wadah = ov.querySelector("[data-jr-gis]");
        if (!wadah) return;
        google.accounts.id.renderButton(wadah, {
          theme: "outline", size: "large", type: "standard",
          text: "continue_with", shape: "pill", width: 300, logo_alignment: "left"
        });
        wadah.hidden = false;
        var kustom = ov.querySelector("[data-jr-google]");
        if (kustom) kustom.hidden = true;
      } catch (_) { /* GIS gagal: tombol kustom (OAuth) tetap dipakai */ }
    });
  }

  /* ---------- Aksi auth ---------- */
  function loginGoogleOAuth() {
    if (!ensureClient()) {
      setErr("[data-jr-err]", "Layanan masuk belum termuat — periksa koneksimu lalu coba lagi.");
      return;
    }
    if (pendingGo) {
      try { sessionStorage.setItem("jr_go_after_login", pendingGo); } catch (_) {}
    }
    client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: currentPageUrl() }
    }).then(function (res) {
      if (res.error) setErr("[data-jr-err]", "Gagal memulai masuk: " + res.error.message);
    });
  }
  function logout() {
    if (!ensureClient()) return;
    client.auth.signOut().then(function () { location.reload(); });
  }
  function muatProfil() {
    if (!session) { profile = null; return Promise.resolve(); }
    return client.from("profiles").select("nama,username").eq("id", session.user.id).single()
      .then(function (res) { profile = res.data || null; })
      .catch(function () { profile = null; });
  }
  function simpanProfil(e) {
    e.preventDefault();
    var nama = modal.querySelector("#jrNama").value.trim();
    var uname = modal.querySelector("#jrUser").value.trim().toLowerCase();
    if (nama.length < 2) { setErr("[data-jr-ferr]", "Nama tampil minimal 2 karakter."); return; }
    if (!/^[a-z0-9._]{3,24}$/.test(uname)) {
      setErr("[data-jr-ferr]", "Username harus 3–24 karakter: huruf kecil, angka, titik, atau garis bawah.");
      return;
    }
    setErr("[data-jr-ferr]", "Memeriksa username…");
    client.from("profiles").select("id").eq("username", uname).neq("id", session.user.id).limit(1)
      .then(function (res) {
        if (res.data && res.data.length) throw new Error("Username itu sudah dipakai — coba variasi lain.");
        return client.from("profiles").update({ nama: nama, username: uname }).eq("id", session.user.id);
      })
      .then(function (res) {
        if (res.error) throw res.error;
        profile = { nama: nama, username: uname };
        setErr("[data-jr-ferr]", "");
        renderState();
        segarkanTombol();
      })
      .catch(function (err) {
        var m = err && err.message ? err.message : "Gagal menyimpan — coba lagi.";
        if (/duplicate|unique/i.test(m)) m = "Username itu sudah dipakai — coba variasi lain.";
        setErr("[data-jr-ferr]", m);
      });
  }

  /* ---------- UI halaman ---------- */
  function namaPendek() {
    if (!session) return "Masuk";
    var n = (profile && profile.nama) || session.user.user_metadata.full_name || "Akun";
    return n.split(" ")[0];
  }
  function segarkanTombol() {
    document.querySelectorAll("[data-jr-loginbtn]").forEach(function (b) {
      b.textContent = session ? namaPendek() : "Masuk";
    });
  }
  function ikatTombol() {
    document.querySelectorAll("[data-login], [data-jr-login]").forEach(function (b) {
      if (b.__jrBound) return;
      b.__jrBound = true;
      if (b.textContent.trim().toLowerCase() === "masuk") b.setAttribute("data-jr-loginbtn", "");
      b.addEventListener("click", function () {
        var go = b.getAttribute("data-go");
        if (go) {
          jrReady.then(function () {
            if (session) location.href = go;
            else {
              pendingGo = go;
              try { sessionStorage.setItem("jr_go_after_login", go); } catch (_) {}
              openModal(b.getAttribute("data-ctx") || "");
            }
          });
          return;
        }
        openModal(b.getAttribute("data-ctx") || "");
      });
    });
  }

  /* ---------- Gerbang unduh GPX ---------- */
  function unduhGpx(url) {
    if (!session) {
      openModal("Mengunduh GPX perlu masuk dulu — satu akun, gratis. Peta rute komunitas sendiri bisa kamu lihat tanpa masuk; berkas GPX-nya yang tersimpan di balik gerbang anggota.");
      return;
    }
    if (!profile || !profile.username) {
      openModal("");
      showPane("form");
      var f = modal.querySelector("[data-jr-form]");
      var namaEl = modal.querySelector("#jrNama");
      if (namaEl && profile && profile.nama) namaEl.value = profile.nama;
      if (f) setErr("[data-jr-ferr]", "");
      return;
    }
    var a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "");
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-gpx]") : null;
    if (t) { e.preventDefault(); unduhGpx(t.getAttribute("data-gpx")); }
  });

  /* ---------- Mulai ---------- */
  function mulai() {
    ikatTombol();
    buildChrome();
    if (!ensureClient()) { selesaikanReady(); return; }
    client.auth.getSession().then(function (res) {
      session = res.data.session;
      return muatProfil();
    }).then(function () {
      segarkanTombol();
      segarkanLaci();
      /* Tujuan sesudah masuk (dari laci / tombol data-go): arahkan sekali,
         lalu kunci tujuan dihapus agar tidak berputar. */
      var tujuan = null;
      try { tujuan = sessionStorage.getItem("jr_go_after_login"); } catch (_) {}
      if (session && tujuan) {
        try { sessionStorage.removeItem("jr_go_after_login"); } catch (_) {}
        pendingGo = "";
        var berkasIni = (location.pathname.split("/").pop() || "index.html");
        var berkasTujuan = tujuan.split("?")[0].split("/").pop();
        if (berkasTujuan && berkasTujuan !== berkasIni) {
          selesaikanReady();
          location.href = tujuan;
          return;
        }
      }
      /* Baru kembali dari Google & profil belum lengkap → tawarkan form daftar sekali. */
      if (session && (!profile || !profile.username) && !sessionStorage.getItem("jr_form_ditawar")) {
        sessionStorage.setItem("jr_form_ditawar", "1");
        openModal("");
        showPane("form");
        var namaEl = modal.querySelector("#jrNama");
        var meta = session.user.user_metadata || {};
        if (namaEl && !namaEl.value) namaEl.value = (profile && profile.nama) || meta.full_name || "";
      }
      selesaikanReady();
    }).catch(function () { selesaikanReady(); /* tetap tampil sebagai belum masuk */ });
    client.auth.onAuthStateChange(function (_ev, s) {
      session = s;
      muatProfil().then(function () { segarkanTombol(); segarkanLaci(); if (modal && !modal.hasAttribute("hidden")) renderState(); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai);
  else mulai();

  window.jrOpenLogin = openModal;
  window.jrOpenDrawer = openDrawer;
  window.jrCloseDrawer = closeDrawer;
  window.jrUnduhGpx = unduhGpx;
  window.jrReady = jrReady;
  window.jr = {
    client: function () { return ensureClient() ? client : null; },
    session: function () { return session; },
    profile: function () { return profile; },
    openLogin: openModal,
    unduhGpx: unduhGpx,
    baseUrl: SB_URL
  };
})();
