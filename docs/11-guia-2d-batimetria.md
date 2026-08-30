# Guía 11 — Propagación 2D de frentes de oleaje sobre batimetría real

## Qué hace
El Studio ahora simula **frentes de ola en 2D** sobre batimetría real descargada por API:

1. **Batimetría real (EMODnet)** — al pulsar "Simular frentes 2D aquí", se descarga una
   rejilla de 11×11 puntos alrededor del centro del mapa vía `rest.emodnet-bathymetry.eu/depth_sample`.
   Cada punto devuelve profundidad media real del DTM europeo (100 m de resolución).
   **Validación a mano**: abre la URL en el navegador
   `https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(-3.6+43.55)` → verás JSON con `avg` (profundidad media en m, negativa). El programa usa `|avg|`.

2. **Trazado de rayos (Snell 2D)** — 7 rayos paralelos avanzan hacia la costa girando según
   `dα/ds = -(1/c)·∂c/∂n` (ecuación de rayos, CEM II-3). Se dibujan en azul sobre el mapa.
   **Validación**: sobre un talud recto, un rayo de 30° debe terminar casi perpendicular a la costa (T14c).

3. **Altura por conservación de flujo de energía** — `E·cg·b = cte` entre rayos vecinos:
   `H = H0·√(cg0·b0/(cg·b))`. Shoaling + refracción sin fórmulas ad hoc.
   **Validación**: el Hs nunca supera `0.78·h` (T14e) y no decrece antes de romper (T14f).

4. **Puntos de rotura** — el primer punto donde H alcanza `0.78·h` se marca en rojo con su H y h exactos.

## Fuente de datos
- **EMODnet Digital Terrain Model (DTM)** — bathymetry europea,-resolution 100 m-1/32 min.
- API: `https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(lon lat)` → JSON `avg` = profundidad media (m, negativa en mar).
- Sin clave, CORS abierto (verificado con `Access-Control-Allow-Origin`).
- Limitación: cubre mares europeos. Para otras zonas (México, Chile...) se añadirá GEBCO vía otro canal.
- **Caché local**: cada rejilla se guarda en IndexedDB (`store: baterias`) — la segunda vez es instantáneo y funciona offline.

## Tests que avalan esto (biblia T14, tanda 7)
| Test | Qué garantiza |
|------|--------------|
| T14a | L(20 m, 10 s) = 121 m, según tablas CEM (~120.3 m) |
| T14b | cg < c en aguas intermedias (dispersión correcta) |
| T14c | refracción: el ángulo con la costa decrece (Snell) |
| T14d | el rayo alcanza aguas someras y para |
| T14e | invariante de rotura H ≤ 0.78·h en todos los puntos |
| T14f | shoaling físico: H no decrece antes de romper |
| T14g | isócronas generadas correctamente |
| T14h | determinismo total (misma entrada → misma salida) |

## Limitaciones honestas
- Los frentes se calculan por trazado de rayos (aprox de fase); no resuelve difracción.
- La separación b entre rayos es fija en esta versión (b0 = separación inicial); el
  refraction-induced convergence/divergence real se calcula en la siguiente iteración
  midiendo la separación real entre trayectorias vecinas.
- EMODnet cubre aguas europeas; otros océanos requieren otra fuente.
