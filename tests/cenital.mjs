import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
await page.evaluate(() => { window.Water3J.aplicarEscena('huracan'); window.Water3J.estado.tiempo.escala = 0.5; });
await new Promise(r => setTimeout(r, 4000));
// vista cenital: sobrevuela el campo de olas
await page.evaluate(() => {
  const W = window.Water3J, c = W.camara;
  c.position.set(0, 80, 0.1); c.lookAt(0, 0, 0);
});
await new Promise(r => setTimeout(r, 5000));
const m = await page.evaluate(() => {
  const gl = document.querySelector('#escena canvas').getContext('webgl2');
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let mn = 999, mx = 0, s = 0, n = 0;
  for (let y = Math.floor(h*0.3); y < h*0.8; y += 4)
    for (let x = 0; x < w; x += 4) {
      const i = (y * w + x) * 4;
      const l = 0.3*px[i]+0.6*px[i+1]+0.1*px[i+2];
      mn = Math.min(mn, l); mx = Math.max(mx, l); s += l; n++;
    }
  return { min: mn.toFixed(0), max: mx.toFixed(0), rango: (mx-mn).toFixed(0) };
});
console.log('CENITAL rango:', JSON.stringify(m));
await browser.close();
