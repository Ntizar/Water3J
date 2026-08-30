import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
await page.evaluate(() => window.Water3J.aplicarEscena('huracan'));
async function captura() {
  return page.evaluate(() => {
    const cv = document.querySelector('#escena canvas');
    const gl = cv.getContext('webgl2');
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const lum = [];
    for (let y = Math.floor(h * 0.4); y < h * 0.7; y += 9)
      for (let x = 0; x < w; x += 9) {
        const i = (y * w + x) * 4;
        lum.push(0.3*px[i] + 0.6*px[i+1] + 0.1*px[i+2]);
      }
    return lum;
  });
}
const a = await captura();
await new Promise(r => setTimeout(r, 2000));
const b = await captura();
let dif = 0; for (let i = 0; i < a.length; i++) dif += Math.abs(a[i] - b[i]);
const desvMedia = dif / a.length;
console.log('desviación media entre frames:', desvMedia.toFixed(2), '(>2 = el agua se mueve)');
console.log(desvMedia > 2 ? 'ANIMACION CONFIRMADA' : 'AGUA CONGELADA');
await browser.close();
