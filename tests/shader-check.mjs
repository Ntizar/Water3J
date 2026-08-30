import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
const logs = [];
page.on('console', m => logs.push(m.text().slice(0, 600)));
page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message.slice(0, 300)));
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2500));
const d = await page.evaluate(() => {
  const W = window.Water3J;
  W.renderer.compile(W.escena3d, W.camara);
  return { calls: W.renderer.info.render.calls, tris: W.renderer.info.render.triangles,
           chop: W.matAgua.uniforms.uChop.value, nOlas: W.comps.length };
});
console.log('draw calls:', d.calls, '| tris:', d.tris, '| chop:', d.chop, '| nOlas:', d.nOlas);
console.log('LOGS:', logs.filter(t => !t.includes('GPU stall')).slice(0, 8).join(' || ') || 'vacío');
await browser.close();
