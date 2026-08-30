import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); // iPhone-ish
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0', timeout: 45000 });
await new Promise(r => setTimeout(r, 3000));
const s = await page.evaluate(() => {
  const W = window.Water3J;
  return {
    ok: !!W, olas: W?.comps?.length,
    beaufort: document.getElementById('tBeaufort')?.textContent,
    mar: document.getElementById('tMar')?.textContent,
    panelAbierto: document.getElementById('panel')?.classList.contains('abierto'),
    chips: document.querySelectorAll('#chipsEscena .chip').length,
    eventos: document.querySelectorAll('#chipsEventos .chip').length,
  };
});
console.log('MOVIL:', JSON.stringify(s), 'errores:', errs.length ? errs : 'ninguno');
await page.screenshot({ path: 'tests/v2-movil-cerrado.png' });
// abrir panel
await page.evaluate(() => document.getElementById('btnPanel').click());
await new Promise(r => setTimeout(r, 600));
await page.screenshot({ path: 'tests/v2-movil-abierto.png' });
// probar un preset (espera larga: SwiftShader renderiza a 1-2 fps)
await page.evaluate(() => window.Water3J.aplicarEscena('huracan'));
await new Promise(r => setTimeout(r, 8000));
const b2 = await page.evaluate(() => document.getElementById('tBeaufort').textContent);
console.log('tras huracán:', b2);
await page.screenshot({ path: 'tests/v2-movil-huracan.png' });
await browser.close();
