#!/usr/bin/env python3
"""Lintasan foto: audit 32 pilihan worker + panen Commons untuk yang kosong.
Keluaran: foto-kandidat.json {id: {url_file, halaman, lisensi, kredit, width, height, via}}
Prinsip: hanya foto yang judul/deskripsinya menyebut lokasi; landscape; lebar >= 1200.
"""
import json, re, sys, time, urllib.parse, urllib.request

UA = {'User-Agent': 'JEJAKRUTE-research/1.0 (https://jejakrute.my.id; contact via site)'}
API = 'https://commons.wikimedia.org/w/api.php'

def api(params):
    params['format'] = 'json'
    url = API + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)

def imageinfo_by_title(title):
    d = api({'action': 'query', 'titles': title, 'prop': 'imageinfo',
             'iiprop': 'url|size|extmetadata', 'iiurlwidth': 200})
    pages = d.get('query', {}).get('pages', {})
    for p in pages.values():
        ii = (p.get('imageinfo') or [None])[0]
        if ii:
            em = ii.get('extmetadata', {})
            return {
                'url_file': ii.get('url'),
                'halaman': ii.get('descriptionurl'),
                'lisensi': (em.get('LicenseShortName', {}) or {}).get('value'),
                'kredit': re.sub('<[^>]+>', '', (em.get('Artist', {}) or {}).get('value', '')).strip(),
                'width': ii.get('width'), 'height': ii.get('height'),
                'judul': p.get('title'),
            }
    return None

def bersih(teks):
    return re.sub(r'\s+', ' ', teks or '').strip()

hasil_riset = json.load(open('/home/hatch/workspace/jejakrute-web/tools/riset/hasil-riset.json'))
inputs = {x['id']: x for x in json.load(open('/home/hatch/workspace/jejakrute-web/tools/riset/inputs.json'))}
out = {}

# --- 1) audit pilihan worker ---
for r in hasil_riset:
    f = r.get('foto')
    if not f:
        continue
    hal = f.get('halaman', '')
    m = re.search(r'(File:[^?#]+)', urllib.parse.unquote(hal))
    info = None
    if m:
        try:
            info = imageinfo_by_title(m.group(1).replace('_', ' '))
        except Exception as e:
            print('audit gagal', r['id'], e, file=sys.stderr)
    if info and info['width']:
        info['via'] = 'worker+audit'
        out[r['id']] = info
    else:
        print('audit tak lolos (dianggap kosong):', r['id'], file=sys.stderr)
    time.sleep(0.15)
print('audit lolos:', len(out))

# --- 2) panen untuk yang kosong ---
def token_khas(nama):
    n = re.sub(r'^(Gunung|Bukit|Danau|Air Terjun|Pusuk)\s+', '', nama, flags=re.I)
    return n.strip()

for r in hasil_riset:
    rid = r['id']
    if rid in out:
        continue
    nama = inputs[rid]['nama']
    khas = token_khas(nama)
    queries = [f'{nama} filetype:bitmap', f'{khas} filetype:bitmap']
    kandidat = []
    seen = set()
    for q in queries:
        try:
            d = api({'action': 'query', 'list': 'search', 'srsearch': q,
                     'srnamespace': 6, 'srlimit': 12})
        except Exception:
            continue
        for hit in d.get('query', {}).get('search', []):
            t = hit['title']
            if t in seen:
                continue
            seen.add(t)
            tl = t.lower()
            if not re.search(r'\.(jpe?g)$', tl):
                continue
            if khas.lower().split()[0] not in tl and nama.lower() not in tl:
                continue  # judul harus menyebut lokasi
            kandidat.append(t)
        if kandidat:
            break
        time.sleep(0.15)
    best = None
    for t in kandidat[:6]:
        try:
            info = imageinfo_by_title(t)
        except Exception:
            continue
        if not info or not info['width']:
            continue
        if info['width'] < 1200 or info['width'] <= info['height']:
            continue
        skor = info['width'] * info['height']
        if best is None or skor > best[0]:
            best = (skor, info)
        time.sleep(0.15)
    if best:
        best[1]['via'] = 'panen-commons'
        out[rid] = best[1]
        print('panen dapat:', rid, best[1]['judul'], best[1]['width'], 'x', best[1]['height'])
    else:
        print('tetap kosong:', rid)
    time.sleep(0.2)

json.dump(out, open('/home/hatch/workspace/jejakrute-web/tools/riset/foto-kandidat.json', 'w'), ensure_ascii=False, indent=1)
print('TOTAL foto kandidat:', len(out), '/ 81')
print('kosong:', sorted(set(inputs) - set(out)))
