# Water3J

**Visualizador científico de oleaje y dinámica costera con Three.js.**

Hecho con ❤️ por David Antizar

## Objetivo

Crear una web app con Three.js que simule de forma científica y visualmente espectacular:

- **Oleaje**: teoría de Airy (olas lineales), olas de Gerstner, espectros JONSWAP / Pierson-Moskowitz
- **Refracción, difracción y reflexión** de olas en costas y estructuras (diques, muelles)
- **Fondo marino editable** con Three.js (batimetría procedural o real)
- **Transporte de sedimentos**: movimiento de arena, deriva litoral, erosión/acreción
- **Interacción oleaje-estructuras**: impacto contra diques, muros portuarios, agitación interior
- **Cálculo de oleaje en playas y puertos** reales (fase futura)

## Metodología: tests primero

**La biblia del proyecto es `docs/09-biblia-tests.md`.** El desarrollo se rige por TDD a nivel de aceptación:

- 14 tests (W3J-T01…T14) con criterios numéricos medibles definen qué debe funcionar y cómo
- Ninguna feature existe hasta que su test pasa; ningún commit rompe un test ya en verde
- El runner en navegador (`tests/runner.html`) audita la app real y genera el registro (`tests/registro.json`)

## Estado

| | |
|---|---|
| **Tests** | **10/14 pasando** — ver `tests/registro.json` · ejecutar: `node tests/node-run.mjs && node tests/tanda3.mjs` |
| **Fase actual** | 2-3: física core + SWE + estructuras validados. Pendientes: T10-T13 (UI/render/informes, requieren app) |
| **Docs** | 9 documentos en `docs/` (teoría, referencias, arquitectura, tests) |

## Estructura

```
Water3J/
├── docs/            # Biblia de conocimiento (01-09: teoría, estado del arte, tests)
├── tests/           # suite.js + runner.html + registro.json (auditoría)
└── src/             # (por crear) app
```

## Licencia

MIT
