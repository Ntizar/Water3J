// debug en navegador: qué produce generarCampo con Hs=6 paramétrico
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:5199/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
const out = await page.evaluate(async () => {
  const W = window.Water3J;
  // importar generarCampo directamente del módulo servido por vite
  const mod = await import('/src/app/campoOlas.js');
  const e = W.estado;
  e.oleaje.modo = 'parametrico'; e.oleaje.Hs = 6; e.oleaje.Tp = 8; e.oleaje.nComponentes = 48;
  const comps = mod.generarCampo(e);
  const sum2 = comps.reduce((s, c) => s + c.a * c.a, 0);
  return { n: comps.length, HsRec: 2 * Math.sqrt(sum2), steep: comps.reduce((s,c)=>s+c.a*c.k,0) };
});
console.log(JSON.stringify(out));
await browser.close();
