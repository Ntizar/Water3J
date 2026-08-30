// olas.js — Física fundamental de Water3J (sin dependencias, ESM)
// Implementa los módulos que auditan W3J-T01, T02 y T03.
// Referencias: docs/02-teoria.md y docs/09-biblia-tests.md

export const G = 9.81;

// ---------- W3J-T01: relación de dispersión ----------

// Resuelve ω² = g·k·tanh(k·h) para k dado ω y h. Semilla de aguas profundas + Newton-Raphson.
export function numeroOnda(omega, h) {
  let k = (omega * omega) / G;
  for (let i = 0; i < 60; i++) {
    const th = Math.tanh(k * h);
    const f = G * k * th - omega * omega;
    const df = G * (th + (k * h) / Math.cosh(k * h) ** 2);
    k -= f / df;
    if (Math.abs(f) < 1e-12) break;
  }
  return k;
}

// Velocidad de fase c = ω/k (aquí es donde la app consulta la dispersión)
export function velocidadFase(periodo, h) {
  const omega = (2 * Math.PI) / periodo;
  const k = numeroOnda(omega, h);
  return omega / k;
}

// ---------- W3J-T02: campo Gerstner ----------

// Componente Gerstner: { dirX, dirZ (no normalizado), amplitud, longitudOnda, fase }
export function componenteGerstner({ dirX = 1, dirZ = 0, amplitud, longitudOnda, fase = 0 }) {
  const k = (2 * Math.PI) / longitudOnda;
  const c = Math.sqrt(G / k); // dispersión aguas profundas
  const norm = Math.hypot(dirX, dirZ) || 1;
  return {
    dx: dirX / norm, dz: dirZ / norm,
    k, c, a: amplitud, fase,
  };
}

// Muestreo de la trocoide en el punto desplazado (posición Lagrangiana -> altura en x,z)
// Para el test usamos la forma 1D exacta: la superficie paramétrica es
//   X(q,t) = q - a·sin(kq - ωt),  η(q,t) = a·cos(kq - ωt)
export function alturaGerstner1D(comp, x, t) {
  const omega = comp.k * comp.c;
  // invertir X(q) = q - a sin(kq - ωt) = x para obtener q (Newton-Raphson)
  let q = x;
  for (let i = 0; i < 40; i++) {
    const th = comp.k * q - omega * t + comp.fase;
    const f = q - comp.a * Math.sin(th) - x;
    const df = 1 - comp.a * comp.k * Math.cos(th);
    q -= f / df;
    if (Math.abs(f) < 1e-12) break;
  }
  const th = comp.k * q - omega * t + comp.fase;
  return comp.a * Math.cos(th);
}

// Versión sumatoria para N componentes (API estable para la app)
export function alturaSuperficie(componentes, x, z, t) {
  let eta = 0;
  for (const comp of componentes) {
    const proy = comp.dx * x + comp.dz * z; // 1D por componente (aprox. lineal por componente)
    eta += alturaGerstner1D(comp, proy, t);
  }
  return eta;
}

// ---------- W3J-T03: espectro JONSWAP ----------

// Espectro JONSWAP parametrizado. U: viento (m/s), F: fetch (m). Devuelve S(ω) en m²s.
export function jonswap(omega, U, F) {
  const g = G;
  // Parámetros originales de Hasselmann et al. (1973):
  //   ωp = 22·(g²/(U·F))^(1/3)   α = 0.076·(g·F/U²)^(-0.22)   (nota el signo del exponente de α)
  const wp = 22 * Math.pow(g * g / (U * F), 1 / 3);
  const alpha = 0.076 * Math.pow(g * F / (U * U), -0.22);
  const gamma = 3.3;
  const sigma = omega <= wp ? 0.07 : 0.09;
  const r = Math.exp(-((omega - wp) ** 2) / (2 * sigma * sigma * wp * wp));
  const PM = (alpha * g * g) / Math.pow(omega, 5) * Math.exp(-1.25 * Math.pow(wp / omega, 4));
  return PM * Math.pow(gamma, r);
}

function tanh_(x) { return Math.tanh(x); }

// Genera N componentes discretizadas del espectro (log-spaced en ω)
// con amplitudes a_i = sqrt(2·S(ωi)·Δω) — usado por la app y validado por T03
export function generarComponentesJONSWAP(U, F, nComp = 200) {
  const omegaP = 22 * Math.pow(G * G / (U * F), 1 / 3);
  // rango: [0.4·ωp, 3·ωp] log-spaced
  const lo = 0.4 * omegaP, hi = 3 * omegaP;
  const logLo = Math.log(lo), logHi = Math.log(hi);
  const comps = [];
  let m0 = 0;
  for (let i = 0; i < nComp; i++) {
    const w0 = Math.exp(logLo + (logHi - logLo) * i / nComp);
    const w1 = Math.exp(logLo + (logHi - logLo) * (i + 1) / nComp);
    const dw = w1 - w0;
    const wm = 0.5 * (w0 + w1);
    const S = jonswap(wm, U, F);
    m0 += S * dw;
    const amplitud = Math.sqrt(2 * S * dw);
    const longitudOnda = 2 * Math.PI / numeroOnda(wm, 1000); // aguas profundas
    comps.push({ omega: wm, amplitud, longitudOnda, fase: 0 });
  }
  const Hs = 4 * Math.sqrt(m0);
  const Tp = 2 * Math.PI / omegaP;
  return { comps, Hs, Tp, omegaP };
}

// Hs del espectro PM con mismo U y F (para el check de coherencia de T03)
export function HsPiersonMoskowitz(U, F) {
  const omegaP = 22 * Math.pow(G * G / (U * F), 1 / 3);
  const lo = 0.4 * omegaP, hi = 3 * omegaP;
  const n = 400;
  const logLo = Math.log(lo), logHi = Math.log(hi);
  let m0 = 0;
  const alpha = 0.076 * Math.pow(G * F / (U * U), -0.22);
  for (let i = 0; i < n; i++) {
    const w0 = Math.exp(logLo + (logHi - logLo) * i / n);
    const w1 = Math.exp(logLo + (logHi - logLo) * (i + 1) / n);
    const dw = w1 - w0, wm = 0.5 * (w0 + w1);
    const PM = (alpha * G * G) / Math.pow(wm, 5) * Math.exp(-1.25 * Math.pow(omegaP / wm, 4));
    m0 += PM * dw;
  }
  return 4 * Math.sqrt(m0);
}
