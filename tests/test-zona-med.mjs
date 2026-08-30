
// test-zona-med.mjs — TEST REAL zona Mediterráneo: régimen de oleaje totalmente distinto
// (olas más cortas, levante/poniente, fondos más suaves). Mismo motor, otra costa.
import { estudioTransecto } from '../src/studio/motor.js';

// Spots reales del Mediterráneo peninsular (funcionan con swell de E/NE - "levant")
const SPOTS = [
  { nombre: 'Las Arenas (Valencia)',   latR: 39.4740, lonR: -0.3250, latO: 39.4300, lonO: -0.2900, orient: 'E',  fondo: 'barra de arena', tipo: 'beach break' },
  { nombre: 'El Portet (Moraira)',     latR: 38.6760, lonR:  0.1470, latO: 38.6350, lonO:  0.1800, orient: 'E',  fondo: 'roca/arena',     tipo: 'beach break' },
  { nombre: 'San Juan (Alicante)',     latR: 38.3900, lonR: -0.4400, latO: 38.3500, lonO: -0.4000, orient: 'NE', fondo: 'barra de arena', tipo: 'beach break' },
  { nombre: 'Cala del Portet (Dénia)', latR: 38.8340, lonR:  0.1060, latO: 38.7950, lonO:  0.1400, orient: 'E',  fondo: 'roca',           tipo: 'reef' },
  { nombre: 'Les Bovetes (Dénia)',     latR: 38.8080, lonR:  0.0060, latO: 38.7700, lonO:  0.0400, orient: 'E',  fondo: 'barra de arena', tipo: 'beach break' },
  { nombre: 'Gandia Norte',            latR: 38.9880, lonR: -0.1560, latO: 38.9500, lonO: -0.1200, orient: 'E',  fondo: 'barra de arena', tipo: 'beach break' },
];

async function batimetriaSpot(spot) {
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
  const R = 6371000, rad = Math.PI/180;
  const dTotal = 2*R*Math.asin(Math.sqrt(
    Math.sin((spot.latR-spot.latO)*rad/2)**2 +
    Math.cos(spot.latO*rad)*Math.cos(spot.latR*rad)*Math.sin((spot.lonR-spot.lonO)*rad/2)**2));
  return { xh: perfil.map((p, i) => ({ x: Math.round(dTotal * i/(n-1)), h: +p.h.toFixed(1) })),
           dTotal: Math.round(dTotal), hRompe: perfil[perfil.length-1].h.toFixed(1) };
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

function evaluarSpot(spot, bat, horas) {
  const res = horas.map(h => {
    const e = estudioTransecto({ Hs0: h.Hs, T: h.T, alfa0: 20*Math.PI/180, perfil: bat.xh, estructuras: [] });
    return { ...h, HsRompe: e.puntos[e.puntos.length-1]?.Hs ?? 0 };
  });
  const ideal = spot.tipo === 'reef' ? 1.8 : 1.3; // el Med: olas ideales más pequeñas
  const scoreHoras = res.map(h => {
    const dif = Math.abs(h.HsRompe - ideal);
    let s = Math.max(0, 10 - dif * 4);
    if (h.T >= 10) s += 2.5; else if (h.T >= 7) s += 1;   // en Med, T≥10 ya es swell de levante bueno
    if (h.HsRompe > ideal * 2) s = Math.max(0, s - 4);
    return { ...h, score: +s.toFixed(1) };
  });
  const porDia = {};
  for (const h of scoreHoras) (porDia[h.t.slice(0,10)] ??= []).push(h);
  const dias = Object.entries(porDia).map(([dia, hs]) => ({
    dia, scoreMedio: +(hs.reduce((a,h)=>a+h.score,0)/hs.length).toFixed(1),
    HsRompeMax: Math.max(...hs.map(h=>h.HsRompe)),
    TMedio: +(hs.reduce((a,h)=>a+h.T,0)/hs.length).toFixed(1),
    horasBuenas: hs.filter(h=>h.score>=7).length,
  }));
  return { res: scoreHoras, dias, scoreGlobal: +(dias.reduce((a,d)=>a+d.scoreMedio,0)/dias.length).toFixed(1) };
}

console.log('== MEDITERRÁNEO (Valencia → Alicante): evaluando', SPOTS.length, 'spots ==');
const salida = [];
for (const spot of SPOTS) {
  try {
    const bat = await batimetriaSpot(spot);
    const horas = await pronosticoSpot(spot);
    const r = evaluarSpot(spot, bat, horas);
    salida.push({ spot, bat, scoreGlobal: r.scoreGlobal, dias: r.dias, zona: 'mediterraneo' });
    console.log(`  ${spot.nombre}: ${bat.dTotal} m (h rompe ${bat.hRompe} m) · score ${r.scoreGlobal}/10 · HsRompe máx ${Math.max(...r.dias.map(d=>d.HsRompeMax)).toFixed(1)} m`);
  } catch (e) { console.log(`  ${spot.nombre}: FALLO ${e.message}`); }
  await new Promise(res => setTimeout(res, 800));
}
salida.sort((a,b) => b.scoreGlobal - a.scoreGlobal);
console.log('\n== RANKING MEDITERRÁNEO ==');
salida.forEach((s, i) => console.log(`${i+1}. ${s.spot.nombre} — ${s.scoreGlobal}/10`));
await (await import('fs')).promises.writeFile('tests/ranking-spots-med.json', JSON.stringify(salida, null, 1));
console.log('\nGuardado en tests/ranking-spots-med.json');
