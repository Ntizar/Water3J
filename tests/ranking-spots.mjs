
// ranking-spots.mjs — ¿dónde están las mejores olas? Motor de ranking de spots
// Para cada spot: batimetría real (EMODnet) + pronóstico horario real (Open-Meteo Marine)
// + física de la biblia → Hs en la rompiente, periodo, calidad de surf.
import { estudioTransecto } from '../src/studio/motor.js';

// Spots reales del Cantábrico: [nombre, lat punto rompiente, lon, lat offshore (fetch), orientación]
const SPOTS = [
  { nombre: 'Somo (Cantabria)',        latR: 43.436, lonR: -3.7290, latO: 43.398, lonO: -3.7130, orient: 'NW', fondo: 'barra de arena', tipo: 'beach break' },
  { nombre: 'Berria (Cantabria)',      latR: 43.433, lonR: -3.7520, latO: 43.400, lonO: -3.7360, orient: 'N',  fondo: 'barra de arena', tipo: 'beach break' },
  { nombre: 'Los Locos (Suances)',     latR: 43.462, lonR: -4.0480, latO: 43.425, lonO: -4.0320, orient: 'N',  fondo: 'roca/arena',     tipo: 'beach break' },
  { nombre: 'El Brusco (Noja)',        latR: 43.477, lonR: -3.7070, latO: 43.445, lonO: -3.6910, orient: 'N',  fondo: 'barra de arena', tipo: 'beach break' },
  { nombre: 'Mundaka (Bizkaia)',       latR: 43.317, lonR: -2.6920, latO: 43.280, lonO: -2.6760, orient: 'NW', fondo: 'barra ría',      tipo: 'rivermouth point' },
  { nombre: 'Laga (Bizkaia)',          latR: 43.378, lonR: -2.6140, latO: 43.345, lonO: -2.5980, orient: 'NW', fondo: 'roca/arena',     tipo: 'beach break' },
  { nombre: 'Zarautz (Gipuzkoa)',      latR: 43.286, lonR: -2.1680, latO: 43.250, lonO: -2.1520, orient: 'NW', fondo: 'barra de arena', tipo: 'beach break' },
  { nombre: 'Zurriola (Donostia)',     latR: 43.323, lonR: -1.9860, latO: 43.290, lonO: -1.9700, orient: 'NW', fondo: 'barra de arena', tipo: 'beach break' },
];

async function batimetriaSpot(spot) {
  // transecto de 5 puntos de offshore (profundo) a rompiente
  const n = 5, perfil = [];
  for (let i = 0; i < n; i++) {
    const lat = spot.latO + (spot.latR - spot.latO) * i / (n-1);
    const lon = spot.lonO + (spot.lonR - spot.lonO) * i / (n-1);
    let d = null;
    for (let intento = 0; intento < 3; intento++) {
      try {
        const r = await fetch(`https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(${lon.toFixed(4)}+${lat.toFixed(4)})`);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        d = await r.json(); break;
      } catch (e) { if (intento === 2) throw e; await new Promise(res => setTimeout(res, 1500 * (intento + 1))); }
    }
    perfil.push({ h: Math.max(0.5, Math.abs(d.avg ?? 10)) });
  }
  // distancias: haversine offshore→rompiente
  const R = 6371000, rad = Math.PI/180;
  const dTotal = 2*R*Math.asin(Math.sqrt(
    Math.sin((spot.latR-spot.latO)*rad/2)**2 +
    Math.cos(spot.latO*rad)*Math.cos(spot.latR*rad)*Math.sin((spot.lonR-spot.lonO)*rad/2)**2));
  let ac = 0;
  const xh = perfil.map((p, i) => {
    const x = Math.round(dTotal * i / (n-1));
    return { x, h: +p.h.toFixed(1) };
  });
  return { xh, dTotal: Math.round(dTotal), hRompe: xh[xh.length-1].h };
}

async function pronosticoSpot(spot, dias = 7) {
  const hoy = new Date(), fin = new Date(hoy.getTime() + dias*864e5);
  const f = x => x.toISOString().slice(0, 10);
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${spot.latO}&longitude=${spot.lonO}` +
    `&hourly=wave_height,wave_period,wave_direction&start_date=${f(hoy)}&end_date=${f(fin)}`;
  const d = (await (await fetch(url)).json()).hourly;
  return d.time.map((t, i) => ({ t, Hs: d.wave_height[i], T: d.wave_period[i], dir: d.wave_direction[i] }))
    .filter(x => x.Hs != null && x.T != null);
}

// física del spot: Hs en la rompiente para cada hora
function evaluarSpot(spot, bat, horas) {
  const res = horas.map(h => {
    const e = estudioTransecto({ Hs0: h.Hs, T: h.T, alfa0: 20*Math.PI/180, perfil: bat.xh, estructuras: [] });
    const pFin = e.puntos[e.puntos.length-1];
    return { ...h, HsRompe: pFin?.Hs ?? 0 };
  });
  // scoring de surf (heurística estándar de surf reports):
  // Hs ideal por tipo de spot + bonus periodo + penalización exceso
  const ideal = spot.tipo === 'rivermouth point' ? 2.2 : 1.5;
  const scoreHoras = res.map(h => {
    const dif = Math.abs(h.HsRompe - ideal);
    let s = Math.max(0, 10 - dif * 4);            // cercanía al ideal
    if (h.T >= 12) s += 3; else if (h.T >= 9) s += 1.5;  // mar de fondo
    if (h.HsRompe > ideal * 2) s = Math.max(0, s - 4);   // demasiado grande
    return { ...h, score: +s.toFixed(1) };
  });
  const scoreDia = {};
  for (const h of scoreHoras) {
    const d = h.t.slice(0, 10);
    (scoreDia[d] ??= []).push(h);
  }
  const dias = Object.entries(scoreDia).map(([dia, hs]) => ({
    dia, scoreMedio: +(hs.reduce((a,h)=>a+h.score,0)/hs.length).toFixed(1),
    scoreMax: Math.max(...hs.map(h=>h.score)),
    HsRompeMax: Math.max(...hs.map(h=>h.HsRompe)),
    TMedio: +(hs.reduce((a,h)=>a+h.T,0)/hs.length).toFixed(1),
    horasBuenas: hs.filter(h=>h.score>=7).length,
  }));
  const scoreGlobal = +(dias.reduce((a,d)=>a+d.scoreMedio,0)/dias.length).toFixed(1);
  return { res: scoreHoras, dias, scoreGlobal };
}

console.log('Evaluando', SPOTS.length, 'spots con batimetría y pronóstico reales…');
const salida = [];
for (const spot of SPOTS) {
  try {
    const bat = await batimetriaSpot(spot);
    const horas = await pronosticoSpot(spot);
    const r = evaluarSpot(spot, bat, horas);
    salida.push({ spot, bat, scoreGlobal: r.scoreGlobal, dias: r.dias, ejemplo: r.res[Math.floor(r.res.length/2)] });
    console.log(`  ${spot.nombre}: batimetría ${bat.dTotal} m (rompe en h=${bat.hRompe} m) · score ${r.scoreGlobal}/10`);
  } catch (e) { console.log(`  ${spot.nombre}: FALLO ${e.message}`); }
  await new Promise(res => setTimeout(res, 800)); // cortesía con EMODnet
}
salida.sort((a,b) => b.scoreGlobal - a.scoreGlobal);
console.log('\n== RANKING ==');
salida.forEach((s, i) => console.log(`${i+1}. ${s.spot.nombre} — ${s.scoreGlobal}/10 (HsRompe máx 7d: ${Math.max(...s.dias.map(d=>d.HsRompeMax)).toFixed(1)} m)`));

await (await import('fs')).promises.writeFile('tests/ranking-spots.json', JSON.stringify(salida, null, 1));
console.log('\nGuardado en tests/ranking-spots.json');
