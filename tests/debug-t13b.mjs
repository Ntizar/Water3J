import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', e => console.error('PAGEERROR:', e.message));
await page.goto('http://localhost:5199/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
const out = await page.evaluate(async () => {
  const W = window.Water3J;
  const el = document.getElementById('Hs');
  el.value = 6; el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 300));
  const sum2 = W.comps.reduce((s, c) => s + c.a * c.a, 0);
  return { HsEstado: W.estado.oleaje.Hs, nComps: W.comps.length, HsRec: 2 * Math.sqrt(sum2),
           modo: W.estado.oleaje.modo };
});
console.log(JSON.stringify(out));
await browser.close();
