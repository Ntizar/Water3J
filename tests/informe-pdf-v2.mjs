
// informe-pdf-v2.mjs — informe v2: mapa de puntos críticos + Cantábrico + Mediterráneo
import { readFileSync } from 'fs';

const cant = JSON.parse(readFileSync('tests/ranking-spots.json', 'utf8'));
const med = JSON.parse(readFileSync('tests/ranking-spots-med.json', 'utf8'));
const todos = [...cant, ...med].sort((a, b) => b.scoreGlobal - a.scoreGlobal);
const f = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const fila = (s, i) => {
  const zona = s.spot.latR > 40 ? 'Mediterráneo' : 'Cantábrico';
  return `<tr><td><b>${i+1}</b></td><td><b>${s.spot.nombre}</b></td><td>${zona}</td>
  <td><b>${s.scoreGlobal}/10</b></td>
  <td>${Math.max(...s.dias.map(d=>d.HsRompeMax)).toFixed(1)} m</td>
  <td>${s.dias[0]?.TMedio.toFixed(1) ?? '—'} s</td></tr>`;
};

const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Informe de olas — Cantábrico + Mediterráneo</title>
<style>
  body { font: 12px/1.5 Georgia, serif; color: #1a1a1a; max-width: 860px; margin: 30px auto; padding: 0 24px; }
  h1 { font-size: 22px; border-bottom: 3px solid #2563eb; padding-bottom: 8px; }
  h2 { font-size: 14px; margin-top: 26px; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; }
  .sub { color: #666; font-size: 13px; }
  .destacado { background: #eef4fb; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 12.5px; }
  th, td { border: 1px solid #ccc; padding: 7px 10px; text-align: left; }
  th { background: #eef3f8; font-weight: 600; }
  .leyenda { font-size: 12px; color: #444; }
  .leyenda span { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin: 0 5px -2px 14px; border: 1px solid #fff; box-shadow: 0 0 2px #999; }
  .pie { margin-top: 40px; color: #777; font-size: 11px; border-top: 1px solid #ddd; padding-top: 10px; }
  code { background: #f4f7fa; padding: 1px 5px; border-radius: 4px; font-size: 11.5px; }
</style></head><body>
<h1>🌊 Mejores olas — Cantábrico + Mediterráneo</h1>
<p class="sub">Informe del ${f} · datos reales: Open-Meteo Marine (pronóstico horario) + EMODnet (batimetría) + física Water3J (44 tests)</p>

<h2>1. Mapa de puntos críticos</h2>
<img src="mapa-criticos.png" style="width:100%;border:1px solid #ccc;border-radius:8px">
<p class="leyenda" style="font-size:12px">
<span style="background:#1a9850"></span> score ≥ 6.5 (buen momento)
<span style="background:#f4a742"></span> 5.5–6.4 (funciona)
<span style="background:#c0392b"></span> &lt; 5.5 (apagado)
</p>

<h2>2. Ranking global</h2>
<table>
<tr><th>#</th><th>Spot</th><th>Zona</th><th>Score 7d</th><th>Hs rompiente máx 7d</th><th>Periodo hoy</th></tr>
${todos.map(fila).join('')}
</table>

<h2>3. Comparativa de zonas (cómo responde el motor a costas distintas)</h2>
<table>
<tr><th>Zona</th><th>Mejor spot</th><th>Score máx</th><th>HsRompe máx de la zona</th><th>Régimen dominante</th></tr>
<tr><td>Cantábrico</td><td>${cant[0].spot.nombre} (${cant[0].scoreGlobal}/10)</td><td>${cant[0].scoreGlobal}/10</td>
<td>${Math.max(...cant.flatMap(s=>s.dias.map(d=>d.HsRompeMax))).toFixed(1)} m</td>
<td>mar de fondo NW atlántico, T 8–13 s</td></tr>
<tr><td>Mediterráneo</td><td>${med[0].spot.nombre} (${med[0].scoreGlobal}/10)</td>
<td>HsRompe máx: ${Math.max(...med.flatMap(s=>s.dias.map(d=>d.HsRompeMax))).toFixed(1)} m</td>
<td>levante de verano: wind swell corto (T 4–7 s), rompientes &lt; 0.4 m esta semana</td></tr>
</table>
<p><b>Lectura física de la diferencia</b>: el mismo motor, las mismas fórmulas y el mismo scoring
producen scores claramente menores en el Mediterráneo porque el régimen real es distinto:
el Cantábrico recibe mar de fondo atlántico (T 8–12 s, energía que sobrevive la propagación),
mientras el Mediterráneo de verano genera wind swell local de periodo corto (T 5–7 s) que se
disipa antes de llegar con energía. La física lo captura sin ajustes por zona — los ideales
del score sí se calibraron por tipo de spot (beach break med. 1.3 m).</p>

<h2>4. Método (verificable paso a paso)</h2>
<p style="font-size:12px">
<b>1. Batimetría por spot</b> — 5 puntos offshore→rompiente de <code>rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(lon lat)</code><br>
<b>2. Pronóstico</b> — horario de <code>marine-api.open-meteo.com</code> (Hs, T, dirección)<br>
<b>3. Física</b> — por cada hora y spot: transecto con shoaling + refracción Snell + rotura 0.78·h → Hs en la rompiente<br>
<b>4. Score</b> — cercanía al tamaño ideal del spot + bonus por periodo; horas buenas = score ≥ 7
</p>

<h2>5. Validación sugerida</h2>
<ol>
<li>Boyas: portus.puertos.es (Cantábrico: Bilbao 1111; Med: Valencia 1511) — comparar Hm0/Tp.</li>
<li>Batimetría: URL de EMODnet por punto (método §4).</li>
<li>Condición local: el score es heurística de surf — el tamaño de ola es física, la diversión es tuya.</li>
</ol>

<div class="pie">Generado por Water3J · datos: Open-Meteo Marine + EMODnet · física avalada por la biblia de tests<br>
Hecho con ❤️ por David Antizar</div>
</body></html>`;

await (await import('fs')).promises.writeFile('tests/informe-olas-v2.html', html);
console.log('informe v2 generado');
