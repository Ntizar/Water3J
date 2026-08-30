import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1000));
await page.evaluate(() => {
  window.Water3J.aplicarEscena('huracan');
  window.Water3J.setCamara({ angX: 0.5, dist: 70, auto: false });
  // recortar el campo a 8 olas via estado:
  window.Water3J.estado.oleaje.nComponentes = 8;
  window.Water3J.actualizarCampo();
});
await new Promise(r => setTimeout(r, 8000));
const cdp = await page.createCDPSession();
await cdp.send('Page.enable');
const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
writeFileSync('tests/v2-8olas.png', Buffer.from(shot.data, 'base64'));
const m = await page.evaluate(() => {
  const gl = document.querySelector('#escena canvas').getContext('webgl2');
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let mn=999, mx=0, s=0, n=0;
  for (let y = Math.floor(h*0.3); y < h*0.75; y += 4)
    for (let x = 0; x < w; x += 4) {
      const i = (y*w+x)*4;
      const l = 0.3*px[i]+0.6*px[i+1]+0.1*px[i+2];
      mn=Math.min(mn,l); mx=Math.max(mx,l); s+=l; n++;
    }
  return {min:+mn.toFixed(0), max:+mx.toFixed(0), rango:+(mx-mn).toFixed(0), media:+(s/n).toFixed(0)};
});
console.log('8 OLAS:', JSON.stringify(m));
await browser.close();
