// motor2d.js — Water3J Studio: propagación 2D de frentes de oleaje sobre batimetría real
// Física: dispersión lineal (Airy), Snell por gradiente de c, conservación del flujo
// de energía entre rayos vecinos, rotura de McCowan. Avalado por tests T14 (biblia).

import { LIMITE_ROTURA } from './motor.js';

// ---------- modelo de ola lineal ----------
export function numeroOnda(T, h) {
  const g = 9.81, w = 2 * Math.PI / T;
  let k = (w * w / g) / Math.max(Math.tanh(w*w*h/g), 1e-6) * 0 + w*w/g; // semilla profunda
  k = w * w / g;
  for (let i = 0; i < 60; i++) {
    const th = Math.tanh(k * h);
    const f = g * k * th - w * w;
    const fp = g * th + g * k * h * (1 - th * th);
    k -= f / fp;
    if (Math.abs(f) < 1e-12) break;
  }
  return k;
}
export const velocidadFase = (T, h) => (2 * Math.PI / T) / numeroOnda(T, h);
export function velocidadGrupo(T, h) {
  const k = numeroOnda(T, h), th = Math.tanh(k * h);
  const n = 0.5 * (1 + (2 * k * h) / Math.sinh(Math.max(2 * k * h, 1e-9)));
  return n * velocidadFase(T, h);
}

// muestreo bilineal de la rejilla {nx,ny,x0,y0,dx,dy,h:Float32Array}
export function hEn(rejilla, x, y) {
  const { nx, ny, x0, y0, dx, dy, h } = rejilla;
  const fx = (x - x0) / dx, fy = (y - y0) / dy;
  const i = Math.floor(fx), j = Math.floor(fy);
  if (i < 0 || j < 0 || i >= nx - 1 || j >= ny - 1) {
    const ci = Math.min(nx-1, Math.max(0, Math.round(fx))), cj = Math.min(ny-1, Math.max(0, Math.round(fy)));
    return h[cj * nx + ci];
  }
  const tx = fx - i, ty = fy - j;
  const a = h[j*nx+i], b = h[j*nx+i+1], c = h[(j+1)*nx+i], d = h[(j+1)*nx+i+1];
  return (a*(1-tx)+b*tx)*(1-ty) + (c*(1-tx)+d*tx)*ty;
}

// ===================== TRAZADO DE RAYOS (Snell 2D) =====================
// α = ángulo del rayo respecto al norte (+y). El rayo gira hacia velocidades menores.
// Ecuación de rayos: dα/ds = -(1/c)·∂c/∂n   (n̂ = perpendicular al rayo, hacia −∇c)
export function trazarRayo2D(rejilla, x0, y0, alfa0, T, opts = {}) {
  const paso = opts.paso ?? rejilla.dx;
  const maxPasos = opts.maxPasos ?? 3000;
  const rad = Math.PI / 180;
  let x = x0, y = y0, alfa = alfa0, t = 0;
  const puntos = [{ x, y, alfa, h: +hEn(rejilla, x, y).toFixed(2), t: 0 }];

  for (let i = 0; i < maxPasos; i++) {
    const h0 = hEn(rejilla, x, y);
    if (h0 <= 0.2) break; // orilla
    const c = velocidadFase(T, h0);
    // ∂c/∂n por diferencias finitas en dirección perpendicular al rayo
    // t̂ = (sin α, cos α) → n̂ = (cos α, -sin α)
    const nx = Math.cos(alfa), ny = -Math.sin(alfa);
    const eps = 1.0;
    const cAdelante = velocidadFase(T, Math.max(0.25, hEn(rejilla, x + nx*eps, y + ny*eps)));
    const cAtras    = velocidadFase(T, Math.max(0.25, hEn(rejilla, x - nx*eps, y - ny*eps)));
    const dcDn = (cAdelante - cAtras) / (2 * eps);
    // dα/ds = -(1/c)·dc/dn → si c decrece hacia n̂ (costa), el rayo gira hacia ella (refracción)
    const dAlfa = -(dcDn / c) * paso;
    alfa += dAlfa;
    x += Math.sin(alfa) * paso;
    y += Math.cos(alfa) * paso;
    t += paso / velocidadGrupo(T, h0);
    const { nx: nxr } = rejilla;
    if (x < rejilla.x0 || x > rejilla.x0 + (rejilla.nx-1)*rejilla.dx ||
        y < rejilla.y0 || y > rejilla.y0 + (rejilla.ny-1)*rejilla.dy) break;
    puntos.push({ x: +x.toFixed(1), y: +y.toFixed(1), alfa: +alfa.toFixed(4), h: +hEn(rejilla, x, y).toFixed(2), t: +t.toFixed(1) });
  }
  return puntos;
}

// ===================== ALTURA H a lo largo del rayo =====================
// Conservación de flujo de energía: E·cg·b = cte → H ∝ √(cg0·b0/(cg·b))
// b = separación entre rayos vecinos. Aquí se pasa explícita por punto (calculada
// por el llamador comparando el rayo con sus vecinos).
export function alturaEnRayo(rayo, T, H0, cg0, b0, bPorPunto) {
  return rayo.map((p, i) => {
    const cg = velocidadGrupo(T, Math.max(0.3, p.h));
    const b = Math.max(0.2, bPorPunto ? bPorPunto[i] : b0);
    let H = H0 * Math.sqrt((cg0 * b0) / (cg * b));
    const hLim = LIMITE_ROTURA * Math.max(0.3, p.h);
    const rompe = H > hLim;
    if (rompe) H = hLim;
    return { ...p, H: +H.toFixed(3), rompe, cg: +cg.toFixed(2) };
  });
}

// ===================== FRENTES DE OLA (líneas de fase) =====================
// Cada punto del frente inicial avanza en la dirección de propagación local
// (perpendicular al frente, corregida por refracción con el gradiente de c).
export function propagarFrente(rejilla, frente, T, pasos = 60) {
  const trayectorias = frente.map(pt => {
    // dirección inicial: perpendicular al frente local (por vecinos del frente)
    const tray = trazarRayo2D(rejilla, pt.x, pt.y, pt.alfa, T, { paso: rejilla.dx, maxPasos: pasos });
    return tray;
  });
  return trayectorias; // una polilínea por punto del frente
}

// separación real entre rayos vecinos en cada paso (para H por convergencia/divergencia)
export function calcularSeparaciones(rayos) {
  const n = rayos.length;
  return rayos.map((rayo, i) => rayo.map((p, k) => {
    const dists = [];
    if (i > 0) {
      const v = rayos[i-1][Math.min(k, rayos[i-1].length-1)];
      dists.push(Math.hypot(p.x - v.x, p.y - v.y));
    }
    if (i < n - 1) {
      const v = rayos[i+1][Math.min(k, rayos[i+1].length-1)];
      dists.push(Math.hypot(p.x - v.x, p.y - v.y));
    }
    return dists.length ? dists.reduce((a,b) => a+b, 0) / dists.length : null;
  }));
}

// isócronas: puntos de todas las trayectorias en el mismo instante t
export function frentesIsocronos(trayectorias, pasoTiempo = 5) {
  const tMax = Math.max(...trayectorias.map(tr => tr[tr.length-1]?.t ?? 0));
  const frentes = [];
  for (let tObj = 0; tObj <= tMax; tObj += pasoTiempo) {
    const linea = [];
    for (const tr of trayectorias) {
      // interpolar el punto de la trayectoria en t
      let mejor = tr[0];
      for (const p of tr) { if (p.t <= tObj) mejor = p; else break; }
      linea.push({ x: mejor.x, y: mejor.y });
    }
    frentes.push(linea);
  }
  return frentes;
}
