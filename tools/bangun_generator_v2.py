#!/usr/bin/env python3
"""Generator v2: ekstrak renderer -> assets/render-lokasi.js (per-jenis),
rombak generator.html (formulir adaptif + Kirim untuk Ditinjau).
Semua penggantian memakai jangkar persis + asersi jumlah; gagal = berhenti."""
import re, sys
B = chr(92)
Q = chr(34)

SRC = open("generator.html", encoding="utf-8").read()

def rep(s, old, new, n=1, label=""):
    c = s.count(old)
    assert c == n, f"GAGAL {label}: ditemukan {c}, diharapkan {n} :: {old[:80]!r}"
    return s.replace(old, new)

# ============================================================ BAGIAN 1: render-lokasi.js
i0 = SRC.index("const CSS_V2")
i1 = SRC.index("// ---------- Formulir ----------")
chunk = SRC[i0:i1].rstrip()
assert "function renderPage(r){" in chunk and "const HERO" in chunk

# 1a. bendera jenis + nilai tinggi per jenis
chunk = rep(chunk,
  'const isP = (r.jenis==="gunung"||r.jenis==="bukit");',
  '''const isP = (r.jenis==="gunung"||r.jenis==="bukit");
  const isDanau = r.jenis==="danau", isTerjun = r.jenis==="air terjun", isWisata = r.jenis==="wisata alam";''',
  1, "bendera-jenis")

chunk = rep(chunk,
  '''const tinggiOk = r.elevasi_m || r.tinggi;
  const elev = tinggiOk ? fmtID(tinggiOk)+" M" : "—";''',
  '''const nilaiTinggi = isTerjun ? (r.tinggi_m || null) : (r.elevasi_m || r.tinggi || null);
  const labelTinggi = isTerjun ? "Tinggi Air Terjun" : (isDanau ? "Ketinggian Permukaan" : (isWisata ? "Ketinggian" : "Elevasi"));
  const elev = nilaiTinggi ? fmtID(nilaiTinggi)+" M" : "—";
  const coverElevHtml = nilaiTinggi ? "<div class=\\"cover-elev\\">"+fmtID(nilaiTinggi)+(isTerjun ? " M" : " M DPL")+"</div>" : "";
  const statElevHtml = nilaiTinggi ? "<div class=\\"stat\\"><span class=\\"s-label\\">"+labelTinggi+"</span><span class=\\"s-val mint\\">"+elev+"</span></div>" : "";
  const rowElevHtml = nilaiTinggi ? "<tr><td>"+labelTinggi+"</td><td>"+fmtID(nilaiTinggi)+(isTerjun ? " m" : " m dpl")+"</td></tr>" : "";
  const aktivitasTxt = (r.aktivitas||[]).filter(Boolean).join(" · ");
  const fasilitasTxt = (r.fasilitas||[]).filter(Boolean).join(" · ");
  const pernahTxt = (isP ? "Sudah pernah mendaki " : "Sudah pernah berkunjung ke ") + esc(r.nama);
  const profilTxt = isP ? "Profil elevasi per segmen jalur" : "Profil elevasi & peta rute dari berkas GPX";''',
  1, "nilai-tinggi")

# 1b. baris info per jenis
chunk = rep(chunk,
  '''const labelIzin = isP ? "Perizinan / SIMAKSI" : "Tiket & izin masuk";
  const kandidat = [["Kesulitan",r.kesulitan],["Titik awal",r.titikAwal],["Basecamp",r.basecamp],["Durasi",r.durasi],["Jarak tempuh",r.jarak],["Musim terbaik",r.musim],["labelIzin",r.simaksi],["Kuota",r.kuota]];''',
  '''const labelIzin = isP ? "Perizinan / SIMAKSI" : "Tiket & izin masuk";
  let kandidat;
  if (isP) kandidat = [["Kesulitan",r.kesulitan],["Titik awal",r.titikAwal],["Basecamp",r.basecamp],["Durasi",r.durasi],["Jarak tempuh",r.jarak],["Musim terbaik",r.musim],["labelIzin",r.simaksi],["Kuota",r.kuota]];
  else if (isDanau) kandidat = [["Titik kunjungan",r.titikAwal],["Aktivitas",aktivitasTxt],["Durasi kunjungan",r.durasi],["Jarak tempuh",r.jarak],["Musim terbaik",r.musim],["labelIzin",r.simaksi]];
  else if (isTerjun) kandidat = [["Tinggi air terjun", r.tinggi_m ? fmtID(r.tinggi_m)+" m" : ""],["Titik awal",r.titikAwal],["Trek ke lokasi",r.jarak],["Durasi kunjungan",r.durasi],["Kolam alami",r.berenang],["Musim terbaik",r.musim],["labelIzin",r.simaksi]];
  else kandidat = [["Aktivitas",aktivitasTxt],["Fasilitas",fasilitasTxt],["Titik akses",r.titikAwal],["Durasi kunjungan",r.durasi],["Jarak tempuh",r.jarak],["Musim terbaik",r.musim],["labelIzin",r.simaksi]];''',
  1, "kandidat")

# 1c. sampul: lencana elevasi kondisional
chunk = rep(chunk, '<div class=' + B + Q + 'cover-elev' + B + Q + '>' + Q + '+elev+' + Q + ' DPL</div>', Q + '+coverElevHtml+' + Q, 1, 'cover-elev')
# (fragmen asli: <div class="cover-elev">"+elev+" DPL</div> -> ganti seluruh div)

# 1d. bilah statistik: stat elevasi kondisional
chunk = rep(chunk,
  '<div class=\\"stat\\"><span class=\\"s-label\\">Elevasi</span><span class=\\"s-val mint\\">"+elev+"</span></div>',
  '"+statElevHtml+"', 1, "stat-elev")

# 1e. baris Elevasi di Data Umum
chunk = rep(chunk,
  '<tr><td>Elevasi</td><td>"+elev+" dpl</td></tr>',
  '"+rowElevHtml+"', 1, "row-elev")

# 1f. teks rute kosong per jenis
chunk = rep(chunk, 'Sudah pernah mendaki ' + Q + '+esc(r.nama)+' + Q + '?', Q + '+pernahTxt+' + Q + '?', 1, 'pernah')

# 1g. frasa khas gunung di kartu unduh
chunk = rep(chunk, 'rute komunitas untuk gunung ini', 'rute komunitas untuk "+(isP?"gunung":"lokasi")+" ini', 1, "untuk-gunung")
chunk = rep(chunk, 'Profil elevasi per segmen jalur</li>', '"+profilTxt+"</li>', 1, "profil-txt")
chunk = rep(chunk, 'Satu aplikasi untuk semua gunung di katalog', 'Satu aplikasi untuk semua lokasi di katalog', 1, "semua-gunung")

render_js = '''// render-lokasi.js — mesin render halaman lokasi JEJAKRUTE (satu sumber kebenaran).
// Dipakai generator.html (pratinjau & kirim usulan), halaman tinjau moderator,
// dan penerbit otomatis. Membutuhkan window.KATALOG (assets/katalog-data.js).
"use strict";
const DATA81 = (window.KATALOG || []).map(l => ({ id: l.id, nama: l.nama, jenis: l.jenis, tinggi: l.ketinggian_mdpl, kab: l.kabupaten_kota, prov: l.provinsi, wilayah: l.wilayah, lat: l.lat, lng: l.lng, daya: l.daya_tarik, sumber: l.sumber, tingkat: l.tingkat_data }));
''' + chunk + '''
window.renderLokasiPage = renderPage;
window.JR_LOKASI = { slugOf, urlOf };
'''
open("assets/render-lokasi.js", "w", encoding="utf-8").write(render_js)
print("render-lokasi.js tertulis:", len(render_js), "byte")

# ============================================================ BAGIAN 2: generator.html
g = SRC

# 2a. CSS tambahan sebelum </style>
g = rep(g, ".foot{color:var(--mut);font-size:12.5px;margin-top:26px;line-height:1.7}",
""".foot{color:var(--mut);font-size:12.5px;margin-top:26px;line-height:1.7}
.pillst{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:.04em}
.pillst.menunggu{background:#3a2f16;color:var(--amber)}
.pillst.disetujui{background:#12312a;color:var(--mint)}
.pillst.ditolak{background:#3a1d1d;color:var(--red)}
.pillst.terbit{background:#17324a;color:var(--sky)}
.usulan-item{display:flex;gap:10px;align-items:baseline;padding:9px 0;border-bottom:1px solid var(--line)}
.usulan-item:last-child{border-bottom:none}
.usulan-item .u-nama{font-weight:600}
.usulan-item .u-meta{color:var(--mut);font-size:12px;margin-left:auto;text-align:right}""", 1, "css")

# 2b. teks pengantar
g = rep(g, "Isi formulir, lihat pratinjau langsung, lalu unduh berkas HTML jadinya beserta JSON datanya. Cocok untuk menambah tempat baru atau memperbarui data tempat yang sudah ada.",
"Isi formulir — bentuknya menyesuaikan jenis lokasi — lihat pratinjau langsung, lalu <strong>kirim untuk ditinjau moderator</strong>. Usulan yang disetujui terbit otomatis di situs ini. Formulir ini untuk lokasi <strong>baru</strong>; koreksi data lokasi lama sampaikan ke pengelola.", 1, "sub")

# 2c. toolbar: tombol unduh -> kirim
g = rep(g, '''<button class="btn solid" id="btnUnduhHtmlTop" type="button">Unduh HTML</button>
    <button class="btn" id="btnUnduhJson" type="button">Unduh JSON Data</button>
    <button class="btn ghost" id="btnSalinJson" type="button">Salin JSON</button>''',
'''<button class="btn solid" id="btnKirimTop" type="button">Kirim untuk Ditinjau</button>''', 1, "toolbar")

# 2d. label tinggi dinamis
g = rep(g, '<div class="f"><label>Elevasi / ketinggian (m)</label><input id="tinggi" type="number" placeholder="0"></div>',
'<div class="f" id="fTinggi"><label id="labelTinggi">Elevasi puncak (m dpl)</label><input id="tinggi" type="number" placeholder="0"></div>', 1, "label-tinggi")

# 2e. fieldset Detail Lokasi baru (adaptif per jenis)
awal = g.index("<legend>Riset Terverifikasi</legend>")
awal_fs = g.rindex("<fieldset>", 0, awal)
akhir_fs = g.index("</fieldset>", awal) + len("</fieldset>")
fieldset_baru = '''<fieldset>
        <legend>Detail Lokasi (Riset Terverifikasi)</legend>
        <div class="f"><label>Nama resmi</label><input id="namaResmi" placeholder="Sesuai nama resmi pengelola"></div>
        <div class="row2">
          <div class="f"><label id="labelDurasi">Durasi lazim</label><input id="durasi" placeholder="mis. 2 hari 1 malam"></div>
          <div class="f"><label id="labelJarak">Jarak tempuh</label><input id="jarak" placeholder="mis. ±18 km PP"></div>
        </div>
        <div class="f"><label>Musim terbaik</label><input id="musim" placeholder="mis. April–Oktober (kemarau)"></div>
        <div class="f"><label id="labelTitikAwal">Titik awal / akses utama</label><input id="titikAwal" placeholder="mis. Desa Contoh — gerbang resmi"></div>
        <div class="grupP">
          <div class="row2">
            <div class="f"><label>Tingkat kesulitan</label>
              <select id="kesulitan">
                <option value="">— belum terverifikasi —</option>
                <option>Mudah</option><option>Sedang</option><option>Berat</option><option>Ekstrem</option>
              </select>
            </div>
            <div class="f"><label>Kuota (hanya bila resmi)</label><input id="kuota" placeholder="mis. 200 orang per hari (pengumuman pengelola)"></div>
          </div>
          <div class="f"><label>Basecamp</label><input id="basecamp" placeholder="mis. Basecamp Contoh"></div>
        </div>
        <div class="grupTerjun" style="display:none">
          <div class="row2">
            <div class="f"><label>Tinggi air terjun (m)</label><input id="tinggiTerjun" type="number" placeholder="mis. 35"></div>
            <div class="f"><label>Kolam alami di bawah air terjun</label>
              <select id="berenang">
                <option value="">— belum terverifikasi —</option>
                <option value="Boleh berenang">Boleh berenang</option>
                <option value="Boleh di area tertentu">Boleh di area tertentu</option>
                <option value="Tidak boleh berenang">Tidak boleh berenang</option>
                <option value="Tidak ada kolam">Tidak ada kolam</option>
              </select>
            </div>
          </div>
        </div>
        <div class="grupAktivitas" style="display:none">
          <label style="display:block;font-size:12.5px;color:var(--mut);margin-bottom:6px">Aktivitas yang bisa dilakukan (satu per baris)</label>
          <div id="aktivitasBox"></div>
          <button class="btn ghost mini" id="addAktivitas" type="button">+ Tambah aktivitas</button>
        </div>
        <div class="grupWisata" style="display:none">
          <label style="display:block;font-size:12.5px;color:var(--mut);margin:10px 0 6px">Fasilitas tersedia (satu per baris)</label>
          <div id="fasilitasBox"></div>
          <button class="btn ghost mini" id="addFasilitas" type="button">+ Tambah fasilitas</button>
        </div>
        <div class="f"><label id="labelSimaksi">Perizinan / SIMAKSI / tiket masuk</label><textarea id="simaksi" placeholder="Kewajiban izin/tiket dan cara memperolehnya, ringkas dan bersumber."></textarea></div>
        <div class="f"><label>Status keamanan terkini</label><textarea id="status" placeholder="Buka/tutup/level waspada + nama sumber + tanggalnya."></textarea>
        <p class="hint">Wajib menyebut tanggal sumber — status tanpa tanggal menyesatkan pembaca.</p></div>
        <div class="f"><label>Deskripsi (2–3 kalimat faktual)</label><textarea id="deskripsi" placeholder="Gambaran lokasi hasil riset: karakter, kawasan, daya tarik utama."></textarea></div>
      </fieldset>'''
g = g[:awal_fs] + fieldset_baru + g[akhir_fs:]

# 2f. legend jalur dinamis
g = rep(g, "<legend>Jalur & Akses Terverifikasi</legend>", '<legend id="labelGrupJalur">Jalur Pendakian Terverifikasi</legend>', 1, "legend-jalur")

# 2g. panel pratinjau: tombol + catatan
g = rep(g, '<button class="btn solid" id="btnUnduhHtml" type="button">Unduh HTML</button>',
'<button class="btn solid" id="btnKirim" type="button">Kirim untuk Ditinjau</button>', 1, "btn-kirim")
g = rep(g, "Pratinjau memakai template & gaya persis halaman live. Seksi Rute Komunitas tampil kosong di berkas unduhan — di situs live ia terisi otomatis dari database komunitas berdasarkan ID lokasi. Spanduk khusus 5 gunung pilot diatur terpisah oleh pembangun situs.",
"Pratinjau memakai template & gaya persis halaman live, menyesuaikan jenis lokasi. Seksi Rute Komunitas terisi otomatis di situs live dari database komunitas berdasarkan ID lokasi. Mengirim usulan mewajibkan masuk dengan akun Google — maks 3 usulan per hari.", 1, "note-prev")

# 2h. panel Usulan Saya + kaki baru
g = rep(g, '''<p class="foot">Cara memakai hasil: serahkan <strong>berkas HTML</strong> (untuk ditempatkan di folder <em>gunung/</em> atau <em>lokasi/</em> situs) dan <strong>JSON data</strong> (untuk arsip riset & pembangun situs) kepada pengelola JEJAKRUTE. Alat ini berjalan sepenuhnya di browser — tidak ada data yang dikirim ke mana pun.</p>''',
'''<div class="panel" id="usulanPanel" style="margin-top:18px">
    <h2><span class="dot"></span>Usulan Saya</h2>
    <div id="usulanSayaBox"><p class="note">Masuk dengan akun Google untuk melihat status usulanmu di sini.</p></div>
  </div>

  <p class="foot">Alur penerbitan: isi formulir → <strong>Kirim untuk Ditinjau</strong> (wajib masuk akun Google) → moderator memeriksa fakta & pratinjaunya → usulan yang <strong>disetujui terbit otomatis</strong> di jejakrute.my.id beserta entri katalog & peta situsnya. Isi usulan tidak dapat diubah sesudah terkirim — periksa lagi sebelum mengirim.</p>''', 1, "foot")

# 2i. blok skrip lama (DATA81..renderPage) -> muat aset bersama
i0 = g.index("<script>\n\"use strict\";")
i1 = g.index("// ---------- Formulir ----------")
g = g[:i0] + '''<script src="assets/katalog-data.js"></script>
<script src="assets/render-lokasi.js"></script>
<script>
"use strict";
const DATA81 = (window.KATALOG || []).map(l => ({ id: l.id, nama: l.nama, jenis: l.jenis, tinggi: l.ketinggian_mdpl, kab: l.kabupaten_kota, prov: l.provinsi, wilayah: l.wilayah, lat: l.lat, lng: l.lng, daya: l.daya_tarik, sumber: l.sumber, tingkat: l.tingkat_data }));
''' + g[i1:]

open("generator.html", "w", encoding="utf-8").write(g)
print("generator.html tahap-HTML selesai:", len(g), "byte")
