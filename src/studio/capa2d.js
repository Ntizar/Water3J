// capa2d.js — orquesta: descargar batimetría EMODnet → motor 2D → dibujar sobre Leaflet
import { descargarBateria, rejillaEnMetros, metrosALatLon } from './batimetria-cliente.js';
import { trazarRayo2D, alturaEnRayo, velocidadGrupo, hEn } from './motor2d.js';
import { LIMITE_ROTURA } from './motor.js';

const $ = id => document.getElementById(id);
let capa = null;         // L.layerGroup con todo el dibujo 2D
let rejilla = null;      // rejilla en grados
let rejillaM = null;     // rejilla en metros

export function init2D(mapa) {
  capa = L.layerGroup().addTo(mapa);
}

// Dibuja la batimetría como rectángulos coloreados (profundidad → azul más oscuro)
function dibujarBatimetria(mapa, rejilla) {
  const colores = h => {
    if (h < 0) return '#cccccc';                    // sin dato
    if (h < 2) return '#bfe3f2';
    if (h < 5) return '#93cdea';
    if (h < 10) return '#63aed8';
    if (h < 20) return '#3d8cc0';
    if (h < 50) return '#2a6da0';
    return '#1b4f7d';
  };
  for (let j = 0; j < rejilla.ny; j++)
    for (let i = 0; i < rejilla.nx; i++) {
      const h = rejilla.h[j * rejilla.nx + i];
      const lat0 = rejilla.y0 + j * rejilla.dy, lat1 = lat0 + rejilla.dy;
      const lon0 = rejilla.x0 + i * rejilla.dx, lon1 = lon0 + rejilla.dx;
      L.rectangle([[lat0, lon0], [lat1, lon1]], {
        stroke: false, fillColor: colores(h), fillOpacity: h < 0 ? 0.35 : 0.55,
      }).bindTooltip(`h ≈ ${h.toFixed(1)} m`).addTo(capa);
    }
}

// Trazado de N rayos paralelos con separación b para el cálculo de shoaling real
export async function simular2D(mapa, { lat, lon, Hs0, T, alfa0, nRayos = 7, separacionM = 60 }) {
  capa.clearLayers();
  $('estado2d').textContent = 'Descargando batimetría EMODnet…';
  rejilla = await descargarBateria(lat, lon, 8, 11);
  rejillaM = rejillaEnMetros(rejilla);
  dibujarBatimetria(mapa, rejilla);
  $('estado2d').textContent = `Batimetría lista (${rejilla.fallos} huecos) · trazando ${nRayos} rayos…`;

  // dirección de propagación en el plano local: alfa0 (deg) respecto al norte → rayo en metros
  const rad = Math.PI / 180;
  // punto inicial: centro-sur de la rejilla (mar adentro), separados perpendicularmente
  const y0M = rejillaM.y0 + rejillaM.dy * (rejillaM.ny - 2); // cerca del borde sur
  const x0M = rejillaM.x0 + (rejillaM.nx - 1) * rejillaM.dx / 2;
  const perpendicular = (alfa0 * rad) + Math.PI / 2;

  const rayos = [];
  for (let r = 0; r < nRayos; r++) {
    const desplazamiento = (r - (nRayos - 1) / 2) * separacionM;
    const sx = x0M + Math.cos(perpendicular) * desplazamiento;
    const sy = y0M + Math.sin(perpendicular) * desplazamiento;
    const rayo = trazarRayo2D(rejillaM, sx, sy, alfa0 * rad, T, { paso: rejillaM.dx * 0.8 });
    // altura con conservación de flujo: b entre vecinos = separacionM (aprox constante aquí)
    const cg0 = velocidadGrupo(T, rayo[0].h || 20);
    const conH = alturaEnRayo(rayo, T, Hs0, cg0, separacionM, rayo.map(() => separacionM));
    rayos.push(conH);
  }

  // dibujar rayos con color según H (verde→amarillo→rojo) y puntos de rotura en rojo
  for (const rayo of rayos) {
    const ll = rayo.map(p => {
      const { lat: la, lon: lo } = metrosALatLon(rejillaM, p.x, p.y);
      return [la, lo];
    });
    L.polyline(ll, { color: '#2563eb', weight: 2, opacity: 0.75 }).addTo(capa);
    for (const p of rayo) {
      if (p.rompe) {
        const { lat: la, lon: lo } = metrosALatLon(rejillaM, p.x, p.y);
        L.circleMarker([la, lo], { radius: 5, color: '#c0392b', fillOpacity: 1 })
          .bindTooltip(`ROMPE: H = ${p.H} m (h = ${p.h} m)`).addTo(capa);
        break; // solo el primer punto de rotura por rayo
      }
    }
  }

  // etiqueta de H en el punto medio de cada rayo
  for (const rayo of rayos) {
    const pm = rayo[Math.floor(rayo.length / 2)];
    if (!pm) continue;
    const { lat: la, lon: lo } = metrosALatLon(rejillaM, pm.x, pm.y);
    L.tooltip({ permanent: false })
      .setLatLng([la, lo]).setContent(`H ≈ ${pm.H} m · h = ${pm.h} m`).addTo(capa);
  }

  $('estado2d').textContent = `${nRayos} rayos trazados · fuente: ${rejilla.fuente} · rojo = punto de rotura`;
  return { rejilla, rayos };
}

export function limpiar2D() { capa?.clearLayers(); $('estado2d').textContent = ''; }
