// puertos.js — cliente Puertos del Estado (Portus) + parser SIMAR
// Sin dependencias: funciona en Node (tests) y navegador (fetch).
// Crédito obligatorio de fuente: ver docs/10-guia-datos-puertos.md

export const FUENTE = 'Puertos del Estado (Portus)';

// Boyas/puntos principales (códigos Portus); se amplía desde el selector de la app
export const ESTACIONES = {
  '3545': { nombre: 'Boya de Bilbao exterior', lat: 43.37, lon: -3.05 },
  '1112': { nombre: 'Boya de Gijón exterior',   lat: 43.55, lon: -5.72 },
  '2342': { nombre: 'Boya de Cádiz exterior',   lat: 36.51, lon: -6.95 },
  '3544': { nombre: 'Boya de Tenerife sur',     lat: 28.03, lon: -16.62 },
  '2080': { nombre: 'Boya de Valencia exterior', lat: 39.52, lon: 0.21 },
  '2341': { nombre: 'Boya de Barcelona exterior', lat: 41.29, lon: 2.25 },
};

const BASE = 'https://poem.puertos.es/portus/StationData';

function fechaUTC(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}@${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
}

// Descarga la serie de las últimas N horas de una estación.
// proxyOpcional: prefijo URL si se necesita (p. ej. un proxy CORS propio); '' = directo.
export async function descargarSerie(codigo, { horas = 24, proxyOpcional = '', params = 'Hm0,Tp,DirM' } = {}) {
  const fin = new Date();
  const ini = new Date(fin.getTime() - horas * 3600e3);
  const url = `${proxyOpcional}${BASE}?code=${codigo}&params=${params}&from=${fechaUTC(ini)}&to=${fechaUTC(fin)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Puertos del Estado respondió ${r.status}`);
  return { codigo, serie: await r.json(), fuente: FUENTE };
}

// Convierte la respuesta de la API en registros simples {t, Hs, Tp, DirM} (solo calidad 1)
export function normalizarSerie(respuesta) {
  const [, filas] = respuesta; // [cabeceras, filas]
  const registros = [];
  for (const fila of filas) {
    const [ts, vars] = fila;
    const reg = { t: new Date(ts * 1000).toISOString() };
    // vars: [ [valor, calidad], ... ] en el orden de params pedidos
    const [hm0, tp, dir] = vars;
    if (!hm0 || hm0[1] !== 1) continue; // solo datos validados
    reg.Hs = hm0[0]; if (tp) reg.Tp = tp[0]; if (dir) reg.DirM = dir[0];
    registros.push(reg);
  }
  return registros;
}

// Estado de oleaje más reciente y validado, listo para inyectar en estado.oleaje
export function ultimoEstadoOleaje(registros) {
  if (!registros.length) throw new Error('Sin datos validados en la serie');
  const u = registros[registros.length - 1];
  return {
    Hs: u.Hs, Tp: Math.min(u.Tp ?? 8, 20),
    direccion: ((u.DirM ?? 0) * Math.PI) / 180,
    fuente: FUENTE, instante: u.t,
  };
}

// Parser de CSV SIMAR (descargas de bancodatos.puertos.es, separador tabulador)
export function parsearSIMAR(texto) {
  const lineas = texto.split(/\r?\n/).filter(l => l.trim());
  if (lineas.length < 2) throw new Error('CSV SIMAR vacío');
  // Los ficheros SIMAR tienen cabeceras compuestas de 2-3 líneas; localizamos la de fecha
  const iCab = lineas.findIndex(l => /fecha|date/i.test(l));
  const cab = lineas[iCab].split('\t').map(c => c.trim().toLowerCase());
  const iHs = cab.findIndex(c => c.includes('hm0') || c.includes('hs'));
  const iTp = cab.findIndex(c => c.includes('tp'));
  const iDir = cab.findIndex(c => c.includes('dir'));
  if (iHs < 0) throw new Error('Columna Hm0 no encontrada en el SIMAR');
  const out = [];
  for (const l of lineas.slice(iCab + 1)) {
    const c = l.split('\t');
    const hs = parseFloat(c[iHs]);
    if (!isFinite(hs) || hs <= -90) continue; // huecos oficiales SIMAR: -99.9
    const reg = { Hs: hs };
    if (iTp > 0 && isFinite(parseFloat(c[iTp]))) reg.Tp = parseFloat(c[iTp]);
    if (iDir > 0 && isFinite(parseFloat(c[iDir]))) reg.DirM = parseFloat(c[iDir]);
    reg.t = c[0]; out.push(reg);
  }
  return out;
}
