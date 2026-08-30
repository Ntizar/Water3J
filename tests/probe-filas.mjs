import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));
await page.evaluate(() => window.Water3J.aplicarEscena('huracan'));
await new Promise(r => setTimeout(r, 6000));
const d = await page.evaluate(() => {
  const cv = document.querySelector('#escena canvas');
  const gl = cv.getContext('webgl2');
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  // filas: muestreo vertical completo, luminancia media por fila => ¿hay transición cielo/agua y relieve?
  const filas = [];
  for (let y = 0; y < h; y += 20) {
    let s = 0, n = 0, mn = 999, mx = 0;
    for (let x = 0; x < w; x += 5) {
      const i = (y * w + x) * 4;
      const l = 0.3*px[i] + 0.6*px[i+1] + 0.1*px[i+2];
      s += l; n++; mn = Math.min(mn, l); mx = Math.max(mx, l);
    }
    filas.push({ y, media: (s/n).toFixed(0), rango: (mx-mn).toFixed(0) });
  }
  return filas;
});
console.log(JSON.stringify(d, null, 0));
await browser.close();
