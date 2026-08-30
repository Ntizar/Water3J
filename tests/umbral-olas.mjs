import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1000));
for (const nOlas of [12, 10]) {
  await page.evaluate((n) => {
    const W = window.Water3J;
    W.estado.oleaje.nComponentes = n;
    W.setCamara({ angX: 0.5, dist: 70, auto: false });
    W.actualizarCampo();
  }, nOlas);
  await new Promise(r => setTimeout(r, 9000));
  const m = await page.evaluate(() => {
    const gl = document.querySelector('#escena canvas').getContext('webgl2');
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let mn=999, mx=0;
    for (let y = Math.floor(h*0.3); y < h*0.75; y += 4)
      for (let x = 0; x < w; x += 4) {
        const i = (y*w+x)*4;
        const l = 0.3*px[i]+0.6*px[i+1]+0.1*px[i+2];
        mn=Math.min(mn,l); mx=Math.max(mx,l);
      }
    return +(mx-mn).toFixed(0);
  });
  console.log(`${nOlas} olas -> rango ${m} ${m > 50 ? 'OK (mar visible)' : 'SATURA (frame viejo)'}`);
}
await browser.close();
