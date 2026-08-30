
// mapa-suances.mjs — mapa zoom playa Los Locos (Suances) con roturas exactas
import { readFileSync, writeFileSync } from 'fs';
const j = JSON.parse(readFileSync('tests/ola-suances.json', 'utf8'));

const lineasRayo = j.rayos.filter(t => t.length > 2).map(t =>
  `L.polyline(${JSON.stringify(t.map(p => [p.lat, p.lon]))}, {color:'#2563eb', weight:2, opacity:.75}).addTo(mapa);`).join('\n');

const marcadores = j.roturas.map(r => `
  L.circleMarker([${r.lat}, ${r.lon}], {radius: 9, color:'#fff', weight:2, fillColor:'#c0392b', fillOpacity:.95})
   .bindTooltip('<b>ROMPE aqui</b><br>h=${r.h} m · Hs rompe=${r.HsRompe} m', {permanent:false}).addTo(mapa);
  L.tooltip({permanent:true, direction:'top', className:'etq'}).setLatLng([${r.lat}, ${r.lon}])
   .setContent('\u2b50 ${r.HsRompe} m').addTo(mapa);`).join('\n');

const rejillaHeat = j.rej.filter(p=>p.h!==null && p.h>2).map(p =>
  `L.circle([${p.lat.toFixed(5)},${p.lon.toFixed(5)}], {radius:45, color:'', fillColor:'#1d4e89', fillOpacity:${Math.min(0.06 + p.h/80, .45).toFixed(2)}, weight:0}).addTo(mapa);`).join('');

const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
  body{margin:0} #m{width:1000px;height:850px}
  .etq{background:#fff;border:1.5px solid #c0392b;color:#111;font:600 11px system-ui;padding:2px 6px;border-radius:6px;box-shadow:0 1px 4px #0004}
  .tit{position:absolute;top:10px;left:50px;z-index:500;background:#ffffffee;padding:8px 14px;border-radius:8px;font:600 14px system-ui;box-shadow:0 2px 8px #0003}
</style></head><body>
<div id="m"></div><div class="tit">\u{1f30a} Ola perfecta · Suances — Los Locos — Hs offshore ${j.Hs0} m · T ${j.T0} s — puntos rojos = rompe</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const mapa = L.map('m', {zoomControl:true});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19}).addTo(mapa);
${rejillaHeat}
${lineasRayo}
${marcadores}
const pts = ${JSON.stringify([...j.roturas.map(r => [r.lat, r.lon]), [j.C.lat + 0.7 / 110.57, j.C.lon], [j.C.lat, j.C.lon]])};
mapa.fitBounds(L.latLngBounds(pts).pad(0.25));
setTimeout(()=>window.__listo=true, 2500);
</script></body></html>`;
await (await import('fs')).promises.writeFile('tests/ola-suances.html', html);
console.log('HTML Suances generado');
