// capa2d.js — orquesta: descargar batimetría EMODnet → motor 2D → dibujar sobre Leaflet
import { descargarBateria, rejillaEnMetros, metrosALatLon } from './batimetria-cliente.js';
import { trazarRayo2D, alturaEnRayo, velocidadGrupo, calcularSeparaciones, propagarFrente, frentesIsocronos } from './motor2d.js';
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
export async function simular2D(mapa, { lat, lon, Hs0, T, alfa0, nRayos = 9, separacionM = 40 }) {
  capa.clearLayers();
  // RESOLUCIÓN ADAPTABLE: zoom alto (puerto) → rejilla más pequeña y densa
  const zoom = mapa.getZoom();
  const anchoKm = zoom >= 14 ? 1.2 : zoom >= 12 ? 3 : zoom >= 10 ? 6 : 10;
  const nPuntos  = zoom >= 14 ? 15 : zoom >= 12 ? 13 : 11;
  $('estado2d').textContent = `Descargando batimetría EMODnet (${nPuntos}×${nPuntos}, ${anchoKm} km)…`;
  rejilla = await descargarBateria(lat, lon, anchoKm, nPuntos);
  rejillaM = rejillaEnMetros(rejilla);
  dibujarBatimetria(mapa, rejilla);
  $('estado2d').textContent = `Batimetría lista (${rejilla.fallos} huecos) · trazando ${nRayos} rayos…`;

  // dirección de propagación en el plano local: alfa0 (deg) respecto al norte → rayo en metros
  const rad = Math.PI / 180;
  // punto inicial: centro-sur de la rejilla (mar adentro), separados perpendicularmente
  const y0M = rejillaM.y0 + rejillaM.dy * (rejillaM.ny - 2); // cerca del borde sur
  const x0M = rejillaM.x0 + (rejillaM.nx - 1) * rejillaM.dx / 2;
  const perpendicular = (alfa0 * rad) + Math.PI / 2;

  const rayosCrudos = [];
  for (let r = 0; r < nRayos; r++) {
    const desplazamiento = (r - (nRayos - 1) / 2) * separacionM;
    const sx = x0M + Math.cos(perpendicular) * desplazamiento;
    const sy = y0M + Math.sin(perpendicular) * desplazamiento;
    rayosCrudos.push(trazarRayo2D(rejillaM, sx, sy, alfa0 * rad, T, { paso: rejillaM.dx * 0.8 }));
  }
  // separación REAL entre rayos vecinos (convergencia/divergencia por refracción)
  const separaciones = calcularSeparaciones(rayosCrudos);
  const rayos = rayosCrudos.map((rayo, i) => {
    const cg0 = velocidadGrupo(T, rayo[0].h || 20);
    const b0 = separaciones[i][0] || separacionM;
    const bPorPunto = rayo.map((_, k) => separaciones[i][k] ?? b0);
    return alturaEnRayo(rayo, T, Hs0, cg0, b0, bPorPunto);
  });

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

  $('estado2d').textContent = `${nRayos} rayos trazados · fuente: ${rejilla.fuente} · rojo = rotura · b real`;

  // ---- ANIMACIÓN DE FRENTES (isócronas de fase moviéndose) ----
  // el frente inicial: línea de puntos alineados aguas arriba de los rayos
  const frenteInicial = rayosCrudos.map(rayo => {
    const p0 = rayo[0];
    return { x: p0.x, y: p0.y, alfa: p0.alfa };
  });
  const trajs = propagarFrente(rejillaM, frenteInicial, T, 120);
  const isos = frentesIsocronos(trajs, T * 0.5); // un frente cada medio periodo
  const capasFrentes = isos.map((linea, idx) => {
    const ll = linea.map(pt => {
      const { lat, lon } = metrosALatLon(rejillaM, pt.x, pt.y);
      return [lat, lon];
    });
    return L.polyline(ll, { color: '#ffffff', weight: 3, opacity: 0 }).addTo(capa);
  });
  let iFrente = 0, temporizador = null;
  function tickAnim() {
    capasFrentes.forEach((l, i) => l.setStyle({ opacity: i === iFrente ? 0.9 : 0 }));
    iFrente = (iFrente + 1) % capasFrentes.length;
  }
  if (window.__animFrentes) clearInterval(window.__animFrentes);
  temporizador = setInterval(tickAnim, 400);
  window.__animFrentes = temporizador;

  return { rejilla, rayos, nFrentes: capasFrentes.length };
}

export function limpiar2D() { capa?.clearLayers(); $('estado2d').textContent = ''; }
