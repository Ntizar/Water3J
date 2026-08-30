// runner-navegador.mjs — T10/T12/T13 contra la app real vía puppeteer (headless, SwiftShader)
import puppeteer from 'puppeteer';

const URL = 'http://localhost:5199/demo.html';
const resultados = [];
function registrar(id, nombre, pasa, medida, criterio) {
  resultados.push({ id, nombre, estado: pasa ? 'PASS' : 'FAIL', medida, criterio });
  console.log(`${pasa ? '✅' : '❌'} ${id} ${nombre} — ${medida}`);
  if (!pasa) console.log(`   criterio: ${criterio}`);
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--no-sandbox', '--window-size=1280,720'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

const errores = [];
page.on('pageerror', e => errores.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errores.push('console: ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 2500)); // dejar arrancar render loop

// ---------- Sanity: la app expone su estado ----------
const saneo = await page.evaluate(() => {
  const W = window.Water3J;
  if (!W) return { ok: false, motivo: 'window.Water3J no expuesto' };
  return {
    ok: true,
    nOlas: W.comps.length,
    hEnOrigen: W.profundidadEn(0, 0),
    rendererInfo: W.renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1',
  };
});
registrar('W3J-T10a', 'App viva: escena, campo y exposición de estado',
  saneo.ok && saneo.nOlas > 0 && saneo.hEnOrigen > 0,
  `olas=${saneo.nOlas ?? '-'} h(0,0)=${saneo.hEnOrigen ?? '-'} m · ${saneo.rendererInfo ?? saneo.motivo ?? ''}`,
  'window.Water3J expuesto, >=1 ola, profundidad > 0');

// ---------- T10b: la superficie se mueve (dos muestras de altura con t distinto) ----------
{
  const h1 = await page.evaluate(() => {
    const W = window.Water3J;
    return W.alturaEn(W.comps, 0, 0, W.matAgua.uniforms.uTiempo.value);
  });
  await new Promise(r => setTimeout(r, 700));
  const h2 = await page.evaluate(() => {
    const W = window.Water3J;
    return W.alturaEn(W.comps, 0, 0, W.matAgua.uniforms.uTiempo.value);
  });
  const mueve = Number.isFinite(h1) && Number.isFinite(h2) && Math.abs(h2 - h1) > 1e-4;
  registrar('W3J-T10b', 'Superficie evoluciona en tiempo real', mueve,
    `η(t1)=${h1?.toFixed(4)} → η(t2)=${h2?.toFixed(4)} m (Δ=${Math.abs(h2 - h1).toFixed(4)})`,
    '|Δη| > 1e-4 m entre dos instantes reales del reloj de la app');
}

// ---------- T10c: modificar estado desde UI (slider Hs) cambia el campo ----------
{
  await page.evaluate(() => {
    const el = document.getElementById('Hs');
    el.value = 6; el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 300));
  const r2 = await page.evaluate(() => ({
    Hs: window.Water3J.estado.oleaje.Hs,
    umbral: window.Water3J.matAgua.uniforms.uUmbralEspuma.value,
    nOlas: window.Water3J.comps.length,
  }));
  registrar('W3J-T10c', 'UI → estado → GPU: slider Hs reacciona',
    r2.Hs === 6 && r2.umbral > 0 && r2.nOlas > 0,
    `Hs=${r2.Hs}, umbral espuma=${r2.umbral.toFixed(2)}, olas=${r2.nOlas}`,
    'mover slider Hs actualiza estado y uniformes del shader');
}

// ---------- T10d: batimetría — profundidad responde a pendiente ----------
{
  const r3 = await page.evaluate(() => {
    const W = window.Water3J;
    const h1 = W.profundidadEn(1000, 0);
    W.estado.batimetria.pendiente = 0.06;
    const h2 = W.profundidadEn(1000, 0);
    W.estado.batimetria.pendiente = 0.02;
    return { h1, h2 };
  });
  registrar('W3J-T10d', 'Batimetría analítica responde a pendiente',
    r3.h2 > r3.h1 && r3.h1 > 0 && r3.h2 > 0,
    `h(1000) pen=0.02 → ${r3.h1.toFixed(1)} m · pen=0.06 → ${r3.h2.toFixed(1)} m`,
    'mayor pendiente ⇒ mayor profundidad mar adentro a igual distancia');
}

// ---------- T12: rendimiento (fps medidos sobre requestAnimationFrame) ----------
{
  // en software (SwiftShader) medimos con calidad 'bajo'; en GPU real esto sobra
  await page.evaluate(() => {
    const sel = document.getElementById('calidad');
    sel.value = 'bajo'; sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 500));
  const fps = await page.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    function tick() { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else res(n / 3); }
    requestAnimationFrame(tick);
  }));
  const aspectoOk = fps > 15; // SwiftShader por software; GPU real >> 60
  registrar('W3J-T12', 'Rendimiento del render loop',
    aspectoOk,
    `${fps.toFixed(1)} fps (headless SwiftShader 1280×720, calidad bajo)`,
    '> 15 fps en software; en GPU real se espera > 60');
}

// ---------- T13: informe automático ----------
{
  const informe = await page.evaluate(() => {
    const W = window.Water3J;
    const e = W.estado;
    e.oleaje.modo = 'parametrico'; e.oleaje.Hs = 6;
    // re-disparar actualización de campo vía el slider (misma ruta que la UI)
    const el = document.getElementById('Hs');
    el.value = 6; el.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      Hs: e.oleaje.Hs, Tp: e.oleaje.Tp, dir: e.oleaje.direccion,
      h: W.profundidadEn(0, 0),
      nOlas: W.comps.length,
      amplitudes: W.comps.map(c => c.a).reduce((s, a) => s + a * a, 0) ** 0.5 * 2,
    };
  });
  const coherente = informe.Hs > 0 && informe.h > 0 && informe.nOlas > 0
    && Math.abs(informe.amplitudes - informe.Hs) / informe.Hs < 0.35;
  registrar('W3J-T13', 'Informe de escenario coherente',
    coherente,
    `Hs=${informe.Hs} m · Tp=${informe.Tp} s · h=${informe.h.toFixed(1)} m · Σa²·2=${informe.amplitudes.toFixed(2)} m (${informe.nOlas} olas)`,
    'Hs reconstruido del campo dentro de ±35% del Hs configurado');
}

// ---------- Screenshot de evidencia ----------
await page.screenshot({ path: 'tests/evidencia-app.png' });

await browser.close();

const pass = resultados.filter(r => r.estado === 'PASS').length;
console.log(`\n${pass}/${resultados.length} tests de navegador pasando`);
if (errores.length) console.log('\nERRORES DE CONSOLA:\n' + errores.slice(0, 10).join('\n'));
process.exit(pass === resultados.length && errores.length === 0 ? 0 : 1);
