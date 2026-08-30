import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));
await page.evaluate(() => window.Water3J.aplicarEscena('huracan'));
await new Promise(r => setTimeout(r, 3000));
const d = await page.evaluate(() => {
  const c = window.Water3J.camara;
  const dir = c.getWorldDirection(new (window.THREE ? THREE.Vector3 : c.position.constructor)());
  return { pos: c.position.toArray().map(v => +v.toFixed(1)),
           dir: dir.toArray().map(v => +v.toFixed(2)),
           aspect: c.aspect, fov: c.fov };
});
console.log(JSON.stringify(d));
await browser.close();
