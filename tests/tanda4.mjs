// tanda4.mjs — W3J-T11: presets/estado serializable round-trip idéntico
import { crearEstadoBase, serializar, deserializar, profundidadEn, kLocal } from '../src/app/estado.js';

const resultados = [];
function registrar(id, nombre, pasa, medida, criterio) {
  resultados.push({ id, nombre, estado: pasa ? 'PASS' : 'FAIL', medida, criterio });
  console.log(`${pasa ? '✅' : '❌'} ${id} ${nombre} — ${medida}`);
  if (!pasa) console.log(`   criterio: ${criterio}`);
}

// los 6 presets de la biblia definidos como MUTACIONES sobre el estado base
function presetPlayaAbierta(e) { e.oleaje.direccion = 0.3; e.batimetria.pendiente = 0.015; return e; }
function presetEspigon(e) {
  presetPlayaAbierta(e);
  e.estructuras.push({ tipo: 'espigon', x: 120, y: 0, largo: 60, angulo: Math.PI / 2, Cr: 0.4 });
  return e;
}
function presetPuerto(e) {
  e.oleaje.direccion = 0;
  e.estructuras.push({ tipo: 'dique', x: 150, y: -40, largo: 80, angulo: Math.PI / 3, Cr: 0.8 });
  e.estructuras.push({ tipo: 'dique', x: 150, y: 40, largo: 80, angulo: -Math.PI / 3, Cr: 0.8 });
  e.gauges.push({ id: 'g1', x: 170, y: 0 });
  return e;
}
function presetMuro(e) {
  e.estructuras.push({ tipo: 'muro', x: 60, y: 0, largo: 100, angulo: 0, Cr: 0.95 });
  return e;
}
function presetTormenta(e) { e.oleaje.Hs = 8; e.oleaje.Tp = 14; e.oleaje.vientoU = 28; return e; }
function presetIrregular(e) {
  const nx = 32, ny = 32, dx = 5;
  const datos = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    datos[j * nx + i] = 3 * Math.sin(i / 4) * Math.cos(j / 5); // barra de arena sintética
  }
  e.batimetria.rejilla = { nx, ny, dx, datos };
  return e;
}

const presets = {
  'playa-abierta': presetPlayaAbierta,
  'playa-espigon': presetEspigon,
  'puerto-simple': presetPuerto,
  'muro-vertical': presetMuro,
  'tormenta': presetTormenta,
  'fondo-irregular': presetIrregular,
};

// ---------- T11 ----------
{
  let todosOk = true, detalles = [];
  for (const [nombre, fn] of Object.entries(presets)) {
    // determinismo: fases y tiempos aleatorios NO afectan (estado no guarda rng)
    const e1 = fn(crearEstadoBase());
    const json1 = serializar(e1);
    const e2 = deserializar(json1);
    const json2 = serializar(e2);
    const igual = json1 === json2;
    const sinNaN = !json1.includes('NaN') && !json1.includes('null,nu');
    todosOk &&= igual && sinNaN;
    detalles.push(`${nombre}: ${igual && sinNaN ? 'OK' : 'FALLO'} (${(json1.length / 1024).toFixed(1)} KB)`);
  }
  registrar('W3J-T11', 'Presets: round-trip serialización',
    todosOk,
    detalles.join(' · '),
    'round-trip JSON→estado→JSON idéntico en 6 presets; sin NaN');
}

// checks auxiliares de estado (profundidad combinada analítica + rejilla)
{
  const e = presetIrregular(crearEstadoBase());
  // la rejilla cubre x∈[0,160], y∈[-80,80]: consultar dentro
  const punto = { x: 100, y: 0 };
  const hSinRej = profundidadEn({ ...e, batimetria: { ...e.batimetria, rejilla: null } }, punto.x, punto.y);
  const hConRej = profundidadEn(e, punto.x, punto.y);
  const ok = hConRej !== hSinRej && hConRej > 0.3;
  const k = kLocal(e, punto.x, punto.y);
  registrar('W3J-T11b', 'Profundidad combinada + k local',
    ok && Number.isFinite(k) && k > 0,
    `h analítica ${hSinRej.toFixed(2)} → con barra ${hConRej.toFixed(2)} m en (${punto.x},0); k=${k.toFixed(4)} 1/m`,
    'rejilla modifica h; k local finito y positivo');
}

{
  const pass = resultados.filter(r => r.estado === 'PASS').length;
  console.log(`\n${pass}/${resultados.length} tests pasando (tanda 4)`);
  process.exit(pass === resultados.length ? 0 : 1);
}
