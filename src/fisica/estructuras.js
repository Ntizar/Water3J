// estructuras.js — Cargas en muro vertical: Goda simplificado — W3J-T09
// Formulación estándar (Goda 1985, caso muro vertical con fondo horizontal,
// incidencia normal β=0, sin término de rotura α*=0):
//   η* = 0.75·H                          (elevación de la lámina en el muro)
//   α1 = 0.6 + 0.5·(2kh/sinh(2kh))²
//   p1 = 0.5·(1+cosβ)·α1·ρgH  = α1·ρgH   (en la cresta z=η*; con β=0, α*=0)
//   p2 = α1·ρgH                          (en el nivel medio)
//   α3 = 1 − 1/cosh(2kh)  ;  p3 = α3·p2  (en el fondo)
//   Fuerza por metro F = ½(p1+p2)·η* + ½(p2+p3)·h
import { G, numeroOnda } from './olas.js';
export const RHO_AGUA = 1000;

export function presionGoda({ H, h, T }) {
  const omega = (2 * Math.PI) / T;
  const k = numeroOnda(omega, h);
  const kh = k * h;
  const etaStar = 0.75 * H;
  const a1 = 0.6 + 0.5 * Math.pow((2 * kh) / Math.sinh(2 * kh), 2);
  const p1 = a1 * RHO_AGUA * G * H;   // cresta
  const p2 = a1 * RHO_AGUA * G * H;   // nivel medio
  const a3 = 1 - 1 / Math.cosh(2 * kh);
  const p3 = a3 * p2;                 // fondo
  const F = 0.5 * (p1 + p2) * etaStar + 0.5 * (p2 + p3) * h;
  return { p1, p2, p3, F, etaStar, alfa1: a1, alfa3: a3 };
}
