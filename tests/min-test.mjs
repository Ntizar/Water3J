import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded' }).catch(()=>{});
await page.setContent(`<canvas id="c" width="256" height="256"></canvas>
<script type="module">
import * as THREE from '/node_modules/three/build/three.module.js';
const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), preserveDrawingBuffer: true });
const s = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 5000); cam.position.set(0, 100, 0.1); cam.lookAt(0,0,0);
const g = new THREE.PlaneGeometry(400, 400, 64, 64); g.rotateX(-Math.PI/2);
const m = new THREE.ShaderMaterial({
  vertexShader: \`
    uniform float uT;
    void main() {
      vec3 p = position;
      p.y += 10.0 * sin(p.x * 0.1 + uT) * cos(p.z * 0.07 + uT * 0.7);
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
    }\`,
  fragmentShader: \`
    void main() { gl_FragColor = vec4(0.9, 0.5, 0.2, 1.0); }\`,
  uniforms: { uT: { value: 1.0 } }
});
s.add(new THREE.Mesh(g, m));
r.render(s, cam);
window.__listo = true;
</script>`);
await page.waitForFunction('window.__listo === true', { timeout: 15000 });
const m2 = await page.evaluate(() => {
  const gl = document.getElementById('c').getContext('webgl2');
  const px = new Uint8Array(256*256*4);
  gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let mn=999, mx=0;
  for (let i = 0; i < px.length; i += 40) { const l = 0.3*px[i]+0.6*px[i+1]+0.1*px[i+2]; mn=Math.min(mn,l); mx=Math.max(mx,l); }
  return { min: +mn.toFixed(0), max: +mx.toFixed(0) };
});
console.log('TEST MÍNIMO (naranja esperado, rango>0):', JSON.stringify(m2));
await browser.close();
