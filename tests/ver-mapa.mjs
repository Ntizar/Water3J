import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.setViewport({ width: 1400, height: 900 });
await page.goto('http://localhost:5199/studio.html', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 3000));
const m1 = await page.evaluate(() => ({
  tilesMap: typeof L !== 'undefined' && !!document.querySelector('#mapa .leaflet-pane'),
  boyas: document.querySelectorAll('.boya').length,
}));
// simular 2 clics en el mapa (mar y costa)
const box = await (await page.$('#mapa')).boundingBox();
await page.mouse.click(box.x + 300, box.y + 200);
await new Promise(r => setTimeout(r, 300));
await page.mouse.click(box.x + 300, box.y + 350);
await new Promise(r => setTimeout(r, 800));
const m2 = await page.evaluate(() => ({
  len: document.getElementById('lenPerfil').textContent,
  resumen: document.querySelectorAll('.metrica').length,
  lineas: document.querySelectorAll('.leaflet-overlay-pane path').length,
  calculo: document.getElementById('calculo').textContent.split('\n')[1] || '',
}));
console.log('MAPA:', JSON.stringify(m1), '\nTRNSECTO:', JSON.stringify(m2), '\nerrores:', errs.length ? errs : 'ninguno');
await browser.close();
