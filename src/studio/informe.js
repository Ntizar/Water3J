// informe.js — informe profesional del estudio (imprimible a PDF) + exportación CSV
// Todo client-side. Sin dependencias. Cada sección lleva su fuente y su validación.
import { PASOS } from './motor.js';

export function generarInformeHTML({ fecha, config, resumen, rejilla, boya }) {
  const alfa = ((config.alfa0 ?? 0) * 180 / Math.PI).toFixed(0);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Informe de estudio de oleaje — ${fecha}</title>
<style>
  body { font: 12px/1.5 Georgia, serif; color: #1a1a1a; max-width: 820px; margin: 30px auto; padding: 0 20px; }
  h1 { font-size: 21px; border-bottom: 3px solid #2563eb; padding-bottom: 8px; }
  h2 { font-size: 14px; margin-top: 26px; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 12.5px; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #eef3f8; font-weight: 600; }
  code { background: #f4f7fa; padding: 1px 5px; border-radius: 4px; font-size: 11.5px; }
  .pie { margin-top: 40px; color: #777; font-size: 11px; border-top: 1px solid #ddd; padding-top: 10px; }
</style></head><body>
<h1>Estudio de propagación de oleaje</h1>
<p><b>Fecha del estudio:</b> ${fecha} · <b>Herramienta:</b> Water3J Studio</p>

<h2>1. Condiciones de partida</h2>
<table>
<tr><th>Parámetro</th><th>Valor</th><th>Fuente</th></tr>
<tr><td>Hs aguas profundas</td><td>${config.Hs0} m</td><td>${boya ? `Boya ${boya.code} — Puertos del Estado (${boya.fecha} GMT)` : 'introducido por el usuario'}</td></tr>
<tr><td>Periodo T</td><td>${config.T} s</td><td>${boya ? 'boya' : 'usuario'}</td></tr>
<tr><td>Dirección α₀</td><td>${alfa}°</td><td>${boya ? 'boya' : 'usuario'}</td></tr>
<tr><td>Batimetría</td><td>${rejilla ? `${rejilla.nx}×${rejilla.ny} puntos (lado ≈ ${rejilla.anchoKm} km)` : 'perfil del transecto'}</td><td>${rejilla?.fuente ?? 'introducida por el usuario'}</td></tr>
</table>

<h2>2. Física aplicada (cada paso con su test de validación)</h2>
${PASOS.map(p => `<p><b>${p.nombre}</b> — <code>${p.formula}</code><br><small>avalado por: ${p.test}</small></p>`).join('')}
<p><b>Propagación 2D</b>: ecuación de rayos dα/ds = −(1/c)·∂c/∂n · conservación E·cg·b = cte con
b medida entre rayos · límite de rotura H ≤ 0.78·h (McCowan). Avalado por T14 y T15.</p>

<h2>3. Resumen de resultados</h2>
<table>
${resumenFilas(resumen)}
</table>

<h2>4. Procedimiento de validación (para el revisor)</h2>
<ol>
<li><b>Boya:</b> abrir <code>https://poem.puertos.es/portus/StationData?code=CODE&params=Hm0,Tp</code> y comparar Hm0/Tp con §1.</li>
<li><b>Batimetría:</b> para cualquier punto del mapa abrir <code>https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(lon+lat)</code> y comparar con el mosaico.</li>
<li><b>Cálculo a mano:</b> Hs = Hs0 × Ks × Kr (§2); límite de rotura 0.78·h.</li>
</ol>

<div class="pie">Generado por Water3J Studio · física avalada por la biblia de tests automatizados<br>
Hecho con ❤️ por David Antizar</div>
</body></html>`;
}

function resumenFilas(r) {
  if (!r) return '<tr><td colspan="2">—</td></tr>';
  const filas = [
    ['Hs máximo en el transecto', r.HsMax != null ? r.HsMax.toFixed(2) + ' m' : '—'],
    ['Punto de rotura', r.xRotura != null ? 'x = ' + Math.round(r.xRotura) + ' m' : 'no rompe'],
    ['Fuerza en muro (Goda)', r.fuerzaMuroMax != null ? (r.fuerzaMuroMax/1000).toFixed(0) + ' kN/m' : 'sin estructura'],
    ['Longitud del transecto', r.longitudKm != null ? r.longitudKm.toFixed(2) + ' km' : '—'],
  ];
  return filas.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
}

// CSV del transecto 1D (tabla completa de resultados)
export function aCSV(estudio) {
  const filas = ['x_m,h_m,Hs_m,Ks,Kr,alfa_deg,rompe'];
  for (const p of estudio.puntos)
    filas.push([p.x, p.h, p.Hs, p.Ks, p.Kr, (p.alfa ?? 0).toFixed(2), p.rompe ? 1 : 0].join(','));
  return filas.join('\n');
}

// descarga un archivo al navegador
export function descargar(nombre, contenido, mime = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenido], { type: mime }));
  a.download = nombre; a.click();
  URL.revokeObjectURL(a.href);
}
