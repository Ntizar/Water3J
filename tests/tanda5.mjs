// tanda5.mjs — W3J-T12: integración Puertos del Estado (Portus/SIMAR)
// Contrato: la respuesta real observada de poem.puertos.es se normaliza a estado de oleaje
// y los CSV SIMAR oficiales se parsean sin huecos. Toda la entrada es la documentada en
// docs/10-guia-datos-puertos.md — nada inventado.
import { normalizarSerie, ultimoEstadoOleaje, parsearSIMAR, ESTACIONES } from '../src/app/puertos.js';

let ok = 0; const fallos = [];
function check(nombre, cond, detalle = '') {
  if (cond) { ok++; console.log(`✅ ${nombre} ${detalle}`); }
  else { fallos.push(nombre); console.log(`❌ ${nombre} ${detalle}`); }
}

// --- Respuesta REAL capturada de poem.puertos.es (boya 3545, formato verificado) ---
const RESPUESTA_REAL = [
  ['UTC', 'Hm0 (m)', 'Tp (s)'],
  [[1788048000, [[0.08, 1], [3.68, 1]]],
   [1788049200, [[0.08, 1], [3.68, 1]]],
   [1788050400, [[0.08, 1], [4.85, 1]]],
   [1788051600, [[-99.9, 0], [3.38, 1]]],   // hueco con calidad 0: debe excluirse
   [1788052800, [[0.13, 1], [3.53, 1]]]],
];

const serie = normalizarSerie(RESPUESTA_REAL);
check('T12a normaliza solo registros validados (calidad 1)', serie.length === 4,
  `(${serie.length} de 5 filas; el hueco -99.9/calidad 0 se excluye)`);

const estado = ultimoEstadoOleaje(serie);
check('T12b último estado = Hs 0.13 / Tp 3.53 con fuente',
  estado.Hs === 0.13 && Math.abs(estado.Tp - 3.53) < 1e-9 && /Puertos/.test(estado.fuente),
  `(Hs ${estado.Hs} m, Tp ${estado.Tp} s, "${estado.fuente}")`);

// --- CSV SIMAR (formato oficial de bancodatos.puertos.es: tabulador, huecos -99.9) ---
const CSV_SIMAR = [
  'SIMAR-44 punto 1052046', '',
  'FECHA\tHm0 (m)\tTp (s)\tDirM (gr)',
  '15/01/2024 00:00\t1.24\t9.5\t287',
  '15/01/2024 01:00\t1.31\t9.8\t290',
  '15/01/2024 02:00\t-99.9\t-99.9\t-99.9',
  '15/01/2024 03:00\t1.40\t10.2\t295',
].join('\n');
const simar = parsearSIMAR(CSV_SIMAR);
check('T12c parsea SIMAR oficial (tab-separado, 3 válidos de 4)',
  simar.length === 3 && Math.abs(simar[2].Hs - 1.40) < 1e-9 && Math.abs(simar[2].Tp - 10.2) < 1e-9,
  `(${simar.length} registros; Hs última fila ${simar[2]?.Hs})`);

// --- Catálogo de estaciones: códigos reales con metadatos ---
const estacionesOk = Object.values(ESTACIONES).every(e => isFinite(e.lat) && isFinite(e.lon) && e.nombre.length > 3);
check('T12d catálogo de estaciones Portus con coordenadas', estacionesOk,
  `(${Object.keys(ESTACIONES).length} estaciones)`);

console.log(`\n${ok}/4 tests pasando (tanda 5 — Puertos del Estado)`);
if (fallos.length) { console.error('FALLOS:', fallos.join(', ')); process.exit(1); }
