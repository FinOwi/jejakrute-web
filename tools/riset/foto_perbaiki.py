#!/usr/bin/env python3
"""Lintasan perbaikan foto: 11 kosong + 3 pilihan buruk dari panen pertama.
Kuasa tolak judul generik: ship/port/bandara/cameroon dsb.
Menimpa foto-kandidat.json hanya bila kandidat lolos aturan lebih ketat.
"""
import json, re, sys, time, urllib.parse, urllib.request

UA = {'User-Agent': 'JEJAKRUTE-research/1.0 (https://jejakrute.my.id; contact via site)'}
API = 'https://commons.wikimedia.org/w/api.php'
TOLAK = ['port of', 'cameroon', ' ship', 'bandara', 'landasan', 'airport', ' km ', 'kapal']

def api(params):
    params['format'] = 'json'
    url = API + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)

def imageinfo(title):
    d = api({'action': 'query', 'titles': title, 'prop': 'imageinfo',
             'iiprop': 'url|size|extmetadata'})
    for p in d.get('query', {}).get('pages', {}).values():
        ii = (p.get('imageinfo') or [None])[0]
        if ii:
            em = ii.get('extmetadata', {})
            return {'url_file': ii.get('url'), 'halaman': ii.get('descriptionurl'),
                    'lisensi': (em.get('LicenseShortName', {}) or {}).get('value'),
                    'kredit': re.sub('<[^>]+>', '', (em.get('Artist', {}) or {}).get('value', '')).strip(),
                    'width': ii.get('width'), 'height': ii.get('height'), 'judul': p.get('title')}
    return None

# id -> (daftar kueri, token wajib di judul (salah satu), token tolak tambahan)
TARGET = {
 'gunung-sorik-marapi': (['Sorik Marapi filetype:bitmap', 'Gunung Sorik filetype:bitmap'], ['sorik'], []),
 'gunung-latimojong': (['Latimojong filetype:bitmap', 'Rantemario filetype:bitmap', 'Buntu Puang filetype:bitmap'], ['latimojong', 'rantemario', 'buntu puang'], []),
 'gunung-gandang-dewata': (['Gandang Dewata filetype:bitmap', 'Gandangdewata filetype:bitmap'], ['gandang'], []),
 'gunung-kapalatmada': (['Kapalatmada filetype:bitmap', 'Kepala Madan filetype:bitmap', 'Mount Kapalatmada filetype:bitmap'], ['kapalatmada', 'kepala madan'], []),
 'gunung-gamkonora': (['Gamkonora filetype:bitmap', 'Gunung Gamkonora filetype:bitmap'], ['gamkonora'], []),
 'kepulauan-wayag-raja-ampat': (['Wayag filetype:bitmap', 'Wayag Raja Ampat filetype:bitmap'], ['wayag'], []),
 'pantai-tanjung-bira': (['Tanjung Bira filetype:bitmap', 'Bira beach filetype:bitmap', 'Pantai Bira filetype:bitmap'], ['bira'], []),
 'taman-nasional-sebangau': (['Sebangau filetype:bitmap', 'Sungai Koran Sebangau filetype:bitmap'], ['sebangau', 'koran'], []),
 'taman-nasional-wasur': (['Wasur filetype:bitmap', 'Rawa Biru Wasur filetype:bitmap'], ['wasur'], []),
 'cagar-alam-tangkoko-batuangus': (['Tangkoko filetype:bitmap', 'Batuangus filetype:bitmap'], ['tangkoko', 'batuangus'], []),
 'teluk-triton': (['Teluk Triton filetype:bitmap', 'Triton Bay filetype:bitmap', 'Kaimana filetype:bitmap'], ['triton', 'kaimana'], []),
 'gunung-dempo': (['Gunung Dempo Pagar Alam filetype:bitmap', 'Dempo summit filetype:bitmap', 'Mount Dempo filetype:bitmap'], ['dempo'], ['ambon', 'port']),
 'gunung-abang': (['Gunung Abang Bali filetype:bitmap', 'Abang Kintamani filetype:bitmap', 'Mount Abang filetype:bitmap'], ['abang'], ['cameroon', 'village', 'nkongoa']),
 'pulau-maratua': (['Maratua filetype:bitmap', 'Pulau Maratua Kakaban filetype:bitmap'], ['maratua'], ['bandara', 'landasan', 'airport']),
}

path = '/home/hatch/workspace/jejakrute-web/tools/riset/foto-kandidat.json'
out = json.load(open(path))
for rid, (queries, wajib, tolak_x) in TARGET.items():
    tolak = TOLAK + tolak_x
    best = None
    seen = set()
    for q in queries:
        try:
            d = api({'action': 'query', 'list': 'search', 'srsearch': q, 'srnamespace': 6, 'srlimit': 15})
        except Exception as e:
            print(rid, 'search gagal', e); continue
        for hit in d.get('query', {}).get('search', []):
            t = hit['title']; tl = t.lower()
            if t in seen or not re.search(r'\.(jpe?g)$', tl):
                continue
            seen.add(t)
            if not any(w in tl for w in wajib):
                continue
            if any(x in tl for x in tolak):
                continue
            try:
                info = imageinfo(t)
            except Exception:
                continue
            if not info or not info['width'] or info['width'] < 1200 or info['width'] <= info['height']:
                continue
            skor = info['width'] * info['height']
            if best is None or skor > best[0]:
                best = (skor, info)
            time.sleep(0.15)
        time.sleep(0.2)
    if best:
        best[1]['via'] = 'perbaikan'
        out[rid] = best[1]
        print('DAPAT:', rid, '|', best[1]['judul'], best[1]['width'], 'x', best[1]['height'])
    else:
        if rid in ('gunung-dempo', 'gunung-abang', 'pulau-maratua') and rid in out:
            del out[rid]
            print('BUANG pilihan buruk, tetap kosong:', rid)
        else:
            print('tetap kosong:', rid)

json.dump(out, open(path, 'w'), ensure_ascii=False, indent=1)
inp = json.load(open('/home/hatch/workspace/jejakrute-web/tools/riset/inputs.json'))
print('TOTAL:', len(out), '/ 81 | kosong:', sorted({x['id'] for x in inp} - set(out)))
