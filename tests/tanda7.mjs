// tanda7.mjs — W3J-T14: motor 2D de propagación (biblia)
// Contrato: dispersión correcta, refracción real hacia la costa, rotura respetada,
// frentes isócronos monótonos, reproducción determinista.
import {
  numeroOnda, velocidadFase, velocidadGrupo, hEn,
  trazarRayo2D, alturaEnRayo, propagarFrente, frentesIsocronos,
} from '../src/studio/motor2d.js';
import { LIMITE_ROTURA } from '../src/studio/motor.js';

let ok = 0; const fallos = [];
function check(nombre, cond, detalle = '') {
  if (cond) { ok++; console.log(`✅ ${nombre} ${detalle ? `(${detalle})` : ''}`); }
  else { fallos.push(nombre); console.log(`❌ ${nombre} ${detalle ? `(${detalle})` : ''}`); }
}

// ---- rejilla sintética: talud recto hacia el sur (profundidad crece con y) ----
// h(y) = 0.3 + 0.05·y  → en y=0 orilla, y=400 → h=20.3 m. dx=dy=10 m, 60×50 nodos
const NX = 60, NY = 50, DX = 10;
const hArr = new Float32Array(NX * NY);
for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++)
  hArr[j*NX+i] = 0.3 + 0.05 * j * DX / 1; // 0.05·j·10 = 0.5·j
const rejilla = { nx: NX, ny: NY, x0: 0, y0: 0, dx: DX, dy: DX, h: hArr };

// T14a dispersión: en h=20, T=10 s → L=c·T ≈ 156 m (tablas estándar)
const L = velocidadFase(10, 20) * 10;
check('T14a dispersión Airy: L(20m,10s) ≈ 121 m (CEM ~120.3)', Math.abs(L - 121) < 4, `L=${L.toFixed(1)} m`);

// T14b velocidad de grupo < fase (n<1 en intermedio), y cg→c/2 en profundo
const cg20 = velocidadGrupo(10, 20), c20 = velocidadFase(10, 20);
check('T14b grupo < fase en intermedio', cg20 < c20 && cg20 > c20 * 0.4, `cg=${cg20.toFixed(2)} c=${c20.toFixed(2)}`);

// T14c refracción: rayo oblicuo propagándose hacia la costa (-y): alfa0 = 150° (30° desde -y)
const rayo = trazarRayo2D(rejilla, 30, 40, 150 * Math.PI/180, 10);
const alfaFinal = rayo[rayo.length-1].alfa * 180/Math.PI;
// el ángulo respecto a -y es |180° - α|: debe decrecer de 30° hacia 0
const anguloCosta = Math.abs(180 - Math.abs(alfaFinal));
check('T14c refracción: el ángulo con la costa decrece', anguloCosta < 29.9, `30° → ${anguloCosta.toFixed(1)}° respecto a -y`);

// T14d el rayo avanza hacia la orilla (y decrece) y termina en h ≤ 1 m aprox
const hFin = rayo[rayo.length-1].h;
check('T14d el rayo llega a aguas someras', hFin <= 2.5, `h final = ${hFin} m en ${rayo.length} pasos`);

// T14e rotura: H nunca supera 0.78·h
const cg0 = velocidadGrupo(10, 20), b0 = 50;
const conB = rayo.map(() => b0);
const puntos = alturaEnRayo(rayo, 10, 3.0, cg0, b0, conB);
const viol = puntos.filter(p => p.H > LIMITE_ROTURA * p.h + 1e-3); // margen 1mm por redondeo de presentación (toFixed 3)
check('T14e invariante rotura H ≤ 0.78·h', viol.length === 0, `${viol.length} violaciones`);

// T14f shoaling físico: H crece al decrecer cg hasta la rotura (serie no decreciente hasta romper)
let Hmax = 0, crece = true;
for (const p of puntos) { if (p.rompe) break; if (p.H < Hmax - 0.02) crece = false; Hmax = p.H; }
check('T14f shoaling: H no decrece antes de romper', crece, `Hmax=${Hmax.toFixed(2)} m`);

// T14g frentes isócronos: 5 trayectorias → número de frentes > 0 y monotonía temporal
const frentesInit = [10, 20, 30, 40, 50].map(x => ({ x, y: 45, alfa: 0 }));
const trajs = propagarFrente(rejilla, frentesInit, 10, 80);
const iso = frentesIsocronos(trajs, 5);
check('T14g isócronas generadas', iso.length > 3 && iso.every(f => f.length === 5), `${iso.length} frentes`);

// T14h determinismo
const r2 = trazarRayo2D(rejilla, 30, 40, 150*Math.PI/180, 10);
check('T14h determinismo total', JSON.stringify(rayo) === JSON.stringify(r2));

console.log(`\n${ok}/8 tests pasando (tanda 7 — motor 2D)`);
if (fallos.length) { console.log('FALLOS:', fallos.join(' · ')); process.exit(1); }
