import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto('https://ntizar.github.io/Water3J/demo.html', { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r => setTimeout(r, 2000));
const d = await page.evaluate(() => {
  const gl = document.querySelector('#escena canvas').getContext('webgl2');
  return { renderer: gl.getParameter(gl.RENDERER), calidad: window.Water3J.estado.visual.calidad,
           verts: window.Water3J.agua.geometry.attributes.position.count };
});
console.log(JSON.stringify(d));
await browser.close();
