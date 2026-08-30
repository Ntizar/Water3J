
// ola-perfecta.mjs — zoom de playa: dónde rompe exactamente la ola perfecta (spot, hora, X, Y)
// 1) rejilla EMODnet fina (zoom puerto: 15x15 en ~1,2 km, ~86 m/punto como Studio zoom>=14)
// 2) mejor hora del pronóstico 7d (del ranking) → frentes 2D con motor2d (rayos Snell + b real)
// 3) puntos de rotura (Hs<=0.78*h) marcados en mapa Leaflet zoom 16 + KML-ish lista de coordenadas
import { readFileSync, writeFileSync } from 'fs';

const EMOD = async (lon, lat, tries = 4) => {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(${lon.toFixed(4)}+${lat.toFixed(4)})`, { signal: AbortSignal.timeout(20000) });
      const t = await r.text();
      const j = JSON.parse(t);
      if (typeof j.avg === 'number') return Math.abs(j.avg);  // EMODnet: prof. en mar negativa; abs() por seguridad
    } catch (e) { /* retry */ }
    await new Promise(r => setTimeout(r, 1500 * (i + 1)));
  }
  return null;
};

// Centro: playa de Somo/El Brusco — frente a la barra, mirando al NW (43.436,-3.729)
const C = { lat: 43.4594, lon: -3.7314 };   // centro EXACTO de Playa de Somo (OSM way 516058323); mar al norte
const radioKm = 0.7;              // rejilla de 1,4 km de lado
const N = 15;                     // 15x15 = 225 puntos

console.log('1) Descargando rejilla EMODnet 15x15 (~86 m/punto)...');
const rej = [];
for (let j = 0; j < 15; j++) {
  for (let i = 0; i < 15; i++) {
    const lon = C.lon + (i - 7) * (radioKm / 7) * (1 / (111.32 * Math.cos(C.lat * Math.PI / 180)));
    const lat = C.lat + (j - 7) * (radioKm / 7) / 110.57;
    rej.push({ x: i, y: j, lon, lat, h: null });
  }
}
let ok = 0;
for (const p of rej) {
  p.h = await EMOD(p.lon, p.lat);
  if (p.h !== null) ok++;
  process.stdout.write(`\r  ${ok}/${rej.length} sondas ok   `);
}
console.log(`\n  rejilla: ${ok}/225 puntos con profundidad`);

// 2) mejor hora: del ranking ya calculado (21 ago 00:00 GMT, Hs orilla 1.32, T 8.8 — pero pronóstico 7d actual:)
const prog = JSON.parse(readFileSync('tests/ranking-spots.json', 'utf8'));
const somo = prog.find(s => s.spot.nombre.includes('Somo')) ?? prog[0];
let mejor = null;
for (const d of somo.dias) for (const h of d.horas ?? []) {
  if (!mejor || (h.HsRompe > (mejor.HsRompe || 0))) mejor = h;
}
const Hs0 = mejor?.Hs ?? 1.2, T0 = mejor?.T ?? 9, dirDeg = mejor?.dir ?? 315;
console.log(`2) mejor condicion 7d: Hs=${Hs0} m · T=${T0} s · dir=${dirDeg}° (de ${mejor?.fecha ?? 'ranking'})`);

// interpolador bilineal de profundidad
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

// c = sqrt(9.81*h) shallow; rayos desde mar (fila y=0) hacia la costa
const rayos = [];
const NRAY = 7;
for (let k = 0; k < NRAY; k++) {
  // arrancan en el borde mar de la rejilla (j=0, ~0.7 km offshore del centro), repartidos en x
  let lat = C.lat + radioKm / 110.57 - 0.001;                // borde MAR (norte: el Cantábrico)
  let lon = C.lon + (k - 3) * (radioKm / 7) / (111.32 * Math.cos(C.lat * Math.PI / 180)) * 1.1;  // abanico estrecho: dentro de la playa (evita la marisma del este)
  let alfa = Math.PI;                                        // propagación hacia el sur (a la playa)
  const traza = [];
  for (let s = 0; s < 220; s++) {
    const h = hEn(lon, lat);
    if (h === null || h <= 0.3) break;                        // fuera de rejilla o llegó a la orilla
    traza.push({ lon, lat, h });
    const c = Math.sqrt(9.81 * h);
    // gradiente de c (sondas ±100 m; cerca del borde puede fallar → sin refracción ese paso)
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
// punto de rotura: primer punto con Hs local (shoaling desde agua profunda h0=30 m) > 0.78*h
const cg = h => Math.sqrt(9.81 * h) / 2;                     // shallow: cg≈c/2
const HsLocal = h => { const Ks = Math.sqrt(cg(30) / cg(h)); return Hs0 * Ks; };
const roturas = [];
for (let k = 0; k < rayos.length; k++) {
  const t = rayos[k];
  for (let s = 1; s < t.length; s++) {
    if (HsLocal(t[s].h) > 0.78 * t[s].h) {                    // primera vez que supera el límite → rompe aquí
      const p = t[s - 1];
      roturas.push({ rayo: k, lat: p.lat, lon: p.lon, h: +p.h.toFixed(2), HsRompe: +Math.min(HsLocal(p.h), 0.78 * t[s].h).toFixed(2) });
      break;   // el rayo TERMINA en su rotura (no sigue a tierra)
    }
  }
}
writeFileSync('tests/ola-perfecta.json', JSON.stringify({ C, Hs0, T0, dirDeg, rej, rayos, roturas }, null, 1));
console.log(`3) ${rayos.length} rayos trazados, ${roturas.length} puntos de rotura → tests/ola-perfecta.json`);
