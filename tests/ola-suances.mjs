
// ola-perfecta2.mjs — igual que ola-perfecta.mjs pero parametrizado: SUANCES (Los Locos)
// centro = OSM exacto; condiciones del pronóstico 7d del ranking (spot Suances/Los Locos)
import { readFileSync, writeFileSync } from 'fs';

const NOMBRE = 'Suances (Los Locos)';
const C = { lat: 43.4387, lon: -4.0468 };   // Playa de Los Locos (OSM 43.4387,-4.0468); mar al NORTE
const radioKm = 0.7;
const EMOD = async (lon, lat, tries = 4) => {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(${lon.toFixed(4)}+${lat.toFixed(4)})`, { signal: AbortSignal.timeout(20000) });
      const j = await r.json();
      if (typeof j.avg === 'number') return Math.abs(j.avg);
    } catch (e) { /* retry */ }
    await new Promise(r => setTimeout(r, 1500 * (i + 1)));
  }
  return null;
};

console.log('1) Rejilla EMODnet 15x15 en', 'Suances (Los Locos)', C);
const rej = [];
for (let j = 0; j < 15; j++) for (let i = 0; i < 15; i++) {
  const lon = C.lon + (i - 7) * (radioKm / 7) * (1 / (111.32 * Math.cos(C.lat * Math.PI / 180)));
  const lat = C.lat + (j - 7) * (radioKm / 7) / 110.57;
  rej.push({ x: i, y: j, lon, lat, h: null });
}
let ok = 0;
for (const p of rej) {
  p.h = await EMOD(p.lon, p.lat);
  if (p.h !== null) ok++;
}
console.log(`   ${ok}/225 sondas ok`);

const prog = JSON.parse(readFileSync('tests/ranking-spots.json', 'utf8'));
const spot = prog.find(s => s.spot.nombre.toLowerCase().includes('locos') || s.spot.nombre.includes('Suances')) ?? prog[0];
let mejor = null;
for (const d of spot.dias) for (const h of d.horas ?? []) if (!mejor || h.HsRompe > (mejor.HsRompe || 0)) mejor = h;
const Hs0 = mejor?.Hs ?? 1.0, T0 = mejor?.T ?? 10, dirDeg = mejor?.dir ?? 330;
console.log(`2) condicion: Hs=${Hs0} m · T=${T0} s · dir=${dirDeg}°`);

const hEn = (lon, lat) => {
  const fx = ((lon - C.lon) * 111.32 * Math.cos(C.lat * Math.PI / 180)) / (radioKm / 7) + 7;
  const fy = ((lat - C.lat) * 110.57) / (radioKm / 7) + 7;
  const i = Math.floor(fx), j = Math.floor(fy);
  if (i < 0 || j < 0 || i >= 14 || j >= 14) return null;
  const tx = fx - i, ty = fy - j;
  const p = (a, b) => rej[a * 15 + b]?.h;
  const h00 = p(j, i), h10 = p(j, i + 1), h01 = p(j + 1, i), h11 = p(j + 1, i + 1);
  if (h00 == null || h10 == null || h01 == null || h11 == null) return null;
  return (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h10 * tx) * ty;
};

const rayos = [];
for (let k = 0; k < 7; k++) {
  let lat = C.lat + radioKm / 110.57 - 0.001;
  let lon = C.lon + (k - 3) * (radioKm / 7) / (111.32 * Math.cos(C.lat * Math.PI / 180)) * 1.1;
  let alfa = Math.PI;
  const traza = [];
  for (let s = 0; s < 220; s++) {
    const h = hEn(lon, lat);
    if (h === null || h <= 0.3) break;
    traza.push({ lon, lat, h });
    const c = Math.sqrt(9.81 * h);
    const d = 0.001;
    const cx = hEn(lon + d, lat), cy = hEn(lon, lat + d);
    if (cx !== null && cy !== null) {
      const dcx = (cx - c) / (d * 111320 * Math.cos(lat * Math.PI / 180));
      const dcy = (cy - c) / (d * 110570);
      const dcdn = dcx * Math.cos(alfa) - dcy * Math.sin(alfa);
      alfa += -(1 / c) * dcdn * 50;
    }
    lon += Math.sin(alfa) * 50 / (111320 * Math.cos(lat * Math.PI / 180));
    lat += Math.cos(alfa) * 50 / 110570;
  }
  rayos.push(traza);
}
const cg = h => Math.sqrt(9.81 * h) / 2;
const HsLocal = h => Hs0 * Math.sqrt(cg(30) / cg(h));
const roturas = [];
for (let k = 0; k < rayos.length; k++) {
  const t = rayos[k];
  for (let s = 1; s < t.length; s++) {
    if (HsLocal(t[s].h) > 0.78 * t[s].h) {
      const p = t[s - 1];
      roturas.push({ rayo: k, lat: p.lat, lon: p.lon, h: +p.h.toFixed(2), HsRompe: +Math.min(HsLocal(p.h), 0.78 * t[s].h).toFixed(2) });
      break;
    }
  }
}
writeFileSync('tests/ola-suances.json', JSON.stringify({ C, nombre: 'Suances (Los Locos)', Hs0, T0, rej, rayos, roturas }, null, 1));
console.log(`3) ${rayos.length} rayos, ${roturas.length} roturas → tests/ola-suances.json`);
