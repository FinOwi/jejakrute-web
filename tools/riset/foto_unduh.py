#!/usr/bin/env python3
"""Unduh foto kandidat final -> assets/gunung/<id>.jpg (maks 1600px, q80) + manifest kredit.
Lalu buat lembar kontak (12/lembar, berlabel id) untuk pemeriksaan visual.
"""
import json, os, re, sys, urllib.parse, urllib.request
from PIL import Image, ImageDraw

UA = {'User-Agent': 'JEJAKRUTE-research/1.0 (https://jejakrute.my.id; contact via site)'}
BASE = '/home/hatch/workspace/jejakrute-web'
KAND = json.load(open(f'{BASE}/tools/riset/foto-kandidat.json'))
OUTDIR = f'{BASE}/assets/gunung'
os.makedirs(OUTDIR, exist_ok=True)
os.makedirs(f'{BASE}/tools/riset/kontak', exist_ok=True)

def thumb_url(nama_file):
    """URL thumbnail resmi lebar 1600 dari Commons API (tanpa query utm)."""
    title = 'File:' + nama_file.replace('_', ' ')
    q = urllib.parse.urlencode({'action': 'query', 'titles': title, 'prop': 'imageinfo',
                                'iiprop': 'url', 'iiurlwidth': 1600, 'format': 'json'})
    req = urllib.request.Request('https://commons.wikimedia.org/w/api.php?' + q, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        d = json.load(r)
    for p in d.get('query', {}).get('pages', {}).values():
        ii = (p.get('imageinfo') or [None])[0]
        if ii:
            return (ii.get('thumburl') or ii.get('url', '')).split('?')[0]
    return None

manifest = {}
gagal = []
for rid, f in sorted(KAND.items()):
    nama_file = urllib.parse.unquote(f['url_file'].split('?')[0].rstrip('/').split('/')[-1])
    tmp = f'/tmp/foto-{rid}.bin'
    try:
        url = thumb_url(nama_file)
        if not url:
            raise RuntimeError('thumburl kosong')
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=90) as r, open(tmp, 'wb') as w:
            w.write(r.read())
        im = Image.open(tmp).convert('RGB')
        if im.width > 1600:
            im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
        dest = f'{OUTDIR}/{rid}.jpg'
        im.save(dest, 'JPEG', quality=80, progressive=True)
        manifest[rid] = {'berkas': f'assets/gunung/{rid}.jpg', 'kredit': f.get('kredit', ''),
                         'lisensi': f.get('lisensi', ''), 'halaman': f.get('halaman', ''),
                         'judul_asli': f.get('judul', ''), 'ukuran': os.path.getsize(dest)}
        print('ok', rid, im.width, 'x', im.height, os.path.getsize(dest) // 1024, 'KB')
    except Exception as e:
        gagal.append((rid, str(e)))
        print('GAGAL', rid, e, file=sys.stderr)

json.dump(manifest, open(f'{BASE}/tools/riset/foto-manifest.json', 'w'), ensure_ascii=False, indent=1)
print('manifest:', len(manifest), '| gagal:', gagal)
total = sum(m['ukuran'] for m in manifest.values())
print('total ukuran:', round(total / 1048576, 2), 'MB')

# --- lembar kontak ---
ids = sorted(manifest)
CELL_W, CELL_H, LBL = 400, 265, 22
for s in range(0, len(ids), 12):
    grup = ids[s:s + 12]
    sheet = Image.new('RGB', (CELL_W * 3, (CELL_H + LBL) * 4), (24, 24, 24))
    d = ImageDraw.Draw(sheet)
    for i, rid in enumerate(grup):
        im = Image.open(f"{BASE}/{manifest[rid]['berkas']}")
        im.thumbnail((CELL_W, CELL_H))
        x, y = (i % 3) * CELL_W, (i // 3) * (CELL_H + LBL)
        sheet.paste(im, (x + (CELL_W - im.width) // 2, y))
        d.text((x + 8, y + CELL_H + 4), rid, fill=(255, 255, 120))
    p = f'{BASE}/tools/riset/kontak/kontak-{s // 12 + 1}.jpg'
    sheet.save(p, 'JPEG', quality=82)
    print('lembar:', p, len(grup), 'foto')
