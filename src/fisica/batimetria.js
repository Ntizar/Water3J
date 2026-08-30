// batimetria.js — Batimetría, shoaling y refracción para Water3J (puro, ESM)
// Audita: W3J-T04 (shoaling), W3J-T05 (refracción Snell)
import { G, numeroOnda } from './olas.js';

// ---------- T04: shoaling ----------

// Coeficiente de shoaling Ks desde una estación de referencia (h0) hasta h.
// Teoría de Airy con conservación de flujo de energía: Ks = sqrt(c0·n0 / (2·c·n))
// n = 1/2·(1 + 2kh/sinh(2kh))  (ratio velocidad de grupo / velocidad de fase)
export function factorN(k, h) {
  const kh = k * h;
  return 0.5 * (1 + (2 * kh) / Math.sinh(2 * kh));
}

export function coeficienteShoaling(T, h0, h) {
  const w = (2 * Math.PI) / T;
  const k0 = numeroOnda(w, h0);
  const k = numeroOnda(w, h);
  const c0 = w / k0, c = w / k;
  const n0 = factorN(k0, h0), n = factorN(k, h);
  return Math.sqrt((c0 * n0) / (2 * c * n));
}

// Batimetría 1D para el test: h(x) interpolada lineal entre estaciones
// (profundidad decreciente hacia la costa)
export function profundidad1D(x, estaciones) {
  // estaciones: [{x, h}, ...] ordenadas por x creciente
  for (let i = 0; i < estaciones.length - 1; i++) {
    const a = estaciones[i], b = estaciones[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      return a.h + t * (b.h - a.h);
    }
  }
  return estaciones[estaciones.length - 1].h;
}

// ---------- T05: refracción (Snell) ----------

// Trazador de rayos 2D sobre batimetría 1D con isolíneas paralelas (fondo
// con profundidad h(x), olas viajando en el plano x-z con ángulo α respecto
// a la normal de las isolíneas). sin(α)/c = constante (Snell para olas).
// Integra numéricamente con paso fijo; devuelve el trazado del rayo.
export function trazarRayo({ T, alfa0, x0, dx = 1, xFin, hDe }) {
  const w = (2 * Math.PI) / T;
  const puntos = [];
  let x = x0;
  let alfa = alfa0; // ángulo entre el rayo y la normal a las isolíneas (dirección -x hacia la costa)
  const k0 = numeroOnda(w, hDe(x0));
  const c0 = w / k0;
  const sinAlpha0C = Math.sin(alfa) / c0;
  const nMax = Math.ceil((xFin - x0) / dx);
  for (let i = 0; i <= nMax; i++) {
    const h = hDe(x);
    if (h <= 0.05) break; // orilla (wetting)
    const k = numeroOnda(w, h);
    const c = w / k;
    const sinA = sinAlpha0C * c; // sin(α) = const·c
    if (Math.abs(sinA) > 1) break; // posible reflexión total (no alcanzable en batimetría decreciente)
    alfa = Math.asin(sinA);
    puntos.push({ x, h, alfa, c });
    // el rayo avanza en x con dz/dx = tan(α) — para isolíneas paralelas medimos solo α(x)
    x += dx;
  }
  return puntos;
}
