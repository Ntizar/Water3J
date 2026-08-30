import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));
// inyectar estado de boya vía Water3J (path programático equivalente a cargar JSON exportado)
await page.evaluate(() => {
  const eo = { Hs: 3.7, Tp: 12.4, direccion: 1.8, fuente: 'Puertos del Estado (Portus)', instante: '2026-08-30T12:00:00Z' };
  window.Water3J.estado.oleaje.Hs = eo.Hs;
  window.Water3J.estado.oleaje.Tp = eo.Tp;
  window.Water3J.actualizarCampo();
  window.Water3J.actualizarTelemetria();
});
const m = await page.evaluate(() => ({
  hs: window.Water3J.estado.oleaje.Hs,
  tp: window.Water3J.estado.oleaje.Tp,
  beaufort: document.getElementById('tBeaufort').textContent,
  mar: document.getElementById('tMar').textContent,
}));
console.log('ESTADO BOYA APLICADO:', JSON.stringify(m), '| errores:', errs.length || 'ninguno');
await browser.close();
