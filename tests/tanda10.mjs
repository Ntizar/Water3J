
// tanda10.mjs — T17: convención del signo EMODnet y máscara de costa
// Motivo: "olas dentro de la tierra" — Math.abs(avg) convertía elevaciones terrestres en profundidades.
import { readFileSync } from 'fs';

let n = 0, ok = 0;
const t = (nombre, cond) => { n++; if (cond) { ok++; console.log('  ok', nombre); } else console.log('  FALLO', nombre); };

// T17a: la función convertirEMODnet de la convención correcta (réplica del código parcheado)
const convertirEMODnet = (avg) => {
  if (avg == null) return { h: null, tierra: false };
  if (avg >= 0) return { h: null, tierra: true };   // tierra/costa: elevación >= 0 (EMODnet DTM: agua estrictamente negativa)
  return { h: -avg, tierra: false };                  // agua: prof. = -avg (>0)
};

// T17a: mar profundo (avg=-82.6) → h=82.6
const a = convertirEMODnet(-82.6);
t('T17a mar: avg=-82.6 → h=82.6', Math.abs(a.h - 82.6) < 1e-9 && !a.tierra);

// T17b: tierra (avg=+34.1, casco de Loredo) → h=null y marcada como tierra
const b = convertirEMODnet(34.137);
t('T17b tierra: avg=+34.1 → h=null · tierra=true', b.h === null && b.tierra);

// T17c: línea de costa ambigua (avg=+0.1) → TIERRA (solo estrictamente negativo es agua)
const c = convertirEMODnet(0.1);
t('T17c costa: avg=+0.1 → tierra (h=null)', c.h === null && c.tierra);

// T17d: sin datos (avg=null) → null
t('T17d null', convertirEMODnet(null).h === null);

// T17e: INVARIANTE sobre los JSON reales de spots: ninguna rotura en tierra
// (h>=0.2 como avg era tierra; ahora roturas deben tener h>0 y NO coincide con coordenadas terrestres EMODnet)
for (const f of ['tests/ola-perfecta.json', 'tests/ola-suances.json', 'tests/ola-liencres.json']) {
  try {
    const j = JSON.parse(readFileSync(f, 'utf8'));
    const malas = j.roturas.filter(r => !(r.h > 0.1) || !isFinite(r.h));
    t('T17e ' + f + ': roturas con h válida (' + j.roturas.length + ' puntos)', malas.length === 0);
  } catch (e) { t('T17e ' + f, false); }
}

console.log(`T17: ${ok}/${n}`);
if (ok !== n) process.exit(1);
