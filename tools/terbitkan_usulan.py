#!/usr/bin/env python3
"""terbitkan_usulan.py — penerbit otomatis usulan lokasi JEJAKRUTE (alur B'').

Pemakaian: python3 tools/terbitkan_usulan.py <usulan_id>
Mengambil satu usulan berstatus 'disetujui' dari Supabase, lalu:
render halaman (node + assets/render-lokasi.js) -> unduh foto Commons ->
tambah entri katalog-data.js + sitemap.xml + arsip riset -> commit & push ->
verifikasi live -> tandai 'terbit' + url_terbit di database.
Kegagalan sebelum commit meninggalkan status 'disetujui' (aman dicoba lagi).
Keluar dengan kode 0 + ringkasan JSON di stdout bila sukses.
"""
import json, re, subprocess, sys, time, urllib.request
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
SB_URL = "https://qykzrcygsyeznzmsdohp.supabase.co"
TOKEN_FILE = Path.home() / "workspace/duitku/.github-token"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"}


def kunci_layanan():
    daftar = json.loads((Path.home() / "workspace/jejakrute/backend/api-keys.json").read_text(encoding="utf-8"))
    return next(e["api_key"] for e in daftar if e.get("id") == "service_role")


def buka(req, timeout=60, percobaan=5):
    """urlopen dengan coba-ulang — koneksi keluar VM ini kadang putus di tengah jalan."""
    galat = None
    for i in range(percobaan):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read()
        except Exception as e:
            galat = e
            time.sleep(2 + i * 2)
    raise RuntimeError("koneksi gagal sesudah %d percobaan: %s" % (percobaan, galat))


SUPA = ["python3", str(Path.home() / "workspace/custom-connectors/custom.supabase/bin/supa_mgmt.py"), "query", "qykzrcygsyeznzmsdohp"]


def sql_satu(teks):
    f = AKAR / "tools" / ".sql_sementara.sql"
    f.write_text(teks, encoding="utf-8")
    try:
        out = subprocess.run(SUPA + [str(f)], capture_output=True, text=True, timeout=120)
    finally:
        f.unlink(missing_ok=True)
    if out.returncode != 0:
        raise RuntimeError("query gagal: " + (out.stderr or out.stdout)[:300])
    return json.loads(out.stdout[out.stdout.index("["):])


def ambil_usulan(uid):
    # 'data' diambil sebagai base64 berpotong 3500 karakter — keluaran teks
    # panjang lewat jalur SQL maupun REST dari VM ini tidak andal utuh.
    import base64
    potongan, awal, kepala = [], 1, None
    while True:
        baris = sql_satu(
            "select jenis, nama, status, substring(encode(convert_to(data::text, 'UTF8'), 'base64') from %d for 3500) as b64 "
            "from public.usulan_lokasi where id = '%s';" % (awal, uid))
        if not baris:
            raise RuntimeError("usulan tidak ditemukan: " + uid)
        if kepala is None:
            kepala = baris[0]
        potongan.append(baris[0]["b64"] or "")
        if len(baris[0]["b64"] or "") < 3500:
            break
        awal += 3500
        if len(potongan) > 12:
            raise RuntimeError("data usulan terlalu besar.")
    data = json.loads(base64.b64decode("".join(potongan)).decode("utf-8"))
    return {"id": uid, "jenis": kepala["jenis"], "nama": kepala["nama"], "status": kepala["status"], "data": data}


def tandai_terbit(uid, url):
    k = kunci_layanan()
    body = json.dumps({"status": "terbit", "url_terbit": url}).encode("utf-8")
    # Koneksi keluar VM ini pernah mengembalikan sukses semu — tulis lalu
    # WAJIB baca ulang; hanya status yang terbaca 'terbit' yang dihitung.
    for _ in range(3):
        req = urllib.request.Request(
            SB_URL + "/rest/v1/usulan_lokasi?id=eq.%s" % uid, data=body, method="PATCH",
            headers={"apikey": k, "Authorization": "Bearer " + k, "Content-Type": "application/json", "Prefer": "return=minimal"})
        status, _ = buka(req)
        if status not in (200, 204):
            raise RuntimeError("gagal menandai terbit: HTTP %s" % status)
        cek = urllib.request.Request(
            SB_URL + "/rest/v1/usulan_lokasi?id=eq.%s&select=status" % uid,
            headers={"apikey": k, "Authorization": "Bearer " + k})
        try:
            _, mentah = buka(cek)
            if json.loads(mentah.decode("utf-8"))[0]["status"] == "terbit":
                return
        except Exception:
            pass
        time.sleep(3)
    raise RuntimeError("PATCH terbit tidak terbaca kembali sesudah 3 percobaan.")


def unduh_foto(url, tujuan, id_lokasi, render):
    if not re.match(r"^https://upload\.wikimedia\.org/", url or ""):
        raise RuntimeError("PERMANEN: URL foto bukan upload.wikimedia.org — tolak atau ganti foto usulan ini.")
    req = urllib.request.Request(url, headers=UA)
    _, blob = buka(req, timeout=90)
    if not (20000 <= len(blob) <= 9000000):
        raise RuntimeError("ukuran foto tidak wajar: %d byte" % len(blob))
    from PIL import Image
    import io
    img = Image.open(io.BytesIO(blob)); img.verify()
    img = Image.open(io.BytesIO(blob)).convert("RGB")
    img.save(tujuan, "JPEG", quality=88)
    return tujuan.stat().st_size


def render_html(render):
    tmp = AKAR / "tools" / ".render_sementara.json"
    tmp.write_text(json.dumps(render, ensure_ascii=False), encoding="utf-8")
    harness = (
        "global.window = {}; const fs = require('fs');"
        "eval(fs.readFileSync('assets/katalog-data.js', 'utf8'));"
        "eval(fs.readFileSync('assets/render-lokasi.js', 'utf8'));"
        "const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));"
        "process.stdout.write(window.renderLokasiPage(data));"
    )
    try:
        out = subprocess.run(["node", "-e", harness, str(tmp)], capture_output=True, text=True, cwd=AKAR, timeout=120)
    finally:
        tmp.unlink(missing_ok=True)
    if out.returncode != 0:
        raise RuntimeError("render gagal: " + out.stderr[:300])
    return out.stdout


def main():
    uid = sys.argv[1]
    assert re.fullmatch(r"[0-9a-f-]{36}", uid), "id usulan tidak sah"
    u = ambil_usulan(uid)
    if u["status"] == "terbit":
        print(json.dumps({"hasil": "sudah-terbit", "id": uid})); return
    if u["status"] != "disetujui":
        raise RuntimeError("status bukan 'disetujui': " + u["status"])
    data = u["data"]
    if data.get("v") != 2 or "render" not in data or "katalog" not in data:
        raise RuntimeError("PERMANEN: bentuk data usulan tidak dikenal (bukan v2).")
    render, kat = data["render"], data["katalog"]
    idl = kat.get("id", "")
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", idl or ""):
        raise RuntimeError("PERMANEN: id katalog tidak sah: " + str(idl))
    if kat.get("jenis") != u["jenis"] or render.get("jenis") != u["jenis"]:
        raise RuntimeError("PERMANEN: jenis tidak konsisten antara kolom dan data.")

    berkas_kat = AKAR / "assets" / "katalog-data.js"
    teks_kat = berkas_kat.read_text(encoding="utf-8")
    sudah_ada = ('"id":"%s"' % idl) in teks_kat
    slug = idl[len("gunung-"):] if idl.startswith("gunung-") else idl
    rel = ("gunung/%s.html" % slug) if u["jenis"] in ("gunung", "bukit") else ("lokasi/%s.html" % idl)
    berkas_hal = AKAR / rel

    if not (sudah_ada and berkas_hal.exists()):
        # foto: unduh & lokal(manifest) lebih dulu
        if render.get("foto") and render["foto"].get("url"):
            tujuan = AKAR / "assets" / "gunung" / (idl + ".jpg")
            ukuran = unduh_foto(render["foto"]["url"], tujuan, idl, render)
            manif = AKAR / "tools" / "riset" / "foto-manifest.json"
            mdata = json.loads(manif.read_text(encoding="utf-8"))
            mdata[idl] = {"berkas": "assets/gunung/%s.jpg" % idl, "kredit": render["foto"].get("kredit", ""),
                          "lisensi": render["foto"].get("lisensi", ""), "halaman": render["foto"].get("halaman", ""),
                          "judul_asli": "", "ukuran": ukuran}
            manif.write_text(json.dumps(mdata, ensure_ascii=False, indent=1), encoding="utf-8")
            render["foto"]["url"] = "/assets/gunung/%s.jpg" % idl
        # render + tulis halaman
        html = render_html(render)
        if "<html" not in html[:100] or render["nama"] not in html:
            raise RuntimeError("hasil render mencurigakan — batal terbit.")
        berkas_hal.write_text(html, encoding="utf-8")
        # katalog-data.js: sisip sebelum "];"
        if not sudah_ada:
            entri = json.dumps(kat, ensure_ascii=False, separators=(",", ":"))
            assert teks_kat.rstrip().endswith("];")
            berkas_kat.write_text(teks_kat.rstrip()[:-2] + "," + entri + "];\n", encoding="utf-8")
            # sitemap
            sm = AKAR / "sitemap.xml"
            teks_sm = sm.read_text(encoding="utf-8")
            url_baru = "  <url><loc>https://jejakrute.my.id/%s</loc></url>\n" % rel
            if url_baru.strip() not in teks_sm:
                sm.write_text(teks_sm.replace("</urlset>", url_baru + "</urlset>"), encoding="utf-8")
            # arsip riset
            kj = AKAR / "tools" / "riset" / "katalog.json"
            daftar = json.loads(kj.read_text(encoding="utf-8"))
            if not any(x.get("id") == idl for x in daftar):
                daftar.append({k: kat.get(k) for k in ("nama", "jenis", "ketinggian_mdpl", "kabupaten_kota", "provinsi", "lat", "lng", "perkiraan", "daya_tarik", "sumber", "wilayah", "tingkat_data", "id")})
                kj.write_text(json.dumps(daftar, ensure_ascii=False, indent=1), encoding="utf-8")
            hr = AKAR / "tools" / "riset" / "hasil-riset.json"
            daftar_r = json.loads(hr.read_text(encoding="utf-8"))
            if not any(x.get("id") == idl for x in daftar_r):
                daftar_r.append(data["riset"])
                hr.write_text(json.dumps(daftar_r, ensure_ascii=False, indent=1), encoding="utf-8")
        # commit & push
        token = TOKEN_FILE.read_text().strip()
        berkas = [str(berkas_hal), str(berkas_kat), str(AKAR / "sitemap.xml"),
                  str(AKAR / "tools" / "riset" / "katalog.json"), str(AKAR / "tools" / "riset" / "hasil-riset.json"),
                  str(AKAR / "tools" / "riset" / "foto-manifest.json"), str(AKAR / "assets" / "gunung" / (idl + ".jpg"))]
        subprocess.run(["git", "add", "--"] + [b for b in berkas if Path(b).exists()], cwd=AKAR, check=True, capture_output=True, text=True)
        c = subprocess.run(["git", "commit", "-m", "terbit: %s — usulan komunitas (disetujui moderator)" % u["nama"]], cwd=AKAR, capture_output=True, text=True)
        if c.returncode != 0 and "nothing to commit" not in (c.stdout + c.stderr):
            raise RuntimeError("commit gagal: " + (c.stdout + c.stderr)[:300])
        p = subprocess.run(["git", "push", "https://x-access-token:%s@github.com/FinOwi/jejakrute-web.git" % token, "main"], cwd=AKAR, capture_output=True, text=True, timeout=300)
        if p.returncode != 0:
            raise RuntimeError("push gagal: " + p.stderr[:300])

    # verifikasi live — build GitHub Pages pernah butuh >4 menit (kejadian
    # Danau Toba), jadi jendela tunggu dibuat longgar: 14 x 45 dtk (~10 mnt).
    url_live = "https://jejakrute.my.id/" + rel
    lolos = False
    for _ in range(14):
        time.sleep(45)
        try:
            req = urllib.request.Request(url_live, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                if r.status == 200 and u["nama"] in r.read().decode("utf-8", "replace"):
                    lolos = True; break
        except Exception:
            pass
    if not lolos:
        raise RuntimeError("halaman belum live sesudah ±10 menit — status dibiarkan 'disetujui' untuk diperiksa.")
    url_terbit = "https://jejakrute.my.id/" + rel
    tandai_terbit(uid, url_terbit)
    print(json.dumps({"hasil": "terbit", "nama": u["nama"], "url": url_terbit}, ensure_ascii=False))


if __name__ == "__main__":
    main()
