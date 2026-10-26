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
    ".jr-hint{font-size:12.8px;color:#9AA0A3;margin-top:5px;line-height:1.5}"
  ].join("\n");

  var modal = null;
  function buildModal() {
    if (modal) return modal;
    var st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
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
    ov.querySelector("[data-jr-google]").addEventListener("click", loginGoogle);
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

  /* ---------- Aksi auth ---------- */
  function loginGoogle() {
    if (!ensureClient()) {
      setErr("[data-jr-err]", "Layanan masuk belum termuat — periksa koneksimu lalu coba lagi.");
      return;
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
            else openModal(b.getAttribute("data-ctx") || "");
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
    if (!ensureClient()) { selesaikanReady(); return; }
    client.auth.getSession().then(function (res) {
      session = res.data.session;
      return muatProfil();
    }).then(function () {
      segarkanTombol();
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
      muatProfil().then(function () { segarkanTombol(); if (modal && !modal.hasAttribute("hidden")) renderState(); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai);
  else mulai();

  window.jrOpenLogin = openModal;
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
