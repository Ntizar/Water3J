// main.js — Water3J v2: HUD náutico + bottom-sheet móvil
// Arquitectura: estado.js (verdad) → campoOlas (CPU/GPU) → escena → UI escribe estado.
import * as THREE from 'three';
import { crearEstadoBase, serializar, deserializar, profundidadEn } from './estado.js';
import { generarCampo, uniformesShader, alturaEn } from './campoOlas.js';
import { VERTEX_AGUA, FRAGMENT_AGUA, VERTEX_FONDO, FRAGMENT_FONDO, VERTEX_CIELO, FRAGMENT_CIELO } from './shaders.js';

const MAX_OLAS = 64;
const estado = crearEstadoBase();

// ---------- Escena ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('escena').appendChild(renderer.domElement);

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 5000);

const cielo = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.ShaderMaterial({
  vertexShader: VERTEX_CIELO, fragmentShader: FRAGMENT_CIELO, side: THREE.BackSide,
  uniforms: {
    uCenit: { value: new THREE.Color(0x12365c) }, uHorizonte: { value: new THREE.Color(0xcfe3ee) },
    uSol: { value: new THREE.Vector3(0.4, 0.35, -0.85).normalize() },
  },
}));
escena.add(cielo);

const TAM = 1200, SEG = { bajo: 96, media: 192, alta: 320, ultra: 448 };
const geoAgua = new THREE.PlaneGeometry(TAM, TAM, SEG.media, SEG.media);
geoAgua.rotateX(-Math.PI / 2);
const matAgua = new THREE.ShaderMaterial({
  vertexShader: VERTEX_AGUA.replaceAll('MAX_OLAS', String(MAX_OLAS)),
  fragmentShader: FRAGMENT_AGUA,
  uniforms: {
    uTiempo: { value: 0 },
    uChop: { value: 1.8 },
    uOlas: { value: [] }, uNumOlas: { value: 0 },
    uColorProfundo: { value: new THREE.Color(0x0c3757) },
    uColorSomero: { value: new THREE.Color(0x2799bd) },
    uColorEspuma: { value: new THREE.Color(0xeaf6fb) },
    uSol: { value: new THREE.Vector3(0.4, 0.35, -0.85).normalize() },
    uUmbralEspuma: { value: 0.6 },
  },
});
const agua = new THREE.Mesh(geoAgua, matAgua);
agua.frustumCulled = false;
escena.add(agua);

// océano lejano: disco enorme que tapa horizonte/canto (uniforme, sin olas)
const lejano = new THREE.Mesh(
  new THREE.CircleGeometry(4000, 48),
  new THREE.MeshBasicMaterial({ color: 0x0c3757 })
);
lejano.rotation.x = -Math.PI / 2; lejano.position.y = -0.4;
escena.add(lejano);

const fondo = new THREE.Mesh(new THREE.PlaneGeometry(TAM * 1.5, TAM * 1.5), new THREE.ShaderMaterial({
  vertexShader: VERTEX_FONDO, fragmentShader: FRAGMENT_FONDO,
  uniforms: { uTiempo: { value: 0 }, uArena: { value: new THREE.Color(0xc9b892) }, uEscalaCauticas: { value: 0.32 } },
}));
fondo.rotation.x = -Math.PI / 2; fondo.position.y = -14;
escena.add(fondo);

// ---------- Campo de olas ----------
let comps = [];
function actualizarCampo() {
  comps = generarCampo(estado);
  const datos = uniformesShader(comps);
  const vecs = [];
  for (let i = 0; i < MAX_OLAS; i++) {
    vecs.push(new THREE.Vector4(datos[i*4] || 0, datos[i*4+1] || 0, datos[i*4+2] || 0, datos[i*4+3] || 1));
  }
  // cap visual: en calidad baja el shader solo recibe 16 componentes (la física CPU conserva todas)
  const LIMITE = { bajo: 12, media: 24, alta: 48, ultra: 64 };
  const nVis = Math.min(comps.length, LIMITE[estado.visual.calidad] ?? 48);
  matAgua.uniforms.uOlas.value = vecs;
  matAgua.uniforms.uNumOlas.value = nVis;
  matAgua.uniforms.uUmbralEspuma.value = Math.max(0.18, estado.oleaje.Hs * 0.32);
}
actualizarCampo();

// ---------- Beaufort ----------
const BEAUFORT = [
  [0.5, 'CALMA CHICOSA'], [1.5, 'VENTOLINA'], [3.3, 'BRISA MUY SUAVE'], [5.4, 'BRISA SUAVE'],
  [7.9, 'BRISA MODERADA'], [10.7, 'BRISA FRESCA'], [13.8, 'BRISA FUERTE'], [17.1, 'VIENTO FUERTE'],
  [20.7, 'TEMPORAL'], [24.4, 'TEMPORAL FUERTE'], [28.4, 'TEMPORAL DURO'], [32.6, 'TEMPORAL MUY DURO'],
  [99, 'HURACÁN'],
];
function beaufort(u) { for (let i = 0; i < BEAUFORT.length; i++) if (u < BEAUFORT[i][0]) return i; return 12; }
const NOMBRES_BFT = ['CALMA CHICOSA','VENTOLINA','BRISA MUY SUAVE','BRISA SUAVE','BRISA MODERADA','BRISA FRESCA','BRISA FUERTE','VIENTO FUERTE','TEMPORAL','TEMPORAL FUERTE','TEMPORAL DURO','TEMPORAL MUY DURO','HURRICÁN'];

// ---------- UI: helpers ----------
const $ = id => document.getElementById(id);
function actualizarTelemetria() {
  const b = beaufort(estado.oleaje.vientoU);
  $('tBeaufort').textContent = `BEAUFORT ${b} · ${NOMBRES_BFT[b]}`;
  $('tMar').textContent = `HS ${estado.oleaje.Hs.toFixed(1)} M · TP ${estado.oleaje.Tp.toFixed(1)} S · ${Math.round(estado.oleaje.direccion * 180 / Math.PI)}°`;
  $('tFondo').textContent = `FONDO ${estado.batimetria.hBase} M · PENDIENTE ${estado.batimetria.pendiente.toFixed(3)}`;
}
function bindSlider(id, vid, fmt, aplicar) {
  const el = $(id), v = $(vid);
  const refrescar = () => { v.textContent = fmt(parseFloat(el.value)); };
  el.addEventListener('input', () => { const x = parseFloat(el.value); controlManual(); aplicar(x); refrescar(); actualizarCampo(); actualizarTelemetria(); });
  refrescar();
}
let director = true;
function controlManual() {
  if (director) { director = false; $('btnDirector').textContent = 'OFF'; $('btnDirector').classList.remove('activa'); }
}
function aviso(titulo, sub) {
  $('avisoTxt').textContent = titulo; $('avisoSub').textContent = sub || '';
  $('aviso').classList.add('visible');
  clearTimeout(aviso._t); aviso._t = setTimeout(() => $('aviso').classList.remove('visible'), 2600);
}

// ---------- Panel bottom-sheet ----------
const panel = $('panel');
function abrirPanel(a) { panel.classList.toggle('abierto', a); }
$('btnPanel').addEventListener('click', () => abrirPanel(!panel.classList.contains('abierto')));
// swipe en la asa
let asaY0 = null;
$('asa').addEventListener('touchstart', e => { asaY0 = e.touches[0].clientY; }, { passive: true });
$('asa').addEventListener('touchend', e => {
  if (asaY0 === null) return;
  const dy = e.changedTouches[0].clientY - asaY0;
  if (dy < -12) abrirPanel(true); else if (dy > 12) abrirPanel(false);
  asaY0 = null;
});
document.querySelectorAll('#pestañas button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#pestañas button').forEach(x => x.classList.remove('activa'));
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('activa'));
  b.classList.add('activa');
  $('sec-' + b.dataset.sec).classList.add('activa');
}));

// ---------- Sliders ----------
bindSlider('Hs', 'vHs', v => v.toFixed(1) + ' m', v => estado.oleaje.Hs = v);
bindSlider('Tp', 'vTp', v => v.toFixed(1) + ' s', v => estado.oleaje.Tp = v);
bindSlider('dir', 'vDir', v => v + '°', v => estado.oleaje.direccion = v * Math.PI / 180);
bindSlider('viento', 'vViento', v => v.toFixed(1) + ' m/s', v => estado.oleaje.vientoU = v);
bindSlider('hBase', 'vH', v => v + ' m', v => estado.batimetria.hBase = v);
bindSlider('pen', 'vPen', v => v.toFixed(3), v => estado.batimetria.pendiente = v);
bindSlider('escalaT', 'vEscala', v => v.toFixed(1) + '×', v => estado.tiempo.escala = v);
bindSlider('orbita', 'vOrbita', v => v === '1' ? 'ON' : 'OFF', () => {});

// ---------- Escenas preset ----------
const ESCENAS = {
  'calma':    { Hs: 0.3, Tp: 6, vientoU: 1,  nombre: 'CALMA', sub: 'mar de aceite · Beaufort 0' },
  'brisa':    { Hs: 1.2, Tp: 7,  vientoU: 6,  nombre: 'BRISA', sub: 'swell suave · tarde de verano' },
  'marejada': { Hs: 3.0, Tp: 9,  vientoU: 12, nombre: 'MAREJADA', sub: 'mar de levante · Beaufort 5' },
  'temporal': { Hs: 6.0, Tp: 12, vientoU: 22, nombre: 'TEMPORAL', sub: 'frente de poniente' },
  'huracan':  { Hs: 11,  Tp: 14, vientoU: 34, nombre: 'HURRICÁN', sub: 'categoría 2 · mar de fondo' },
  'tsunami':  { Hs: 2.0, Tp: 30, vientoU: 2,  nombre: 'TSUNAMI', sub: 'onda larga · periodo extremo', TpMax: true },
};
function aplicarEscena(k, auto = false) {
  const e = ESCENAS[k]; if (!e) return;
  if (!auto) controlManual();
  estado.oleaje.Hs = e.Hs; estado.oleaje.Tp = Math.min(e.Tp, 20); estado.oleaje.vientoU = e.vientoU;
  // reflejar en sliders
  $('Hs').value = e.Hs; $('Tp').value = Math.min(e.Tp, 20); $('viento').value = e.vientoU;
  $('vHs').textContent = e.Hs.toFixed(1) + ' m'; $('vTp').textContent = Math.min(e.Tp, 20).toFixed(1) + ' s';
  $('vViento').textContent = e.vientoU.toFixed(1) + ' m/s';
  actualizarCampo(); actualizarTelemetria();
  aviso(e.nombre, e.sub);
  document.querySelectorAll('#chipsEscena .chip').forEach(c => c.classList.toggle('activa', c.dataset.k === k));
}
const chipsEscena = $('chipsEscena');
for (const [k, e] of Object.entries(ESCENAS)) {
  const b = document.createElement('button');
  b.className = 'chip'; b.dataset.k = k; b.textContent = e.nombre;
  b.addEventListener('click', () => aplicarEscena(k));
  chipsEscena.appendChild(b);
}
aplicarEscena('brisa');

// ---------- Eventos ----------
const EVENTOS = {
  'ola-gigante': { nombre: 'OLA GIGANTE', accion: () => aplicarEscena('huracan') },
  'clapotis': { nombre: 'CLAPOTIS', accion: () => aviso('CLAPOTIS', 'reflexión sobre muro vertical — módulo listo, visual v2.1') },
  'frente': { nombre: 'FRENTE DE ROMPIENTE', accion: () => { estado.batimetria.pendiente = 0.06; $('pen').value = 0.06; $('vPen').textContent = '0.060'; actualizarCampo(); aviso('ROMPIENTES', 'pendiente abrupta · shoaling intensificado'); } },
};
const chipsEv = $('chipsEventos');
for (const [k, ev] of Object.entries(EVENTOS)) {
  const b = document.createElement('button');
  b.className = 'chip'; b.textContent = ev.nombre;
  b.addEventListener('click', () => { controlManual(); ev.accion(); });
  chipsEv.appendChild(b);
}

// ---------- Estructuras ----------
const ESTRUCTURAS = {
  'muro': 'MURO VERTICAL', 'dique': 'DIQUE', 'espigon': 'ESPIGÓN',
};
const chipsEst = $('chipsEstructuras');
for (const [k, n] of Object.entries(ESTRUCTURAS)) {
  const b = document.createElement('button');
  b.className = 'chip'; b.textContent = n;
  b.addEventListener('click', () => aviso(n, 'geometría 3D de estructura — próximamente (física ya validada: Goda, Cr)'));
  chipsEst.appendChild(b);
}

// ---------- Segmentos (calidad / cámara) ----------
function bindSegmento(id, cb) {
  $(id).querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    $(id).querySelectorAll('button').forEach(x => x.classList.remove('activa'));
    b.classList.add('activa'); cb(b.dataset);
  }));
}
bindSegmento('segCalidad', d => {
  const seg = SEG[d.q] ?? SEG.media;
  geoAgua.dispose();
  const n = new THREE.PlaneGeometry(TAM, TAM, seg, seg); n.rotateX(-Math.PI / 2);
  agua.geometry = n; estado.visual.calidad = d.q;
});
bindSegmento('segCamara', d => {
  modoCamara = d.cam;
  if (d.cam === 'aerea') { angX = 1.2; dist = 220; }
  else if (d.cam === 'costa') { angX = 0.35; dist = 35; }
  else { angX = 0.42; dist = 60; }
});

// ---------- Cámara ----------
let modoCamara = 'orbital';
let arrastrando = false, px = 0, py = 0, dist = 60, angX = 0.42, angY = 0.7, orbitaAuto = true;
renderer.domElement.addEventListener('pointerdown', e => { arrastrando = true; px = e.clientX; py = e.clientY; orbitaAuto = $('orbita').value === '1'; });
addEventListener('pointerup', () => arrastrando = false);
addEventListener('pointermove', e => {
  if (!arrastrando) return;
  angY -= (e.clientX - px) * 0.005; angX += (e.clientY - py) * 0.005;
  angX = Math.max(0.05, Math.min(1.45, angX)); px = e.clientX; py = e.clientY;
});
renderer.domElement.addEventListener('wheel', e => {
  dist = Math.max(40, Math.min(900, dist * (1 + Math.sign(e.deltaY) * 0.1)));
}, { passive: true });
// pellizco táctil
let pinch0 = null;
renderer.domElement.addEventListener('touchstart', e => {
  if (e.touches.length === 2) pinch0 = Math.hypot(
    e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
}, { passive: true });
renderer.domElement.addEventListener('touchmove', e => {
  if (e.touches.length === 2 && pinch0) {
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    dist = Math.max(40, Math.min(900, dist * pinch0 / d)); pinch0 = d;
  }
}, { passive: true });
renderer.domElement.addEventListener('touchend', () => pinch0 = null);
$('btnReset').addEventListener('click', () => { dist = 60; angX = 0.42; angY = 0.7; });

function actualizarCamara(t) {
  if (orbitaAuto && !arrastrando) angY += 0.0006;
  const obj = new THREE.Vector3(0, estado.oleaje.Hs * 0.25, 40); // mira algo por encima del nivel medio
  // la cámara SIEMPRE por encima de la cresta máxima (chop 1.8 => eta_max ≈ 2·Hs)
  const alturaExtra = 4 + estado.oleaje.Hs * 1.3;
  camara.position.set(obj.x + dist * Math.cos(angX) * Math.sin(angY),
    obj.y + dist * Math.sin(angX) + alturaExtra, obj.z + dist * Math.cos(angX) * Math.cos(angY));
  camara.lookAt(obj);
}

// ---------- Pausa / escenario / director ----------
let pausado = false;
$('btnPausa').addEventListener('click', () => {
  pausado = !pausado; $('btnPausa').textContent = pausado ? '▶' : '❚❚';
});
$('btnDescargar').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([serializar(estado)], { type: 'application/json' }));
  a.download = 'escenario-water3j.json'; a.click();
});
$('btnCargar').addEventListener('click', () => $('cargar').click());
$('cargar').addEventListener('change', async e => {
  try {
    Object.assign(estado, deserializar(await e.target.files[0].text()));
    actualizarCampo(); actualizarTelemetria();
  } catch (err) { aviso('ESCENARIO INVÁLIDO', err.message); }
});
$('btnDirector').addEventListener('click', () => {
  director = !director;
  $('btnDirector').textContent = director ? 'ON' : 'OFF';
  $('btnDirector').classList.toggle('activa', director);
});

// ---------- Loop ----------
let tSim = 0, tPrev = performance.now(), tEscena = 0, idxEscena = 0;
const CLAVES_ESCENA = Object.keys(ESCENAS);
let fpsMarcas = [], frames = 0, tHud = 0, tArranque = 0, adaptado = false;

// adaptación automática: en móviles modestos / render por software el coste de 48 olas × 37k
// vértices es brutal. Detección en el ARRANQUE (antes del primer render): si el renderer es
// software (SwiftShader/llvmpipe) arrancamos en calidad 'bajo' — evita el swap en caliente.
const esSoftware = /swiftshader|llvmpipe|software/i.test(renderer.getContext().getParameter(renderer.getContext().RENDERER) + '');
if (esSoftware) { estado.visual.calidad = 'bajo'; geoAgua.dispose();
  const n = new THREE.PlaneGeometry(TAM, TAM, SEG.bajo, SEG.bajo); n.rotateX(-Math.PI / 2);
  agua.geometry = n;
  $('segCalidad')?.querySelectorAll('button').forEach(x => x.classList.toggle('activa', x.dataset.q === 'bajo'));
}
function adaptarCalidad(fps) {
  if (adaptado || pausado) return;
  if (tSim > 4 && fps < 3) {
    adaptado = true;
    estado.visual.calidad = 'bajo';
    geoAgua.dispose();
    const n = new THREE.PlaneGeometry(TAM, TAM, SEG.bajo, SEG.bajo); n.rotateX(-Math.PI / 2);
    agua.geometry = n;
    actualizarCampo(); // reenvía uniformes con el cap
    $('segCalidad').querySelectorAll('button').forEach(x => x.classList.toggle('activa', x.dataset.q === 'bajo'));
    aviso('MODO LIGERO', 'rendimiento adaptado a tu dispositivo');
  }
}

function loop(tNow) {
  requestAnimationFrame(loop);
  const dtReal = Math.min((tNow - tPrev) / 1000, 0.1); tPrev = tNow;
  if (!pausado) tSim += dtReal * estado.tiempo.escala;
  if (director && !pausado) {
    tEscena += dtReal;
    if (tEscena > 14) { // secuencia automática cada 14 s
      tEscena = 0; idxEscena = (idxEscena + 1) % CLAVES_ESCENA.length;
      const k = CLAVES_ESCENA[idxEscena];
      aplicarEscena(k, true);
    }
  }
  matAgua.uniforms.uTiempo.value = tSim;
  fondo.material.uniforms.uTiempo.value = tSim;
  actualizarCamara(tSim);
  renderer.render(escena, camara);
  frames++;
  if (tNow - tHud > 600) {
    const fps = fpsMarcas.push(tNow) && (fpsMarcas = fpsMarcas.filter(x => tNow - x < 1000)).length;
    $('hudPerf').innerHTML = `${fps} fps<br>${comps.length} olas`;
    adaptarCalidad(fps);
    tHud = tNow; frames = 0;
  }
}
requestAnimationFrame(loop);
addEventListener('resize', () => {
  camara.aspect = innerWidth / innerHeight; camara.updateProjectionMatrix();
  renderer.setSize(innerWidth, window.innerHeight);
});

window.THREE = THREE;
window.Water3J = {
  estado,
  setCamara(a) { if (a.dist !== undefined) dist = a.dist; if (a.angX !== undefined) angX = a.angX; if (a.angY !== undefined) angY = a.angY; if (a.auto !== undefined) orbitaAuto = a.auto; },
  get comps() { return comps; },
  alturaEn, profundidadEn: (x, y) => profundidadEn(estado, x, y),
  renderer, matAgua, actualizarCampo, aplicarEscena, camara, escena3d: escena, agua,
};
