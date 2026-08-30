// node-run.mjs — ejecuta en Node los tests que no requieren navegador (T01-T03)
import { velocidadFase, numeroOnda, componenteGerstner, alturaGerstner1D,
         generarComponentesJONSWAP, HsPiersonMoskowitz } from '../src/fisica/olas.js';

const resultados = [];

function registrar(id, nombre, pasa, medida, criterio) {
  resultados.push({ id, nombre, estado: pasa ? 'PASS' : 'FAIL', medida, criterio });
  console.log(`${pasa ? '✅' : '❌'} ${id} ${nombre} — ${medida}`);
  if (!pasa) console.log(`   criterio: ${criterio}`);
}

// ---------- W3J-T01: dispersión ----------
{
  const Ls = [5, 20, 50, 100, 200];
  const hs = [3, 10, 50, 1000];
  const g = 9.81;
  let maxErr = 0;
  let okRegimenes = true;
  for (const L of Ls) for (const h of hs) {
    const omega = 2 * Math.PI / (L / Math.sqrt(g * L / (2 * Math.PI))); // T desde c=√(gL/2π)
    // mejor: fijar T y resolver k exacto como referencia
    const T = Math.sqrt(2 * Math.PI * L / g); // T para L en aguas profundas (independiente del módulo)
    const omegaT = 2 * Math.PI / T;
    // referencia: Newton-Raphson independiente (reimplementado aquí a propósito)
    let kRef = omegaT * omegaT / g;
    for (let i = 0; i < 60; i++) {
      const f = g * kRef * Math.tanh(kRef * h) - omegaT * omegaT;
      const df = g * (Math.tanh(kRef * h) + kRef * h / Math.cosh(kRef * h) ** 2);
      kRef -= f / df;
    }
    const cApp = velocidadFase(T, h);
    const cRef = omegaT / kRef;
    maxErr = Math.max(maxErr, Math.abs(cApp - cRef) / cRef);
  }
  // regímenes
  const cDeep = velocidadFase(Math.sqrt(2 * Math.PI * 200 / g), 1000);
  const cDeepTeo = Math.sqrt(g * 200 / (2 * Math.PI));
  okRegimenes &&= Math.abs(cDeep - cDeepTeo) / cDeepTeo < 0.01;
  // régimen somero auténtico: T=20 s, h=2 m (kh≈0.14 -> c ≈ √(gh) dentro de ±2%)
  const cShallow = velocidadFase(20, 2);
  okRegimenes &&= Math.abs(cShallow - Math.sqrt(g * 2)) / Math.sqrt(g * 2) < 0.02;
  registrar('W3J-T01', 'Relación de dispersión',
    maxErr < 0.005 && okRegimenes,
    `error máx ${(maxErr * 100).toFixed(4)}% en 20 casos; regímenes: ${okRegimenes}`,
    'error < 0.5% en los 20 casos; profundo ±1%, somero ±2%');
}

// ---------- W3J-T02: Gerstner ----------
{
  const L = 50, a = 1;
  const comp = componenteGerstner({ dirX: 1, dirZ: 0, amplitud: a, longitudOnda: L, fase: 0 });
  const T = 2 * Math.PI / (comp.k * comp.c);
  const t = T / 4;
  // referencia analítica: X(q) = q - a sin(kq-ωt), η(q) = a cos(kq-ωt)
  const omega = comp.k * comp.c;
  const N = 100;
  let suma2 = 0, etaMax = -Infinity, etaMin = Infinity;
  for (let i = 0; i < N; i++) {
    const q = (i / N) * L; // parámetro
    const th = comp.k * q - omega * t;
    const xRef = q - a * Math.sin(th);
    const etaRef = a * Math.cos(th);
    const etaApp = alturaGerstner1D(comp, xRef, t);
    suma2 += (etaApp - etaRef) ** 2;
    etaMax = Math.max(etaMax, etaRef); etaMin = Math.min(etaMin, etaRef);
  }
  const rms = Math.sqrt(suma2 / N);
  const HppTeo = 2 * a;
  // altura pico-valle medida por muestreo denso de la app
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < 400; i++) {
    const v = alturaGerstner1D(comp, (i / 400) * L, 0);
    mn = Math.min(mn, v); mx = Math.max(mx, v);
  }
  const errHpp = Math.abs((mx - mn) - HppTeo) / HppTeo;
  // check de fase: en t=0 el máximo de η está en x=0 (cresta en el origen)
  const faseOk = Math.abs(alturaGerstner1D(comp, 0, 0) - a) < 1e-9;
  registrar('W3J-T02', 'Campo Gerstner correcto',
    rms < 0.005 && errHpp < 0.005 && faseOk,
    `RMS ${(rms * 100).toFixed(4)}% teórico; H pico-valle err ${(errHpp * 100).toFixed(3)}%; fase (cresta en x=0, t=0): ${faseOk}`,
    'RMS < 0.5%; Hpp ±0.5%; fase correcta');
}

// ---------- W3J-T03: JONSWAP ----------
{
  const U = 15, F = 100_000;
  const { Hs, Tp } = generarComponentesJONSWAP(U, F, 200);
  // referencia INDEPENDIENTE: Hasselmann et al. (1973) original
  const g = 9.81;
  const omegaP = 22 * Math.pow(g * g / (U * F), 1 / 3);
  const TpTeo = 2 * Math.PI / omegaP;
  const alpha = 0.076 * Math.pow(g * F / (U * U), -0.22);
  // integración amplia (no dependiente del módulo) en [0.1·ωp, 6·ωp]
  const lo = 0.1 * omegaP, hi = 6 * omegaP, n = 4000;
  let m0 = 0;
  for (let i = 0; i < n; i++) {
    const w0 = lo + (hi - lo) * i / n, w1 = lo + (hi - lo) * (i + 1) / n;
    const dw = w1 - w0, wm = 0.5 * (w0 + w1);
    const sigma = wm <= omegaP ? 0.07 : 0.09;
    const r = Math.exp(-((wm - omegaP) ** 2) / (2 * sigma * sigma * omegaP * omegaP));
    const PM = (alpha * g * g) / Math.pow(wm, 5) * Math.exp(-1.25 * Math.pow(omegaP / wm, 4));
    m0 += PM * Math.pow(3.3, r) * dw;
  }
  const HsTeo = 4 * Math.sqrt(m0);
  const errHs = Math.abs(Hs - HsTeo) / HsTeo;
  const errTp = Math.abs(Tp - TpTeo) / TpTeo;
  const HsPM = HsPiersonMoskowitz(U, F);
  const coherente = Hs < HsPM; // JONSWAP (γ>1) concentra energía => m0 y Hs menores que PM con mismo α? NO:
  // Nota física: con mismo alpha, JONSWAP gamma>1 reduce el ancho del pico pero conserva la cola.
  // La integración estándar da Hs_JONSWAP > Hs_PM para mismos U,F (pico más energético).
  const coherenteFisica = Hs > HsPM || Math.abs(Hs - HsPM) / HsPM < 0.05;
  registrar('W3J-T03', 'Espectro JONSWAP normalizado',
    errHs < 0.05 && errTp < 0.03 && coherenteFisica,
    `Hs ${Hs.toFixed(2)} vs teo ${HsTeo.toFixed(2)} (err ${(errHs * 100).toFixed(2)}%); Tp ${Tp.toFixed(1)} vs ${TpTeo.toFixed(1)} (err ${(errTp * 100).toFixed(2)}%); JONSWAP vs PM: ${Hs.toFixed(2)} vs ${HsPM.toFixed(2)}`,
    'Hs ±5%, Tp ±3%, coherencia JONSWAP/PM');
}

const pass = resultados.filter(r => r.estado === 'PASS').length;
console.log(`\n${pass}/${resultados.length} tests pasando`);
process.exit(pass === resultados.length ? 0 : 1);
