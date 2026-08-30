# Arquitectura técnica — Water3J

Diseño de la futura web app. Se define ahora a nivel de módulos; el detalle de implementación vendrá después de los prototipos.

## 1. Stack

| Capa | Tecnología | Justificación |
|---|---|---|
| Render 3D | **Three.js** (r160+, WebGL2 primero, WebGPU/TSL opcional) | Ecosistema, comunidad, ejemplos |
| Física GPU | GLSL shaders + ping-pong FBOs (GPUComputationRenderer) | Estándar para GPGPU en navegador |
| Batimetría | Heightmap procedural + edición interactiva (pinceles) | Base para refracción y SWE |
| UI | HTML/CSS sobre canvas, panel de controles | Ligero |
| Build | Vite | Rápido, estándar con Three.js |
| Deploy | GitHub Pages | Gratis, coherente con otros proyectos de David |

**Decisión de diseño:** empezar 100% WebGL2 (como WaterThreeJS), sin depender de WebGPU. WebGPU/TSL como mejora opcional futura (más compute shaders para SWE y sedimentos).

## 2. Módulos

```
src/
├── core/
│   ├── ocean.ts            # Campo de olas Gerstner espectral
│   ├── spectrum.ts         # Generadores de espectro (JONSWAP, PM, paramétrico)
│   ├── bathymetry.ts       # Heightmap de fondo marino + edición
│   └── time.ts             # Reloj de simulación (escala real/acelerada)
├── physics/
│   ├── swe.ts              # Solver aguas someras (virtual pipes, GPGPU)
│   ├── rays.ts             # Trazado de rayos para refracción (opcional, debug)
│   ├── sediments.ts        # Transporte de sedimentos (GPGPU, fase 2)
│   └── structures.ts       # Diques, muros, muelles (colisión + coeficientes)
├── render/
│   ├── waterMaterial.ts    # Shader de agua (refracción, reflexión, caústicas, espuma)
│   ├── seabedMaterial.ts   # Shader de fondo (caústicas, sedimento, colores por profundidad)
│   ├── foam.ts             # Espuma (crestas, línea de orilla, rotura)
│   ├── sky.ts              # Cielo, sol, atmósfera
│   └── post.ts             # Bloom, tonemapping ACES, underwater fog
├── ui/
│   ├── controls.ts         # Sliders (viento, Hs, Tp, dirección, batimetría)
│   ├── presets.ts          # Presets de escenarios (playa, puerto, dique, tormenta)
│   └── inspector.ts        # Lectura de valores en un punto (H local, T, τ, z_b)
└── app.ts                  # Bootstrap, loop principal
```

## 3. Pipeline de render (inspirado en WaterThreeJS)

1. **Pase de refracción:** renderizar escena submarina (fondo marino, estructuras, objetos) a un target HDR half-float con DepthTexture
2. **Pase principal:** superficie de agua con shader propio
   - Vertex: desplazamiento Gerstner espectral + modificación por batimetría (shoaling/refracción)
   - Fragment: Fresnel, mezcla de reflejo (skybox/SSR barato) + refracción (target del paso 1 con distorsión por normal), absorción por profundidad (Beer-Lambert), caústicas proyectadas al fondo
3. **Espuma:** máscara por rotura (criterio H/h), compresión de crestas, banda de orilla
4. **Post:** bloom, tonemapping ACES, salida sRGB
5. **Underwater:** si la cámara está sumergida, cambiar a fog exponencial + distorsión (pantalla completa)

## 4. Pipeline de física

```
Espectro de entrada (viento, fetch, Hs, Tp, dirección)
  ↓
Campo Gerstner (GPU vertex)  ←—— mismo cálculo en CPU para flotabilidad
  ↓
Interacción con batimetría: k(h) local → refracción + shoaling
  ↓
Estructuras: reflexión (Cr por tipo) + difracción (Huygens en extremos)
  ↓
Solver SWE (opcional, activable): columnas de agua, corrientes, rotura
  ↓
Sedimentos (fase 2): τ de corte → capacidad → flujo → Δz_b
  ↓
Feedback: z_b actualizado modifica k(h) → nueva refracción
```

**Estrategia de progresión:** cada módulo de física debe poder activarse/desactivarse. La demo mínima viable es solo Gerstner + batimetría visual + flotabilidad (como WaterThreeJS pero propio). Luego se encienden los módulos científicos.

## 5. Interfaz científica (diferenciador clave)

La app no es solo un visualizador bonito: debe mostrar **números y campos**.

- **Sliders:** Hs (altura significativa), Tp (periodo de pico), dirección, velocidad viento, fetch, profundidad base, pendiente de playa
- **Visualización de campos:** overlay sobre el agua de `η` (altura), corrientes, tensión de corte, K_d (difracción)
- **Inspector puntual:** click en un punto → ficha con H local, T, profundidad, τ, transporte previsto
- **Cálculo de perfil de playa:** sección transversal con perfil real vs equilibrio de Dean
- **Carga en muro:** gráfico de presión de Goda sobre la estructura seleccionada
- **Time-series:** Hs en un punto de observación a lo largo del tiempo (con espectro)

## 6. Escenarios iniciales (presets)

1. **Playa abierta:** pendiente suave, olas oblicuas → deriva litoral visible
2. **Playa con espigón:** acumulación/erosión alrededor de la estructura
3. **Puerto simple:** dos diques convergentes con bocana → agitación interior
4. **Muro vertical:** clapotis, presiones, reflexión
5. **Tormenta:** Hs grande, rotura, overtopping de dique
6. **Fondo irregular:** barras de arena, refracción sobre bajío, rip current

## 7. Fases de desarrollo propuestas

| Fase | Contenido | Estimación |
|---|---|---|
| **0. Setup** | Repo, Vite, Three.js, esqueleto de escena | Inmediato |
| **1. Océano base** | Gerstner espectral + cielo + material de agua | Corta |
| **2. Batimetría** | Heightmap procedural + edición + shoaling/refracción básica | Media |
| **3. Estructuras** | Diques/muros con reflexión + espuma de orilla | Media |
| **4. SWE GPGPU** | Solver virtual pipes activable | Media-larga |
| **5. Sedimentos** | Transporte + morfodinámica | Larga (año 2) |
| **6. Interfaz científica** | Inspector, overlays, perfiles | Media |
| **7. Puerto real** | Integración con batimetría real (import GeoTIFF) | Larga |

## 8. Riesgos y mitigaciones

- **Rendimiento SWE en WebGL:** los ping-pong FBOs son limitados; mitigar con resolución adaptativa y WebGPU como upgrade
- **Complejidad de shaders:** mantener shaders modulares (chunk system de Three.js), no monolíticos
- **Alcance excesivo:** priorizar visualización científica correcta antes de realismo fotográfico; cada fase debe ser usable por sí misma
- **Batimetría real:** dependencia de datos externos (GeoTIFF, Mercator, EMODnet); empezar con batimetría procedural y dejar la real para fase final
