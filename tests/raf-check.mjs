import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1000));
// aplico HURACÁN CON SLIDERS (como un usuario) y espero muchísimo más
await page.evaluate(() => window.Water3J.aplicarEscena('huracan'));
// cuando aplico escena, uTiempo sigue avanzando. PERO: quizá el canvas renderiza SOLO cuando
// requestAnimationFrame dispara (SwiftShader rAF puede estar THROTTLED en headless).
// mido rAF rate:
const raf = await page.evaluate(() => new Promise(res => {
  let n = 0; const t0 = performance.now();
  function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); }
  requestAnimationFrame(f);
}));
console.log('rAF por segundo:', raf);
const d = await page.evaluate(() => ({ t: window.Water3J.matAgua.uniforms.uTiempo.value.toFixed(2) }));
console.log('uTiempo:', d.t);
await browser.close();
