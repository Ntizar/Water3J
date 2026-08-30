import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));
await page.evaluate(() => window.Water3J.aplicarEscena('huracan'));
await new Promise(r => setTimeout(r, 6000));
const d = await page.evaluate(() => {
  const W = window.Water3J;
  return {
    hs: W.estado.oleaje.Hs, nOlas: W.comps.length,
    uTiempo: W.matAgua.uniforms.uTiempo.value.toFixed(2),
    numOlas: W.matAgua.uniforms.uNumOlas.value,
    olas0: W.matAgua.uniforms.uOlas.value[0].toArray().map(v => +v.toFixed(3)),
    chop: W.matAgua.uniforms.uChop.value,
    nMat: W.agua.material.type, geoN: W.agua.geometry.attributes.position.count,
    visible: W.agua.visible, escenaKids: W.escena3d.children.map(o => o.type),
  };
});
console.log(JSON.stringify(d, null, 1), 'errores:', errs.length || 'ninguno');
await browser.close();
