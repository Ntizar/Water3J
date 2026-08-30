import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));
await page.evaluate(() => window.Water3J.aplicarEscena('huracan'));
// cenital 60 m: probado que el relieve SÍ se ve así
await page.evaluate(() => { const c = window.Water3J.camara; c.position.set(0, 70, 0.01); c.lookAt(0,0,0); });
await new Promise(r => setTimeout(r, 9000));
const cdp = await page.createCDPSession();
await cdp.send('Page.enable');
const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
writeFileSync('tests/v2-cenital.png', Buffer.from(shot.data, 'base64'));
console.log('ok');
await browser.close();
