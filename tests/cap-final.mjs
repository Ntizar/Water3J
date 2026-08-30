import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));
await page.evaluate(() => window.Water3J.aplicarEscena('huracan'));
await new Promise(r => setTimeout(r, 12000));
const estado = await page.evaluate(() => ({
  bft: document.getElementById('tBeaufort').textContent,
  hs: window.Water3J.estado.oleaje.Hs,
  director: window.Water3J.directorOn ?? 'n/a',
}));
const cdp = await page.createCDPSession();
await cdp.send('Page.enable');
const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
writeFileSync('tests/v2-huracan-final.png', Buffer.from(shot.data, 'base64'));
console.log('estado tras 12s:', JSON.stringify(estado), '| errores JS:', errs.length ? errs : 'ninguno');
await browser.close();
