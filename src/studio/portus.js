// portus.js — cliente de datos reales de Puertos del Estado (REDCOS)
// API descubierta del código de sus widgets: poem.puertos.es/portus/StationData
// NOTA CORS: puertos.es no permite CORS abierto desde todos los orígenes. Si el fetch
// falla, la UI ofrece carga manual (pegar JSON descargado) — sin fingir datos.

export const ESTACIONES_2D = {
  '1111': 'Bilbao Exterior', '1211': 'Gijón Exterior', '1311': 'Cádiz Exterior',
  '1411': 'Tenerife Sur', '1511': 'Valencia Exterior', '1611': 'Barcelona Exterior',
};

export async function descargarPartida(code, params = 'Hm0,Tp') {
  const url = `https://poem.puertos.es/portus/StationData?code=${code}&params=${params}&format=json`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} (posible CORS — usa carga manual)`);
  return r.json();
}

// Extrae la última partida válida (con flag de calidad si existe)
export function ultimaPartida(json) {
  const filas = Array.isArray(json) ? json : json?.datos ?? json?.data ?? [];
  for (let i = filas.length - 1; i >= 0; i--) {
    const f = filas[i];
    const Hm0 = +(f.Hm0 ?? f.hm0 ?? f[1]);
    const Tp = +(f.Tp ?? f.tp ?? f[2]);
    if (isFinite(Hm0) && Hm0 > 0 && Hm0 < 20 && isFinite(Tp) && Tp > 2 && Tp < 30)
      return { Hs: Hm0, Tp, fecha: f.fecha ?? f.date ?? f[0] ?? 'desconocida' };
  }
  return null;
}

// Carga manual: el usuario pega el JSON descargado de portus.puertos.es
export function partidaManual(texto) {
  return ultimaPartida(JSON.parse(texto));
}
