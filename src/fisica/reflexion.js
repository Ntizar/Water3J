// reflexion.js — Superposición incidente + reflejada (clapotis) — W3J-T06
// η(x,t) = a·cos(kx−ωt) + Cr·a·cos(kx+ωt), muro en x=0.
// Antinodos en x = n·L/2 (amplitud a·(1+Cr)), nodos en x = L/4 + n·L/2 (amplitud a·(1−Cr)).
import { G } from './olas.js';

export function elevacionClapotis({ a, L, Cr, x, t, fase = 0 }) {
  const k = (2 * Math.PI) / L;
  const omega = Math.sqrt(G * k);
  return a * Math.cos(k * x - omega * t + fase) + Cr * a * Math.cos(k * x + omega * t - fase);
}

// Amplitud en un punto midiendo durante n periodos teóricos (muestreo denso)
export function amplitudEnPunto({ a, L, Cr, x, nPeriodos = 5, muestras = 400 }) {
  const k = (2 * Math.PI) / L;
  const omega = Math.sqrt(G * k);
  const T = (2 * Math.PI) / omega;
  let mn = Infinity, mx = -Infinity;
  const t0 = 3 * T; // saltar transitorio (no hay, pero por robustez)
  for (let i = 0; i < muestras * nPeriodos; i++) {
    const eta = elevacionClapotis({ a, L, Cr, x, t: t0 + (i / (muestras * nPeriodos)) * nPeriodos * T });
    mn = Math.min(mn, eta); mx = Math.max(mx, eta);
  }
  return (mx - mn) / 2;
}

// Periodo medido por cruces por cero ascendentes en un antinodo
export function periodoMedido({ a, L, Cr, x, nPeriodos = 5, muestras = 2000 }) {
  const omega = Math.sqrt(G * (2 * Math.PI / L));
  const T = (2 * Math.PI) / omega;
  const cruces = [];
  let prev = elevacionClapotis({ a, L, Cr, x, t: 0 });
  for (let i = 1; i <= muestras * nPeriodos; i++) {
    const t = (i / (muestras * nPeriodos)) * nPeriodos * T;
    const eta = elevacionClapotis({ a, L, Cr, x, t });
    if (prev < 0 && eta >= 0) cruces.push(t);
    prev = eta;
  }
  if (cruces.length < 2) return NaN;
  return (cruces[cruces.length - 1] - cruces[0]) / (cruces.length - 1);
}
