# Biblia de Tests — Water3J

> **Este documento es el contrato del proyecto.** Ninguna funcionalidad existe hasta que su test correspondiente pasa. Ninguna refactorización es válida si rompe un test. Los tests se escriben ANTES que el código (TDD estricto a nivel de aceptación).

- **Versión:** 1.0 (2026-08-30)
- **Estado inicial:** todos los tests PENDIENTES
- **Regla de oro:** un test solo puede pasar con **evidencia medible** (valor numérico, captura, export). Nunca por opinión ("parece que funciona").

## Cómo se audita el programa

1. Cada test tiene un **ID único** (`W3J-Txx`) y una función implementable `test_W3J_Txx()` en `tests/suite.js`.
2. El **runner** (`tests/runner.html`) ejecuta la suite en el navegador sobre la app real y produce un informe: tabla con ID, resultado (✅/❌/⏭️ omitido), valor medido vs criterio.
3. El resultado de la última auditoría se registra en `tests/registro.json` (fecha, build/commit, resultado por test). El README refleja el estado: "X/12 tests pasando".
4. **Un PR/commit que implemente una feature debe declarar qué tests pasa.** Si rompe un test que ya pasaba, el commit se rechaza.
5. Tests manuales (visuales/UX) se auditan con checklist + captura obligatoria adjunta en el commit.

## Contrato para ampliar con vibecode (reglas invariables)

- **Añadir un test:** ID secuencial nuevo, nunca reciclado. Estructura idéntica a los existentes (campos de abajo). Actualizar `tests/suite.js`, `tests/registro.json` y este documento.
- **Modificar un test existente:** solo si el criterio estaba mal especificado físicamente, con justificación escrita en el propio test (sección "Historial"). Nunca relajar un criterio para que pase el código.
- **No se puede:** borrar tests, marcar como omitidos sin causa documentada, ni duplicar criterios.
- **Todo módulo nuevo** (nueva física, nueva UI, nuevo export) entra con su test antes que con su código.
- **Lenguaje de criterios:** SIEMPRE valores medibles con unidades y tolerancia (ej: "error < 2%", "≥ 55 fps sostenidos 10s", "masa drift < 0.5%").

## Estructura obligatoria de cada test

```
### W3J-Txx — <nombre>
- **Categoría:** física | render | gpgpu | ui | informes | rendimiento
- **Prioridad:** P0 (bloqueante) | P1 (core) | P2 (deseable)
- **Requisito (GWT):** Dado... cuando... entonces...
- **Procedimiento:** pasos exactos (idealmente automatizados en suite.js)
- **Criterio de paso:** valor medible + tolerancia
- **Evidencia:** qué se registra en registro.json
```

---

## BLOQUE A — Física fundamental (P0)

### W3J-T01 — Relación de dispersión
- **Categoría:** física · **Prioridad:** P0
- **Requisito (GWT):** Dado el módulo `spectrum.ts`/`ocean.ts`, cuando se consulta la velocidad de fase `c(k, h)` para un barrido de longitudes de onda y profundidades, entonces coincide con la teoría.
- **Procedimiento:** para L = [5, 20, 50, 100, 200] m y h = [3, 10, 50, 1000] m, calcular `c = ω/k` del módulo y comparar con la solución exacta de `ω² = g·k·tanh(k·h)` (resolver k por Newton-Raphson en el test como referencia independiente).
- **Criterio de paso:** error relativo < 0.5% en los 20 casos. Verificación adicional de regímenes: c(L=200, h=1000) ≈ √(g·L/2π) ≈ 17.7 m/s (±1%) y c(L=20, h=3) ≈ √(g·h) ≈ 5.42 m/s (±2%, aguas someras).
- **Evidencia:** tabla de 20 comparaciones en el informe del runner.
- **Historial:** (2026-08-30) El caso somero original (L=20 m, h=3 m, kh≈0.47) estaba en régimen intermedio, no somero. Corregido el CASO (T=20 s, h=2 m), no el criterio. Aprendizaje: elegir caso de régimen verificando kh, no h/L a ojo.

### W3J-T02 — Campo Gerstner correcto
- **Categoría:** física · **Prioridad:** P0
- **Requisito (GWT):** Dado una componente Gerstner de parámetros conocidos, cuando se muestrea la superficie `sampleHeight`, entonces la forma es la trocoide exacta.
- **Procedimiento:** 1 sola ola: d=(1,0), a=1 m, L=50 m, steepness correspondiente. Muestrear η(x, t=T/4) en 100 puntos de un periodo espacial. Comparar con la solución analítica x_shift = x - a·sin(kx), η = a·cos(kx). Comprobar también que la altura máxima pico-a-valle = 2a (±0.5%).
- **Criterio de paso:** error RMS < 0.5% del valor teórico en los 100 puntos; fase correcta en t=T/4 (η máx en x=0).
- **Evidencia:** RMS y máximos en el informe.
- **Historial:** (2026-08-30) El check de fase original exigía el máximo en x=0 en t=T/4 — físicamente erróneo (en T/4 la cresta se ha desplazado un cuarto de λ). Corregido: cresta en x=0 en t=0. El criterio de fase ahora es correcto.

### W3J-T03 — Superposición espectral normalizada (JONSWAP)
- **Categoría:** física · **Prioridad:** P0
- **Requisito (GWT):** Dado un espectro JONSWAP con viento U=15 m/s y fetch F=100 km, cuando se generan las componentes, entonces Hs y Tp derivados coinciden con los parámetros del espectro.
- **Procedimiento:** generar N=200 componentes; calcular Hs = 4√(m0) y Tp desde el pico de S(ω); comparar con Hs, Tp de entrada.
- **Criterio de paso:** Hs derivada dentro de ±5% de la de entrada; Tp dentro de ±3%; energía total (integral de S) conservada ±1% tras discretizar. Además, Hs(JONSWAP γ=3.3) < Hs(PM) con mismos U y F (pico más energético no implica más altura — validar que la comparación es coherente con la literatura).
- **Evidencia:** Hs/Tp entrada vs derivada.
- **Historial:** (2026-08-30) Primera ejecución: el test PASABA con Hs=1908 m (absurdo físico) porque módulo y referencia compartían la misma fórmula errónea de ωp. Corregidos AMBOS a la forma original de Hasselmann et al. (1973): ωp = 22·(g²/UF)^⅓, α = 0.076·(gF/U²)^-0.22. Lección: la referencia del test debe detectar errores físicos absurdos aunque "cuadren" numéricamente. Coherencia JONSWAP>PM (3.05 vs 2.46 m) validó la corrección. Además, el criterio original de coherencia (Hs_JONSWAP < Hs_PM) era erróneo: con mismo α, el pico de JONSWAP es más energético → Hs_JONSWAP > Hs_PM (3.05 vs 2.46 m, coherente con literatura).

### W3J-T04 — Shoaling (Green's law)
- **Categoría:** física · **Prioridad:** P0
- **Requisito (GWT):** Dado olas propagando sobre una batimetría 1D que decrece linealmente, cuando la ola pasa de h=50 m a h=4 m con crestas paralelas a las isolíneas, entonces la altura crece según la teoría.
- **Procedimiento:** activar el módulo de transformación (refracción/shoaling) sin difracción; medir H en 5 estaciones (h = 50, 25, 12.5, 8, 4 m); comparar con Ks = (c₀n₀/(2cn))^½ de la teoría (o H∝h^(-1/4) en somero con tolerancia del régimen intermedio).
- **Criterio de paso:** error < 3% por estación en régimen intermedio/somero; monotonía estricta (H crece al reducir h). Fallo automático si H decrece en algún tramo.
- **Evidencia:** tabla H medida vs H teórico por estación.

### W3J-T05 — Refracción (Snell)
- **Categoría:** física · **Prioridad:** P0
- **Requisito (GWT):** Dado un tren de olas incidente a 30° sobre una batimetría con isolíneas paralelas, cuando propaga hacia somero, entonces el ángulo local sigue sin α/c = constante.
- **Procedimiento:** trazar 20 rayos con el trazador del programa sobre batimetría plana inclinada; medir ángulo α(h) en cada estación; comparar con Snell analítico.
- **Criterio de paso:** error angular < 1.5° por estación; al llegar a somero α → 0 (±2°) (olas alineadas con la costa).
- **Evidencia:** ángulos medidos vs teóricos.

### W3J-T06 — Reflexión y clapotis en muro vertical
- **Categoría:** física · **Prioridad:** P0
- **Requisito (GWT):** Dado un muro vertical liso (Cr=1) y olas regulares incidentes normales, cuando el tren de olas alcanza el muro, entonces se forma oleaje estacionario con nodos y antinodos.
- **Procedimiento:** colocar muro en x=0; medir η(t) en un antinodo (x = n·L/2 desde el muro) y un nodo (x = L/4 + n·L/2) durante 5 periodos.
- **Criterio de paso:** amplitud en antinodo = 2·a_incidente (±5%); amplitud en nodo < 10% de la incidente; periodo idéntico al incidente. Con Cr=0.3 (escollera): amplitud antinodo ≈ (1+Cr)·a (±5%).
- **Evidencia:** series temporales y amplitudes medidas.

---

## BLOQUE B — Motor de simulación (P0/P1)

### W3J-T07 — Flotabilidad en equilibrio
- **Categoría:** física · **Prioridad:** P1
- **Requisito (GWT):** Dado un cuerpo esférico con densidad 0.5·ρ_w soltado en la superficie, cuando se simulan 20 s, entonces flota en equilibrio con ~mitad sumergida y sigue la ola.
- **Procedimiento:** soltar esfera r=1 m; registrar z(t) del centro y ángulo de inclinación.
- **Criterio de paso:** en promedio (ventana 5 s), la cota de flotación ≈ altura que corresponde a 50% del volumen sumergido (±10%); el cuerpo no deriva más de 0.5 m de su posición por deriva de Stokes en 20 s con olas de a=0.5 m (deriva secundaria documentada, no prohibitiva); inclinación sigue la normal local de la ola (±5°).
- **Evidencia:** series z(t) y ángulo.

### W3J-T08 — SWE: conservación de masa y caso dique roto
- **Categoría:** gpgpu · **Prioridad:** P0
- **Requisito (GWT):** Dado el solver de aguas someras (virtual pipes), cuando se ejecuta el problema clásico de rotura de presa (Fraccarollo & Toro 1995, como en WebFlood), entonces conserva masa y reproduce el frente.
- **Procedimiento:** caso de presa rota estándar (h_up=0.5 m, h_down=0.05 m, dominio 4×1); medir masa total del agua en cada paso; comparar posición del frente a t=0.2 s con la referencia publicada (o el resultado de la tesis de WebFlood).
- **Criterio de paso:** drift de masa < 0.5% al final de la simulación (fuga solo por fronteras activadas a propósito); frente dentro de ±10% de la posición de referencia; sin NaNs en ningún campo durante toda la ejecución (check automático cada 50 pasos).
- **Evidencia:** curva de masa, posición de frente, contador de NaNs.

### W3J-T09 — Cargas en muro (Goda simplificado)
- **Categoría:** física · **Prioridad:** P1
- **Requisito (GWT):** Dado un muro vertical con oleaje incidente Hs y h conocidos, cuando el módulo de estructuras calcula la carga, entonces la presión pico y su distribución son plausibles frente a la formulación de Goda.
- **Procedimiento:** casos: (Hs=2 m, h=8 m, Tp=9 s), (Hs=4 m, h=6 m, Tp=11 s), (Hs=1 m, h=10 m, Tp=6 s). Comparar p1 (cresta) y fuerza total por metro con cálculo Goda implementado independientemente en el test (fórmulas del manual, no del código de la app).
- **Criterio de paso:** error < 10% en los 3 casos; presión monótona decreciente desde el punto de aplicación; creciente con Hs (monotonía entre casos).
- **Evidencia:** tabla de presiones y fuerzas.

---

## BLOQUE C — Interacción y escena (P1)

### W3J-T10 — Batimetría editable en vivo con efecto físico
- **Categoría:** ui · **Prioridad:** P1
- **Requisito (GWT):** Dado la escena con océano y batimetría, cuando el usuario eleva con pincel una zona del fondo creando un bajío, entonces la refracción local cambia visiblemente y físicamente en < 1 s.
- **Procedimiento (automatizable):** colocar pincel programático que eleva el fondo 3 m en un punto con h=10 m; medir antes/después: c local (T04), ángulo de rayos que atraviesan el bajío, y Ks local.
- **Criterio de paso:** cambio de c local > 20% sobre el bajío (verificable numéricamente); actualización del campo de olas (altura medida en el punto cambia > 5%) en < 60 frames tras el trazo; sin huecos/artefactos visibles (captura manual adjunta como evidencia complementaria).
- **Evidencia:** valores antes/después + captura.

### W3J-T11 — Escenarios preset completos
- **Categoría:** ui · **Prioridad:** P1
- **Requisito (GWT):** Dado los 6 presets definidos (playa abierta, playa con espigón, puerto simple, muro vertical, tormenta, fondo irregular), cuando se carga cada uno, entonces la escena queda íntegramente determinada y serializable.
- **Procedimiento:** cargar cada preset → exportar JSON → recargar desde el JSON exportado → comparar estado (batimetría, estructuras, espectro, gauges, cámara).
- **Criterio de paso:** round-trip JSON→escena→JSON idéntico (diff vacío salvo metadatos de fecha) para los 6 presets; carga de cada uno < 2 s; ningún valor NaN en el estado exportado.
- **Evidencia:** diff de los 6 round-trips.

---

## BLOQUE D — Rendimiento e informes (P1/P2)

### W3J-T12 — Presupuesto de rendimiento por nivel de calidad
- **Categoría:** rendimiento · **Prioridad:** P0
- **Requisito (GWT):** Dado cada nivel de calidad (bajo/medio/alto/ultra), cuando se ejecuta la escena de referencia (preset "playa abierta") durante 15 s, entonces el framerate y la memoria cumplen el presupuesto.
- **Procedimiento:** medir FPS con `requestAnimationFrame` timestamps (excluir 2 s de warm-up); registrar draw calls, triángulos, uso de texturas; repetir en el hardware de referencia disponible.
- **Criterio de paso:** medio: ≥ 55 fps sostenidos en GPU dedicada y ≥ 40 fps en integrada a 1080p; bajo: ≥ 55 fps en integrada; ningún frame > 100 ms tras warm-up (sin stalls); draw calls del océano ≤ 8 (LOD funcionando). El ajuste dinámico de calidad debe activarse al forzar caída (cargar ultra + tormenta + muchos objetos) y estabilizar ≥ 30 fps.
- **Evidencia:** métricas por nivel en registro.json.

### W3J-T13 — Informe científico completo
- **Categoría:** informes · **Prioridad:** P1
- **Requisito (GWT):** Dado una simulación con gauges y estructuras, cuando el usuario genera el informe, entonces se produce un documento completo, reproducible y con conclusiones numéricas.
- **Procedimiento:** generar informe en el preset "puerto simple" con 2 gauges y 1 muro; verificar contenido: parámetros de entrada, ≥ 3 campos calculados (capturas con overlay), series temporales de los gauges, Kt/Kd calculados, sección metodológica; exportar PDF (print) y JSON.
- **Criterio de paso:** el JSON del informe contiene todos los valores numéricos con unidades (ningún campo vacío/NaN); Kt medido tras el dique ∈ (0, 1); dos generaciones consecutivas del mismo estado producen informes idénticos (determinismo); PDF imprimible en A4 sin cortar contenido (checklist manual + captura).
- **Evidencia:** JSON del informe + comparación de determinismo.

### W3J-T14 — Robustez ante entradas extremas
- **Categoría:** física · **Prioridad:** P1
- **Requisito (GWT):** Dado valores extremos pero físicamente admisibles, cuando se configuran, entonces el programa no produce NaN, no colapsa y degrada con mensaje claro.
- **Procedimiento:** barridos: Hs ∈ [0.1, 15] m, Tp ∈ [2, 25] s, h ∈ [0.5, 200] m, viento [2, 60] m/s; combinaciones aleatorias (50 casos); incluir olas con steepness > límite de Gerstner (debe clamplearse, no loop visual) y H/h > 0.78 (rompe, no explota).
- **Criterio de paso:** 0 NaN en todos los campos en 50/50 casos; steepness total siempre ≤ 1.0 (clamp documentado); con H/h crítico se activa espuma/rotura sin fallo; mensajes de aviso en UI cuando el parámetro sale del rango recomendado.
- **Evidencia:** resultados del barrido.

---

## Matriz de trazabilidad (qué test valida qué requisito)

| Requisito del proyecto | Test(s) |
|---|---|
| Oleaje físico correcto (dispersión, Gerstner, espectros) | T01, T02, T03 |
| Transformación en costas (shoaling, refracción) | T04, T05 |
| Reflexión/estructuras/puertos | T06, T09 |
| SWE / rotura / robustez numérica | T08, T14 |
| Flotabilidad | T07 |
| Batimetría editable interactiva | T10 |
| Escenarios reutilizables | T11 |
| Visualización optimizada | T12 |
| Informes científicos | T13 |

## Definición de "hecho"

Una fase de desarrollo está **completa** cuando: todos sus tests P0/P1 asociados pasan en el hardware de referencia, `tests/registro.json` está actualizado con fecha+commit, y el README muestra el contador actualizado. **La app nunca se publica con un test P0 fallando.**
