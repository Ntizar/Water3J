// main.js — Bootstrap Water3J
// Arquitectura: estado.js (fuente de verdad) → campoOlas (CPU/GPU) → escena Three.js → UI escribe estado.
import * as THREE from 'three';
import { crearEstadoBase, serializar, deserializar, profundidadEn } from './estado.js';
import { generarCampo, uniformesShader, alturaEn } from './campoOlas.js';
import { VERTEX_AGUA, FRAGMENT_AGUA, VERTEX_FONDO, FRAGMENT_FONDO, VERTEX_CIELO, FRAGMENT_CIELO } from './shaders.js';

const estado = crearEstadoBase();
const MAX_OLAS = 64;

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('escena').appendChild(renderer.domElement);

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 5000);
camara.position.set(...estado.visual.camara.posicion);
camara.lookAt(...estado.visual.camara.objetivo);

// ---------- Cielo ----------
const cielo = new THREE.Mesh(
  new THREE.SphereGeometry(2000, 32, 16),
  new THREE.ShaderMaterial({
    vertexShader: VERTEX_CIELO, fragmentShader: FRAGMENT_CIELO, side: THREE.BackSide,
    uniforms: {
      uCenit: { value: new THREE.Color(0x1a4a7a) },
      uHorizonte: { value: new THREE.Color(0xbfd8e8) },
      uSol: { value: new THREE.Vector3(0.4, 0.5, -0.75).normalize() },
    },
  })
);
escena.add(cielo);

// ---------- Agua ----------
const TAM = 1200, SEG = { bajo: 96, media: 192, alta: 320, ultra: 448 };
const geoAgua = new THREE.PlaneGeometry(TAM, TAM, SEG.media, SEG.media);
geoAgua.rotateX(-Math.PI / 2);

const matAgua = new THREE.ShaderMaterial({
  vertexShader: VERTEX_AGUA.replaceAll('MAX_OLAS', String(MAX_OLAS)),
  fragmentShader: FRAGMENT_AGUA,
  uniforms: {
    uTiempo: { value: 0 },
    uOlas: { value: [new THREE.Vector4(1, 0, 0.1, 50)] },
    uNumOlas: { value: 1 },
    uColorProfundo: { value: new THREE.Color(0x0a3d5c) },
    uColorSomero: { value: new THREE.Color(0x2d8fb3) },
    uColorEspuma: { value: new THREE.Color(0xf0f8ff) },
    uSol: { value: new THREE.Vector3(0.4, 0.5, -0.75).normalize() },
    uUmbralEspuma: { value: 0.6 },
  },
});
const agua = new THREE.Mesh(geoAgua, matAgua);
agua.frustumCulled = false;
escena.add(agua);

// ---------- Fondo marino (plano arena con caústicas; batimetría real en v2) ----------
const fondo = new THREE.Mesh(
  new THREE.PlaneGeometry(TAM * 1.5, TAM * 1.5),
  new THREE.ShaderMaterial({
    vertexShader: VERTEX_FONDO, fragmentShader: FRAGMENT_FONDO,
    uniforms: {
      uTiempo: { value: 0 },
      uArena: { value: new THREE.Color(0xc2b280) },
      uEscalaCauticas: { value: 0.35 },
    },
  })
);
fondo.rotation.x = -Math.PI / 2;
fondo.position.y = -8; // visual MVP
escena.add(fondo);

// ---------- Actualizar campo de olas desde el estado ----------
let comps = [];
function actualizarCampo() {
  comps = generarCampo(estado);
  const datos = uniformesShader(comps);
  const vecs = [];
  for (let i = 0; i < MAX_OLAS; i++) {
    // relleno con ceros hasta MAX_OLAS: three aplana el array completo y exige tamaño estable
    vecs.push(new THREE.Vector4(
      datos[i * 4] || 0, datos[i * 4 + 1] || 0, datos[i * 4 + 2] || 0, datos[i * 4 + 3] || 1
    ));
  }
  matAgua.uniforms.uOlas.value = vecs;
  matAgua.uniforms.uNumOlas.value = comps.length;
  matAgua.uniforms.uUmbralEspuma.value = estado.oleaje.Hs * 0.45;
}
actualizarCampo();

// ---------- Controles orbitales mínimos (sin OrbitControls para cero deps) ----------
let arrastrando = false, px = 0, py = 0, dist = 260, angX = 0.5, angY = 0.7;
renderer.domElement.addEventListener('pointerdown', e => { arrastrando = true; px = e.clientX; py = e.clientY; });
window.addEventListener('pointerup', () => arrastrando = false);
window.addEventListener('pointermove', e => {
  if (!arrastrando) return;
  angY -= (e.clientX - px) * 0.005; angX += (e.clientY - py) * 0.005;
  angX = Math.max(0.08, Math.min(1.4, angX));
  px = e.clientX; py = e.clientY;
});
renderer.domElement.addEventListener('wheel', e => {
  dist = Math.max(40, Math.min(800, dist * (1 + Math.sign(e.deltaY) * 0.1)));
}, { passive: true });

function actualizarCamara() {
  const objetivo = new THREE.Vector3(0, 0, 60);
  camara.position.set(
    objetivo.x + dist * Math.cos(angX) * Math.sin(angY),
    objetivo.y + dist * Math.sin(angX),
    objetivo.z + dist * Math.cos(angX) * Math.cos(angY)
  );
  camara.lookAt(objetivo);
}

// ---------- UI ----------
const $ = id => document.getElementById(id);
function bindSlider(id, valorId, fmt, aplicar) {
  const el = $(id);
  el.addEventListener('input', () => {
    const v = parseFloat(el.value);
    $(valorId).textContent = fmt(v);
    aplicar(v);
    actualizarCampo();
  });
}
bindSlider('Hs', 'vHs', v => v.toFixed(1) + ' m', v => estado.oleaje.Hs = v);
bindSlider('Tp', 'vTp', v => v.toFixed(1) + ' s', v => estado.oleaje.Tp = v);
bindSlider('dir', 'vDir', v => v + '°', v => estado.oleaje.direccion = v * Math.PI / 180);
bindSlider('hBase', 'vH', v => v + ' m', v => estado.batimetria.hBase = v);
bindSlider('pen', 'vPen', v => v.toFixed(3), v => estado.batimetria.pendiente = v);
$('calidad').addEventListener('change', e => {
  const seg = SEG[e.target.value] ?? SEG.media;
  geoAgua.dispose();
  const nueva = new THREE.PlaneGeometry(TAM, TAM, seg, seg);
  nueva.rotateX(-Math.PI / 2);
  agua.geometry = nueva;
  estado.visual.calidad = e.target.value;
});
let pausado = false;
$('btnPausa').addEventListener('click', () => { pausado = !pausado; $('btnPausa').textContent = pausado ? '▶ Reanudar' : '⏸ Pausar'; });
$('btnDescargar').addEventListener('click', () => {
  const blob = new Blob([serializar(estado)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'escenario-water3j.json';
  a.click();
});
$('btnCargar').addEventListener('click', () => $('cargar').click());
$('cargar').addEventListener('change', async e => {
  const txt = await e.target.files[0].text();
  try {
    Object.assign(estado, deserializar(txt));
    actualizarCampo();
  } catch (err) { alert('Escenario inválido: ' + err.message); }
});

// ---------- Loop ----------
const medidorFPS = (() => { let marcas = [], last = 0; return (t) => {
  marcas.push(t); while (marcas.length && t - marcas[0] > 1000) marcas.shift();
  return marcas.length - 1;
};})();
let tSim = 0, tPrev = performance.now();
const hud = $('hud');
let frames = 0, tHud = 0;

function loop(tNow) {
  requestAnimationFrame(loop);
  const dtReal = Math.min((tNow - tPrev) / 1000, 0.1);
  tPrev = tNow;
  if (!pausado) tSim += dtReal * estado.tiempo.escala;
  matAgua.uniforms.uTiempo.value = tSim;
  fondo.material.uniforms.uTiempo.value = tSim;
  actualizarCamara();
  renderer.render(escena, camara);
  frames++;
  if (tNow - tHud > 500) {
    hud.textContent = `${medidorFPS(tNow)} fps · ${comps.length} olas · t=${tSim.toFixed(1)}s`;
    tHud = tNow; frames = 0;
  }
}
requestAnimationFrame(loop);

window.addEventListener('resize', () => {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// exposición para el runner de tests en navegador
// comps con getter: la variable local se reasigna en actualizarCampo()
window.Water3J = {
  estado,
  get comps() { return comps; },
  alturaEn,
  profundidadEn: (x, y) => profundidadEn(estado, x, y),
  renderer, matAgua,
  actualizarCampo,
};
