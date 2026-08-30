// app.js — Water3J Studio v2: mapa real Leaflet, boyas Puertos del Estado, transecto dibujable
import { estudioTransecto, resumen, PASOS, LIMITE_ROTURA } from './motor.js';
import { guardarEscenario, listarEscenarios, cargarEscenario, borrarEscenario } from './db.js';
import { ESTACIONES } from './boyas.js';

const $ = id => document.getElementById(id);

// ================= MAPA =================
const mapa = L.map('mapa', { center: [40.2, -3.5], zoom: 6 });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(mapa);

for (const e of ESTACIONES) {
  const icono = L.divIcon({ className: 'boya', html:
    `<div style="width:16px;height:16px;background:#2563eb;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [16,16], iconAnchor: [8,8] });
  L.marker([e.lat, e.lon], { icon: icono }).addTo(mapa)
    .bindPopup(`<b>${e.nombre}</b><br>Boya de Puertos del Estado<br>código API: ${e.code}`);
}

// ================= TRANSECTO DIBUJABLE =================
let puntos = [], linea = null, mMar = null, mCosta = null, lenPerfil = 0;
let perfilUsuario = null;

mapa.on('click', ev => {
  const { lat, lng } = ev.latlng;
  if (puntos.length >= 2) limpiarTransecto();
  puntos.push({ lat, lon: lng });
  const pt = L.circleMarker([lat, lng], { radius: 7, color: '#8b2f2f', fillColor: '#8b2f2f', fillOpacity: 1 });
  if (puntos.length === 1) {
    mMar = pt.addTo(mapa).bindTooltip('MAR — inicio del transecto').openTooltip();
  } else {
    mCosta = pt.addTo(mapa).bindTooltip('COSTA — fin del transecto').openTooltip();
    linea = L.polyline([[puntos[0].lat, puntos[0].lon], [puntos[1].lat, puntos[1].lon]],
      { color: '#8b2f2f', weight: 3, dashArray: '8,6' }).addTo(mapa);
    lenPerfil = haversine(puntos[0], puntos[1]);
    $('lenPerfil').textContent = `${(lenPerfil/1000).toFixed(2)} km`;
    calcular();
  }
});
function limpiarTransecto() {
  puntos = []; perfilUsuario = null;
  [linea, mMar, mCosta].forEach(x => x && mapa.removeLayer(x));
  linea = mMar = mCosta = null;
  $('lenPerfil').textContent = '—';
}

function haversine(a, b) {
  const R = 6371000, rad = Math.PI/180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// perfil batimétrico generado según longitud real (editable abajo)
function perfilGenerado() {
  if (!lenPerfil) return [{ x: 0, h: 20 }, { x: 500, h: 1 }];
  const n = 10, pts = [];
  for (let i = 0; i <= n; i++) {
    const h = 20 * (1 - i/n) ** 1.4 + 0.5;
    pts.push({ x: Math.round(lenPerfil * i / n), h: +h.toFixed(1) });
  }
  return pts;
}
function perfilActual() { return perfilUsuario ?? perfilGenerado(); }

// ================= CÁLCULO =================
function configActual() {
  return {
    Hs0: +$('inHs').value, T: +$('inT').value,
    alfa0: +$('inAlfa').value * Math.PI/180,
    perfil: perfilActual(),
    estructuras: $('inEstructura').value
      ? [{ x: Math.round((+$('inXEst').value/100) * lenPerfil), tipo: $('inEstructura').value }] : [],
  };
}
function calcular() {
  const e = estudioTransecto(configActual());
  dibujar(e); mostrarResumen(e); mostrarPasos(e);
}

// ================= GRÁFICA =================
function dibujar(e) {
  const cv = $('grafica'), ctx = cv.getContext('2d');
  const W = cv.width = cv.clientWidth * 2, H = cv.height = 440;
  const ps = e.puntos, xMax = ps[ps.length-1].x;
  const HsMax = Math.max(1, ...ps.map(p => p.Hs));
  const hMax = Math.max(...ps.map(p => p.h));
  ctx.clearRect(0, 0, W, H);
  const X = x => 60 + (x / xMax) * (W - 90);
  // batimetría
  ctx.beginPath(); ctx.moveTo(X(0), H - 30);
  for (const p of ps) ctx.lineTo(X(p.x), H - 40 - (p.h / hMax) * 300);
  ctx.lineTo(X(xMax), H - 30); ctx.closePath();
  ctx.fillStyle = '#ddeaf3'; ctx.fill();
  // límite rotura
  ctx.strokeStyle = '#e0a020'; ctx.setLineDash([7,5]); ctx.lineWidth = 2; ctx.beginPath();
  ps.forEach((p, i) => { const Y = H - 40 - (0.78 * p.h / HsMax) * 340;
    i ? ctx.lineTo(X(p.x), Y) : ctx.moveTo(X(p.x), Y); });
  ctx.stroke(); ctx.setLineDash([]);
  // curva Hs
  ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3.5; ctx.beginPath();
  ps.forEach((p, i) => { const Y = H - 40 - (p.Hs / HsMax) * 340;
    i ? ctx.lineTo(X(p.x), Y) : ctx.moveTo(X(p.x), Y); });
  ctx.stroke();
  // estructura
  for (const p of ps) if (p.estructura) {
    ctx.fillStyle = '#8b2f2f'; ctx.fillRect(X(p.x) - 4, 40, 8, H - 80);
    ctx.font = '18px system-ui'; ctx.fillText(p.estructura.tipo.toUpperCase(), X(p.x) - 26, 32);
  }
  ctx.fillStyle = '#5b6b7a'; ctx.font = '17px system-ui';
  ctx.fillText(`escala Hs máx: ${HsMax.toFixed(1)} m — azul: Hs(x) · naranja: límite rotura 0.78·h`, 60, 20);
}

// ================= RESUMEN + TRANSPARENCIA =================
function mostrarResumen(e) {
  const r = resumen(e);
  $('resumen').innerHTML = [
    ['Hs máx', r.HsMax.toFixed(2) + ' m'],
    ['Rotura', r.xRotura != null ? `x = ${Math.round(r.xRotura)} m` : 'no rompe'],
    ['Fuerza muro', r.fuerzaMuroMax != null ? (r.fuerzaMuroMax/1000).toFixed(0) + ' kN/m' : '—'],
    ['Longitud', (e.puntos[e.puntos.length-1].x / 1000).toFixed(2) + ' km'],
  ].map(([k,v]) => `<div class="metrica"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');
}
function mostrarPasos(e) {
  $('pasos').innerHTML = PASOS.map(p => `
    <div class="paso"><b>${p.nombre}</b><br><code>${p.formula}</code>
    <div class="aval">✔ avalado por: ${p.test}</div></div>`).join('');
  const p = e.puntos[Math.floor(e.puntos.length / 2)];
  $('calculo').textContent =
    `EJEMPLO CON TUS NÚMEROS (punto medio, x = ${p.x.toFixed(0)} m):\n` +
    `h = ${p.h.toFixed(1)} m · Ks = ${p.Ks} · Kr = ${p.Kr} · α = ${p.alfa}°\n` +
    `Hs = ${e.config.Hs0} × ${p.Ks} × ${p.Kr} = ${p.Hs} m` +
    (p.rompe ? ` → LIMITADO: 0.78 × ${p.h.toFixed(1)} m = ${(0.78*p.h).toFixed(2)} m` : '') +
    `\nPerfil por defecto generado por longitud — EDÍTALO abajo para batimetría real.`;
}

// ================= EDICIÓN DEL PERFIL =================
// (simple: textarea JSON — suficiente para validar; en v3 UI gráfica de edición)
function mostrarEditorPerfil() {
  let div = $('editorPerfil');
  if (!div) {
    div = document.createElement('div'); div.id = 'editorPerfil';
    div.style.cssText = 'margin-top:12px';
    div.innerHTML = `<label style="font-size:12px;color:var(--gris)">Perfil batimétrico [x en m, h en m] — editable:</label>
      <textarea id="txtPerfil" style="width:100%;height:90px;font:12px monospace;border:1px solid var(--linea);border-radius:8px;padding:6px"></textarea>
      <button class="sec" id="btnAplicarPerfil">Aplicar perfil</button>`;
    $('resumen').after(div);
    $('btnAplicarPerfil').onclick = () => {
      try {
        const p = JSON.parse($('txtPerfil').value);
        if (!Array.isArray(p) || p.length < 2) throw new Error('mínimo 2 puntos');
        perfilUsuario = p; calcular();
      } catch (err) { alert('JSON inválido: ' + err.message); }
    };
  }
}
const obsOriginal = mostrarResumen;
mostrarResumen = function(e) { obsOriginal(e); $('txtPerfil').value = JSON.stringify(e.config.perfil); };
mostrarEditorPerfil();

// ================= ESCENARIOS (IndexedDB) =================
async function refrescarLista() {
  const lista = await listarEscenarios();
  const div = $('listaEsc');
  div.innerHTML = lista.length ? '' : '<p style="color:var(--gris);font-size:12.5px">Sin escenarios aún.</p>';
  for (const e of lista) {
    const d = document.createElement('div'); d.className = 'escenario';
    d.innerHTML = `<b>${e.nombre}</b><span class="borrar">✕</span>`;
    d.querySelector('b').onclick = async () => {
      const esc = await cargarEscenario(e.id), dt = esc.datos;
      $('inHs').value = dt.Hs0; $('inT').value = dt.T;
      $('inAlfa').value = Math.round((dt.alfa0 ?? 0) * 180/Math.PI);
      $('inEstructura').value = dt.estructuras?.[0]?.tipo ?? '';
      perfilUsuario = dt.perfil; lenPerfil = dt.perfil[dt.perfil.length-1].x;
      $('lenPerfil').textContent = `${(lenPerfil/1000).toFixed(2)} km`;
      if (dt.transecto) { // restaurar línea en el mapa
        limpiarTransecto();
        puntos = dt.transecto;
        mMar = L.circleMarker([puntos[0].lat, puntos[0].lon], { radius: 7, color: '#8b2f2f', fillOpacity: 1 }).addTo(mapa).bindTooltip('MAR');
        mCosta = L.circleMarker([puntos[1].lat, puntos[1].lon], { radius: 7, color: '#8b2f2f', fillOpacity: 1 }).addTo(mapa).bindTooltip('COSTA');
        linea = L.polyline([[puntos[0].lat, puntos[0].lon],[puntos[1].lat, puntos[1].lon]], { color: '#8b2f2f', weight: 3, dashArray: '8,6' }).addTo(mapa);
        mapa.fitBounds(linea.getBounds().pad(0.5));
      }
      calcular();
    };
    d.querySelector('.borrar').onclick = async ev => { ev.stopPropagation(); await borrarEscenario(e.id); refrescarLista(); };
    div.appendChild(d);
  }
}
$('btnGuardar').onclick = async () => {
  if (puntos.length < 2) { alert('Dibuja primero un transecto en el mapa (2 clics).'); return; }
  const nombre = prompt('Nombre:', 'Estudio ' + new Date().toLocaleDateString('es-ES'));
  if (!nombre) return;
  await guardarEscenario({ nombre, tipo: 'studio',
    datos: { ...configActual(), transecto: puntos } });
  refrescarLista();
};

['inHs','inT','inAlfa','inXEst','inEstructura'].forEach(id => {
  $(id).oninput = calcular; $(id).onchange = calcular;
});
calcular(); refrescarLista();
