// suite.js — Suite de tests Water3J
// Estructura de la biblia (docs/09-biblia-tests.md). Cada test se implementa
// en su fase. Estado: PENDING = no implementado, PASS/FAIL = resultado medido.
//
// Reglas (no negociables):
//  - Cada test devuelve { id, estado, medida, criterio } — evidencia siempre.
//  - Un test nunca se relaja para que el código pase.
//  - Tests nuevos = ID secuencial + entrada en la biblia.

export const TESTS = [

  // ---- BLOQUE A — Física fundamental ----
  {
    id: 'W3J-T01', nombre: 'Relación de dispersión', categoria: 'física', prioridad: 'P0',
    estado: 'PENDING', fase: 1,
    run: null, // async () => { ...comparar c(k,h) módulo vs Newton-Raphson... }
  },
  {
    id: 'W3J-T02', nombre: 'Campo Gerstner correcto', categoria: 'física', prioridad: 'P0',
    estado: 'PENDING', fase: 1, run: null,
  },
  {
    id: 'W3J-T03', nombre: 'Espectro JONSWAP normalizado', categoria: 'física', prioridad: 'P0',
    estado: 'PENDING', fase: 1, run: null,
  },
  {
    id: 'W3J-T04', nombre: "Shoaling (Green's law)", categoria: 'física', prioridad: 'P0',
    estado: 'PENDING', fase: 2, run: null,
  },
  {
    id: 'W3J-T05', nombre: 'Refracción (Snell)', categoria: 'física', prioridad: 'P0',
    estado: 'PENDING', fase: 2, run: null,
  },
  {
    id: 'W3J-T06', nombre: 'Reflexión y clapotis (muro vertical)', categoria: 'física', prioridad: 'P0',
    estado: 'PENDING', fase: 3, run: null,
  },

  // ---- BLOQUE B — Motor de simulación ----
  {
    id: 'W3J-T07', nombre: 'Flotabilidad en equilibrio', categoria: 'física', prioridad: 'P1',
    estado: 'PENDING', fase: 1, run: null,
  },
  {
    id: 'W3J-T08', nombre: 'SWE: conservación de masa + presa rota', categoria: 'gpgpu', prioridad: 'P0',
    estado: 'PENDING', fase: 4, run: null,
  },
  {
    id: 'W3J-T09', nombre: 'Cargas en muro (Goda)', categoria: 'física', prioridad: 'P1',
    estado: 'PENDING', fase: 3, run: null,
  },

  // ---- BLOQUE C — Interacción y escena ----
  {
    id: 'W3J-T10', nombre: 'Batimetría editable en vivo', categoria: 'ui', prioridad: 'P1',
    estado: 'PENDING', fase: 2, run: null,
  },
  {
    id: 'W3J-T11', nombre: 'Presets: round-trip serialización', categoria: 'ui', prioridad: 'P1',
    estado: 'PENDING', fase: 3, run: null,
  },

  // ---- BLOQUE D — Rendimiento e informes ----
  {
    id: 'W3J-T12', nombre: 'Presupuesto de rendimiento', categoria: 'rendimiento', prioridad: 'P0',
    estado: 'PENDING', fase: 3, run: null,
  },
  {
    id: 'W3J-T13', nombre: 'Informe científico completo', categoria: 'informes', prioridad: 'P1',
    estado: 'PENDING', fase: 4, run: null,
  },
  {
    id: 'W3J-T14', nombre: 'Robustez ante entradas extremas', categoria: 'física', prioridad: 'P1',
    estado: 'PENDING', fase: 2, run: null,
  },
];

// Utilidades comunes para implementar los tests (referencias de la biblia)
export const util = {
  // Solución exacta de ω² = g·k·tanh(k·h) por Newton-Raphson (referencia independiente de la app)
  numeroOndaExacto(omega, h, g = 9.81) {
    let k = omega * omega / g; // semilla aguas profundas
    for (let i = 0; i < 50; i++) {
      const f = g * k * Math.tanh(k * h) - omega * omega;
      const df = g * (Math.tanh(k * h) + k * h / Math.cosh(k * h) ** 2);
      k -= f / df;
    }
    return k;
  },

  // Error relativo |a-b|/|b|
  errRel(a, b) { return Math.abs(a - b) / Math.abs(b); },

  // NaN check sobre un array o estructura anidada
  hayNaN(x) {
    if (typeof x === 'number') return Number.isNaN(x);
    if (Array.isArray(x)) return x.some(v => this.hayNaN(v));
    if (x && typeof x === 'object') return Object.values(x).some(v => this.hayNaN(v));
    return false;
  },

  // FPS: función de muestreo para T12 (llamar cada frame, ventana deslizante)
  medidorFPS() {
    const marcas = [];
    return () => {
      const t = performance.now();
      marcas.push(t);
      while (marcas.length && t - marcas[0] > 1000) marcas.shift();
      return marcas.length - 1; // fps último segundo
    };
  },
};
