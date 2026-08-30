import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.setViewport({ width: 1280, height: 800 });
await page.goto('https://ntizar.github.io/Water3J/demo.html', { waitUntil: 'networkidle0', timeout: 45000 });
await new Promise(r => setTimeout(r, 3000));
const demo = await page.evaluate(() => {
  const W = window.Water3J;
  return { ok: !!W, olas: W?.comps?.length, webgl: W?.renderer?.capabilities?.isWebGL2 };
});
console.log('DEMO PUBLICADA:', JSON.stringify(demo), 'errores:', errs.length ? errs : 'ninguno');
await page.screenshot({ path: 'tests/evidencia-pages.png' });
await browser.close();
process.exit(demo.ok && demo.olas > 0 && errs.length === 0 ? 0 : 1);
