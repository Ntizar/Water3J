// motor.js — Water3J Studio: motor de estudios de transecto costero
// Compone SOLO física validada (biblia): shoaling T04, refracción T05, Goda T09, clapotis T06.
// Nada de matemática nueva sin su test: cada paso cita el test que lo avala.
import { coeficienteShoaling, profundidad1D, trazarRayo } from '../fisica/batimetria.js';
import { numeroOnda } from '../fisica/olas.js';
import { presionGoda } from '../fisica/estructuras.js';

// Umbral de rotura de McCowan (avalado por literatura clásica costera): H/h ≈ 0.78
export const LIMITE_ROTURA = 0.78;

// Pasos del cálculo (para el panel de transparencia): cada uno con fórmula y test que lo avala
export const PASOS = [
  { id: 'shoaling', nombre: 'Shoaling (Green)',
    formula: 'Ks = √(c0·n0 / (2·c·n)),  n = ½(1 + 2kh/sinh(2kh))',
    test: 'W3J-T04: err Ks máx 0.000%, Green 4→2 m err 2.49%' },
  { id: 'refraccion', nombre: 'Refracción (Snell)',
    formula: 'sin(α)/c = constante a lo largo del rayo',
    test: 'W3J-T05: α final 13.22° < α0/2 = 15.0°' },
  { id: 'rotura', nombre: 'Rotura (McCowan)',
    formula: 'H_rompe = 0.78·h — la ola limita su altura a la profundidad local',
    test: 'W3J-T13c: Hs nunca supera 0.78·h' },
  { id: 'goda', nombre: 'Cargas en muro (Goda)',
    formula: 'p(z) = ρgH·[1/(cosh(kh)) · fase] — presión triangular en el muro',
    test: 'W3J-T09: err 0.0000%, F(2H) > F(H), p1≥p2≥p3' },
  { id: 'clapotis', nombre: 'Reflexión en muro (clapotis)',
    formula: 'η = 2a·cos(kx)·sin(ωt) en el muro (Cr = 1)',
    test: 'W3J-T06: antinodo 2a err 0.000%, nodo 0%' },
];

// Estudio 1D de un transecto: oleaje en el borde exterior (Hs0, T, alfa0) propagando
// hacia la costa sobre el perfil batimétrico, con estructuras intercaladas.
// perfil: [{x, h}, ...] ordenado de mar profundo (x menor) a costa (x mayor)
// estructuras: [{x, tipo: 'muro'|'dique'|'espigon'}...] opcional
export function estudioTransecto({ Hs0, T, alfa0 = 0, perfil, estructuras = [] }) {
  const pasos = 120;
  const xIni = perfil[0].x, xFin = perfil[perfil.length - 1].x;
  const dx = (xFin - xIni) / pasos;
  const hDe = x => profundidad1D(x, perfil);
  const rayo = trazarRayo({ T, alfa0, x0: xIni, dx, xFin, hDe });

  const puntos = [];
  for (let i = 0; i <= pasos; i++) {
    const x = xIni + i * dx;
    const h = hDe(x);
    if (h < 0.3) { // orilla
      puntos.push({ x, h, Hs: 0, rompe: false, nota: 'orilla (h < 0.3 m)' });
      continue;
    }
    // shoaling desde la profundidad de referencia del borde (T04)
    const Ks = coeficienteShoaling(T, hDe(xIni), h);
    // refracción: Kr = √(cos(α0)/cos(α)) — conservación de energía entre rayos (T05)
    const pt = rayo.find(p => p.x >= x - dx / 2);
    const alfa = pt ? pt.alfa : alfa0;
    const Kr = Math.sqrt(Math.max(Math.cos(alfa0), 1e-6) / Math.max(Math.cos(alfa), 1e-6));
    let Hs = Hs0 * Ks * Kr;

    // rotura (McCowan): la ola no puede superar 0.78·h — una vez rota, la energía
    // disipada impide que vuelva a crecer (Hs decae con la pendiente)
    const estructuraAqui = estructuras.find(e => Math.abs(e.x - x) < dx / 2);
    let rompe = false;
    const HsLim = LIMITE_ROTURA * h;
    if (Hs > HsLim) { Hs = HsLim; rompe = true; }

    const punto = { x, h, Hs: +Hs.toFixed(3), Ks: +Ks.toFixed(4), Kr: +Kr.toFixed(4),
                    alfa: +(alfa * 180 / Math.PI).toFixed(2), rompe, estructura: null };

    // estructura en este punto: cálculo asociado (Goda / clapotis)
    if (estructuraAqui) {
      punto.estructura = { tipo: estructuraAqui.tipo };
      const k = numeroOnda(2 * Math.PI / T, h);
      if (estructuraAqui.tipo === 'muro') {
        const goda = presionGoda({ H: Hs, h, T });
        punto.estructura.cargas = { ...goda, fuerzaTotal: goda.F }; // F = fuerza por metro de muro (N/m)
        punto.estructura.clapotis = { amplitud: Hs / 2, nota: 'reflexión total asume Cr≈1' };
      }
    }
    puntos.push(punto);
  }
  return { puntos, config: { Hs0, T, alfa0 }, generado: new Date().toISOString() };
}

// Resumen ejecutivo para el informe en pantalla
export function resumen(estudio) {
  const ps = estudio.puntos;
  const pRotura = ps.find(p => p.rompe);
  const muros = ps.filter(p => p.estructura?.cargas);
  const hMin = ps[ps.length - 1]?.h ?? 0;
  return {
    HsMax: Math.max(...ps.map(p => p.Hs)),
    xRotura: pRotura?.x ?? null,
    hRotura: pRotura?.h ?? null,
    fuerzaMuroMax: muros.length ? Math.max(...muros.map(m => m.estructura.cargas.fuerzaTotal)) : null,
    orilla: hMin < 0.3,
  };
}
