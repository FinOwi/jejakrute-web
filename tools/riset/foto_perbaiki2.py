#!/usr/bin/env python3
"""Perbaikan-2: ganti foto lemah (anai tanpa air terjun, pesagi buram ber-watermark,
talang berkabut, sibuatan generik, marapi mungil) hanya bila ada kandidat
judul-terverifikasi yang jelas lebih baik. Memperbarui foto-kandidat.json,
foto-manifest.json, dan berkas assets/gunung/<id>.jpg.
"""
import json, re, time, urllib.parse, urllib.request
from PIL import Image

UA = {'User-Agent': 'JEJAKRUTE-research/1.0 (https://jejakrute.my.id; contact via site)'}
API = 'https://commons.wikimedia.org/w/api.php'
BASE = '/home/hatch/workspace/jejakrute-web'

def api(params):
    params['format'] = 'json'
    req = urllib.request.Request(API + '?' + urllib.parse.urlencode(params), headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)

def info(title):
    d = api({'action': 'query', 'titles': title, 'prop': 'imageinfo',
             'iiprop': 'url|size|extmetadata', 'iiurlwidth': 1600})
    for p in d.get('query', {}).get('pages', {}).values():
        ii = (p.get('imageinfo') or [None])[0]
        if ii:
            em = ii.get('extmetadata', {})
            return {'url_file': ii.get('url'), 'halaman': ii.get('descriptionurl'),
                    'lisensi': (em.get('LicenseShortName', {}) or {}).get('value'),
                    'kredit': re.sub('<[^>]+>', '', (em.get('Artist', {}) or {}).get('value', '')).strip(),
                    'width': ii.get('width'), 'height': ii.get('height'),
                    'judul': p.get('title'), 'thumb': (ii.get('thumburl') or ii.get('url', '')).split('?')[0]}
    return None

TARGET = {
 'air-terjun-lembah-anai': (['Air Terjun Lembah Anai filetype:bitmap', 'Lembah Anai waterfall filetype:bitmap'], ['anai'], 0),
 'gunung-sibuatan': (['Sibuatan filetype:bitmap', 'Gunung Sibuatan filetype:bitmap'], ['sibuatan'], 0),
 'gunung-pesagi': (['Gunung Pesagi filetype:bitmap', 'Pesagi Lampung filetype:bitmap'], ['pesagi'], 0),
 'gunung-talang': (['Gunung Talang filetype:bitmap', 'Danau Talang filetype:bitmap', 'Kawah Talang filetype:bitmap'], ['talang'], 0),
 'gunung-marapi': (['Gunung Marapi Sumatera Barat filetype:bitmap', 'Marapi Bukittinggi filetype:bitmap'], ['marapi'], 2200),
}

kand = json.load(open(f'{BASE}/tools/riset/foto-kandidat.json'))
man = json.load(open(f'{BASE}/tools/riset/foto-manifest.json'))
for rid, (queries, wajib, min_w) in TARGET.items():
    cur_title = (man.get(rid) or {}).get('judul_asli', '')
    best = None
    seen = set()
    for q in queries:
        try:
            d = api({'action': 'query', 'list': 'search', 'srsearch': q, 'srnamespace': 6, 'srlimit': 12})
        except Exception:
            continue
        for hit in d.get('query', {}).get('search', []):
            t = hit['title']; tl = t.lower()
            if t in seen or t == cur_title or not re.search(r'\.(jpe?g)$', tl):
                continue
            seen.add(t)
            if not any(w in tl for w in wajib):
                continue
            try:
                x = info(t)
            except Exception:
                continue
            if not x or not x['width'] or x['width'] < max(1400, min_w) or x['width'] <= x['height']:
                continue
            skor = x['width'] * x['height']
            if best is None or skor > best[0]:
                best = (skor, x)
            time.sleep(0.15)
        time.sleep(0.2)
    if not best:
        print('tetap lama:', rid)
        continue
    x = best[1]
    tmp = f'/tmp/ganti-{rid}.bin'
    req = urllib.request.Request(x['thumb'], headers=UA)
    with urllib.request.urlopen(req, timeout=90) as r, open(tmp, 'wb') as w:
        w.write(r.read())
    im = Image.open(tmp).convert('RGB')
    if im.width > 1600:
        im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    dest = f'{BASE}/assets/gunung/{rid}.jpg'
    im.save(dest, 'JPEG', quality=80, progressive=True)
    import os
    kand[rid] = {'url_file': x['url_file'], 'halaman': x['halaman'], 'lisensi': x['lisensi'],
                 'kredit': x['kredit'], 'width': x['width'], 'height': x['height'], 'judul': x['judul'], 'via': 'perbaikan-2'}
    man[rid] = {'berkas': f'assets/gunung/{rid}.jpg', 'kredit': x['kredit'], 'lisensi': x['lisensi'],
                'halaman': x['halaman'], 'judul_asli': x['judul'], 'ukuran': os.path.getsize(dest)}
    print('GANTI:', rid, '->', x['judul'], x['width'], 'x', x['height'])

json.dump(kand, open(f'{BASE}/tools/riset/foto-kandidat.json', 'w'), ensure_ascii=False, indent=1)
json.dump(man, open(f'{BASE}/tools/riset/foto-manifest.json', 'w'), ensure_ascii=False, indent=1)
print('selesai. manifest:', len(man))
