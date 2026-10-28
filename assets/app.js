/* JEJAKRUTE web — helper bersama.
   Backend: Supabase proyek JKR (sama dengan aplikasi). Kunci anon bersifat
   publik secara desain — keamanan dijaga RLS di server. service_role
   TIDAK PERNAH dipakai di web. */
const SB_URL = "https://qykzrcygsyeznzmsdohp.supabase.co";
// anon key publik-by-design (sama seperti yang tertanam di aplikasi Android)
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a3pyY3lnc3llem56bXNkb2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NDM3MjAsImV4cCI6MjEwODQxOTcyMH0.T4y-jdD9OJK8LSNE26mydKXWDzCKoIeCy_BBvm57LlA";
const APK_URL = "https://github.com/FinOwi/jejakrute/releases/download/v0.34.5/JEJAKRUTE-v0.34.5-universal.apk";

function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function fmtTgl(iso){if(!iso)return"—";const d=new Date(iso);return d.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}
function fmtKm(v){if(v==null)return"—";return Number(v).toFixed(1).replace(".",",")+" km"}
function gpxUrl(path){return SB_URL+"/storage/v1/object/public/media/"+path.split("/").map(encodeURIComponent).join("/")}

async function sbGet(path){
  const r=await fetch(SB_URL+"/rest/v1/"+path,{headers:{apikey:SB_KEY,Authorization:"Bearer "+SB_KEY}});
  if(!r.ok) throw new Error("HTTP "+r.status);
  return r.json();
}
async function sbRpc(fn,body){
  const r=await fetch(SB_URL+"/rest/v1/rpc/"+fn,{method:"POST",headers:{apikey:SB_KEY,Authorization:"Bearer "+SB_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok) throw new Error("HTTP "+r.status);
  return r.json();
}

/* Ambil rute komunitas (status menunggu/disetujui memang terbaca publik via RLS)
   + peta kontributor dari profiles (terbaca publik). */
async function ambilRuteKomunitas(lokasiId){
  let q="community_routes?select=id,user_id,nama,lokasi_id,lokasi_nama,gpx_path,jarak_km,naik_m,status,unduhan,pemakaian,created_at&order=created_at.desc&limit=100";
  if(lokasiId) q+="&lokasi_id=eq."+encodeURIComponent(lokasiId);
  const routes=await sbGet(q);
  if(!routes.length) return routes;
  const ids=[...new Set(routes.map(r=>r.user_id))];
  try{
    const profs=await sbGet("profiles?select=id,nama,username&id=in.("+ids.join(",")+")");
    const map={}; profs.forEach(p=>map[p.id]=p);
    routes.forEach(r=>r._profil=map[r.user_id]||null);
  }catch(e){/* kontributor tampil anonim bila profil gagal dimuat */}
  return routes;
}

function labelStatusRute(st){
  return st==="disetujui"
    ? '<span class="pill verif">Rute Komunitas Terverifikasi</span>'
    : '<span class="pill belum">Jejak Komunitas — Belum Terverifikasi</span>';
}
function namaKontributor(r){
  const p=r._profil;
  if(p && p.username) return "@"+esc(p.username);
  if(p && p.nama) return esc(p.nama);
  return "Pendaki JEJAKRUTE";
}
function kartuRute(r){
  return '<article class="route"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">'
    +'<h3>'+esc(r.nama||"Rute pendakian")+'</h3>'+labelStatusRute(r.status)+'</div>'
    +'<p class="meta">oleh <b style="color:var(--txt)">'+namaKontributor(r)+'</b>'
    +(r.lokasi_nama?' • '+esc(r.lokasi_nama):'')+' • '+fmtTgl(r.created_at)+'</p>'
    +'<div class="nums"><span>'+fmtKm(r.jarak_km)+'</span><span>▲ '+Math.round(r.naik_m||0)+' m</span>'
    +((r.unduhan||r.pemakaian)?'<span style="color:var(--mut);font-weight:600">⬇ '+r.unduhan+' • dipakai '+r.pemakaian+'×</span>':'')
    +'</div><div class="foot"><span class="meta">Berkas GPX publik dari rekaman pendaki</span>'
    +'<span style="display:flex;gap:8px"><a class="btn sm ghost" href="pratinjau-3d.html?rute='+r.id+'">Lihat 3D</a>'
    +'<button class="btn sm" type="button" data-gpx="'+gpxUrl(r.gpx_path)+'">Unduh GPX</button></span></div></article>';
}

/* Tandai menu aktif */
document.addEventListener("DOMContentLoaded",()=>{
  const here=location.pathname.split("/").pop()||"index.html";
  document.querySelectorAll("nav.menu a").forEach(a=>{
    if(a.getAttribute("href")===here) a.classList.add("aktif");
  });
});
