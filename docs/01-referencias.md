# Referencias — Water3J

Catálogo de repos, papers y recursos encontrados durante la investigación inicial (2026-08-30).

## 1. Visualización con Three.js

### ⭐ achrefelouafi/WaterThreeJS
- **URL:** https://github.com/achrefelouafi/WaterThreeJS
- **Relevancia:** MUY ALTA — casi exactamente el punto de partida visual que buscamos
- Océano en tiempo real con Three.js, encima y debajo de la superficie
- Todo procedural (sin texturas): olas, cielo, caústicas y luz volumétrica en shaders
- Campo de olas **espectral de Gerstner**: decenas de olas desde swell largo hasta chop fino
- **Dispersión de aguas profundas** (olas largas viajan más rápido que cortas)
- Orilla lee la columna de agua: bajíos turquesa transparente + banda de espuma animada
- Objetos flotantes con **flotabilidad** (bobb, tilt a la normal de la ola, deriva por pendiente)
- Pipeline: HDR half-float, pase de refracción separado, depth textures, bloom, volumétricos submarinos, ACES filmic tone-mapping, sRGB
- Solo WebGL2 + GLSL, sin WebGPU, sin FFT, sin compute shaders (corre en cualquier navegador)
- **Licencia:** pendiente de verificar

### jeantimex/threejs-water
- **URL:** https://github.com/jeantimex/threejs-water
- **Relevancia:** ALTA — referencia para caústicas, reflejos y refracciones raytraced
- 185 stars. Basado en el clásico de Evan Wallace (2011), modernizado
- Reflejos/refracciones raytraced, caústicas, objetos interactivos
- Shaders dedicados para geometría redondeada (RoundedBox) con mapeo triplanar y proyección de caústicas

### Mohido/Ocean
- **URL:** https://github.com/Mohido/Ocean
- **Relevancia:** MEDIA — port a JS del clásico "Effective Water Simulation" (GPU Gems 1, Cap. 1)

### Sean-Bradley/three.js (rama `gerstner-waves`)
- **URL:** https://github.com/Sean-Bradley/three.js/blob/gerstner-waves/examples/webgl_shaders_ocean_gerstner.html
- **Relevancia:** ALTA como **referencia de shader limpio** — implementación didáctica de Gerstner en GLSL
- Código clave incluido (función GerstnerWave con dispersión c = sqrt(9.8/k))
- Se puede usar directamente como punto de partida de shader

## 2. Física — Solvers de aguas someras (SWE) en GPU

### ⭐ lisyarus/webgpu-shallow-water
- **URL:** https://github.com/lisyarus/webgpu-shallow-water
- **Relevancia:** MUY ALTA — mejor referencia técnica para SWE en GPU
- 102 stars, MIT. Solver de ecuaciones de aguas someras con método **virtual pipes** en WebGPU
- Detalla el modelo: 4 buffers (altura fondo, altura columna de agua, flujo X, flujo Y)
- Pasos: flujos de frontera → aceleración por diferencia de superficie → escalado de outflow → advección de columnas → velocidad media → partículas
- Soporta fronteras tipo: muro, fuente, desagüe, **generador de olas**
- Referencia del método: paper "virtual pipes" (diglib.eg.org) + outflow scaling (inria.hal.science)
- Nota: es C++/WebGPU nativo, no Three.js, pero el algoritmo es portable a GLSL/TSL

### aeplay/WebFlood
- **URL:** https://github.com/aeplay/WebFlood
- **Relevancia:** ALTA — prueba de concepto de SWE GPGPU en WebGL puro (sin WebGPU)
- 57 stars, MIT. Simulación interactiva de inundación urbana
- Enfoque **semi-lagrangiano**, todo en GLSL
- Pasa bien el caso de prueba clásico Fraccarollo & Toro (1995)
- Incluye **PDF de tesis** con detalles de implementación
- Demo: http://aeplay.github.io/WebFlood/

### NekomiyaKasane/webgl-water-demo
- **URL:** https://github.com/NekomiyaKasane/webgl-water-demo
- **Relevancia:** MEDIA — esquema de integración **Lax-Friedrichs** con render físico realista

### Rive4/WebGL_GPGPU-Water-Simulation
- **URL:** https://github.com/Rive4/WebGL_GPGPU-Water-Simulation
- **Relevancia:** BAJA/MEDIA — heightmap basado en Navier-Stokes, comparativa Euler/Verlet/Velocity-Verlet
- TFG UPV/EHU, español, útil como documentación didáctica

## 3. Sedimentos y erosión

### bshishov/UnityTerrainErosionGPU
- **URL:** https://github.com/bshishov/UnityTerrainErosionGPU
- **Relevancia:** ALTA — base conceptual para el módulo de sedimentos
- 154 stars, MIT. Erosión hidráulica + térmica con compute shaders (Unity)
- README con explicación matemática detallada (capacidad de transporte, capacidad de deposición)
- El modelo de pipes + erosión se puede portar a GLSL/Three.js

### pyReef-model/wavesed
- **URL:** https://github.com/pyReef-model/wavesed
- **Relevancia:** MEDIA — referencia científica de modelo regional de transporte de sedimentos por oleaje
- Modelo basado en teoría de Airy + refracción por Huygens
- Entramiento de sedimentos por tensión de corte de olas + deriva litoral
- No portable directo, pero útil como referencia conceptual

## 4. Comerciales (referencia de producto, no open source)

### Three.js Water Pro (useclick.io)
- **URL:** https://useclick.io/threejs-water-pro
- **Relevancia:** MEDIA — muestra qué es viable comercialmente y qué features espera el mercado
- FFT + Gerstner, espuma multicapa, flotabilidad, underwater, caústicas en fondo marino, WebGPU con fallback WebGL
- Modo determinista multiplayer, máscaras de agua
- Lecciones: la combinación **FFT (viento) + Gerstner (swell)** es el estándar de la industria

### Tidewater (ilikekillnerds.com)
- **URL:** https://ilikekillnerds.com/2026/05/21/i-built-tidewater-threejs-ocean-kit
- **Relevancia:** BAJA/MEDIA — experiencia de un dev individual construyendo un kit de océano
- Arquitectura similar: cascaded FFT + Gerstner + CPU mirror para flotabilidad + wake field
- 13 presets (arrecife, tropical, huracán, etc.)
- Lección: "no es un simulador CFD, y eso es bueno" — enfoque práctico

## 5. Teoría científica (papers, wikis, frameworks)

### Coastal Wiki — Shallow-water wave theory
- **URL:** https://www.coastalwiki.org/wiki/Shallow-water_wave_theory
- **Relevancia:** MUY ALTA — enciclopedia científica de referencia
- Cubre: generación, teoría de Airy, reflexión (con coeficientes), refracción, shoaling, difracción, fricción de fondo, interacción olas-corriente, tensiones de radiación, zona de surf, oleaje de amplitud finita
- Fuente principal para docs/02 y docs/03

### satbastola — Cap. 5 Coastal Engineering (Shoaling, Refraction, Diffraction)
- **URL:** https://satbastola.github.io/CivilEngineering_Tools/Chap5/Diffraction_Shoaling_Refraction.html
- **Relevancia:** ALTA — resumen con fórmulas de transformación de olas
- Ecuación de Mild-Slope (MSE): ∇·(C·Cg·∇η) + k²·C·Cg·η = 0
- Coeficientes de difracción tras dique (integrales de Fresnel)
- Shoaling: conservación de flujo de energía
- Incluye visualización interactiva del coeficiente de difracción

### GMD — Ocean wave tracing v.1
- **URL:** https://gmd.copernicus.org/articles/16/6515/2023/
- **Relevancia:** MEDIA/ALTA — solver numérico de rayos de olas con corrientes y profundidades variables
- Modelo de rayos (ray tracing de crestas) sobre batimetría real y corrientes

### MDPI — Integrated Modeling of Coastal Processes
- **URL:** https://mdpi.com/2673-3951/5/2/25
- **Relevancia:** ALTA (referencia de pipeline completo, no portable)
- Modelo Mild-Slope avanzado → tensiones de radiación → RANS (corrientes) → transporte de sedimentos
- Este es el pipeline científico completo al que aspiramos a imitar de forma simplificada

### arxiv 2509.21329 — NORA-SARAH (Norwegian coast)
- **URL:** https://arxiv.org/abs/2509.21329
- **Relevancia:** MEDIA — contexto de frameworks científicos modernos (SWAN, espectros)

### Wavespectra (python)
- **URL:** https://github.com/wavespectra/wavespectra
- **Relevancia:** MEDIA — librería Python para espectros de olas, útil para generar espectros de entrada

### mysimulator.uk — Ocean Wave Dynamics
- **URL:** https://mysimulator.uk/articles/ocean-wave-dynamics
- **Relevancia:** MEDIA — artículo didáctico con demo interactiva
- Explica superposición lineal, dispersión, shoaling, refracción, rompiente

## Notas de síntesis

- La **combinación Gerstner (swell) + FFT o superposición espectral (viento/chop)** es el estándar visual de la industria
- Para puertos y diques, la transformación científica relevante es **refracción (bathymetría) + difracción (bordes de dique) + reflexión (muros)**, no CFD completa
- Los solvers SWE en GPU (virtual pipes / Lax-Friedrichs / semi-lagrangiano) son el puente entre olas visuales y física de inundación/flujo
- La erosión/sedimentos se puede implementar como capa adicional sobre un solver SWE (modelo de pipes + capacidad de transporte + deposición)
- Coastal Wiki es la mejor fuente para fórmulas científicas con rigor; los papers de MDPI/GMD para el pipeline de ingeniería costera
