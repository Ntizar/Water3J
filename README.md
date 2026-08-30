# Water3J 🌊

**Visualizador científico y estudio de oleaje costero — física validada por tests, datos reales de APIs, todo en tu navegador.**

Hecho con ❤️ por **David Antizar** · Mastermind como ejecutor

**Demo (móvil):** https://ntizar.github.io/Water3J/demo.html
**Studio (PC, herramienta completa):** https://ntizar.github.io/Water3J/studio.html

---

## Qué es

Dos aplicaciones en un repositorio:

1. **App v1 (móvil)** — visualizador 3D de oleaje Gerstner con fondo marino editable, escenas (Bilbao calma, huracán…), datos reales de boyas de Puertos del Estado y aviso permanente de fuente/fecha de cada dato.

2. **Studio (PC)** — la herramienta seria de estudio de oleaje:
   - **Mapa OpenStreetMap real** con las boyas geolocalizadas
   - **Transecto dibujable** con 2 clics (distancia real haversine)
   - **Motor 1D**: shoaling + refracción + rotura punto a punto
   - **Motor 2D**: frentes de ola propagándose sobre **batimetría real de EMODnet** por API, con animación temporal y puntos de rotura marcados
   - **Estructuras**: cargas de Goda + clapotis en muros verticales
   - **Base de datos local (IndexedDB)**: escenarios y batimetrías cacheadas, 100% offline tras la primera descarga
   - **Salidas profesionales**: informe imprimible a PDF con procedimiento de validación para el revisor + exportación CSV del transecto
   - **Transparencia total**: cada cálculo muestra su fórmula, ejemplo numérico con TUS datos y qué test lo avala

---

## Estado real del proyecto

### Biblia de tests: 39/39 en verde

| Tanda | Qué cubre | Tests |
|---|---|---|
| T1–T3 (v1) | física de olas, campo, estado | 10 |
| T11–T12 | estado serializable, integración Puertos del Estado (SIMAR) | 8 |
| T13 | motor de transectos 1D (Studio) | 5 |
| T14 | motor 2D: dispersión, refracción Snell, rotura, determinismo | 8 |
| T15 | separación real entre rayos, convergencia/divergencia | 4 |
| T16 | cliente Puertos del Estado (parser, huecos -99.9) | 5 |
| T17 | convención del signo EMODnet + máscara de costa (tanda10) | 7 |
| ver-*.mjs | E2E headless (puppeteer + SwiftShader): mapa, 2D, puertos, informe | verificación |

**Bugs reales cazados por la biblia**: huecos SIMAR tratados como datos válidos, vector perpendicular del rayo mal definido (refracción lateral incorrecta), clave `F` de Goda, convención de ángulos de propagación, redondeo en el invariante de rotura, **convención del signo EMODnet** (T17: `Math.abs()` convertía elevaciones terrestres en "profundidades" → olas dentro de la tierra; correcto: negativo=agua, positivo=tierra → h=null).

**Limitaciones honestas**: el DTM de EMODnet (~100 m) no resuelve bien la línea de costa — cerca de la orilla puede devolver valores ambiguos; la máscara T17 los trata como tierra (conservador). Los rayos terminan al romper y la rejilla visual se filtra a h>2 m. Los puntos de rotura exactos dependen de la calidad de la batimetría local (cartas náuticas de detalle o Lidar mejorarían la precisión en la última decena de metros).

### Fuentes de datos reales (conectadas y testadas)

| Fuente | Uso | API |
|---|---|---|
| **Puertos del Estado (REDCOS)** | Hs/Tp medidos por boyas, cada hora | `poem.puertos.es/portus/StationData?code=...&params=Hm0,Tp` |
| **EMODnet Bathymetry** | batimetría real europea, sin clave, CORS abierto | `rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(lon lat)` |

Limitaciones honestas: la API de Puertos puede bloquear CORS según navegador (carga manual de JSON documentada); EMODnet cubre mares europeos con DTM de ~100 m.

### Física implementada

- Dispersión de Airy (Newton sobre ω² = g·k·tanh(kh)), fases y grupos
- Shoaling (Ks) y refracción (Snell, Kr)
- Conservación del flujo de energía 2D (E·cg·b = cte) con **b medida entre rayos**
- Rotura de McCowan (H ≤ 0.78·h)
- Presiones de Goda en muro vertical + clapotis
- Ola Gerstner en GPU (app 3D)

---

## Cómo usar

**Studio (PC):**
1. Centra el mapa donde quieras estudiar (zoom alto = modo puerto: rejilla 15×15 en 1,2 km)
2. Introduce Hs/T/dirección — o conecta una boya real con el botón 📡
3. Dibuja el transecto con 2 clics, o pulsa 🌍 para la simulación 2D con frentes animados
4. Coloca un muro y lee las cargas de Goda
5. Guarda el escenario (queda en tu navegador, con el mapa donde estaba)
6. Exporta CSV o genera el informe PDF (Ctrl+P para PDF)

**Móvil / demo:** escena → boya real opcional → fondo marino táctil editable.

## Validar cualquier número que te muestre la app

Todo documentado en `docs/`: boya (URL de StationData), batimetría (URL de depth_sample), cálculos (`Hs = Hs0 × Ks × Kr`, rotura 0.78·h, Goda).

---

## Estructura

```
src/
├── fisica/       # física pura — testeada en Node
├── app/          # app móvil 3D (estado, campo, shaders)
└── studio/       # herramienta PC
    ├── motor.js               # transecto 1D
    ├── motor2d.js             # rayos 2D, frentes, isócronas
    ├── batimetria-cliente.js  # EMODnet + caché
    ├── portus.js              # cliente REDCOS
    ├── capa2d.js              # visualización sobre Leaflet
    ├── informe.js             # informe PDF + CSV
    ├── db.js                  # IndexedDB
    └── boyas.js               # estaciones geolocalizadas
tests/            # biblia (Node + puppeteer headless)
docs/             # guías: fuente, fórmulas y validación de cada sistema
```

## Desarrollo

```bash
npm install
npm test          # biblia en Node
npx vite          # dev server
npm run build     # build a dist/ (GitHub Pages)
```

---

## Documentación

- `docs/09-biblia-tests.md` — los tests como contrato del proyecto
- `docs/10-guia-datos-puertos.md` — integración REDCOS/SIMAR
- `docs/11-guia-2d-batimetria.md` — propagación 2D y EMODnet
- `docs/12-guia-puertos-animacion.md` — resolución adaptable, animación, b real

---

Hecho con ❤️ por **David Antizar** · Mastermind como ejecutor
