# Estado del arte — Herramientas de simulación de oleaje y costas (2026)

Análisis de las herramientas de referencia para aprender qué hacen bien, qué hacen mal y qué hueco puede ocupar Water3J.

## 1. Herramientas científicas profesionales

### MIKE 21 / MIKE 3 (DHI) — el estándar comercial
- **Módulos:** SW (espectral, aguas abiertas), BW (Boussinesq, oleaje en puertos con difracción/rotura), FM (malla flexible, agitación portuaria), MA (análisis de amarre de buques), HD (hidrodinámica)
- **Fortalezas:**
  - Cadena completa: mallado no estructurado → simulación → **Data Viewer** (visualización integrada de mallas, espectros, batimetrías, series temporales) → informes
  - Formulaciones seleccionables por caso: espectral completa (FS) vs paramétrica direccional (DS) — más barata para transformación local
  - Salidas derivadas automáticas: estadísticas de olas acumuladas y por subseries, deriva de Stokes
  - Estructuras sub-grid: weir, culverts, diques, compuertas, pilotes, turbinas — sin refinar la malla
  - HPC: OpenMP + MPI + solvers GPU
- **Debilidades:** coste (licencias caras), curva de aprendizaje alta, GUI de escritorio Windows (MIKE Zero), nada web
- **Lección para Water3J:** el flujo "mallar → simular → visualizar → informar" integrado en una sola herramienta es lo que valoran los usuarios. La separación de formulaciones por coste (FS/DS) es un patrón a copiar: ofrecer "modo rápido" (paramétrico) y "modo preciso" (espectral/SWE)

### XBeach (Deltares/TU Delft) — el estándar open source
- **Qué hace:** hidrodinámica + morfodinámica de costas arenosas en tormentas: transformación de olas (refracción, shoaling, rotura), olas infragravitatorias, corrientes, transporte de sedimentos (bed load + suspensión), avalanchas de duna, overwash, inundación
- **Fortalezas:**
  - Open source, comunidad científica activa, validado en decenas de estudios revisados por pares
  - Esquemas: olas cortas como envolvente espectral (acción de olas) + aguas someras no lineales para ondas largas — arquitectura híbrida inteligente
  - Salida NetCDF estructurada con selección de tipos de salida y tiempos
  - Ecosistema de herramientas: Matlab Toolbox, `xbeach-toolbox` (Python, pre/postprocesado), XBeach GUI (Matlab), **QBeach** (plugin QGIS 2026)
- **Debilidades:** CLI sin GUI propia, visualización mínima (matplotlib/QGIS post-hoc), instalación no trivial para el usuario final
- **Lección para Water3J:** el modelo científico de referencia para sedimentos + tormenta. Su arquitectura híbrida (espectral para olas cortas + SWE para ondas largas) es EXACTAMENTE el enfoque escalable para el navegador. Sus fórmulas (roller de olas, avalanching, esquema wetting/drying) están documentadas en el manual → fuente primaria

### SWASH (TU Delft) — SWE no lineal fase-resuelta
- En el estudio comparativo IAHR (MIKE21 BW vs SWASH vs XBeach en foreshore somero), **SWASH fue el preferido**: resultados iguales a MIKE BW pero numéricamente más robusto y open source
- **Lección:** para transformación olas cerca de la costa, un SWE bien hecho supera a modelos más complejos. Refuerza la apuesta de Water3J por el solver SWE

### Delft3D / Delft3D FM / SCHISM / FVCOM — ecosistema académico
- Mallas estructuradas vs no estructuradas (FM): las no estructuradas ganan en eficiencia con geometría compleja
- Visualización: dependen de Matlab, Python (schismview), o **VisIt** (visualizador científico externo); **Thalassa** destaca: visualización WEB de mallas no estructuradas con millones de nodos usando datashader
- **Lección:** la visualización es el eslabón débil de todo el ecosistema científico — siempre externa, siempre Python/Matlab. Water3J con visualización 3D web nativa llena un hueco real

## 2. Kits visuales de océano en Three.js

### Three.js Water Pro (Dan Greenheck, comercial ~75$) — el referente visual
- **Arquitectura:** FFT de cascada (3 bandas de espectro) + swell de Gerstner + fallback WebGL (ruido) cuando no hay WebGPU; TSL/node materials
- **Optimización que aplica:**
  - **LOD de geometría del agua:** malla muy fina cerca de la cámara, degradando con la distancia (configurable por niveles de calidad)
  - Niveles de calidad (low/medium/high/ultra) que activan/desactivan efectos
  - Modo debug con wireframe para diagnosticar
  - Fresnel, subsurface scattering en crestas, caústicas en el fondo, espuma por compresión de superficie
- **Lecciones:** la combinación FFT+Gerstner con LOD cascada es el estándar. Los presets de calidad y el modo debug no son opcionales en un producto serio

### Tidewater (kit comercial, dev individual)
- Cascaded FFT + Gerstner + **espejo CPU del campo de olas para flotabilidad** (clave: física en CPU sincronizada con render GPU) + wake field + espuma ligada a compresión
- 13 presets de escena (arrecife, huracán, lago...)
- Lección honesta del autor: "no es un simulador CFD y eso es bueno" — separar simulación visual de simulación científica

### Spiri0/Threejs-WebGPU-IFFT-Ocean (open source)
- Océano iFFT con compute shaders WebGPU, corre en portátil con gráfica integrada
- Demostración de que WebGPU compute hace viable FFT océano + más en el navegador
- En WebGL2 consigue lo mismo con 5 render targets por intervalo (más costoso pero posible)

### Otros: PlanetTechJS (chunk LOD genérico), CDLOD (paper de LOD por distancia continua — base teórica para LOD de agua y terreno)

## 3. Síntesis — el hueco de Water3J

| Capacidad | MIKE/DHI | XBeach | Kits Three.js | **Water3J (objetivo)** |
|---|---|---|---|---|
| Física validada | ✅ | ✅ | ❌ | ⚠️ simplificada pero fiel |
| Visualización 3D | Media | ❌ (externa) | ✅ espectacular | ✅ espectacular |
| En el navegador | ❌ | ❌ | ✅ | ✅ |
| Interactividad (editar batimetría en vivo) | ❌ | ❌ | Parcial | ✅ |
| Informes automáticos | ✅ (complejos) | Post-hoc Python | ❌ | ✅ (cliente, ligero) |
| Coste | Muy alto | Gratis | 75$ | Gratis/open |
| Curva de aprendizaje | Alta | Alta | Baja | **Baja** |

**Posicionamiento:** Water3J no compite con MIKE ni XBeach en rigor numérico — compite en **accesibilidad**: educación, divulgación, pre-diseño rápido, demos a clientes, primera aproximación antes del estudio serio. Y en el camino se convierte en el mejor visualizador web de dinámica costera que exista.

Patrones a copiar de cada uno:
- De **MIKE**: flujo completo escena→resultado→informe; presets por caso de uso; estructuras sub-grid
- De **XBeach**: arquitectura híbrida espectral+SWE; esquemas de rotura (roelvink_daly, gamma), avalanching, wetting/drying; salida estructurada
- De **SWASH**: robustez numérica del SWE
- De **Water Pro**: LOD cascada, niveles de calidad, FFT+Gerstner, modo debug
- De **Tidewater**: espejo CPU para física de objetos
- De **Thalassa**: visualización web de mallas grandes
