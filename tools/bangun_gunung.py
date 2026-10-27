#!/usr/bin/env python3
"""Pembangun halaman /gunung/<slug> JEJAKRUTE dari data katalog aplikasi.

Prinsip kejujuran (doktrin JEJAKRUTE):
- Semua angka berasal dari data.dart (katalog terkurasi) atau snapshot
  community_routes yang disetujui. Tidak ada jalur/SIMAKSI/kuota karangan.
- Rute komunitas dihitung & dirender dari data nyata; gunung tanpa rute
  menampilkan keadaan kosong yang jujur.
- Klaim fitur hanya yang sudah terbit di aplikasi; mesh diberi label
  eksperimental; tidak ada klaim SOS Bluetooth.
Jalankan: python3 bangun_gunung.py [slug ...]  (tanpa argumen = semua
gunung+bukit). Keluaran: ../gunung/<slug>.html relatif terhadap tools/.
"""
import json, math, re, sys, html as H
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KATALOG = json.load(open('/tmp/katalog.json'))
RUTE = json.load(open('/tmp/rute_per_lokasi.json'))

appjs = (ROOT / 'assets' / 'app.js').read_text()
SB_URL = re.search(r'https://[a-z0-9]+\.supabase\.co', appjs).group(0)
SB_KEY = re.search(r'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', appjs).group(0)
m = re.search(r'https://github\.com/FinOwi/jejakrute/releases/download/[^"\']+\.apk', appjs)
APK_URL = m.group(0) if m else 'https://jejakrute.my.id/'

def esc(s): return H.escape(str(s), quote=True)
def fmt_id(n, dec=0):
    s = f'{n:,.{dec}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return s
def slug_of(d):
    i = d['id']
    return i[7:] if i.startswith('gunung-') else i

def hav(lat1, lng1, lat2, lng2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1); dl = math.radians(lng2 - lng1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def terdekat(d, n=5):
    if d['lat'] is None: return []
    cand = []
    for o in KATALOG:
        if o['id'] == d['id'] or o['lat'] is None: continue
        cand.append((hav(d['lat'], d['lng'], o['lat'], o['lng']), o))
    cand.sort(key=lambda x: x[0])
    return cand[:n]

PILOT = {
 'gunung-sibayak': dict(
   tagline='kawah aktif di atas Berastagi',
   banner=('red', 'PENDAKIAN DITUTUP SEMENTARA — 15 Oktober s.d. 15 November 2026. Halaman ini untuk perencanaan; jangan berangkat sebelum ada pengumuman pembukaan resmi.'),
   info=[('Titik awal', 'Berastagi, Kabupaten Karo'), ('Puncak', 'Deleng Pintau'), ('Catatan', 'Kawah aktif; sumber air panas di kaki gunung')]),
 'gunung-sibuatan': dict(
   tagline='tertinggi di Sumatera Utara',
   banner=('mint', 'Jalur Naga Lingga dikelola GEMPARI — lapor di pos dan ikuti aturan pengelola sebelum mendaki.'),
   info=[('Jalur utama', 'Naga Lingga, Merek — Kabupaten Karo'), ('Pengelola jalur', 'GEMPARI'), ('Puncak', 'Pilar — pilar triangulasi peninggalan Belanda')]),
 'pusuk-buhit': dict(
   tagline='gunung sakral asal-usul Batak',
   banner=('amber', 'KAWASAN ADAT SAKRAL — hormati aturan dan larangan adat setempat; ikuti arahan masyarakat dan pemandu lokal.'),
   info=[('Titik awal', 'Pangururan, Kabupaten Samosir'), ('Catatan', 'Panorama Danau Toba dari puncak; situs asal-usul Batak')]),
 'gunung-sorik-marapi': dict(
   tagline='danau kawah di Batang Gadis',
   banner=('red', 'JALUR DITUTUP — status Level II (Waspada); jalur pendakian ditutup sejak 4 April 2026 sampai pemberitahuan berikutnya.'),
   info=[('Kawasan', 'Taman Nasional Batang Gadis'), ('Catatan', 'Danau kawah di puncak; koordinat puncak masih perkiraan')]),
 'bukit-gundul': dict(
   tagline='pandang Sipiso-piso & Danau Toba',
   banner=('amber', 'AKSES JALAN KAKI SAJA — kendaraan bermotor tidak lagi mencapai titik pandang; siapkan waktu dan tenaga berjalan dari gerbang kawasan.'),
   info=[('Nama lain', 'Dolok Sipiso-piso'), ('Titik awal', 'Gerbang kawasan Sipiso-piso, Merek'), ('Catatan', 'Titik pandang Air Terjun Sipiso-piso dan Danau Toba')]),
}
TAGLINE = {'gunung-kerinci': 'tertinggi di Sumatra'}

HERO = [
 'https://images.unsplash.com/photo-1606820854416-439b3305ff39?w=1400&q=80&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=80&auto=format&fit=crop',
]
def hero_of(d):
    return HERO[abs(hash(d['id'])) % len(HERO)]

CSS = """
:root{
  --bg:#17191C;--bg-deep:#101315;--card:#24272B;--card2:#2B2E33;--line:#33373C;
  --txt:#F4F5F3;--body:#C6CAC6;--mut:#9AA0A3;--mint:#17CE8F;--mints:#A8F0D0;
  --amber:#FFB340;--sky:#38BDF8;--red:#FF5A52;--dark:#052A1D;--radius:16px;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--txt);line-height:1.55;overflow-x:hidden}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='560' height='560'%3E%3Cg fill='none' stroke='%23FFF' stroke-opacity='.04' stroke-width='1.1'%3E%3Cpath d='M60 300C60 210 150 140 250 140C350 140 430 210 430 300C430 390 350 460 250 460C150 460 60 390 60 300Z'/%3E%3C/g%3E%3C/svg%3E");background-size:560px 560px}
h1,h2,h3,h4{font-family:'Oswald',sans-serif;line-height:1.15;font-weight:600}
img{display:block;max-width:100%}
a{color:var(--mint);text-decoration:none}
button{font-family:inherit;cursor:pointer}
::selection{background:var(--mint);color:var(--dark)}
:focus-visible{outline:2px solid var(--mint);outline-offset:2px;border-radius:6px}
.wrap{max-width:1184px;margin:0 auto;padding:0 22px}
.topbar{position:sticky;top:0;z-index:120;background:rgba(23,25,28,.97);border-bottom:1px solid var(--line);backdrop-filter:blur(8px)}
.topbar-in{max-width:1184px;margin:0 auto;padding:10px 22px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px}
.main-nav{display:flex;gap:4px}
.main-nav a{color:var(--txt);font-family:'Oswald',sans-serif;font-weight:500;font-size:14px;letter-spacing:.09em;text-transform:uppercase;padding:9px 11px;border-radius:9px;transition:color .15s,background .15s}
.main-nav a:hover,.main-nav a.on{color:var(--mint);background:var(--card)}
.brand-c{display:flex;flex-direction:column;align-items:center;text-decoration:none}
.brand-c .bs{font-family:'Caveat',cursive;font-weight:700;font-size:34px;color:#fff;line-height:.95}
.brand-c .bsub{font-size:8px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:var(--mut);margin-top:3px}
.top-right{display:flex;justify-content:flex-end}
.btn-masuk{display:inline-block;background:var(--mint);color:var(--dark);border:0;border-radius:999px;padding:10px 22px;font-family:'Oswald',sans-serif;font-weight:600;font-size:14px;letter-spacing:.08em;text-transform:uppercase;transition:background .18s}
.btn-masuk:hover{background:#2BDCA0}
.breadcrumb{padding:14px 22px 0;max-width:1184px;margin:0 auto;display:flex;gap:6px;align-items:center;font-size:12px;color:var(--mut);flex-wrap:wrap}
.breadcrumb a{color:var(--mut)}
.breadcrumb a:hover{color:var(--mint)}
.breadcrumb span{color:var(--line)}
.cover{max-width:1184px;margin:14px auto 0;padding:0 22px}
.cover-inner{position:relative;min-height:480px;height:55vh;border-radius:20px;overflow:hidden;background:#1a2318}
.cover-inner>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 35%}
.cover-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,14,10,.35) 0%,rgba(10,14,10,0) 30%,rgba(10,14,10,.15) 60%,rgba(10,14,10,.72) 100%)}
.cover-copy{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center;padding:26px 22px 44px;color:#fff}
.cover-kicker{font-family:'Oswald',sans-serif;font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:#EAF4EE;margin-bottom:8px}
.cover-kicker::before,.cover-kicker::after{content:"—";margin:0 9px;color:var(--mints)}
.cover-title{font-family:'Oswald',sans-serif;font-weight:700;font-size:clamp(44px,8vw,100px);line-height:.98;letter-spacing:.01em;text-transform:uppercase;text-shadow:0 3px 30px rgba(0,0,0,.5)}
.cover-elev{font-family:'Oswald',sans-serif;font-weight:600;font-size:clamp(18px,2.5vw,26px);color:var(--mints);letter-spacing:.08em;margin-top:6px}
.cover-hand{font-family:'Caveat',cursive;font-weight:600;font-size:clamp(18px,2.2vw,26px);color:var(--mints);margin-top:4px;transform:rotate(-1.2deg)}
.cover-credit{position:absolute;right:14px;bottom:12px;background:rgba(10,12,14,.8);color:#9AA0A3;font-size:10px;border-radius:6px;padding:3px 7px}
.stats-bar{max-width:1184px;margin:0 auto;padding:0 22px}
.stats-inner{background:var(--card);border:1px solid var(--line);border-radius:0 0 16px 16px;border-top:0;display:grid;grid-template-columns:repeat(5,1fr);overflow:hidden}
.stat{padding:14px 18px;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:2px;min-width:0}
.stat:last-child{border-right:0}
.s-label{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--mut);font-weight:600}
.s-val{font-family:'Oswald',sans-serif;font-weight:600;font-size:16px;color:var(--txt);letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s-val.mint{color:var(--mint)}.s-val.amber{color:var(--amber)}.s-val.red{color:var(--red)}
section.blk{margin-top:52px}
.sec-kicker{font-family:'Caveat',cursive;font-weight:600;font-size:21px;color:var(--mint)}
.sec-title{font-family:'Oswald',sans-serif;font-size:clamp(22px,3vw,30px);letter-spacing:.045em;text-transform:uppercase;margin-top:2px}
.sec-desc{color:var(--body);font-size:15px;line-height:1.65;margin-top:10px;max-width:680px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:22px}
.info-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px 24px}
.info-card h3{font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--txt);display:flex;align-items:center;gap:8px}
.ic-dot{width:8px;height:8px;border-radius:50%;background:var(--mint);flex:none;display:inline-block}
.info-table{width:100%;border-collapse:collapse;margin-top:12px}
.info-table tr{border-top:1px solid var(--line)}
.info-table tr:first-child{border-top:0}
.info-table td{padding:9px 4px;font-size:13.5px;vertical-align:top}
.info-table td:first-child{color:var(--mut);width:38%;font-size:12.5px}
.info-table td:last-child{color:var(--txt);font-weight:600}
.src-note{color:var(--mut);font-size:11.5px;line-height:1.6;margin-top:12px}
.banner{display:flex;gap:12px;align-items:flex-start;border-radius:var(--radius);padding:16px 20px;margin-top:26px;border:1px solid var(--line);font-size:14px;line-height:1.6;color:var(--body)}
.banner strong{color:var(--txt)}
.banner.red{background:rgba(255,90,82,.09);border-color:rgba(255,90,82,.45)}
.banner.amber{background:rgba(255,179,64,.09);border-color:rgba(255,179,64,.45)}
.banner.mint{background:rgba(23,206,143,.08);border-color:rgba(23,206,143,.4)}
.rute-list{display:flex;flex-direction:column;gap:12px;margin-top:18px}
.rute-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:18px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.rute-card .rc-main{flex:1;min-width:220px}
.rc-name{font-weight:600;font-size:16px;color:var(--txt)}
.rc-meta{color:var(--mut);font-size:13px;margin-top:3px}
.btn-ghost{display:inline-block;border:1px solid var(--mint);color:var(--mint);border-radius:999px;padding:9px 18px;font-family:'Oswald',sans-serif;font-weight:600;font-size:13px;letter-spacing:.06em;text-transform:uppercase;transition:background .15s,color .15s}
.btn-ghost:hover{background:var(--mint);color:var(--dark)}
.rute-kosong{background:var(--card);border:1px dashed var(--line);border-radius:var(--radius);padding:22px;text-align:center;color:var(--body);font-size:14.5px;line-height:1.65;margin-top:18px}
.gate-strip{display:flex;align-items:center;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:15px 20px;margin-top:18px;flex-wrap:wrap}
.gate-strip p{flex:1;font-size:14px;color:var(--body);min-width:220px}
.gate-strip p strong{color:var(--txt)}
.peta-dl{display:grid;grid-template-columns:1fr 340px;gap:24px;align-items:start;margin-top:22px}
.peta-preview{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;position:relative;min-height:240px}
.peta-preview img{width:100%;height:100%;min-height:240px;object-fit:cover;opacity:.8;position:absolute;inset:0}
.peta-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.peta-badge{background:rgba(23,25,28,.88);border:1px solid var(--line);border-radius:10px;padding:10px 16px;text-align:center}
.pb-label{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--mut)}
.pb-name{font-family:'Oswald',sans-serif;font-weight:700;font-size:18px;color:var(--mint);letter-spacing:.05em;margin-top:2px}
.pb-size{font-size:11.5px;color:var(--mut);margin-top:1px}
.dl-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px}
.dl-card h3{font-size:20px;letter-spacing:.06em;text-transform:uppercase}
.dl-txt{color:var(--body);font-size:14px;line-height:1.6;margin-top:8px}
.dl-points{list-style:none;margin:12px 0 4px;display:flex;flex-direction:column;gap:7px}
.dl-points li{display:flex;gap:10px;align-items:baseline;font-size:13.5px;color:var(--body)}
.dot{width:7px;height:7px;border-radius:50%;background:var(--mint);flex:none;transform:translateY(1px)}
.btn-dl{display:inline-flex;align-items:center;gap:9px;background:var(--mint);color:var(--dark);border-radius:999px;padding:12px 22px;font-family:'Oswald',sans-serif;font-weight:600;font-size:14px;letter-spacing:.06em;text-transform:uppercase;margin-top:14px;transition:background .18s,transform .18s;border:0}
.btn-dl:hover{background:#2BDCA0}
.btn-dl:active{transform:scale(.97)}
.dl-note{font-family:'Caveat',cursive;font-weight:600;font-size:18px;color:var(--mut);margin-top:10px;display:block;transform:rotate(-.8deg)}
.feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 20px;margin-top:16px}
.feat{display:flex;gap:12px;align-items:flex-start;padding:12px 8px;border-radius:10px;transition:background .15s}
.feat:hover{background:rgba(255,255,255,.03)}
.feat-icon{width:36px;height:36px;border-radius:10px;flex:none;display:flex;align-items:center;justify-content:center;font-size:18px}
.mint-bg{background:rgba(23,206,143,.12)}.amber-bg{background:rgba(255,179,64,.12)}.sky-bg{background:rgba(56,189,248,.12)}.red-bg{background:rgba(255,90,82,.12)}
.f-name{font-weight:600;font-size:14px;color:var(--txt);line-height:1.3}
.f-desc{color:var(--mut);font-size:12.5px;line-height:1.55;margin-top:3px}
.tips-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:18px}
.tip-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:18px 20px}
.t-icon{font-size:26px;margin-bottom:8px}
.tip-card h4{font-size:14.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--txt)}
.tip-card p{color:var(--body);font-size:13px;line-height:1.6;margin-top:6px}
.nearby-list{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px}
.nearby-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;transition:border-color .15s,background .15s;display:block}
.nearby-card:hover{border-color:var(--mint);background:var(--card2)}
.nc-name{font-family:'Oswald',sans-serif;font-weight:600;font-size:17px;color:var(--txt)}
.nearby-card:hover .nc-name{color:var(--mint)}
.nc-elev{font-family:'Oswald',sans-serif;font-size:13.5px;color:var(--mints);margin-top:3px}
.nc-dist{color:var(--mut);font-size:12px;margin-top:2px}
.page-footer{max-width:1184px;margin:58px auto 0;padding:22px 22px 36px;border-top:1px solid var(--line);display:flex;align-items:flex-start;justify-content:space-between;gap:24px;flex-wrap:wrap}
.foot-brand .bs{font-family:'Caveat',cursive;font-weight:700;font-size:30px;color:#fff}
.foot-brand .bsub{font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:var(--mut);margin-top:2px}
.foot-meta{color:var(--mut);font-size:12px;line-height:1.7;margin-top:8px}
.foot-links{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
.foot-links a{color:var(--mut);font-size:12.5px;padding:4px 8px;border-radius:6px}
.foot-links a:hover{color:var(--mint)}
@media(max-width:768px){
  .topbar-in{grid-template-columns:auto 1fr auto}.main-nav{display:none}
  .stats-inner{grid-template-columns:repeat(3,1fr)}
  .stat:nth-child(4),.stat:nth-child(5){border-top:1px solid var(--line)}.stat:nth-child(3){border-right:0}
  .info-grid,.peta-dl,.feat-grid,.tips-grid{grid-template-columns:1fr}
  .nearby-list{grid-template-columns:1fr 1fr}
  .cover-inner{min-height:400px}
  .s-val{white-space:normal;font-size:14px;line-height:1.3}
}
"""

def rute_cards_html(rute):
    if not rute:
        return ''
    out = []
    for r in rute:
        meta = f"{fmt_id(r['jarak_km'],1)} km · naik {fmt_id(r['naik_m'])} m · lolos moderasi"
        out.append(f'''<div class="rute-card"><div class="rc-main"><div class="rc-name">{esc(r['nama'])}</div><div class="rc-meta">{meta}</div></div><a class="btn-ghost" href="/pratinjau-3d.html?rute={esc(r['id'])}">Lihat 3D</a></div>''')
    return '\n      '.join(out)

def bangun(d):
    slug = slug_of(d)
    nama = d['nama']
    pilot = d['tingkat'].startswith('pilot')
    pinfo = PILOT.get(d['id'], {})
    tagline = pinfo.get('tagline') or TAGLINE.get(d['id']) or f"Katalog Nasional · {d['wilayah']}"
    rute = RUTE.get(d['id'], [])
    n_rute = len(rute)
    dekat = terdekat(d)
    kata = nama.split(' ', 1)
    judul1 = kata[0]
    judul2 = kata[1] if len(kata) > 1 else ''
    elev = f"{fmt_id(d['tinggi'])} M" if d['tinggi'] else '—'
    koord = f"{d['lat']:.2f}°, {d['lng']:.2f}°" if d['lat'] is not None else '—'
    terdekat_txt = '—'
    if dekat:
        terdekat_txt = f"{dekat[0][1]['nama'].replace('Gunung ','')} · ±{fmt_id(dekat[0][0],0)} km"
    metadesc = d['daya'] if len(d['daya']) <= 158 else d['daya'][:155].rsplit(' ', 1)[0] + '…'

    banner_html = ''
    if pinfo.get('banner'):
        tone, teks = pinfo['banner']
        banner_html = f'<div class="wrap"><div class="banner {tone}"><p>{esc(teks)}</p></div></div>'

    if pilot:
        desc2 = ('Catatan data: jalur bawaan gunung pilot kami tandai sebagai <strong>RUTE PILOT — belum terverifikasi, '
                 'bukan rute resmi</strong>. Rute publik di halaman ini hanya berasal dari kontribusi komunitas yang lolos tinjauan moderator.')
        info_rows = pinfo.get('info', [])
    else:
        desc2 = ('Halaman ini memakai data dasar Katalog Nasional JEJAKRUTE. Kami tidak menerbitkan jalur, kuota, atau info '
                 'perizinan yang belum terverifikasi — bila kamu punya data lapangan gunung ini, kontribusimu membantu melengkapinya.')
        info_rows = [('Status kurasi', 'Data dasar v1 — detail jalur & perizinan sedang dikurasi'),
                     ('Rute publik', 'Hanya dari kontribusi komunitas yang lolos moderasi'),
                     ('Di aplikasi', 'Data medan & peta offline tersedia di aplikasi JEJAKRUTE')]
    info_html = '\n        '.join(f'<tr><td>{esc(k)}</td><td>{esc(v)}</td></tr>' for k, v in info_rows)

    kosong_style = '' if n_rute == 0 else ' style="display:none"'
    nearby_html = []
    for jarak, o in dekat:
        href = f"/gunung/{slug_of(o)}" if o['jenis'] in ('gunung', 'bukit') else f"/lokasi.html?id={o['id']}"
        oe = f"{fmt_id(o['tinggi'])} M" if o['tinggi'] else o['jenis'].title()
        nearby_html.append(f'''<a href="{href}" class="nearby-card"><div class="nc-name">{esc(o['nama'])}</div><div class="nc-elev">{oe}</div><div class="nc-dist">±{fmt_id(jarak,0)} km dari sini · {esc(o['prov'])}</div></a>''')
    nearby_html.append('''<a href="/katalog.html" class="nearby-card" style="border-style:dashed;display:flex;align-items:center;justify-content:center"><div style="text-align:center"><div style="color:var(--mint);font-family:'Oswald',sans-serif;font-size:15px;font-weight:600;letter-spacing:.05em">Katalog Lengkap</div><div style="color:var(--mut);font-size:11px;margin-top:2px">81 lokasi tersedia</div></div></a>''')

    if d['id'] == 'gunung-sibuatan':
        tips = [('🥾', 'Lapor di Pos GEMPARI', 'Jalur Naga Lingga dikelola GEMPARI. Lapor di pos, ikuti aturan pengelola, dan jangan membuka jalur baru.'),
                ('📡', 'Nyalakan Live Share', 'Bagikan tautan Live Share ke keluarga sebelum mulai. Mereka memantau posisimu dari browser, tanpa perlu memasang aplikasi.'),
                ('⏰', 'Pasang Batas Waktu Turun', 'Tentukan jam wajib turun dan kontak darurat di tab Aman. Bila kamu melewati batasnya, kontakmu menerima peringatan.')]
    else:
        tips = [('🗺️', 'Unduh Data Medan Dulu', f"Unduh peta dan data medan {nama} di aplikasi sebelum berangkat. Di jalur, sinyal bukan rencana — semua harus sudah ada di HP-mu."),
                ('📡', 'Nyalakan Live Share', 'Bagikan tautan Live Share ke keluarga sebelum mulai. Mereka memantau posisimu dari browser, tanpa perlu memasang aplikasi.'),
                ('⏰', 'Pasang Batas Waktu Turun', 'Tentukan jam wajib turun dan kontak darurat di tab Aman. Bila kamu melewati batasnya, kontakmu menerima peringatan.')]
    tips_html = '\n      '.join(f'<div class="tip-card"><div class="t-icon">{i}</div><h4>{esc(t)}</h4><p>{esc(b)}</p></div>' for i, t, b in tips)

    geo_ld = ''
    if d['lat'] is not None:
        geo_ld = f''',"geo":{{"@type":"GeoCoordinates","latitude":"{d['lat']}","longitude":"{d['lng']}"}}'''
    hero = hero_of(d)

    return f'''<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(nama)} — Peta Offline & Rute Pendakian | JEJAKRUTE</title>
<meta name="description" content="{esc(metadesc)}">
<meta property="og:title" content="{esc(nama)} — JEJAKRUTE">
<meta property="og:description" content="{esc(metadesc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://jejakrute.my.id/gunung/{slug}">
<link rel="canonical" href="https://jejakrute.my.id/gunung/{slug}">
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"TouristAttraction","name":"{esc(nama)}","description":"{esc(d['daya'])}"{geo_ld},"address":{{"@type":"PostalAddress","addressRegion":"{esc(d['kab'])} — {esc(d['prov'])}"}}}}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Inter:wght@400;600&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body>
<header class="topbar">
  <div class="topbar-in">
    <nav class="main-nav">
      <a href="/">Beranda</a>
      <a href="/katalog.html">Katalog</a>
      <a href="/rute-komunitas.html" class="on">Rute</a>
      <a href="/feed.html">Komunitas</a>
    </nav>
    <a href="/" class="brand-c" aria-label="JEJAKRUTE Beranda">
      <span class="bs">JEJAKRUTE</span>
      <span class="bsub">Cerita dari Jalur</span>
    </a>
    <div class="top-right">
      <a class="btn-masuk" href="/feed.html">Masuk</a>
    </div>
  </div>
</header>

<div class="breadcrumb">
  <a href="/">Beranda</a><span>/</span>
  <a href="/katalog.html">Katalog</a><span>/</span>
  <a href="/katalog.html">{esc(d['prov'])}</a><span>/</span>
  <span style="color:var(--txt)">{esc(nama)}</span>
</div>

<div class="cover">
  <div class="cover-inner">
    <img src="{hero}" alt="Ilustrasi kawasan {esc(nama)}" loading="eager">
    <div class="cover-shade"></div>
    <div class="cover-copy">
      <div class="cover-kicker">{esc(d['prov'])} — {esc(d['kab'])}</div>
      <h1 class="cover-title">{esc(judul1)}<br>{esc(judul2)}</h1>
      <div class="cover-elev">{elev} DPL</div>
      <div class="cover-hand">{esc(tagline)}</div>
    </div>
    <span class="cover-credit">Foto ilustrasi: Unsplash</span>
  </div>
</div>

<div class="stats-bar">
  <div class="stats-inner">
    <div class="stat"><span class="s-label">Elevasi</span><span class="s-val mint">{elev}</span></div>
    <div class="stat"><span class="s-label">Provinsi</span><span class="s-val">{esc(d['prov'])}</span></div>
    <div class="stat"><span class="s-label">Koordinat</span><span class="s-val">{koord}</span></div>
    <div class="stat"><span class="s-label">Rute komunitas</span><span class="s-val mint"><span data-rute-count>{n_rute}</span> rute</span></div>
    <div class="stat"><span class="s-label">Lokasi terdekat</span><span class="s-val">{esc(terdekat_txt)}</span></div>
  </div>
</div>

{banner_html}

<section class="blk wrap">
  <div class="sec-kicker">kenali dulu</div>
  <h2 class="sec-title">Profil {esc(nama)}</h2>
  <p class="sec-desc">{esc(d['daya'])}</p>
  <p class="sec-desc">{desc2}</p>
  <div class="info-grid">
    <div class="info-card">
      <h3><span class="ic-dot"></span>Data Umum</h3>
      <table class="info-table">
        <tr><td>Nama resmi</td><td>{esc(nama)}</td></tr>
        <tr><td>Jenis</td><td>{esc(d['jenis'].title())}</td></tr>
        <tr><td>Elevasi</td><td>{elev} dpl</td></tr>
        <tr><td>Provinsi</td><td>{esc(d['prov'])}</td></tr>
        <tr><td>Kabupaten</td><td>{esc(d['kab'])}</td></tr>
        <tr><td>Wilayah</td><td>{esc(d['wilayah'])}</td></tr>
        <tr><td>Koordinat</td><td>{koord}{' (perkiraan)' if d['perkiraan'] else ''}</td></tr>
      </table>
      <p class="src-note">Sumber data: {esc(d['sumber'])}</p>
    </div>
    <div class="info-card">
      <h3><span class="ic-dot"></span>Info Lapangan</h3>
      <table class="info-table">
        {info_html}
      </table>
    </div>
  </div>
</section>

<section class="blk wrap">
  <div class="sec-kicker">dari pendaki, untuk pendaki</div>
  <h2 class="sec-title">Rute Komunitas {esc(nama)}</h2>
  <p class="sec-desc">Rute di halaman ini adalah jejak nyata kontribusi pendaki yang lolos tinjauan moderator — bukan garis karangan. Buka pratinjau 3D-nya, atau unduh GPX-nya setelah masuk.</p>
  <div class="rute-list" id="ruteList">
      {rute_cards_html(rute)}
  </div>
  <div class="rute-kosong" id="ruteKosong"{kosong_style}>
    Belum ada rute komunitas untuk {esc(nama)}.<br>
    Sudah pernah mendaki {esc(nama)}? Bagikan jejak GPX-mu — setelah lolos moderasi, rute ini membantu pendaki berikutnya.
  </div>
  <div class="gate-strip">
    <p><strong><span data-rute-count>{n_rute}</span> rute komunitas</strong> tercatat untuk {esc(nama)} — lengkap dengan profil elevasi dan pratinjau 3D.</p>
    <a class="btn-masuk" href="/rute-komunitas.html">Lihat Rute Komunitas</a>
  </div>
</section>

<section class="blk wrap">
  <div class="sec-kicker">navigasi tanpa sinyal</div>
  <h2 class="sec-title">Peta & Data Medan di Aplikasi</h2>
  <p class="sec-desc">Di aplikasi JEJAKRUTE, unduh data medan {esc(nama)} sebelum berangkat — sesudah itu navigasi berjalan tanpa sinyal.</p>
  <div class="peta-dl">
    <div class="peta-preview">
      <img src="{hero}" alt="Ilustrasi kawasan {esc(nama)}">
      <div class="peta-overlay">
        <div class="peta-badge">
          <div class="pb-label">Data Medan Offline</div>
          <div class="pb-name">{esc(nama.replace('Gunung ', '').upper())}</div>
          <div class="pb-size">Topomap + DEM + Rute Komunitas</div>
        </div>
      </div>
    </div>
    <div class="dl-card">
      <h3>Unduh Aplikasinya</h3>
      <p class="dl-txt">Satu aplikasi untuk semua gunung di katalog — gratis, tanpa iklan.</p>
      <ul class="dl-points">
        <li><span class="dot"></span>Peta topografi offline untuk wilayah yang kamu unduh</li>
        <li><span class="dot"></span>Data elevasi DEM — bukan tebakan</li>
        <li><span class="dot"></span><span><span data-rute-count>{n_rute}</span> rute komunitas untuk gunung ini</span></li>
        <li><span class="dot"></span>Profil elevasi per segmen jalur</li>
        <li><span class="dot"></span>Peringatan keluar jalur saat merekam</li>
      </ul>
      <a class="btn-dl" href="{APK_URL}">
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 2a.75.75 0 01.75.75v8.69l2.22-2.22a.75.75 0 011.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.22 2.22V2.75A.75.75 0 0110 2zm-7.25 13.25a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75z"/></svg>
        Unduh Aplikasi Gratis
      </a>
      <span class="dl-note">gratis · tanpa iklan · android 7+</span>
    </div>
  </div>
</section>

<section class="blk wrap">
  <div class="sec-kicker">selamat di jalur</div>
  <h2 class="sec-title">Fitur Keselamatan</h2>
  <div class="feat-grid">
    <div class="feat"><div class="feat-icon mint-bg">🔔</div><div><div class="f-name">Peringatan Keluar Jalur</div><div class="f-desc">Getar dan bunyi saat rekamanmu menyimpang jauh dari rute — kritis saat kabut tebal.</div></div></div>
    <div class="feat"><div class="feat-icon sky-bg">📡</div><div><div class="f-name">Live Share ke Keluarga</div><div class="f-desc">Satu tautan — keluarga memantau posisimu dari browser, tanpa memasang aplikasi.</div></div></div>
    <div class="feat"><div class="feat-icon red-bg">⏰</div><div><div class="f-name">Batas Waktu Turun</div><div class="f-desc">Pasang jam wajib turun; bila terlewat, kontak daruratmu menerima peringatan.</div></div></div>
    <div class="feat"><div class="feat-icon mint-bg">👥</div><div><div class="f-name">Mode Rombongan Offline</div><div class="f-desc">Posisi anggota rombongan terpantau antar-HP tanpa sinyal seluler. Fitur eksperimental — sedang diuji di lapangan.</div></div></div>
    <div class="feat"><div class="feat-icon amber-bg">📍</div><div><div class="f-name">Rekam Jejak & Replay 3D</div><div class="f-desc">Trek otomatis direkam; putar ulang dalam 3D lengkap dengan profil elevasi.</div></div></div>
    <div class="feat"><div class="feat-icon sky-bg">⛰️</div><div><div class="f-name">Data Medan (DEM)</div><div class="f-desc">Elevasi dan kemiringan lereng dari data DEM asli, bukan interpolasi.</div></div></div>
  </div>
</section>

<section class="blk wrap">
  <div class="sec-kicker">persiapan lapangan</div>
  <h2 class="sec-title">Tips Mendaki {esc(nama)}</h2>
  <div class="tips-grid">
      {tips_html}
  </div>
</section>

<section class="blk wrap" style="margin-bottom:0">
  <div class="sec-kicker">eksplorasi lebih</div>
  <h2 class="sec-title">Lokasi Terdekat</h2>
  <div class="nearby-list">
      {chr(10).join(nearby_html)}
  </div>
</section>

<footer class="page-footer">
  <div>
    <div class="foot-brand"><div class="bs">JEJAKRUTE</div><div class="bsub">Cerita dari Jalur</div></div>
    <div class="foot-meta">Aplikasi GPS pendaki & penjelajah alam · Android · Gratis, tanpa iklan</div>
  </div>
  <div class="foot-links">
    <a href="/">Beranda</a><a href="/katalog.html">Katalog</a>
    <a href="/rute-komunitas.html">Rute Komunitas</a>
    <a href="/live.html">Live Share</a><a href="/donasi.html">Donasi</a>
    <a href="/privasi.html">Privasi</a><a href="/ketentuan.html">Ketentuan</a>
  </div>
</footer>

<script>
(function(){{
  var SB_URL = "{SB_URL}", SB_KEY = "{SB_KEY}", LOK = "{d['id']}";
  function fmt(n, dec){{ return Number(n).toLocaleString('id-ID', {{minimumFractionDigits: dec, maximumFractionDigits: dec}}); }}
  function escT(s){{ var t = document.createElement('span'); t.textContent = s == null ? '' : String(s); return t.innerHTML; }}
  fetch(SB_URL + "/rest/v1/community_routes?select=id,nama,jarak_km,naik_m&status=eq.disetujui&lokasi_id=eq." + encodeURIComponent(LOK) + "&order=created_at.desc", {{ headers: {{ apikey: SB_KEY, Authorization: "Bearer " + SB_KEY }} }})
    .then(function(r){{ return r.json(); }})
    .then(function(rows){{
      if (!Array.isArray(rows)) return;
      document.querySelectorAll('[data-rute-count]').forEach(function(el){{ el.textContent = rows.length; }});
      var list = document.getElementById('ruteList');
      var kosong = document.getElementById('ruteKosong');
      if (rows.length) {{
        if (kosong) kosong.style.display = 'none';
        list.innerHTML = rows.map(function(r){{
          return '<div class="rute-card"><div class="rc-main"><div class="rc-name">' + escT(r.nama) + '</div><div class="rc-meta">' + fmt(r.jarak_km, 1) + ' km · naik ' + fmt(r.naik_m, 0) + ' m · lolos moderasi</div></div><a class="btn-ghost" href="/pratinjau-3d.html?rute=' + encodeURIComponent(r.id) + '">Lihat 3D</a></div>';
        }}).join('');
      }} else {{
        list.innerHTML = '';
        if (kosong) kosong.style.display = '';
      }}
    }})
    .catch(function(){{}});
}})();
</script>
</body>
</html>'''

def main():
    ingin = sys.argv[1:]
    outdir = ROOT / 'gunung'
    outdir.mkdir(exist_ok=True)
    n = 0
    for d in KATALOG:
        if d['jenis'] not in ('gunung', 'bukit'):
            continue
        slug = slug_of(d)
        if ingin and slug not in ingin and d['id'] not in ingin:
            continue
        (outdir / f'{slug}.html').write_text(bangun(d), encoding='utf-8')
        n += 1
        print('dibangun:', slug)
    print('total:', n)

if __name__ == '__main__':
    main()
