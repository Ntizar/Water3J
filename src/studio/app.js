// app.js — Water3J Studio: lógica de la interfaz (PC)
import { estudioTransecto, resumen, PASOS, LIMITE_ROTURA } from './motor.js';
import { guardarEscenario, listarEscenarios, cargarEscenario, borrarEscenario } from './db.js';

const $ = id => document.getElementById(id);

const PERFILES = {
  playa: [{ x: 0, h: 20 }, { x: 100, h: 14 }, { x: 200, h: 8 }, { x: 300, h: 4 }, { x: 400, h: 1.5 }, { x: 500, h: 0.5 }],
  fuerte: [{ x: 0, h: 20 }, { x: 60, h: 10 }, { x: 120, h: 5 }, { x: 180, h: 2 }, { x: 200, h: 0.5 }],
  plataforma: [{ x: 0, h: 15 }, { x: 300, h: 12 }, { x: 350, h: 3 }, { x: 600, h: 1 }],
};

function perfilActual() { return PERFILES[$('inPerfil').value] ?? PERFILES.playa; }

function configActual() {
  return {
    Hs0: +$('inHs').value, T: +$('inT').value,
    alfa0: +$('inAlfa').value * Math.PI / 180,
    perfil: perfilActual(),
    estructuras: $('inEstructura').value ? [{ x: +$('inXEst').value, tipo: $('inEstructura').value }] : [],
  };
}

function calcular() {
  const estudio = estudioTransecto(configActual());
  dibujar(estudio); mostrarResumen(estudio); mostrarPasos(estudio);
  return estudio;
}

function dibujar(e) {
  const cv = $('grafica'), ctx = cv.getContext('2d');
  const W = cv.width = cv.clientWidth * 2, H = cv.height = 640;
  const ps = e.puntos, xMax = ps[ps.length - 1].x;
  const HsMax = Math.max(1, ...ps.map(p => p.Hs));
  const hMax = Math.max(...ps.map(p => p.h));
  ctx.clearRect(0, 0, W, H);
  const X = x => 70 + (x / xMax) * (W - 110);
  const Y = v => 560 - (v / HsMax) * 480;
  // rejilla
  ctx.strokeStyle = '#e3e9ef';
  for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(70, 40 + i * 130); ctx.lineTo(W - 20, 40 + i * 130); ctx.stroke(); }
  // batimetría (zona bajo perfil)
  ctx.beginPath(); ctx.moveTo(70, H - 40);
  for (const p of ps) ctx.lineTo(X(p.x), 560 - (p.h / hMax) * 480);
  ctx.lineTo(X(xMax), H - 40); ctx.closePath();
  ctx.fillStyle = '#ddeaf3'; ctx.fill();
  // límite de rotura 0.78·h
  ctx.strokeStyle = '#e0a020'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.beginPath();
  ps.forEach((p, i) => { i ? ctx.lineTo(X(p.x), 560 - (0.78 * p.h / HsMax) * 480) : ctx.moveTo(X(p.x), 560 - (0.78 * p.h / HsMax) * 480); });
  ctx.stroke(); ctx.setLineDash([]);
  // curva Hs
  ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3.5; ctx.beginPath();
  ps.forEach((p, i) => { i ? ctx.lineTo(X(p.x), 560 - (p.Hs / HsMax) * 500) : ctx.moveTo(X(p.x), 560 - (p.Hs / HsMax) * 500); });
  ctx.stroke();
  // estructura
  for (const p of ps) if (p.estructura) {
    ctx.fillStyle = '#8b2f2f'; ctx.fillRect(X(p.x) - 5, 60, 10, 480);
    ctx.fillStyle = '#8b2f2f'; ctx.font = '20px system-ui';
    ctx.fillText(p.estructura.tipo.toUpperCase(), X(p.x) - 34, 50);
  }
  ctx.fillStyle = '#5b6b7a'; ctx.font = '20px system-ui';
  ctx.fillText(`Hs máx escala: ${HsMax.toFixed(1)} m — azul: Hs(x) · naranja discontinua: límite de rotura 0.78·h · azul claro: fondo`, 70, H - 8);
}

function mostrarResumen(e) {
  const r = resumen(e);
  $('resumen').innerHTML = [
    ['Hs máx en el transecto', r.HsMax.toFixed(2) + ' m'],
    ['Punto de rotura', r.xRotura != null ? `x = ${Math.round(r.xRotura)} m` : 'no rompe'],
    ['Fuerza en el muro', r.fuerzaMuroMax != null ? (r.fuerzaMuroMax / 1000).toFixed(0) + ' kN/m' : '—'],
    ['Rotura según McCowan', 'H = 0.78·h'],
  ].map(([k, v]) => `<div class="metrica"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');
}

function mostrarPasos(estudio) {
  $('pasos').innerHTML = PASOS.map(p => `
    <div class="paso"><b>${p.nombre}</b><br><code>${p.formula}</code>
    <div class="aval">✔ Avalado por: ${p.test}</div></div>`).join('');
  const p = estudio.puntos[Math.floor(estudio.puntos.length / 2)];
  $('calculo').textContent =
    `EJEMPLO CON TUS NÚMEROS (punto medio del transecto, x = ${p.x.toFixed(0)} m):
` +
    `h = ${p.h.toFixed(1)} m · Ks = ${p.Ks} · Kr = ${p.Kr} · α = ${p.alfa}°
` +
    `Hs = ${estudio.config.Hs0} × ${p.Ks} × ${p.Kr} = ${p.Hs} m` +
    (p.rompe ? ` → LIMITADO por rotura: 0.78 × ${p.h.toFixed(1)} m = ${(0.78 * p.h).toFixed(2)} m` : '') +
    `
Compruébalo a mano: Ks = √(c₀·n₀/(2·c·n)) con T = ${estudio.config.T} s y h = ${p.h.toFixed(1)} m.`;
}

// ---------- biblioteca local (IndexedDB) ----------
async function refrescarLista() {
  const lista = await listarEscenarios();
  const div = $('listaEsc');
  div.innerHTML = lista.length ? '' : '<p style="color:var(--gris);font-size:13px">Sin escenarios aún. Configura y guarda.</p>';
  for (const e of lista) {
    const d = document.createElement('div'); d.className = 'escenario';
    d.innerHTML = `<b title="cargar">${e.nombre}</b><span class="borrar" title="borrar">✕</span>`;
    d.querySelector('b').onclick = async () => {
      const esc = await cargarEscenario(e.id);
      const d0 = esc.datos;
      $('inHs').value = d0.Hs0; $('inT').value = d0.T;
      $('inAlfa').value = Math.round((d0.alfa0 ?? 0) * 180 / Math.PI);
      $('inEstructura').value = d0.estructuras?.[0]?.tipo ?? '';
      $('inXEst').value = d0.estructuras?.[0]?.x ?? 300;
      // reconstruir preset si coincide
      const claves = Object.entries(PERFILES);
      const match = claves.find(([, v]) => JSON.stringify(v) === JSON.stringify(d0.perfil));
      $('inPerfil').value = match?.[0] ?? 'playa';
      calcular();
    };
    d.querySelector('.borrar').onclick = async ev => { ev.stopPropagation(); await borrarEscenario(e.id); refrescarLista(); };
    $('listaEsc').appendChild(d);
  }
}

$('btnGuardar').onclick = async () => {
  const nombre = prompt('Nombre del escenario:', 'Estudio ' + new Date().toLocaleDateString('es-ES'));
  if (!nombre) return;
  const cfg = configActual();
  await guardarEscenario({ nombre, tipo: 'studio', datos: cfg });
  refrescarLista();
};
$('btnCalcular').onclick = calcular;
$('inPerfil').onchange = calcular;
['inHs', 'inT', 'inAlfa', 'inXEst', 'inEstructura'].forEach(id => { $(id).oninput = calcular; $(id).onchange = calcular; });

calcular(); refrescarLista();
