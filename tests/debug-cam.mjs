import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
await page.evaluate(() => window.Water3J.aplicarEscena('huracan'));
await new Promise(r => setTimeout(r, 500));
const d = await page.evaluate(() => {
  const W = window.Water3J;
  const c = W.camara;
  const proyecta = (x, y, z) => {
    const v = new (c.position.constructor)(x, y, z).project(c);
    return [(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight];
  };
  const pos = c.position;
  // proyectar una cresta a 100 m y 300 m de la cámara y su altura ±Hs/2
  const pCerca = proyectaRelativo(60);
  function proyectaRelativo(dx) {
    // punto delante de la cámara a distancia dx, altura ±Hs/2
    const dir = new (c.position.constructor)();
    c.getWorldDirection(dir);
    const base = c.position.clone().add(dir.multiplyScalar(dx));
    const arriba = proyecta(base.x, base.y + W.estado.oleaje.Hs / 2, base.z);
    const abajo = proyecta(base.x, base.y - W.estado.oleaje.Hs / 2, base.z);
    return { pxArriba: arriba[1], pxAbajo: abajo[1], altoPx: Math.abs(arriba[1] - abajo[1]) };
  }
  return { camY: c.position.y.toFixed(1), dist: c.position.length().toFixed(0),
           cerca: proyectaRelativo(80), media: proyectaRelativo(250) };
});
console.log(JSON.stringify(d, null, 1));
await browser.close();
