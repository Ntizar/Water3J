import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.setViewport({ width: 1400, height: 900 });
await page.goto('http://localhost:5199/studio.html', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 2500));
// clic en botón 2D (centro por defecto = interior de España; muevo el mapa a la costa de Bilbao primero)
await page.evaluate(() => { window.__mapa?.setView; });
// el mapa es var local; uso el centro por defecto. Mejor: hacer clic con botón y ver el estado.
await page.click('#btn2D');
await new Promise(r => setTimeout(r, 20000)); // 121 llamadas EMODnet en paralelo
const estado = await page.evaluate(() => document.getElementById('estado2d').textContent);
const rects = await page.evaluate(() => document.querySelectorAll('#mapa .leaflet-overlay-pane path').length);
console.log('ESTADO 2D:', estado, '| elementos dibujados:', rects, '| errores:', errs.length ? errs : 'ninguno');
await browser.close();
