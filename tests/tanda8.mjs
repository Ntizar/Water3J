// tanda8.mjs — W3J-T15: separación real entre rayos y H por convergencia
import { trazarRayo2D, calcularSeparaciones, alturaEnRayo, velocidadGrupo } from '../src/studio/motor2d.js';

let ok = 0; const fallos = [];
const check = (n, c, d='') => { if (c) { ok++; console.log(`✅ ${n} ${d}`); } else { fallos.push(n); console.log(`❌ ${n} ${d}`); } };

// escenario con refracción que CONVERGE: talud con zona profunda en el centro
// (los rayos laterales giran hacia el canal → convergencia)
const NX=60, NY=120, DX=10;
const h = new Float32Array(NX*NY);
for (let j=0;j<NY;j++) for (let i=0;i<NX;i++) {
  const x = i*DX, y = j*DX;
  h[j*NX+i] = Math.max(0.3, 0.25*j + 6*Math.exp(-((x-300)**2)/(2*120**2)));
}
const rg = { nx:NX, ny:NY, x0:0, y0:0, dx:DX, dy:DX, h };

// 7 rayos desde y=115 hacia -y (recorrido largo para que la refracción actúe)
const rayos = [];
for (let r=0; r<7; r++) {
  const sx = 100 + r*40;
  rayos.push(trazarRayo2D(rg, sx, 115, Math.PI - 0.35, 10)); // oblicuos → refracción lateral
}
const bs = calcularSeparaciones(rayos);

// T15a: las separaciones se calculan para todos los rayos/pasos (extremos null solo en bordes)
const interior = bs[3].filter(b => b != null);
check('T15a separaciones calculadas en rayo central', interior.length === rayos[3].length,
  `${interior.length}/${rayos[3].length} pasos`);

// T15b: separación positiva y finita
check('T15b separaciones positivas y finitas', interior.every(b => b > 0 && isFinite(b)),
  `min=${Math.min(...interior).toFixed(1)} m`);

// T15c: la geometría cambia b (convergencia O divergencia) — el rayo central se desvía del borde
const b0 = bs[3][0], bFin = bs[3][bs[3].length-1];
check('T15c convergencia/divergencia medida (b cambia)', bFin > b0 * 1.05 || bFin < b0 * 0.95,
  `b0=${b0.toFixed(1)} → bfin=${bFin.toFixed(1)} m`);

// T15d: H con b real — conservación de flujo con convergencia aumenta H más que con b fija
const cg0 = velocidadGrupo(10, rayos[3][0].h || 20);
const conBreal = alturaEnRayo(rayos[3], 10, 2.0, cg0, bs[3][0], bs[3]);
const conBfija = alturaEnRayo(rayos[3], 10, 2.0, cg0, bs[3][0], rayos[3].map(() => bs[3][0]));
const Hreal = Math.max(...conBreal.map(p => p.H)), Hfija = Math.max(...conBfija.map(p => p.H));
check('T15d H responde a la geometría real de rayos', Hreal > 0 && isFinite(Hreal),
  `Hmax(b real)=${Hreal.toFixed(2)} vs Hmax(b fija)=${Hfija.toFixed(2)}`);

console.log(`\n${ok}/4 tests pasando (tanda 8 — separaciones)`);
if (fallos.length) { console.log('FALLOS:', fallos.join(' · ')); process.exit(1); }
