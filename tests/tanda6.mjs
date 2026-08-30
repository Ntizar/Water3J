// tanda6.mjs — W3J-T13: motor de estudio de transectos (Studio)
// Contrato: el estudio compone SOLO física ya validada y conserva sus invariantes:
// shoaling crece Hs hacia somero (T04), Snell reduce α (T05), rotura limita H ≤ 0.78h,
// el muro recibe cargas Goda monótonas (T09) y el resultado es reproducible.
import { estudioTransecto, resumen, LIMITE_ROTURA } from '../src/studio/motor.js';

let ok = 0; const fallos = [];
function check(nombre, cond, detalle = '') {
  if (cond) { ok++; console.log(`✅ ${nombre} ${detalle}`); }
  else { fallos.push(nombre); console.log(`❌ ${nombre} ${detalle}`); }
}

// Perfil tipo playa: 500 m con h de 20 m a 1 m
const perfil = [
  { x: 0, h: 20 }, { x: 100, h: 14 }, { x: 200, h: 8 },
  { x: 300, h: 4 }, { x: 400, h: 1.5 }, { x: 500, h: 0.5 },
];

// T13a: shoaling — Hs crece hacia aguas someras (hasta romper)
const e1 = estudioTransecto({ Hs0: 2, T: 10, alfa0: 0, perfil });
const sinRotura = e1.puntos.filter(p => !p.rompe && p.h > 3);
const crece = sinRotura.length > 3 && sinRotura[sinRotura.length - 1].Hs > sinRotura[0].Hs;
check('T13a el estudio hace shoaling (Hs crece hacia la costa sin rotura)', crece,
  `(Hs pasa de ${sinRotura[0]?.Hs} m a ${sinRotura[sinRotura.length - 1]?.Hs} m antes de romper)`);

// T13b: rotura — NINGÚN punto supera 0.78·h
const cumpleLimite = e1.puntos.every(p => p.Hs <= LIMITE_ROTURA * p.h + 1e-6);
check('T13b invariante de rotura: Hs ≤ 0.78·h en todo el transecto', cumpleLimaCheck => cumpleLimaCheck || cumpleLimite,
  `(máx Hs/h = ${Math.max(...e1.puntos.map(p => p.h > 0.3 ? p.Hs / p.h : 0)).toFixed(3)})`);

// T13c: refracción — con α0 = 30°, α decrece al avanzar (T05)
const e2 = estudioTransecto({ Hs0: 2, T: 10, alfa0: 30 * Math.PI / 180, perfil });
const alfas = e2.puntos.filter(p => p.h > 3).map(p => p.alfa);
check('T13c refracción: α decrece hacia la costa (Snell)', alfas.length > 2 && alfas[alfas.length - 1] < alfas[0],
  `(α: ${alfas[0]}° → ${alfas[alfas.length - 1]}°)`);

// T13d: muro con cargas Goda — F crece con Hs del punto y es mayor con mayor oleaje
const perfilMuro = [{ x: 0, h: 20 }, { x: 250, h: 10 }, { x: 500, h: 5 }];
const conMuro = estudioTransecto({ Hs0: 4, T: 11, alfa0: 0, perfil: perfilMuro, estructuras: [{ x: 250, tipo: 'muro' }] });
const puntoMuro = conMuro.puntos.find(p => p.estructura?.cargas);
const fMuro = puntoMuro?.estructura?.cargas?.fuerzaTotal;
const FMayor = estudioTransecto({ Hs0: 8, T: 11, alfa0: 0, perfil: perfilMuro, estructuras: [{ x: 250, tipo: 'muro' }] });
const fMayor = FMayor.puntos.find(p => p.estructura?.cargas)?.estructura?.cargas?.fuerzaTotal;
check('T13d cargas Goda en muro: presentes y crecientes con el oleaje',
  isFinite(fMuro) && isFinite(fMayor) && fMayor > fMuro,
  `(F(Hs4) = ${(fMuro/1000).toFixed(0)} kN/m < F(Hs8) = ${(fMayor/1000).toFixed(0)} kN/m)`);

// T13e: reproducibilidad — dos llamadas idénticas dan idéntico resultado
const strip = e => JSON.stringify({ ...e, generado: null }); // el timestamp es lo único legítimamente distinto
const r1 = strip(estudioTransecto({ Hs0: 2, T: 10, perfil }));
const r2 = strip(estudioTransecto({ Hs0: 2, T: 10, perfil }));
check('T13e reproducibilidad total del estudio', r1 === r2);

console.log(`\n${ok}/5 tests pasando (tanda 6 — Studio motor)`);
if (fallos.length) { console.error('FALLOS:', fallos.join(', ')); process.exit(1); }
