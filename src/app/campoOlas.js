// campoOlas.js — Genera las componentes Gerstner (CPU) desde el estado,
// sincronizadas con el shader GPU. Misma matemática en ambos lados.
// Hs objetivo → amplitudes repartidas por espectro JONSWAP discretizado.
import { generarComponentesJONSWAP } from '../fisica/olas.js';
import { componenteGerstner } from '../fisica/olas.js';

export function generarCampo(estado) {
  const o = estado.oleaje;
  let comps;
  if (o.modo === 'jonswap') {
    const { comps: cs } = generarComponentesJONSWAP(o.vientoU, o.fetchF, o.nComponentes);
    comps = cs.map(c => ({ amplitud: c.amplitud, longitudOnda: c.longitudOnda, fase: c.fase }));
  } else {
    // paramétrico: Hs/Tp → bandas alrededor de Lp con reparto de energía espectral
    const Lp = (9.81 * o.Tp * o.Tp) / (2 * Math.PI); // L de pico en aguas profundas
    // reparto cuadrático EXACTO: a_i = (Hs/2)·forma_i con Σ forma_i² = 1
    // ⇒ Σ a_i² = (Hs/2)² ⇒ Hs_reconstruido = 2·sqrt(Σ a_i²) = Hs por diseño
    comps = [];
    let sumaForma2 = 0;
    const forma = [];
    for (let i = 0; i < o.nComponentes; i++) {
      const s = i / (o.nComponentes - 1); // 0..1
      const f = 0.6 + 0.8 * s;            // energía hacia swell largo (perfil espectra)
      forma.push(f); sumaForma2 += f * f;
    }
    const norm = 1 / Math.sqrt(sumaForma2);
    // Escalado de longitudes con Hs (escala de equilibrio wind-sea, Toba: L ∝ Hs^(2/5)):
    // Hs grande ⇒ olas proporcionalmente más largas ⇒ steepness realista sin romper el clamp
    const escalaL = 1.25 * Math.pow(Math.max(o.Hs, 0.2) / 1.5, 0.4);
    for (let i = 0; i < o.nComponentes; i++) {
      const s = i / (o.nComponentes - 1);
      const L = Lp * (0.35 + 0.65 * s) * escalaL; // de chop corto a swell largo
      const ang = o.direccion + Math.sin(i * 12.9898) * 0.35; // dispersión direccional estable
      comps.push({ amplitud: (o.Hs / 2) * forma[i] * norm, longitudOnda: L, fase: 0, dirX: Math.cos(ang), dirZ: Math.sin(ang) });
    }
  }
  // clamp de steepness total (biblia T14)
  const sumaSteep = comps.reduce((s, c) => s + c.amplitud * (2 * Math.PI / c.longitudOnda), 0);
  if (sumaSteep > o.steepnessMax) {
    const f = o.steepnessMax / sumaSteep;
    comps = comps.map(c => ({ ...c, amplitud: c.amplitud * f }));
  }
  // a uniformes GPU: vec4(dirX·a·k?, ...) — usamos (dirX, dirZ, steepness_i, L)
  return comps.map(c => componenteGerstner(c));
}

// Paquete de uniformes para el shader (array de vec4: dirX, dirZ, steepness, longitudOnda)
export function uniformesShader(comps) {
  const data = new Float32Array(comps.length * 4);
  comps.forEach((c, i) => {
    const steepness = c.a * c.k;
    data[i * 4 + 0] = c.dx; data[i * 4 + 1] = c.dz;
    data[i * 4 + 2] = steepness; data[i * 4 + 3] = 2 * Math.PI / c.k;
  });
  return data;
}

// Altura CPU (para flotabilidad y gauges) — misma fórmula que el shader vertex
export function alturaEn(comps, x, z, t) {
  let y = 0;
  for (const c of comps) {
    const f = c.k * (c.dx * x + c.dz * z - c.c * t) + c.fase;
    y += c.a * Math.sin(f);
  }
  return y; // forma senoidal vertical (Gerstner vertical); horizontal despreciable para CPU
}
