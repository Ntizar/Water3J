// mapa-critico.mjs — mapa con los puntos críticos (spot mejor valorado + roturas) y PDF completo
// 1) Leaflet headless (tiles OSM reales) → captura PNG por zona
// 2) incrusta la captura en el informe → PDF
import puppeteer from 'puppeteer';
import { readFileSync, existsSync } from 'fs';

const cant = JSON.parse(readFileSync('tests/ranking-spots.json', 'utf8'));
const med = JSON.parse(readFileSync('tests/ranking-spots-med.json', 'utf8'));
const todos = [...cant, ...med].sort((a, b) => b.scoreGlobal - a.scoreGlobal);

// mini-servidor para servir el HTML con Leaflet (file:// no carga tiles bien en algunos casos)
import { createServer } from 'http';
const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body{margin:0;padding:0} #m{width:1000px;height:640px}
.etq{font:600 11px system-ui;background:rgba(255,255,255,.92);border:1px solid #2563eb;border-radius:6px;padding:2px 6px}</style>
</head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const puntos = ${JSON.stringify(todos.map(s => ({ nombre: s.spot.nombre, lat: s.spot.latR, lon: s.spot.lonR, score: s.scoreGlobal, HsMax: Math.max(...s.dias.map(d => d.HsRompeMax)) })))};
const mapa = L.map('m', { zoomControl: false, attributionControl: false }).setView([41.3, -1.5], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
window.__listo = false;
for (const s of puntos) {
  const color = s.score >= 6.5 ? '#1a9850' : s.score >= 5.5 ? '#f4a742' : '#c0392b';
  L.circleMarker([s.lat, s.lon], { radius: 11, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95 }).addTo(mapa);
  L.tooltip({ permanent: true, direction: 'top', offset: [0, -8], className: 'etq' })
   .setLatLng([s.lat, s.lon]).setContent(\`\${s.nombre} — \${s.score}/10\`).addTo(mapa);
}
window.__err = null;
// sanity: contar capas
setTimeout(() => { window.__nCapas = Object.keys(mapa._layers).length; }, 500);
setTimeout(() => window.__listo = true, 2500);
</script></body></html>`;

const fs = await import('fs');
fs.writeFileSync('tests/mapa-criticos.html', html);
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.setViewport({ width: 1000, height: 700 });
await p.goto('file:///C:/Users/d_ant/Projects/Water3J/tests/mapa-criticos.html', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 4000));
await p.screenshot({ path: 'tests/mapa-criticos.png' });
await b.close();
console.log('Mapa capturado: tests/mapa-criticos.png');
