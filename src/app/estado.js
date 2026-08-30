// estado.js — Estado puro de la simulación Water3J (serializable, testable en Node)
// Toda la app vive de este objeto. El render lo lee; la UI lo escribe.
// NUNCA guardar aquí referencias a Three.js ni al DOM.
import { numeroOnda } from '../fisica/olas.js';

export function crearEstadoBase() {
  return {
    version: 1,
    // ---- Oleaje incidente (espectro) ----
    oleaje: {
      modo: 'parametrico',            // 'parametrico' | 'jonswap'
      Hs: 1.5,                        // m — altura significativa
      Tp: 8,                          // s — periodo de pico
      direccion: 0,                   // rad — 0 = de oeste a este (eje +x)
      vientoU: 10,                    // m/s
      fetchF: 50000,                  // m
      nComponentes: 48,               // componentes Gerstner
      steepnessMax: 0.9,              // clamp total (biblia T14)
    },
    // ---- Batimetría ----
    batimetria: {
      modo: 'playa',                  // 'plana' | 'playa' | 'personalizada'
      hBase: 20,                      // m — profundidad en mar abierto
      pendiente: 0.02,                // pendiente hacia la costa
      // rejilla editada: null o Float32Array serializable como array base64
      rejilla: null,                  // { nx, ny, dx, datos: [h...] } en metros
    },
    // ---- Estructuras ----
    estructuras: [],                  // { tipo: 'muro'|'dique'|'espigon', x, y, largo, angulo, Cr }
    // ---- Observación ----
    gauges: [],                       // { id, x, y, serie: [{t, eta, H}] }
    // ---- Visual ----
    visual: {
      calidad: 'media',               // 'bajo'|'media'|'alta'|'ultra'
      overlays: { eta: false, corrientes: false, cortante: false, difraccion: false },
      camara: { posicion: [0, 90, 220], objetivo: [0, 0, 0] },
    },
    // ---- Tiempo ----
    tiempo: { t: 0, escala: 1 },      // t en segundos simulados
  };
}

// ---------- Serialización (T11: round-trip idéntico) ----------
// Canonicalización: claves ordenadas, números redondeados a 9 decimales,
// arrays tipados a arrays planos. Determinismo total.

function canon(valor) {
  if (valor === null || typeof valor === 'number' || typeof valor === 'string' || typeof valor === 'boolean') {
    return typeof valor === 'number' ? redondear(valor) : valor;
  }
  if (valor instanceof Float32Array || valor instanceof Float64Array) {
    return { __typed: valor.constructor.name, datos: Array.from(valor, redondear) };
  }
  if (Array.isArray(valor)) return valor.map(canon);
  if (typeof valor === 'object') {
    const out = {};
    for (const k of Object.keys(valor).sort()) out[k] = canon(valor[k]);
    return out;
  }
  return String(valor); // funciones/undefined → representación estable (no debería ocurrir)
}

function redondear(n) {
  return Number.isFinite(n) ? Math.round(n * 1e9) / 1e9 : String(n); // NaN/Inf → string estable
}

export function serializar(estado) {
  return JSON.stringify(canon(estado));
}

export function deserializar(json) {
  const obj = JSON.parse(json);
  return reconstruir(obj);
}

function reconstruir(valor) {
  if (valor === null || typeof valor !== 'object') return valor;
  if (valor.__typed === 'Float32Array') return Float32Array.from(valor.datos);
  if (valor.__typed === 'Float64Array') return Float64Array.from(valor.datos);
  if (Array.isArray(valor)) return valor.map(reconstruir);
  const out = {};
  for (const k of Object.keys(valor)) out[k] = reconstruir(valor[k]);
  return out;
}

// ---------- Profundidad efectiva: combina batimetría analítica + rejilla editada ----------
export function profundidadEn(estado, x, y) {
  let h = 0;
  const b = estado.batimetria;
  if (b.modo === 'plana') h = b.hBase;
  else if (b.modo === 'playa') {
    // costa en x = 0, mar hacia +x; h decrece hacia la costa
    h = Math.max(b.pendiente * x, 0.3);
  }
  if (b.rejilla) {
    const { nx, ny, dx, datos } = b.rejilla;
    const x0 = 0, y0 = -(ny * dx) / 2;
    const i = Math.floor((x - x0) / dx), j = Math.floor((y - y0) / dx);
    if (i >= 0 && i < nx && j >= 0 && j < ny) {
      h = Math.max(h + datos[j * nx + i], 0.3); // la rejilla es DESVIACIÓN sobre la analítica
    }
  }
  return h;
}

// ---------- Número de onda local (dispersión con h local → shoaling/refracción) ----------
export function kLocal(estado, x, y) {
  const T = estado.oleaje.Tp;
  return numeroOnda((2 * Math.PI) / T, profundidadEn(estado, x, y));
}
