import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
// mock de fetch ANTES de navegar: devuelve la respuesta REAL de la boya 3545
await page.evaluateOnNewDocument(() => {
  const real = [['UTC','Hm0 (m)','Tp (s)'],
    [[1788048000,[[0.08,1],[3.68,1]]],[1788049200,[[0.08,1],[3.68,1]]],
     [1788050400,[[0.08,1],[4.85,1]]],[1788051600,[[2.30,1],[13.20,1]]]]];
  window.fetch = async (url) => ({ ok: true, json: async () => real });
});
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));
// abrir panel y conectar boya
await page.click('#btnPanel');
await new Promise(r => setTimeout(r, 400));
await page.select('#selEstacion', '3545');
await page.click('#btnConectar');
await new Promise(r => setTimeout(r, 1500));
const m = await page.evaluate(() => ({
  hs: window.Water3J.estado.oleaje.Hs,
  hsSlider: document.getElementById('vHs').textContent,
  bft: document.getElementById('tBeaufort').textContent,
  aviso: document.getElementById('avisoTxt').textContent,
  nEstaciones: document.querySelectorAll('#selEstacion option').length,
}));
console.log('DATOS REALES UI:', JSON.stringify(m), '| errores:', errs.length || 'ninguno');
await browser.close();
