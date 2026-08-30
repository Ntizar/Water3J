import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.setViewport({ width: 1400, height: 900 });
await page.goto('http://localhost:5199/studio.html', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 2500));
// zoom a nivel puerto (15) — el centro por defecto es interior, pero EMODnet dará tierra/0 → aún así valida flujo
await page.evaluate(() => { const m = document.getElementById('mapa'); });
// hacer zoom con la API de Leaflet vía la app (mapa es var de módulo; uso botones de zoom del mapa)
for (let i = 0; i < 8; i++) { await page.evaluate(() => document.querySelector('.leaflet-control-zoom-in')?.click()); await new Promise(r => setTimeout(r, 150)); }
await page.click('#btn2D');
await new Promise(r => setTimeout(r, 25000)); // rejilla 15×15 = 225 llamadas
const estado = await page.evaluate(() => document.getElementById('estado2d').textContent);
const rects = await page.evaluate(() => document.querySelectorAll('#mapa .leaflet-overlay-pane path').length);
console.log('ZOOM PUERTO:', estado, '| elementos:', rects, '| errores:', errs.length ? errs : 'ninguno');
await browser.close();
