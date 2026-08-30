import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p.startsWith('/Water3J/')) p = p.slice('/Water3J'.length); // Pages sirve el repo en /Water3J/
  let f = join('dist', p === '/' ? 'index.html' : p);
  if (!existsSync(f)) f = join('dist', p, 'index.html');
  if (existsSync(f)) {
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
    res.end(readFileSync(f));
  } else { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(8123, r));

const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const errs = [];
page.on('pageerror', e => errs.push(e.message));

await page.goto('http://localhost:8123/', { waitUntil: 'networkidle0' });
const land = await page.evaluate(() => ({
  h1: document.querySelector('h1')?.textContent?.trim(),
  ctas: document.querySelectorAll('.cta').length,
  cards: document.querySelectorAll('.card').length,
}));
console.log('LANDING:', JSON.stringify(land));
await page.screenshot({ path: 'tests/evidencia-landing.png' });

await page.goto('http://localhost:8123/Water3J/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2500));
const demo = await page.evaluate(() => {
  const W = window.Water3J;
  return { ok: !!W, olas: W?.comps?.length };
});
console.log('DEMO:', JSON.stringify(demo), 'errores:', errs.length ? errs.slice(0,3) : 'ninguno');
await page.screenshot({ path: 'tests/evidencia-demo.png' });

await browser.close();
server.close();
const ok = land.h1?.includes('océano') && land.ctas === 2 && land.cards === 6 && demo.ok && demo.olas > 0 && errs.length === 0;
console.log(ok ? 'VERIFICACION OK' : 'VERIFICACION FALLO');
process.exit(ok ? 0 : 1);
