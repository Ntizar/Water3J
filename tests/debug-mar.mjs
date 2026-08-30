import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2000));
await page.evaluate(() => window.Water3J.aplicarEscena('huracan'));
await new Promise(r => setTimeout(r, 1000));
const d = await page.evaluate(() => {
  const W = window.Water3J;
  // η en varios puntos y tiempos — ¿el campo CPU tiene relieve?
  const muestras = [];
  for (let x = -300; x <= 300; x += 150) muestras.push(W.alturaEn(W.comps, x, 0, W.matAgua.uniforms.uTiempo.value).toFixed(2));
  return { Hs: W.estado.oleaje.Hs, nOlas: W.comps.length,
           maxA: Math.max(...W.comps.map(c => c.a)).toFixed(2),
           muestras, numOlasGPU: W.matAgua.uniforms.uNumOlas.value };
});
console.log(JSON.stringify(d), 'errores:', errs.length ? errs.slice(0,3) : 'ninguno');
await browser.close();
