// tanda9.mjs — W3J-T16: cliente Portus (parser + partida válida)
import { ultimaPartida } from '../src/studio/portus.js';
let ok = 0; const fallos = [];
const check = (n, c, d='') => { if (c) { ok++; console.log(`✅ ${n} ${d}`); } else { fallos.push(n); console.log(`❌ ${n} ${d}`); } };

// formato real capturado de poem.puertos.es
const real = { datos: [
  { fecha: '2026-08-30 08:00', Hm0: 1.8, Tp: 9.5 },
  { fecha: '2026-08-30 09:00', Hm0: -99.9, Tp: -99.9 },   // hueco
  { fecha: '2026-08-30 10:00', Hm0: 2.3, Tp: 11.2 },
]};
const p = ultimaPartida(real);
check('T16a última partida válida', p && p.Hs === 2.3 && p.Tp === 11.2, `Hs=${p?.Hs} Tp=${p?.Tp}`);
check('T16a2 huecos -99.9 excluidos', p?.fecha === '2026-08-30 10:00');

// formato array simple
const p2 = ultimaPartida([['2026-08-30 10:00', 1.5, 8.0], ['2026-08-30 11:00', 2.0, 9.0]]);
check('T16b formato array', p2 && p2.Hs === 2.0, `Hs=${p2?.Hs}`);

// valores imposibles rechazados
const p3 = ultimaPartida([{ Hm0: 55, Tp: 100 }]);
check('T16c valores imposibles → null', p3 === null);

// solo huecos → null
const p4 = ultimaPartida([{ Hm0: -99.9, Tp: -99.9 }]);
check('T16d todo huecos → null', p4 === null);

console.log(`\n${ok}/5 tests pasando (tanda 9 — Portus)`);
if (fallos.length) { console.log('FALLOS:', fallos.join(' · ')); process.exit(1); }
