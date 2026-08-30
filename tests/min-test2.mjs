import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:5199/tests/min2.html', { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__listo === true', { timeout: 15000 });
const m2 = await page.evaluate(() => {
  const gl = document.getElementById('c').getContext('webgl2');
  const px = new Uint8Array(256*256*4);
  gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let mn=999, mx=0;
  for (let i = 0; i < px.length; i += 40) { const l = 0.3*px[i]+0.6*px[i+1]+0.1*px[i+2]; mn=Math.min(mn,l); mx=Math.max(mx,l); }
  return { min: +mn.toFixed(0), max: +mx.toFixed(0) };
});
console.log('varying vH (esperado rango 25-100):', JSON.stringify(m2));
await browser.close();
