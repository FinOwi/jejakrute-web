# Kebijakan Pemeliharaan Dependensi & Tenggat Remediasi — JEJAKRUTE

Dokumen ini menutup kontrol OWASP ASVS 5.0.0 **15.1.1** (tenggat remediasi
terdokumentasi) dan menjadi acuan **15.2.1** (komponen di dalam tenggat).
Disahkan: 28 Oktober 2026 (keputusan zgg — penutupan temuan audit ASVS L1).

## Tenggat remediasi kerentanan

Dihitung sejak kerentanan diketahui (pengumuman resmi/Dependabot/laporan):

| Tingkat | Patokan | Tenggat |
|---|---|---|
| Kritis | CVSS ≥ 9,0 atau sedang dieksploitasi aktif | ≤ 7 hari |
| Tinggi | CVSS 7,0–8,9 | ≤ 30 hari |
| Sedang | CVSS 4,0–6,9 | ≤ 90 hari |
| Rendah | CVSS < 4,0 | Siklus rilis berikutnya, ≤ 180 hari |

## Kadar pembaruan rutin

- **Peninjauan bulanan** pada awal bulan (pengingat otomatis bow): versi
  terbaru semua komponen inventaris dibandingkan dengan yang terpasang.
- Versi patch/minor yang lolos uji diterapkan pada siklus yang sama.
- Versi mayor dievaluasi per rilis dan membutuhkan persetujuan zgg.
- Kerentanan menembus antrean: ikuti tenggat tabel di atas, bukan kadar bulanan.

## Proses

- **Web (CDN):** Dependabot memantau `package.json` inventaris di repo
  `FinOwi/jejakrute-web` dan membuka PR pembaruan. bow menyelaraskan versi
  pada tag `<script>` ke versi PR, menjalankan uji asap (feed, katalog,
  generator, tinjau — Playwright), lalu menggabungkan. Jalur darurat:
  perbaiki langsung, uji sesudahnya, catat di laporan audit berikutnya.
- **Aplikasi (Flutter):** `flutter pub outdated` pada peninjauan bulanan;
  kenaikan versi masuk rilis berikutnya dengan `flutter test` penuh dan
  gerbang uji HP zgg seperti biasa.
- **Platform terkelola** (Supabase, Cloudflare, GitHub Pages, Google):
  pembaruan adalah tanggung jawab penyedia; yang kita pantau adalah
  konfigurasi & fitur keamanan yang kita aktifkan (lihat laporan audit).

## Inventaris komponen (per 28 Oktober 2026)

### Web — dimuat via CDN (versi terpin persis)

| Komponen | Versi | Sejak | Catatan |
|---|---|---|---|
| @supabase/supabase-js | 2.118.0 | 28 Okt 2026 | Naik dari 2.45.4 pada penutupan audit ini |
| maplibre-gl | 5.24.0 | 28 Okt 2026 | Sebelumnya pin mengambang `@5`; kini persis |
| leaflet | 1.9.4 | — | Versi 1.x terakhir |

### Aplikasi — pubspec.yaml (Flutter 3.47.7, Android SDK 36)

cupertino_icons ^1.0.8 · geolocator ^13.0.4 · wakelock_plus ^1.3.2 ·
share_plus ^10.1.4 · path_provider ^2.1.5 · http ^1.2.2 · flutter_map ^8.2.1 ·
latlong2 ^0.9.1 · vector_map_tiles 9.0.0-beta.13 · pmtiles ^1.2.0 ·
crypto ^3.0.7 · xml ^7.1.0 · supabase_flutter ^2.10.0 ·
cached_network_image ^3.4.1 · image ^4.5.4 · google_sign_in ^7.2.0

## Pengecualian tercatat

- **vector_map_tiles 9.0.0-beta.13** — versi beta terpin persis karena belum
  ada rilis stabil yang cocok dengan flutter_map 8; dievaluasi tiap peninjauan
  bulanan.
- **Sumber aplikasi belum berada di repo Git** (repo `FinOwi/jejakrute` hanya
  berisi update.json & rilis) — Dependabot untuk aplikasi belum dapat
  dipasang; pemantauan berjalan lewat peninjauan bulanan sampai ada keputusan
  memindahkan sumber ke repo.
