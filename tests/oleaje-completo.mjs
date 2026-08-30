
// oleaje-completo.mjs — T18: entender el oleaje de las boyas y el clima previsto
// - desglose swell (mar de fondo) vs wind wave (mar de viento) por hora
// - viento: offshore (calidad++), onshore (calidad--), velocidad
// - clima: lluvia y nubes por hora
import { writeFileSync } from 'fs';

const SPOTS = [
  { nombre: 'Somo (Cantabria)', lat: 43.436, lon: -3.729, orient: 'NW', ideal: [0.8, 1.8] },
  { nombre: 'Suances (Los Locos)', lat: 43.462, lon: -4.048, orient: 'N', ideal: [0.9, 2.0] },
  { nombre: 'Liencres (El Madero)', lat: 43.464, lon: -3.950, orient: 'N', ideal: [0.8, 1.8] },
];

const fetchJSON = async (u, tries = 3) => {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(25000) });
      if (r.ok) return r.json();
    } catch (e) {}
    await new Promise(rr => setTimeout(rr, 1200 * (i + 1)));
  }
  return null;
};

// calidad de viento: dirección de viento vs orientación de la playa (a qué dirección mira la playa)
const calidadViento = (dirViento, orientPlaya) => {
  const delta = Math.abs(((dirViento - orientPlaya + 540) % 360) - 180);  // 0 = viento de mar (onshore), 180 = de tierra
  if (delta > 140) return { tipo: 'offshore', nota: 1.0 };               // viento de tierra: cara lisa
  if (delta > 100) return { tipo: 'cruzado-tierra', nota: 0.9 };
  if (delta > 60)  return { tipo: 'cruzado', nota: 0.7 };
  if (delta > 30)  return { tipo: 'cruzado-mar', nota: 0.45 };
  return { tipo: 'onshore', nota: 0.2 };                                  // revuelto el mar
};

const res = [];
for (const s of SPOTS) {
  const u = 'https://marine-api.open-meteo.com/v1/marine?latitude=' + s.lat + '&longitude=' + s.lon +
    '&hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period,swell_wave_direction,wind_wave_height,wind_wave_direction&forecast_days=7&timezone=UTC';
  const u2 = 'https://api.open-meteo.com/v1/forecast?latitude=' + s.lat + '&longitude=' + s.lon +
    '&hourly=wind_speed_10m,wind_direction_10m,precipitation,cloud_cover&forecast_days=7&timezone=UTC';
  const m = await fetchJSON(u), w = await fetchJSON(u2);
  if (!m || !w) { console.log('FALLO datos', s.nombre); continue; }

  const horas = [];
  for (let i = 0; i < m.hourly.time.length; i++) {
    const Hs = m.hourly.wave_height?.[i] ?? null;
    if (Hs == null) continue;
    const swellH = m.hourly.swell_wave_height?.[i] ?? 0, swellT = m.hourly.swell_wave_period?.[i] ?? 0, swellD = m.hourly.swell_wave_direction?.[i] ?? 0;
    const windH = m.hourly.wind_wave_height?.[i] ?? 0, windD = m.hourly.wind_wave_direction?.[i] ?? 0;
    const vVel = w.hourly.wind_speed_10m?.[i] ?? 0, vDir = w.hourly.wind_direction_10m?.[i] ?? 0;
    const cv = calidadViento(vDir, s.orient);
    // desglose de energía: qué % del oleaje total es swell de fondo (T>=8) vs mar de viento
    const fracSwell = Hs > 0 ? Math.min(1, swellH / Hs) : 0;
    horas.push({
      t: m.hourly.time[i], Hs, T: m.hourly.wave_period?.[i] ?? 0, dir: m.hourly.wave_direction?.[i] ?? 0,
      swellH, swellT, swellD, windH, windD, fracSwell: +fracSwell.toFixed(2),
      viento: { vel: vVel, dir: vDir, tipo: cv.tipo, nota: cv.nota },
      clima: { lluvia: w.hourly.precipitation?.[i] ?? 0, nubes: w.hourly.cloud_cover?.[i] ?? 0 },
    });
  }

  // resumen diario con el viento integrado
  const dias = {};
  for (const h of horas) {
    const d = h.t.slice(0, 10);
    (dias[d] = dias[d] || []).push(h);
  }
  const resumen = Object.entries(dias).map(([d, hs]) => {
    const swellDominante = hs.reduce((a, b) => b.swellH > a.swellH ? b : a);
    const vientoMedio = hs.reduce((a, b) => a + b.viento.vel, 0) / hs.length;
    const horasOff = hs.filter(h => h.viento.tipo === 'offshore' && h.viento.vel < 15).length;
    const horasOn = hs.filter(h => h.viento.tipo === 'onshore' && h.viento.vel > 15).length;
    return {
      dia: d, horas: hs.length,
      HsMax: +Math.max(...hs.map(h => h.Hs)).toFixed(2),
      swellDominante: { H: swellDominante.swellH, T: swellDominante.swellT, dir: swellDominante.swellD },
      fracSwellMedio: +(hs.reduce((a, b) => a + b.fracSwell, 0) / hs.length).toFixed(2),
      vientoMedioKmh: +vientoMedio.toFixed(1),
      horasOffshore: horasOff, horasOnshoreFuerte: horasOn,
      lluviaTotal: +hs.reduce((a, b) => a + b.clima.lluvia, 0).toFixed(1),
    };
  });
  res.push({ spot: s, resumen });
  console.log(s.nombre + ': ' + resumen.length + ' días, swell dominante ejemplo: ' + JSON.stringify(resumen[3]?.swellDominante ?? resumen[0].swellDominante));
}
writeFileSync('tests/oleaje-completo.json', JSON.stringify(res, null, 1));
console.log('→ tests/oleaje-completo.json');
