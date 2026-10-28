#!/usr/bin/env python3
"""Generator v2 bagian 2: kabel JS (collect adaptif, kirim usulan, UI per jenis)."""
import re

g = open("generator.html", encoding="utf-8").read()
ORIG = g

def rep(s, old, new, n=1, label=""):
    c = s.count(old)
    assert c == n, f"GAGAL {label}: ditemukan {c}, diharapkan {n} :: {old[:80]!r}"
    return s.replace(old, new)

# anon key diambil dari berkas lama (jangan ketik ulang)
m = re.search(r'eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+', open("assets/render-lokasi.js", encoding="utf-8").read())
assert m, "anon key tidak ditemukan"
ANON = m.group(0)

# 1. F list + bidang baru
g = rep(g, '"simaksi","kuota","status"', '"simaksi","kuota","tinggiTerjun","berenang","status"', 1, "F-list")

# 2. tombol tambah aktivitas/fasilitas
g = rep(g, '$("addSumber").addEventListener("click", ()=>dynRow("sumberBox", [["url","URL sumber","https://…"]]));',
'''$("addSumber").addEventListener("click", ()=>dynRow("sumberBox", [["url","URL sumber","https://…"]]));
$("addAktivitas").addEventListener("click", ()=>dynRow("aktivitasBox", [["teks","Aktivitas","mis. Berenang & snorkeling"]]));
$("addFasilitas").addEventListener("click", ()=>dynRow("fasilitasBox", [["teks","Fasilitas","mis. Area parkir & toilet"]]));''', 1, "add-btn")

# 3. collect() adaptif
awal = g.index("function collect(){")
akhir = g.index("function exportJson(r){")
collect_baru = '''function collect(){
  const g = id => $(id).value.trim();
  const num = id => { const v = $(id).value; return v==="" ? null : Number(v); };
  const j = g("jenis");
  const isP = (j==="gunung"||j==="bukit"), isTerjun = j==="air terjun";
  return {
    nama: g("nama"), id: g("id"), jenis: j, tinggi: isTerjun ? null : num("tinggi"),
    wilayah: g("wilayah"), kab: g("kab"), prov: g("prov"),
    lat: num("lat"), lng: num("lng"), daya: g("daya"), sumberKat: g("sumberKat"),
    namaResmi: g("namaResmi"),
    kesulitan: isP ? g("kesulitan") : "", durasi: g("durasi"),
    jarak: g("jarak"), musim: g("musim"), titikAwal: g("titikAwal"),
    basecamp: isP ? g("basecamp") : "",
    simaksi: g("simaksi"), kuota: isP ? g("kuota") : "", status: g("status"), deskripsi: g("deskripsi"),
    elevasi_m: isTerjun ? null : num("tinggi"),
    tinggi_m: isTerjun ? num("tinggiTerjun") : null,
    berenang: isTerjun ? g("berenang") : "",
    aktivitas: (j==="danau"||j==="wisata alam") ? bacaDyn("aktivitasBox", ["teks"]).map(o=>o.teks).filter(Boolean) : [],
    fasilitas: j==="wisata alam" ? bacaDyn("fasilitasBox", ["teks"]).map(o=>o.teks).filter(Boolean) : [],
    jalur: bacaDyn("jalurBox", ["nama"]),
    tips: bacaDyn("tipsBox", ["judul","isi"]),
    sumber: bacaDyn("sumberBox", ["url"]).map(o=>o.url),
    foto: g("fotoUrl") ? { url: g("fotoUrl"), kredit: g("fotoKredit"), lisensi: g("fotoLisensi"), halaman: g("fotoHalaman") } : null
  };
}
'''
g = g[:awal] + collect_baru + g[akhir:]

# 4. exportJson + bidang baru
g = rep(g, "sumber: r.sumber, catatan: \"\",",
"sumber: r.sumber, catatan: \"\", aktivitas: r.aktivitas || [], fasilitas: r.fasilitas || [], tinggi_m: r.tinggi_m, kolam: r.berenang || null,", 1, "exportJson")

# 5. isiForm: isi bidang baru + baris dinamis baru + terapkanJenis
g = rep(g, 'set("status", r.status); set("deskripsi", r.deskripsi);',
'''set("status", r.status); set("deskripsi", r.deskripsi);
  set("tinggiTerjun", r.tinggi_m); set("berenang", r.berenang || r.kolam || "");''', 1, "isiForm-1")
g = rep(g, '''$("sumberBox").innerHTML = ""; (r.sumber||[]).forEach(u=>{ const d = dynRow("sumberBox", [["url","URL sumber",""]]); d.querySelector("[data-k=url]").value = typeof u==="string" ? u : (u.url||""); });
  update();''',
'''$("sumberBox").innerHTML = ""; (r.sumber||[]).forEach(u=>{ const d = dynRow("sumberBox", [["url","URL sumber",""]]); d.querySelector("[data-k=url]").value = typeof u==="string" ? u : (u.url||""); });
  $("aktivitasBox").innerHTML = ""; (r.aktivitas||[]).forEach(a=>{ const d = dynRow("aktivitasBox", [["teks","Aktivitas",""]]); d.querySelector("[data-k=teks]").value = a||""; });
  $("fasilitasBox").innerHTML = ""; (r.fasilitas||[]).forEach(a=>{ const d = dynRow("fasilitasBox", [["teks","Fasilitas",""]]); d.querySelector("[data-k=teks]").value = a||""; });
  terapkanJenis();
  update();''', 1, "isiForm-2")

# 6. impor: sesuaikan data baru + wording
g = rep(g, 'jalur: j.jalur || [], tips: j.tips || [], sumber: j.sumber || [], foto: j.foto || null',
'''jalur: j.jalur || [], tips: j.tips || [], sumber: j.sumber || [], foto: j.foto || null,
      aktivitas: j.aktivitas || [], fasilitas: j.fasilitas || [], tinggi_m: j.tinggi_m, berenang: j.kolam || ""''', 1, "impor-1")
g = rep(g, 'ok("JSON dimuat. Periksa formulir, lalu unduh hasil terbarunya.");',
'ok("JSON dimuat. Periksa formulir dan pratinjaunya, lalu kirim untuk ditinjau.");', 1, "impor-2")

# 7. blok unduh -> kirim usulan + usulan saya + UI per jenis
awal = g.index("// unduh & salin")
akhir = g.index("function ok(msg)")
blok_baru = '''// ---------- Formulir adaptif per jenis ----------
const LABEL_JENIS = {
  "gunung":      { tinggi: "Elevasi puncak (m dpl)", durasi: "Durasi pendakian lazim", jarak: "Jarak tempuh jalur", titik: "Titik awal / pintu pendakian resmi", izin: "Perizinan / SIMAKSI / tiket masuk", grup: "Jalur Pendakian Terverifikasi" },
  "bukit":       { tinggi: "Ketinggian puncak (m dpl)", durasi: "Durasi pendakian lazim", jarak: "Jarak tempuh jalur", titik: "Titik awal / pintu pendakian resmi", izin: "Perizinan / SIMAKSI / tiket masuk", grup: "Jalur Pendakian Terverifikasi" },
  "danau":       { tinggi: "Ketinggian permukaan danau (m dpl)", durasi: "Durasi kunjungan lazim", jarak: "Jarak tempuh akses", titik: "Titik kunjungan / dermaga utama", izin: "Tiket masuk & izin kawasan", grup: "Akses & Rute Kunjungan" },
  "air terjun":  { tinggi: "", durasi: "Durasi kunjungan lazim", jarak: "Jarak trek jalan ke lokasi", titik: "Titik awal / area parkir & loket", izin: "Tiket masuk & retribusi", grup: "Trek & Akses Terverifikasi" },
  "wisata alam": { tinggi: "Ketinggian lokasi (m dpl, bila ada)", durasi: "Durasi kunjungan lazim", jarak: "Jarak tempuh akses", titik: "Titik akses utama / gerbang masuk", izin: "Tiket masuk & izin kawasan", grup: "Akses & Rute Kunjungan" }
};
function terapkanJenis(){
  const j = $("jenis").value, L = LABEL_JENIS[j];
  const isP = (j==="gunung"||j==="bukit");
  document.querySelectorAll(".grupP").forEach(el=>{ el.style.display = isP ? "" : "none"; });
  document.querySelectorAll(".grupTerjun").forEach(el=>{ el.style.display = j==="air terjun" ? "" : "none"; });
  document.querySelectorAll(".grupAktivitas").forEach(el=>{ el.style.display = (j==="danau"||j==="wisata alam") ? "" : "none"; });
  document.querySelectorAll(".grupWisata").forEach(el=>{ el.style.display = j==="wisata alam" ? "" : "none"; });
  $("fTinggi").style.display = j==="air terjun" ? "none" : "";
  if (L.tinggi) $("labelTinggi").textContent = L.tinggi;
  $("labelDurasi").textContent = L.durasi;
  $("labelJarak").textContent = L.jarak;
  $("labelTitikAwal").textContent = L.titik;
  $("labelSimaksi").textContent = L.izin;
  $("labelGrupJalur").textContent = L.grup;
}
$("jenis").addEventListener("change", ()=>{ terapkanJenis(); update(); });

// ---------- Kirim usulan ----------
const SB_REST = "https://qykzrcygsyeznzmsdohp.supabase.co/rest/v1";
const SB_ANON = "__ANON__";
function sesiLokal(){
  try {
    const raw = localStorage.getItem("sb-qykzrcygsyeznzmsdohp-auth-token");
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.access_token || !s.user) return null;
    if (s.expires_at && s.expires_at * 1000 < Date.now()) return null;
    return s;
  } catch(e){ return null; }
}
async function kirimUsulan(){
  const r = collect();
  if (!r.nama || !r.id || !r.kab || !r.prov || !r.daya){ ok("Lengkapi dulu kolom wajib: Nama, ID, Kabupaten/Kota, Provinsi, Daya tarik."); return; }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.id)){ ok("ID lokasi hanya boleh huruf kecil, angka, dan tanda hubung."); return; }
  if ((window.KATALOG||[]).some(l=>l.id===r.id)){ ok("ID ini sudah tayang di katalog — formulir ini hanya untuk lokasi baru."); return; }
  const s = sesiLokal();
  if (!s){ ok("Kamu belum masuk. Masuk dulu dengan akun Google lewat halaman Komunitas (feed.html) — sesi masukmu berlaku di seluruh situs — lalu klik Kirim lagi."); return; }
  const katalog = { nama: r.nama, jenis: r.jenis, ketinggian_mdpl: r.jenis==="air terjun" ? null : r.tinggi, kabupaten_kota: r.kab, provinsi: r.prov, lat: r.lat, lng: r.lng, perkiraan: false, daya_tarik: r.daya, sumber: r.sumberKat, wilayah: r.wilayah, tingkat_data: "usulan-komunitas", id: r.id };
  const data = { v: 2, render: r, riset: exportJson(r), katalog };
  ok("Mengirim usulan…");
  try {
    const resp = await fetch(SB_REST + "/usulan_lokasi", { method: "POST", headers: { apikey: SB_ANON, Authorization: "Bearer " + s.access_token, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ user_id: s.user.id, jenis: r.jenis, nama: r.nama, data }) });
    if (resp.status === 201){ ok("Terkirim! Usulan \\u201C" + r.nama + "\\u201D menunggu tinjauan moderator. Pantau statusnya di panel Usulan Saya di bawah."); muatUsulanSaya(); }
    else { const t = await resp.text(); ok(t.indexOf("terlalu_cepat")>=0 ? "Batas tercapai: maks 3 usulan per hari. Coba lagi besok." : "Gagal mengirim (" + resp.status + "). Coba lagi sebentar lagi."); }
  } catch(e){ ok("Gagal mengirim: " + e.message); }
}
$("btnKirim").addEventListener("click", kirimUsulan);
$("btnKirimTop").addEventListener("click", kirimUsulan);
async function muatUsulanSaya(){
  const s = sesiLokal(); const box = $("usulanSayaBox");
  if (!s){ box.innerHTML = "<p class=\\"note\\">Masuk dengan akun Google untuk melihat status usulanmu di sini.</p>"; return; }
  try {
    const resp = await fetch(SB_REST + "/usulan_lokasi?select=nama,jenis,status,url_terbit,created_at,catatan_moderator&order=created_at.desc&limit=10", { headers: { apikey: SB_ANON, Authorization: "Bearer " + s.access_token } });
    const rows = await resp.json();
    if (!Array.isArray(rows) || !rows.length){ box.innerHTML = "<p class=\\"note\\">Belum ada usulan. Isi formulir di atas dan kirim lokasi pertamamu.</p>"; return; }
    const label = { menunggu: "Menunggu tinjauan", disetujui: "Disetujui — menunggu terbit", ditolak: "Ditolak", terbit: "Sudah terbit" };
    box.innerHTML = rows.map(u=>"<div class=\\"usulan-item\\"><span class=\\"u-nama\\">" + esc(u.nama) + "</span><span class=\\"pillst " + u.status + "\\">" + label[u.status] + "</span><span class=\\"u-meta\\">" + new Date(u.created_at).toLocaleDateString("id-ID") + (u.url_terbit ? " · <a href=\\"" + esc(u.url_terbit) + "\\">lihat halaman</a>" : "") + (u.catatan_moderator ? "<br>Catatan: " + esc(u.catatan_moderator) : "") + "</span></div>").join("");
  } catch(e){ box.innerHTML = "<p class=\\"note\\">Gagal memuat usulan.</p>"; }
}
muatUsulanSaya();

'''
g = g[:awal] + blok_baru.replace("__ANON__", ANON) + g[akhir:]

# 8. update() memakai renderer bersama
g = rep(g, '$("prev").srcdoc = renderPage(collect());', '$("prev").srcdoc = window.renderLokasiPage(collect());', 1, "update")

open("generator.html", "w", encoding="utf-8").write(g)
print("generator.html tahap-JS selesai:", len(g), "byte")
