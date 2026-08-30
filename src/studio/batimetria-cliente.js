// batimetria-cliente.js — descarga batimetría real de EMODnet (sin clave, CORS abierto)
// + caché en IndexedDB para no repetir descargas.
import { guardarBateria, cargarBateria } from './db.js';

export async function descargarBateria(lat, lon, anchoKm = 8, n = 9) {
  const clave = `bat_${lat.toFixed(3)}_${lon.toFixed(3)}_${anchoKm}_${n}`;
  const cache = await cargarBateria(clave);
  if (cache) return cache;

  const dLat = anchoKm / 111;
  const dLon = anchoKm / (111 * Math.cos(lat * Math.PI / 180));
  const puntos = [];
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++)
      puntos.push({
        lat: lat - dLat/2 + dLat * j/(n-1),
        lon: lon - dLon/2 + dLon * i/(n-1),
        i, j,
      });

  const resultados = await Promise.all(puntos.map(async p => {
    try {
      const url = `https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(${p.lon.toFixed(4)}+${p.lat.toFixed(4)})`;
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      // Convencion EMODnet (T17): NEGATIVO = agua (bajo nivel del mar), POSITIVO = tierra.
      // En tierra no hay profundidad valida -> h=null ( mascara de costa), nunca abs().
      const hAgua = d.avg != null && d.avg < 0 ? -d.avg : null;
      return { ...p, h: hAgua, tierra: d.avg != null && d.avg >= 0, fuente: 'EMODnet' };
    } catch (e) {
      return { ...p, h: null, error: e.message };
    }
  }));

  const h = new Float32Array(n * n);
  let fallos = 0;
  for (const r of resultados) {
    const idx = r.j * n + r.i;
    if (r.h == null) { h[idx] = -1; fallos++; }
    else h[idx] = Math.max(0.1, r.h);
  }
  const rejilla = { nx: n, ny: n, x0: lon - dLon/2, y0: lat - dLat/2,
                    dx: dLon/(n-1), dy: dLat/(n-1), h, unidad: 'grados',
                    latCentro: lat, lonCentro: lon, anchoKm, fallos, fuente: 'EMODnet DTM' };
  await guardarBateria(clave, rejilla);
  return rejilla;
}

export function rejillaEnMetros(rejilla) {
  const mPorLat = 111320;
  const mPorLon = 111320 * Math.cos(rejilla.latCentro * Math.PI / 180);
  return {
    ...rejilla,
    x0: rejilla.x0 * mPorLon, y0: rejilla.y0 * mPorLat,
    dx: rejilla.dx * mPorLon, dy: rejilla.dy * mPorLat,
    unidad: 'metros',
  };
}
export function metrosALatLon(rejillaM, x, y) {
  const mPorLat = 111320;
  const mPorLon = 111320 * Math.cos(rejillaM.latCentro * Math.PI / 180);
  return { lat: y / mPorLat, lon: x / mPorLon };
}
