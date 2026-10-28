#!/usr/bin/env python3
"""Generator v3: kunci formulir di balik masuk (keputusan zgg 28 Okt 2026 —
yang mengisi generator wajib anggota terdaftar JEJAKRUTE).
- Panel gerbang #gerbangMasuk + pembungkus #areaFormulir (toolbar, formulir,
  pratinjau) yang tersembunyi sampai ada sesi masuk.
- Memuat assets/auth.js supaya tombol gerbang membuka login Google di tempat.
- JS gerbang: tampil/sembunyi menurut sesiLokal(); polling 1,5 dtk sesudah
  login di tempat membuka kunci tanpa muat ulang.
Semua penggantian memakai jangkar persis + asersi jumlah; gagal = berhenti."""

g = open("generator.html", encoding="utf-8").read()

def rep(s, old, new, n=1, label=""):
    c = s.count(old)
    assert c == n, f"GAGAL {label}: ditemukan {c}, diharapkan {n} :: {old[:80]!r}"
    return s.replace(old, new)

# 1. gerbang + buka pembungkus area formulir (sebelum toolbar pertama)
gerbang = '''  <div class="panel" id="gerbangMasuk" style="display:none;text-align:center;padding:30px 22px">
    <h2 style="margin:0 0 8px">Khusus Anggota Terdaftar</h2>
    <p class="note" style="max-width:560px;margin:0 auto 14px">Generator halaman lokasi hanya bisa dipakai anggota JEJAKRUTE. Masuk dengan akun Google — akun yang sama dengan aplikasi — untuk mengisi formulir dan mengirim usulan lokasi baru. Belum punya akun? Masuk pertama kali otomatis mendaftarkanmu.</p>
    <button class="btn solid" id="btnMasukGenerator" type="button">Masuk dengan Google</button>
  </div>
  <div id="areaFormulir" style="display:none">
'''
g = rep(g, '  <div class="toolbar">\n    <select class="load" id="muatAda">',
        gerbang + '  <div class="toolbar">\n    <select class="load" id="muatAda">', 1, "gerbang")

# 2. tutup pembungkus tepat sebelum panel Usulan Saya
g = rep(g, '\n  <div class="panel" id="usulanPanel"',
        '\n  </div>\n\n  <div class="panel" id="usulanPanel"', 1, "tutup-area")

# 3. muat auth.js sesudah render-lokasi.js (tombol gerbang membuka login Google)
g = rep(g, '<script src="assets/render-lokasi.js"></script>',
        '<script src="assets/render-lokasi.js"></script>\n<script src="assets/auth.js?v=20261027-4"></script>', 1, "authjs")

# 4. logika gerbang di akhir blok kirim (sesudah panggilan muatUsulanSaya())
blok_gerbang = '''
// ---------- Gerbang masuk: formulir hanya untuk anggota terdaftar ----------
function segarkanGerbang(){
  const ada = !!sesiLokal();
  $("gerbangMasuk").style.display = ada ? "none" : "";
  $("areaFormulir").style.display = ada ? "" : "none";
  return ada;
}
$("btnMasukGenerator").addEventListener("click", ()=>{ if (window.jrOpenLogin) window.jrOpenLogin(""); else location.href = "feed.html"; });
if (!segarkanGerbang()){
  const penjagaGerbang = setInterval(()=>{ if (segarkanGerbang()){ clearInterval(penjagaGerbang); muatUsulanSaya(); } }, 1500);
  setTimeout(()=>clearInterval(penjagaGerbang), 10 * 60 * 1000);
}
'''
g = rep(g, '\nmuatUsulanSaya();\n', '\nmuatUsulanSaya();\n' + blok_gerbang, 1, "js-gerbang")

open("generator.html", "w", encoding="utf-8").write(g)
print("generator.html v3 (kunci formulir) selesai:", len(g), "byte")
