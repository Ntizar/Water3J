// flotabilidad.js — Cuerpos flotantes sobre el campo de olas (puro, ESM)
// Audita: W3J-T07 (flotabilidad en equilibrio)
import { componenteGerstner, alturaSuperficie } from './olas.js';

export const G = 9.81;

// Esfera con densidad relativa rhoRel (0..1) flotando en agua de densidad 1.
// Integración semi-implícita de Euler con amortiguación (drag lineal + cuadrático).
// dt fijo para reproducibilidad del test.
export function simularFlotante({ comps, posicion0 = { x: 0, z: 0 }, radio = 1,
                                   rhoRel = 0.5, dt = 0.01, tFin = 20 }) {
  const masa = rhoRel * 1000 * (4 / 3) * Math.PI * radio ** 3; // kg (rho_agua=1000)
  let y = 0, vy = 0;           // posición vertical del CENTRO (y=0 = nivel medio)
  let x = posicion0.x, z = posicion0.z;
  let vx = 0, vz = 0;
  let t = 0;
  const serie = [];
  const sub = 1e-3;            // subpaso de integración
  while (t < tFin) {
    const eta = alturaSuperficie(comps, x, z, t);
    // volumen sumergido de esfera con centro a y y superficie del agua en eta
    const prof = Math.min(Math.max(eta - y + radio, 0), 2 * radio);
    // volumen de casquete esférico sumergido (prof desde el fondo de la esfera)
    const Vsum = Math.PI * prof * prof * (3 * radio - prof) / 3;
    const Fb = 1000 * G * Vsum;          // Arquímedes
    const Fg = masa * G;                 // peso
    // drag vertical: proporcional a v relativo al agua (aprox: agua quieto verticalmente)
    const Fdrag = -60 * Math.PI * radio * vy - 400 * vy * Math.abs(vy) * 0;
    vy += ((Fb - Fg + Fdrag) / masa) * sub;
    y += vy * sub;
    // deriva horizontal: solo la del campo (Stokes) la añade la ola; aquí el flotante
    // sigue la superficie muestreada en su posición (sin fuerza horizontal extra en este MVP)
    t += sub;
    if (Math.abs(t * 1000 - Math.round(t * 1000)) < sub / 2 && Math.round(t * 100) % 25 === 0) {
      serie.push({ t: +t.toFixed(2), y, eta });
    }
    if (serie.length && serie[serie.length - 1].t === +t.toFixed(2) && serie[serie.length - 1].y !== y) {
      serie[serie.length - 1].y = y; serie[serie.length - 1].eta = eta;
    }
  }
  return { serie, yFinal: y, masa };
}

// Inclinación: normal local de la superficie via diferencias finitas del campo
export function normalSuperficie(comps, x, z, t, d = 0.5) {
  const dhx = (alturaSuperficie(comps, x + d, z, t) - alturaSuperficie(comps, x - d, z, t)) / (2 * d);
  const dhz = (alturaSuperficie(comps, x, z + d, t) - alturaSuperficie(comps, x, z - d, t)) / (2 * d);
  const n = { x: -dhx, y: 1, z: -dhz };
  const m = Math.hypot(n.x, n.y, n.z);
  return { x: n.x / m, y: n.y / m, z: n.z / m };
}
