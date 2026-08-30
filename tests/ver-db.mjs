import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('dialog', async d => { await d.accept('Prueba Bilbao temporal'); });
await page.setViewport({ width: 1400, height: 900 });
await page.goto('http://localhost:5199/studio.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));
await page.click('#btnGuardar');
await new Promise(r => setTimeout(r, 600));
const n1 = await page.evaluate(() => document.querySelectorAll('.escenario').length);
// recargar la página: debe seguir ahí (persistencia real)
await page.reload({ waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));
const n2 = await page.evaluate(() => document.querySelectorAll('.escenario').length);
const nombre = await page.evaluate(() => document.querySelector('.escenario b')?.textContent);
console.log('escenarios tras guardar:', n1, '| tras reload:', n2, '| nombre:', nombre, '| errores:', errs.length || 'ninguno');
await browser.close();
