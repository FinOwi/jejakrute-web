# JEJAKRUTE — Website Pendamping

Situs statis pendamping aplikasi JEJAKRUTE (PRD v0.7 §17: *web untuk menemukan
& membagikan, aplikasi untuk melakukan di lapangan*). GitHub Pages dari
branch `main` (root).

## Halaman
- `index.html` — halaman muka + unduh aplikasi
- `katalog.html` — Katalog Nasional 81 lokasi (data: `assets/katalog-data.js`,
  dibangkitkan dari `data/katalog-nasional-v1.json` di repo aplikasi —
  sumber kebenaran tunggal; jangan sunting manual)
- `lokasi.html?id=<id>` — detail lokasi + Rute Komunitas lokasi itu
- `rute-komunitas.html` — daftar Rute Komunitas (Supabase `community_routes`,
  terbaca publik via RLS) + unduh GPX dari bucket publik `media`
- `live.html` — penampil Live Share publik lewat RPC `get_live_share(token)`
- `donasi.html` — halaman donasi

## Backend
Supabase proyek JKR yang sama dengan aplikasi; web hanya memakai kunci
anon (publik-by-design, dijaga RLS). service_role tidak pernah dipakai.
Tidak ada skema DB yang diubah situs ini.

## Lanjutan
Domain kustom (mis. jejakrute.my.id) belum dipasang — perlu keputusan
pemilik + pengaturan DNS.
