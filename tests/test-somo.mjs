
// test-somo.mjs — TEST REAL playa de Somo (Cantabria)
// Oleaje horario real (Open-Meteo Marine, 14 días, 360 registros) + batimetría real EMODnet
// + nuestra física (biblia). Pregunta: ¿qué hace la costa y qué días hay surf?
import { estudioTransecto } from '../src/studio/motor.js';

const LAT_OFFSHORE = 43.398, LON_OFFSHORE = -3.7130;

// ---------- 1) transecto real (EMODnet, medido en esta misma ejecución) ----------
const pts = [
  [43.398, -3.7130], [43.404, -3.7155], [43.410, -3.7180],
  [43.416, -3.7205], [43.421, -3.7227], [43.436, -3.7290],
  [43.439, -3.7303],
];
const perfil = [];
for (const [lat, lon] of pts) {
  const r = await fetch(`https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(${lon.toFixed(4)}+${lat.toFixed(4)})`);
  const d = await r.json();
  perfil.push({ lat, lon, h: Math.max(0.3, Math.abs(d.avg)) });
}
function dist(a, b) {
  const R = 6371000, rad = Math.PI/180;
  const s = Math.sin((b.lat-a.lat)*rad/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lon-a.lon)*rad/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}
let ac = 0;
const perfilXH = perfil.map((p, i) => {
  if (i > 0) ac += dist(perfil[i-1], p);
  return { x: Math.round(ac), h: +p.h.toFixed(1) };
});
// reordenar mar→costa: el punto 0 es el más marino (78.9 m); la lista ya va hacia la orilla
console.log('== BATIMETRÍA REAL (EMODnet) ==');
console.log(perfilXH.map(p => `x=${p.x} m h=${p.h} m`).join(' | '));

// ---------- 2) oleaje horario real de 14 días ----------
console.log('\n== OLEAJE REAL — Open-Meteo Marine (14 días horarios) ==');
const url = 'https://marine-api.open-meteo.com/v1/marine?latitude=43.46&longitude=-3.78' +
  '&hourly=wave_height,wave_period,wave_direction&start_date=2026-08-16&end_date=2026-08-30';
const d = (await (await fetch(url)).json()).hourly;
const filas = d.time.map((t, i) => ({ t, Hs: d.wave_height[i], T: d.wave_period[i], dir: d.wave_direction[i] }))
  .filter(f => f.Hs != null && f.T != null);
console.log(`registros válidos: ${filas.length}`);
const hs = filas.map(f => f.Hs);
console.log(`Hs min/med/max: ${Math.min(...hs).toFixed(2)} / ${(hs.reduce((a,b)=>a+b,0)/hs.length).toFixed(2)} / ${Math.max(...hs).toFixed(2)} m`);

// ---------- 3) física: dónde rompe y con qué Hs en CADA registro horario ----------
console.log('\n== NUESTRA FÍSICA APLICADA A CADA HORA REAL ==');
const resultados = filas.map(f => {
  const e = estudioTransecto({ Hs0: f.Hs, T: f.T, alfa0: 20*Math.PI/180, perfil: perfilXH, estructuras: [] });
  const r = (() => { let HsMax = 0, xRotura = null;
    for (const p of e.puntos) { if (p.Hs > HsMax) HsMax = p.Hs; if (p.rompe && xRotura == null) xRotura = p.x; }
    return { HsMax, xRotura }; })();
  return { ...f, HsOrilla: r.HsMax, xRotura: r.xRotura };
});

// estadísticas de rotura
const conRotura = resultados.filter(r => r.xRotura != null);
const xRoturas = conRotura.map(r => r.xRotura);
console.log(`Horas con rotura en el transecto: ${conRotura.length}/${resultados.length}`);
console.log(`Zona de rotura: x = ${Math.min(...xRoturas)}–${Math.max(...xRoturas)} m desde el borde exterior`);

// días de surf: criterio real de surf — Hs en la rompiente 0.6–2.5 m y periodo decente
console.log('\n== DÍAS MEJORES PARA SURFEAR (Hs en la rompiente 0.6–2.5 m, T ≥ 8 s) ==');
const porDia = {};
for (const r of resultados) {
  const dia = r.t.slice(0, 10);
  (porDia[dia] ??= []).push(r);
}
const ranking = Object.entries(porDia).map(([dia, horas]) => {
  const hMaxDia = Math.max(...horas.map(h => h.HsOrilla));
  const tMed = horas.reduce((a, h) => a + h.T, 0) / horas.length;
  const horasSurf = horas.filter(h => h.HsOrilla >= 0.6 && h.HsOrilla <= 2.5 && h.T >= 8);
  return { dia, hMaxDia, tMed, horasSurf: horasSurf.length, mejorH: horasSurf.length ? horasSurf[0].HsOrilla : null };
}).sort((a, b) => b.horasSurf - a.horasSurf || b.hMaxDia - a.hMaxDia);

for (const r of ranking) {
  const barra = '█'.repeat(Math.round(Math.min(r.hMaxDia, 3) * 8));
  console.log(`${r.dia}  HsOrilla max=${r.hMaxDia.toFixed(2)} m  T̄=${r.tMed.toFixed(1)} s  horas surf: ${r.horasSurf}  ${barra}`);
}
const mejor = ranking[0];
const mejorHora = porDia[mejor.dia].filter(h => h.HsOrilla >= 0.6 && h.HsOrilla <= 2.5 && h.T >= 8)[0];
console.log(`\nMEJOR DÍA: ${mejor.dia} — mejor hora ~${mejorHora?.t.slice(11)} con Hs orilla ${mejorHora?.HsOrilla} m, T ${mejorHora?.T} s`);

// ---------- 4) ¿cómo cambia la costa? (transporte neto aproximado) ----------
console.log('\n== CÓMO CAMBIA LA COSTA (aprox de transporte por oleaje) ==');
// CERC (Coastal Engineering Research Center): transporte ∝ Hs^5 (energía que moviliza sedimento)
// comparar la energía de las 2 semanas vs un temporal típico invernal
const E2semanas = hs.reduce((a, h) => a + h**5, 0);
const temporal = 3.0; // temporal invernal típico en la costa vasco-cántabra
const EtemporalHora = temporal**5;
console.log(`Energía de transporte acumulada (14 días): ${E2semanas.toFixed(1)} (unidades relativas Hs^5·h)`);
console.log(`Un temporal de ${temporal} m muestras ${EtemporalHora.toFixed(0)} por hora → ${E2semanas.toFixed(1)}/${EtemporalHora} = ${(E2semanas/EtemporalHora).toFixed(1)} horas de temporal equivalen a estas 2 semanas`);
// rodales (barra) con la física: posición de rotura media
const xMedio = xRoturas.reduce((a,b)=>a+b,0)/xRoturas.length;
console.log(`La barra se activa (rompe) a x̄ = ${xMedio.toFixed(0)} m de la orilla en la mayoría de mareas → es donde se mueve la arena`);
