import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('https://token-gremlin.github.io/natural-disasters/', { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r => setTimeout(r, 5000));
await page.screenshot({ path: 'tests/ref-abyssal.png' });
const info = await page.evaluate(() => ({
  body: document.body.innerText.slice(0, 2500),
  nControles: document.querySelectorAll('button, input, select, [role=slider]').length,
}));
console.log('CONTROLES:', info.nControles);
console.log(info.body);
await browser.close();
