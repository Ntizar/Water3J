import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
await page.evaluate(() => { window.Water3J.aplicarEscena('huracan'); window.Water3J.estado.tiempo.escala = 1; });
await new Promise(r => setTimeout(r, 1500));
const d = await page.evaluate(() => {
  const cv = document.querySelector('#escena canvas');
  const gl = cv.getContext('webgl2') || cv.getContext('webgl');
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  // varianza de luminancia en la franja central (agua)
  const lum = [];
  for (let y = Math.floor(h * 0.4); y < h * 0.7; y += 7)
    for (let x = 0; x < w; x += 7) {
      const i = (y * w + x) * 4;
      lum.push(0.3 * px[i] + 0.6 * px[i+1] + 0.1 * px[i+2]);
    }
  const media = lum.reduce((a,b)=>a+b,0) / lum.length;
  const varr = lum.reduce((a,b)=>a+(b-media)**2, 0) / lum.length;
  return { media: media.toFixed(1), desv: Math.sqrt(varr).toFixed(2), n: lum.length };
});
console.log('PIXELES AGUA:', JSON.stringify(d));
await browser.close();
