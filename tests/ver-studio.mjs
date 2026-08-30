import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.setViewport({ width: 1400, height: 900 });
await page.goto('http://localhost:5199/studio.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
const m1 = await page.evaluate(() => ({
  metricas: document.querySelectorAll('.metrica').length,
  pasos: document.querySelectorAll('.paso').length,
  ejemplo: document.getElementById('calculo').textContent.split('\n')[0],
}));
// cambiar inputs y recalcular (los oninput disparan)
await page.evaluate(() => {
  document.getElementById('inHs').value = 5; document.getElementById('inHs').dispatchEvent(new Event('input'));
});
await new Promise(r => setTimeout(r, 300));
const m2 = await page.evaluate(() => document.getElementById('calculo').textContent.split('\n').slice(1,3).join(' | '));
console.log('STUDIO:', JSON.stringify({ metricas: m1.metricas, pasos: m1.pasos, ejemplo1: m1.ejemplo }), '\ntras Hs=5:', m2, '| errores:', errs.length || 'ninguno');
await browser.close();
