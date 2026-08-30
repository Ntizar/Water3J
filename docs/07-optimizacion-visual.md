# Optimización de visualización — Water3J

Cómo conseguir visualización espectacular Y 60fps en el navegador. Compila técnicas de Water Pro, WaterThreeJS, Tidewater, Spiri0 y mejores prácticas Three.js 2026.

## 1. Geometría del agua — el cuello de botella principal

### LOD de cascada / chunked LOD (crítico)
- Malla de agua con resolución adaptativa: muy fina cerca de la cámara, gruesa lejos
- **CDLOD (Continuous Distance LOD):** anillos concéntricos alrededor de la cámara con transición morphing entre niveles (evita popping). Referencia: paper CDLOD
- Implementación: 4-8 anillos; el anillo interior a ~1m de resolución, el exterior a 10-20m
- Alternativa (Water Pro): mapa de desplazamiento por vértice con resolución controlada + nivel de detalle configurable (2 niveles para dispositivos modestos)

### Presupuesto de vértices orientativo
| Escena | Vértices superficie agua |
|---|---|
| Portátil integrado | 100k-200k |
| GPU media | 300k-500k |
| GPU alta | 800k+ |

### Frustum culling y cache
- `mesh.frustumCulled = false` para el agua (los desplazamientos GPU descolocan el bounding box) pero mantener culling en el resto
- Reutilizar geometrías/materiales (Three.js agrupa draw calls de materiales idénticos)
- BatchedMesh/InstancedMesh para objetos repetidos (boyas, espigones de bloques)

## 2. Campo de olas — opciones por rendimiento

| Técnica | Coste GPU | Calidad | Uso |
|---|---|---|---|
| Gerstner analítico (5-30 componentes) | Muy bajo | Muy buena | **Base de Water3J**, cualquier dispositivo |
| Gerstner + textura de detalle (normal maps proceduralmente animados) | Bajo | Muy buena | Añadir chop fino gratis |
| FFT cascada (WebGL2, ping-pong) | Medio | Excelente | Modo calidad alta |
| FFT con compute shaders (WebGPU) | Bajo-medio | Excelente | Futuro, mejor ruta |

**Estrategia Water3J:** Gerstner espectral como base universal (funciona en WebGL2), FFT como mejora opcional activable en dispositivos WebGPU. Misma interfaz de campo de olas (`sampleHeight(x, z, t)` / `sampleNormal`) para CPU y GPU — el espejo CPU es obligatorio para flotabilidad e inspector científico.

### Detalle barato que engaña al ojo
- Normal map animado con scroll en 2-3 capas — da chop fino sin vértices extra
- Espuma por textura de ruido modulada por compresión de crestas (no por rotura real) en modo bajo
- Subsurface scattering fake: luz verde-azulada trasmitida a través de crestas a contraluz (scattering height-based)

## 3. Pases de render — presupuesto y orden

Pipeline WaterThreeJS (referencia): refracción separada a target HDR half-float + DepthTexture → superficie → post único (bloom threshold + tonemapping ACES una sola vez + sRGB).

Optimizaciones:
- **Half resolution para el pase de refracción** (el agua lo distorsiona igualmente): x0.5 en ambos ejes
- Bloom a mitad de resolución con downsample en cadena (mip chain)
- **Tonemapping solo al final** — nunca ACES en pases intermedios
- Caústicas: animadas por ruido procedural en el shader del fondo (barato) en vez de proyectadas del pase de refracción (caro). Proyección real solo en modo ultra
- Limitar multisampling (desactivar MSAA del renderer si se usa postproceso; el FXAA/SMAA del postproceso es más barato)
- Cap de `pixelRatio` a 1.5 (retina completa es carísima)

## 4. GPGPU — simular barato

- GPUComputationRenderer de Three.js para ping-pong FBOs en WebGL2 (SWE, sedimentos)
- Texturas float: usar `HalfFloatType` siempre que se pueda (2x ancho de banda); `FloatType` solo si hace falta precisión
- Resolución de simulación desacoplada de la de render: SWE a 256x256 o 512x512 es más que suficiente para playas didácticas
- Pausar el solver cuando no hay cambios relevantes (tiempo acelerado pausado, pestaña oculta — `document.visibilityState`)
- Batch: un solo pass que actualice varios campos si comparten datos (evita lecturas repetidas)

## 5. Niveles de calidad (adaptados de Water Pro)

| Nivel | Agua | Sombra/caústicas | Post | SWE |
|---|---|---|---|---|
| Bajo | Gerstner 8 componentes + normal scroll | caústicas ruido | tonemap | off |
| Medio | Gerstner 16 | ruido + espuma compresión | tonemap+bloom | off |
| Alto | Gerstner 24 + refracción pass | proyectadas | bloom+ACES | 256² opcional |
| Ultra | FFT o Gerstner 32 | proyectadas full | full | 512² activo |

- Autodetección inicial: FPS medido 2s al arrancar → elegir nivel; ajuste dinámico si cae de 45fps (reducir pixelRatio primero, luego componentes)
- Panel de debug: wireframe del agua, mostrar malla SWE, contadores FPS/draw calls/vértices

## 6. Carga y arranque
- Todo procedural (cero assets que descargar — lección de WaterThreeJS): primer render casi instantáneo
- Compilar shaders en el primer frame puede dar un tragate; precompilar con `renderer.compile()` al inicio

## 7. Métricas objetivo
- **Bajo:** 60fps en un portátil con gráfica integrada (Intel/AMD integrada) a 1080p
- **Medio:** 60fps GPU media a 1080p, 30fps integrada
- La demo nunca debe bajar de 30fps en hardware razonable — degrade gracefully
