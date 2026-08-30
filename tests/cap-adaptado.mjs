import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));
await page.evaluate(() => { window.Water3J.aplicarEscena('huracan'); window.Water3J.setCamara({ angX: 0.5, dist: 70, auto: false }); });
// esperar a que adaptarCalidad dispare (fps<3 tras 4 s de sim en SwiftShader)
await new Promise(r => setTimeout(r, 25000));
const m = await page.evaluate(() => {
  const W = window.Water3J, gl = document.querySelector('#escena canvas').getContext('webgl2');
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
  return { calidad: W.estado.visual.calidad, verts: W.agua.geometry.attributes.position.count,
           visuales: W.matAgua.uniforms.uNumOlas.value, rango: +(mx-mn).toFixed(0), media: +(s/n).toFixed(0) };
});
console.log('TRAS ADAPTACION:', JSON.stringify(m), '| errores:', errs.length || 'ninguno');
await browser.close();
